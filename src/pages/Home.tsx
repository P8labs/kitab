import { Editor } from "@/components/home/Editor";
import { Sidebar } from "@/components/home/Sidebar";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
};

export default function Home() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [vaultPath, setVaultPath] = useState("");
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const loadTree = async () => {
    const config: any = await invoke("get_config");

    if (!config?.last_opened) return;
    setVaultPath(config.last_opened);
    const res = await invoke("read_dir", {
      path: config.last_opened,
    });

    setTree(res as FileNode[]);
  };

  useEffect(() => {
    loadTree();
  }, []);

  const openFile = async (path: string) => {
    const file = await invoke("read_file", { path });

    setActiveFile(path);
    setContent(file as string);
  };

  return (
    <div className="h-screen w-screen flex">
      <Sidebar
        tree={tree}
        onOpen={openFile}
        vaultPath={vaultPath}
        refresh={loadTree}
      />

      <Editor
        activeFile={activeFile}
        content={content}
        setContent={setContent}
      />
    </div>
  );
}
