import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";

import {
  RiAddLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiFolderOpenLine,
  RiMapPin2Line,
  RiTimeLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Titlebar } from "@/components/shell/Titlebar";

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

  // 🔥 load recent vaults
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
    <div className="h-screen w-screen overflow-hidden bg-[var(--app-base)] text-[13px] text-[var(--text-primary)]">
      <Titlebar title="Misty - Vault Setup" compact />

      <div className="flex h-[calc(100vh-2rem)] items-center justify-center px-4 py-6">
        <div className="grid w-full max-w-4xl grid-cols-[1.15fr_0.85fr] overflow-hidden rounded-[6px] border border-border bg-[var(--surface-panel)]">
          <section className="border-r border-border p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
              <RiAddLine className="size-4" />
              Create vault
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-[var(--text-muted)]">
                  Vault name
                </Label>
                <Input
                  placeholder="notes"
                  value={name}
                  className="h-8"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-[var(--text-muted)]">
                  Location
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    className="h-8 flex-1"
                    value={path ?? ""}
                    placeholder="Choose a folder"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    className="h-8 px-2 text-[12px]"
                    onClick={pickFolder}
                  >
                    Browse
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-y border-border py-2 text-[11px] text-[var(--text-muted)]">
              <div className="flex items-center gap-1">
                <RiMapPin2Line className="size-3.5" />
                <span>{path ? "Path selected" : "Waiting for location"}</span>
              </div>
              <div className="flex items-center gap-1">
                <RiTimeLine className="size-3.5" />
                <span>Auto-save enabled</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              <Button
                disabled={!name || !path || loading}
                onClick={createVault}
                className="h-8 px-3 text-[12px]"
              >
                {loading ? "Creating..." : "Create vault"}
              </Button>
              <Button
                variant="ghost"
                onClick={openExistingVault}
                className="h-8 px-2 text-[12px]"
              >
                <RiFolderOpenLine className="mr-1 size-3.5" />
                Open existing
              </Button>
            </div>
          </section>

          <aside className="bg-[var(--surface-sidebar)] p-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Recent vaults
            </div>

            <div className="space-y-1.5">
              {recent.length === 0 && (
                <div className="rounded-[5px] border border-border bg-[var(--surface-panel)] px-2 py-1.5 text-[12px] text-[var(--text-muted)]">
                  No recent vaults
                </div>
              )}

              {recent.map((vault) => (
                <div
                  key={vault.path}
                  className="w-full rounded-[5px] border border-border bg-[var(--surface-panel)] px-2 py-1.5 text-left text-[12px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openVault(vault)}
                      className="min-w-0 flex-1 truncate text-left font-medium text-[var(--text-primary)] hover:text-white"
                    >
                      {vault.name}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="tree-action"
                        title="Remove from recents"
                        onClick={() => removeVault(vault.path)}
                      >
                        <RiDeleteBinLine className="size-3" />
                      </button>
                      <button
                        type="button"
                        className="tree-action"
                        title="Open vault"
                        onClick={() => openVault(vault)}
                      >
                        <RiArrowRightSLine className="size-3.5 text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {vault.path}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
