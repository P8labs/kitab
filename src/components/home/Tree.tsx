type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
};

export function Tree({
  nodes,
  onOpen,
}: {
  nodes: FileNode[];
  onOpen: (path: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <li key={node.path}>
          <div
            className="cursor-pointer text-zinc-400 hover:text-white text-sm"
            onClick={() => {
              if (!node.is_dir) onOpen(node.path);
            }}
          >
            {node.name}
          </div>
        </li>
      ))}
    </ul>
  );
}
