"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PasswordResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setMessage("As senhas não são iguais.");
      return;
    }
    setLoading(true);
    setMessage("");
    const { error } = await createSupabaseBrowserClient().auth.updateUser({
      password,
    });
    if (error) {
      setMessage(
        "Este link expirou ou a senha não pôde ser alterada. Solicite uma nova recuperação.",
      );
      setLoading(false);
      return;
    }
    router.replace("/painel");
    router.refresh();
  }
  return (
    <form className="stack" onSubmit={submit}>
      <label className="field">
        <span>Nova senha</span>
        <input
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Repita a nova senha</span>
        <input
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      <button className="button" disabled={loading}>
        {loading ? "Salvando…" : "Salvar nova senha"}
      </button>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
