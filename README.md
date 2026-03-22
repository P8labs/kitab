# Kitab

Kitab is a lightweight desktop note taking app built using Tauri and Rust. It is focused on speed and simple workflow. Instead of adding too many features, the goal was to keep things fast and usable even with large number of notes.

Notes are just markdown files and everything works directly on filesystem. There is no database, so it stays simple and easy to manage.

## Features

Kitab supports multiple vaults so you can manage different note collections. It has a markdown editor with live preview which feels smooth while writing. Backlinks are included so notes can connect like a wiki system, and `[[note]]` style linking is supported.

Search works across all notes and is fast enough even on bigger datasets. Since everything is file based, you always have full control on your data.

## Why Kitab

Most obsidian like apps are powerful but they become heavy over time because of plugins and extra layers. Startup becomes slow and memory usage also increases. Even simple operations sometimes feel delayed when vault gets bigger.

Kitab is built with a different approach. It only focuses on core things like editing, linking and search. Because of this the bundle size is small (less than 10MB) and startup is faster. Memory usage is also lower compared to most apps in same space.

It is not trying to compete on features, just trying to keep things fast and simple.

## Optimization

Main work is done on backend side to avoid unnecessary work on UI.

File indexing, search and backlinks are handled in Rust instead of frontend. This reduces repeated parsing and keeps UI responsive.

Backlinks use a simple cache based on file path and last modified time. If file is not changed, previous parsed result is reused. This avoids full rescans again and again.

Search is also moved to backend and uses parallel processing for scanning files. This helps in reducing time when dataset becomes large.

Some small things like reducing lock time, sorting results after parallel processing and removing unused UI parts also helped in keeping performance stable.

## Benchmarks

Benchmarks are done using Rust Criterion.

System:
i5-12450HX, 24GB RAM (Lenovo LOQ)

Dataset:
~1000 markdown files (same fixture used for before/after)

| Operation                    | Before      | After       |
| ---------------------------- | ----------- | ----------- |
| Index Files                  | ~19 ms      | ~19 ms      |
| Search Files                 | ~50 ms      | ~23 ms      |
| Backlinks (Full Rescan)      | ~469–895 ms | ~199–208 ms |
| Backlinks (Cold Cache)       | ~120–132 ms | ~40 ms      |
| Backlinks (Warm Cache Batch) | ~263–296 ms | ~137–145 ms |

Search is almost 2x faster after optimization.
Backlinks improved a lot because of caching and parallel parsing.
Indexing was already fast so not much change there.

Overall Kitab is focused on being fast and lightweight. It may not have everything but it tries to do basic things properly without slowing down.
