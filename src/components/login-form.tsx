"use client";

import { FormEvent, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=/painel` } });
    setMessage(error ? "Não foi possível enviar o link. Confira o e-mail e tente novamente." : "Link de acesso enviado. Confira sua caixa de entrada.");
    setLoading(false);
  }
  return <form className="stack" onSubmit={submit}><div className="field"><label htmlFor="email">Seu e-mail</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" /></div><button className="button" disabled={loading}>{loading ? "Enviando…" : "Enviar link de acesso"}</button>{message && <p className="notice">{message}</p>}</form>;
}
