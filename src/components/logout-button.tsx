"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/entrar");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="logout-button"
      onClick={() => void logout()}
      disabled={loading}
    >
      <LogOut size={16} />
      {loading ? "Saindo…" : "Sair"}
    </button>
  );
}
