use std::collections::HashMap;
use std::fs;
use std::hint::black_box;
use std::path::Path;

use criterion::{criterion_group, criterion_main, Criterion};
use tempfile::tempdir;

use kitab_lib::features::app_state::BacklinkScanCacheEntry;
use kitab_lib::features::vault::{
    compute_backlinks_with_cache, index_all_notes, search_notes_content,
};

const NOTE_COUNT: usize = 1000;
const SEARCH_QUERY: &str = "distributed-search-needle";
const SEARCH_QUERIES: [&str; 5] = [
    "distributed-search-needle",
    "generated test content",
    "No marker in this note",
    "item",
    "Core Note",
];
const BACKLINK_QUERIES: [&str; 4] = ["Core Note", "Other Note", "Note 5", "Note 7"];

fn build_fixture(root: &Path, notes: usize) {
    let _ = fs::create_dir_all(root.join("notes").join("deep"));
    let _ = fs::create_dir_all(root.join("notes").join("deep2"));

    for idx in 0..notes {
        let title = format!("Note {}", idx);
        let target = if idx % 3 == 0 {
            "[[Core Note]]"
        } else if idx % 7 == 0 {
            "[[Core Note|Alias]]"
        } else {
            "[[Other Note]]"
        };

        let dir = if idx % 3 == 0 {
            root.join("notes").join("deep")
        } else if idx % 2 == 0 {
            root.join("notes").join("deep2")
        } else {
            root.join("notes")
        };

        let path = dir.join(format!("{}.md", title));
        let search_line = if idx % 5 == 0 {
            format!("Contains marker: {}", SEARCH_QUERY)
        } else {
            "No marker in this note".to_string()
        };
        let body =
            format!("# {title}\n\nThis is generated test content.\n{search_line}\n{target}\n\n- item\n- item\n");
        let _ = fs::write(path, body);
    }
}

fn legacy_backlinks_scan(vault_root: &Path, target: &str) -> usize {
    if target.trim().is_empty() {
        return 0;
    }

    let needle = format!("[[{}", target.to_lowercase());
    let notes = index_all_notes(vault_root);
    let mut count = 0usize;

    for note in notes {
        let Ok(content) = fs::read_to_string(&note.path) else {
            continue;
        };
        let content_lower = content.to_lowercase();
        let mut start_at = 0usize;
        let mut matched = false;

        while let Some(relative_idx) = content_lower[start_at..].find(&needle) {
            let idx = start_at + relative_idx + needle.len();
            let next = content_lower[idx..].chars().next();
            if matches!(next, Some(']') | Some('|')) {
                matched = true;
                break;
            }
            start_at = idx;
        }

        if matched {
            count += 1;
        }
    }

    count
}

fn bench_backlinks(c: &mut Criterion) {
    let temp = tempdir().expect("create temp dir");
    build_fixture(temp.path(), NOTE_COUNT);

    c.bench_function("index files legacy", |b| {
        b.iter(|| {
            let notes = index_all_notes(temp.path());
            black_box(notes.len());
        })
    });

    c.bench_function("search files legacy", |b| {
        b.iter(|| {
            let hits = search_notes_content(temp.path(), SEARCH_QUERY);
            black_box(hits.len());
        })
    });

    c.bench_function("search files optimized hot-index (batch)", |b| {
        let notes = index_all_notes(temp.path());
        b.iter(|| {
            let mut total = 0usize;
            for query in SEARCH_QUERIES {
                let needle = query.to_lowercase();
                for note in &notes {
                    let Ok(content) = fs::read_to_string(&note.path) else {
                        continue;
                    };
                    if content.to_lowercase().contains(&needle) {
                        total += 1;
                    }
                }
            }
            black_box(total);
        })
    });

    c.bench_function("backlinks legacy full-rescan (batch)", |b| {
        b.iter(|| {
            let mut total = 0usize;
            for target in BACKLINK_QUERIES {
                total += legacy_backlinks_scan(temp.path(), target);
            }
            black_box(total);
        })
    });

    c.bench_function("backlinks cold cache", |b| {
        b.iter(|| {
            let mut cache: HashMap<String, BacklinkScanCacheEntry> = HashMap::new();
            let links = compute_backlinks_with_cache(temp.path(), "Core Note", None, &mut cache);
            black_box(links.len());
        })
    });

    c.bench_function("backlinks warm cache (batch)", |b| {
        let mut cache: HashMap<String, BacklinkScanCacheEntry> = HashMap::new();
        for target in BACKLINK_QUERIES {
            let _ = compute_backlinks_with_cache(temp.path(), target, None, &mut cache);
        }

        b.iter(|| {
            let mut total = 0usize;
            for target in BACKLINK_QUERIES {
                let links = compute_backlinks_with_cache(temp.path(), target, None, &mut cache);
                total += links.len();
            }
            black_box(total);
        })
    });
}

criterion_group! {
    name = benches;
    config = Criterion::default().sample_size(20);
    targets = bench_backlinks
}
criterion_main!(benches);
