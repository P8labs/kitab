import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/state/app";

export default function Onboard() {
  const { setHasVault } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    navigate("/");
    setLoading(false);
    setHasVault(true);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <Card className="w-105">
        <CardContent className="flex flex-col gap-5 p-6">
          <h1 className="text-xl font-semibold">Create Vault</h1>

          <div className="flex flex-col gap-2">
            <Label>Vault Name</Label>
            <Input
              placeholder="My Notes"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Location</Label>

            <div className="flex gap-2">
              <Input value={path ?? ""} placeholder="Select folder" readOnly />

              <Button variant="secondary" onClick={pickFolder}>
                Browse
              </Button>
            </div>
          </div>

          <Button disabled={!name || !path || loading} onClick={createVault}>
            {loading ? "Creating..." : "Create Vault"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
