import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "@/state/app";

export default function Gatekeeper({ children }: any) {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasVault, setHasVault } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const config: any = await invoke("get_config");

      setHasVault(!!config?.last_opened);
      setLoading(false);
    }

    init();
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!hasVault && location.pathname !== "/onboard") {
      navigate("/onboard");
    }

    if (hasVault && location.pathname === "/onboard") {
      navigate("/");
    }
  }, [loading, hasVault, location.pathname]);

  if (loading) {
    return <div className="h-screen w-screen bg-black" />;
  }

  return children;
}
