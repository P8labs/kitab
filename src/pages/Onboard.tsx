import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";

import {
  Add01Icon,
  Delete02Icon,
  FolderOpenIcon,
  MapPinIcon,
  Time01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Titlebar } from "@/components/shell/Titlebar";
import { HIcon } from "@/components/ui/hicon";

import { useApp } from "@/state/app";

type Vault = {
  name: string;
  path: string;
};

export default function Onboard() {
  const { setHasVault } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<Vault[]>([]);

  useEffect(() => {
    async function load() {
      const config: any = await invoke("get_config");
      setRecent(config?.recent_vaults || []);
    }
    load();
  }, []);

  const pickFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Folder for Vault",
    });

    if (typeof selected === "string") {
      setPath(selected);
    }
  };

  const createVault = async () => {
    if (!name || !path) return;

    setLoading(true);

    await invoke("add_vault", { name, path });

    setHasVault(true);
    navigate("/");
  };

  const openVault = async (vault: Vault) => {
    await invoke("set_active_vault", { path: vault.path });

    setHasVault(true);
    navigate("/");
  };

  const openExistingVault = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Open Vault",
    });

    if (typeof selected === "string") {
      await invoke("set_active_vault", { path: selected });
      setHasVault(true);
      navigate("/");
    }
  };

  const removeVault = async (path: string) => {
    await invoke("remove_vault", { path });
    setRecent((prev) => prev.filter((item) => item.path !== path));
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-app-base text-[13px] text-text-primary">
      <Titlebar title="Kitab - Vault Setup" compact />

      <div className="flex h-[calc(100vh-2rem)] items-center justify-center px-4 py-6">
        <div className="grid w-full max-w-4xl grid-cols-[1.15fr_0.85fr] overflow-hidden rounded-[6px] border border-black/8 bg-surface-panel shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-md dark:border-white/20 dark:shadow-[0_12px_48px_rgba(0,0,0,0.15)] dark:backdrop-blur-xl">
          <section className="border-r border-black/8 p-4 dark:border-white/20">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.06em] text-text-muted">
              <HIcon icon={Add01Icon} size={16} />
              Create vault
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-text-muted">
                  Vault name
                </Label>
                <Input
                  placeholder="notes"
                  value={name}
                  className="h-8 border-black/8 bg-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.08)] placeholder:text-text-muted/60 dark:border-white/20 dark:bg-white/5 dark:shadow-[0_4px_18px_rgba(20,20,20,0.05)] dark:placeholder:text-text-muted/40"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-text-muted">Location</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    className="h-8 flex-1 border-black/8 bg-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.08)] placeholder:text-text-muted/60 dark:border-white/20 dark:bg-white/5 dark:shadow-[0_4px_18px_rgba(20,20,20,0.05)] dark:placeholder:text-text-muted/40"
                    value={path ?? ""}
                    placeholder="Choose a folder"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    className="h-8 border-black/12 px-2 text-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-white/45 dark:shadow-[0_4px_18px_rgba(20,20,20,0.05)]"
                    onClick={pickFolder}
                  >
                    Browse
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-y border-black/8 py-2 text-text-muted dark:border-white/20">
              <div className="flex items-center gap-1">
                <HIcon icon={MapPinIcon} size={14} />
                <span>{path ? "Path selected" : "Waiting for location"}</span>
              </div>
              <div className="flex items-center gap-1">
                <HIcon icon={Time01Icon} size={14} />
                <span>Auto-save enabled</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              <Button
                disabled={!name || !path || loading}
                onClick={createVault}
                className="h-8 px-3 text-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_18px_rgba(20,20,20,0.05)]"
              >
                {loading ? "Creating..." : "Create vault"}
              </Button>
              <Button
                variant="ghost"
                onClick={openExistingVault}
                className="h-8 px-2 text-[12px] hover:bg-surface-hover dark:hover:bg-surface-hover"
              >
                <HIcon icon={FolderOpenIcon} className="mr-1" size={14} />
                Open existing
              </Button>
            </div>
          </section>

          <aside className="bg-surface-sidebar/80 p-4 backdrop-blur-md dark:bg-surface-sidebar/50 dark:backdrop-blur-xl">
            <div className="mb-2 uppercase tracking-[0.06em] text-text-muted">
              Recent vaults
            </div>

            <div className="space-y-1.5">
              {recent.length === 0 && (
                <div className="rounded-[5px] border border-black/8 bg-surface-panel/60 px-2 py-1.5 text-[12px] text-text-muted shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-sm dark:border-white/20 dark:bg-surface-panel/40 dark:shadow-[0_4px_18px_rgba(20,20,20,0.05)]">
                  No recent vaults
                </div>
              )}

              {recent.map((vault) => (
                <button
                  key={vault.path}
                  type="button"
                  onClick={() => openVault(vault)}
                  className="hover:cursor-pointer w-full rounded-[5px] border border-black/8 bg-surface-panel/60 px-2 py-1.5 text-left text-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-sm dark:border-white/20 dark:bg-surface-panel/40 dark:shadow-[0_4px_18px_rgba(20,20,20,0.05)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 truncate text-left font-medium text-text-primary hover:text-primary">
                      {vault.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="tree-action z-30"
                        title="Remove from recents"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVault(vault.path);
                        }}
                      >
                        <HIcon icon={Delete02Icon} size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="truncate text-[11px] text-text-muted">
                    {vault.path}
                  </p>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
