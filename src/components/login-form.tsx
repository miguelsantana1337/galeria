"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type Provider = "google" | "apple";

export function LoginForm({
  initialError = "",
  socialProviders = [],
}: {
  initialError?: string;
  socialProviders?: Provider[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(initialError);
  const [error, setError] = useState(Boolean(initialError));
  const [loading, setLoading] = useState<string | null>(null);

  function feedback(text: string, isError = false) {
    setMessage(text);
    setError(isError);
  }
  function changeMode(next: Mode) {
    setMode(next);
    feedback("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(mode);
    feedback("");
    const supabase = createSupabaseBrowserClient();
    if (mode === "signin") {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        feedback(
          authError.message.toLowerCase().includes("email not confirmed")
            ? "Confirme seu e-mail antes de entrar. Confira também a caixa de spam."
            : "E-mail ou senha incorretos. Confira os dados ou redefina sua senha.",
          true,
        );
        setLoading(null);
        return;
      }
      router.replace("/painel");
      router.refresh();
      return;
    }
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/painel`,
        data: { full_name: name.trim() },
      },
    });
    if (authError)
      feedback(
        authError.message.toLowerCase().includes("already")
          ? "Este e-mail já possui uma conta. Entre ou redefina sua senha."
          : "Não foi possível criar a conta. Confira os dados e tente novamente.",
        true,
      );
    else if (data.session) {
      router.replace("/painel");
      router.refresh();
      return;
    } else
      feedback(
        "Conta criada. Enviamos um e-mail de confirmação para liberar seu acesso.",
      );
    setLoading(null);
  }
  async function socialLogin(provider: Provider) {
    setLoading(provider);
    feedback("");
    const { error: authError } =
      await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/painel`,
        },
      });
    if (authError) {
      feedback(
        `Não foi possível entrar com ${provider === "google" ? "Google" : "Apple"}. Tente novamente ou use e-mail e senha.`,
        true,
      );
      setLoading(null);
    }
  }
  async function resetPassword() {
    if (!email.trim()) {
      feedback("Digite seu e-mail para receber a recuperação de senha.", true);
      return;
    }
    setLoading("reset");
    const { error: resetError } =
      await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
    feedback(
      resetError
        ? "Não foi possível enviar a recuperação agora. Aguarde um minuto e tente novamente."
        : "Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.",
      Boolean(resetError),
    );
    setLoading(null);
  }
  return (
    <div className="auth-box">
      <div className="auth-tabs" role="tablist" aria-label="Acesso">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          onClick={() => changeMode("signin")}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => changeMode("signup")}
        >
          Criar conta
        </button>
      </div>
      <div className="social-auth">
        <button
          type="button"
          onClick={() => void socialLogin("google")}
          disabled={Boolean(loading) || !socialProviders.includes("google")}
          title={
            !socialProviders.includes("google")
              ? "Configuração do Google pendente"
              : undefined
          }
        >
          {loading === "google" ? (
            <LoaderCircle className="spin" size={20} />
          ) : (
            <GoogleMark />
          )}
          Continuar com Google
          {!socialProviders.includes("google") && (
            <small>Em configuração</small>
          )}
        </button>
        <button
          type="button"
          onClick={() => void socialLogin("apple")}
          disabled={Boolean(loading) || !socialProviders.includes("apple")}
          title={
            !socialProviders.includes("apple")
              ? "Configuração da Apple pendente"
              : undefined
          }
        >
          {loading === "apple" ? (
            <LoaderCircle className="spin" size={20} />
          ) : (
            <AppleMark />
          )}
          Continuar com Apple
          {!socialProviders.includes("apple") && <small>Em configuração</small>}
        </button>
      </div>
      <div className="auth-divider">
        <span>ou use seu e-mail</span>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" && (
          <label className="field">
            <span>Seu nome</span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Como podemos chamar você?"
            />
          </label>
        )}
        <label className="field auth-input">
          <span>E-mail</span>
          <div>
            <Mail size={18} />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
            />
          </div>
        </label>
        <label className="field auth-input">
          <span>Senha</span>
          <div>
            <LockKeyhole size={18} />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                mode === "signup" ? "Mínimo de 8 caracteres" : "Sua senha"
              }
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {mode === "signin" && (
          <button
            type="button"
            className="forgot-password"
            onClick={resetPassword}
          >
            Esqueci minha senha
          </button>
        )}
        <button className="button auth-submit" disabled={Boolean(loading)}>
          {loading === mode && <LoaderCircle className="spin" size={18} />}
          {mode === "signin" ? "Entrar na Minha Galeria" : "Criar minha conta"}
        </button>
      </form>
      {message && (
        <p
          className={error ? "auth-message error" : "auth-message"}
          role="status"
        >
          {message}
        </p>
      )}
      <p className="auth-terms">
        Ao continuar, você concorda com nossa{" "}
        <Link href="/privacidade">política de privacidade</Link>.
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.4H3A10 10 0 0 0 3 16.6l3.4-2.7Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7C7.2 7.7 9.4 5.9 12 5.9Z"
      />
    </svg>
  );
}
function AppleMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.1 12.6c0-2.8 2.3-4.1 2.4-4.2A5.1 5.1 0 0 0 15.4 6c-1.7-.2-3.4 1-4.3 1-.9 0-2.3-1-3.8-1-2 0-3.9 1.2-4.9 3-2.1 3.6-.5 9 1.5 11.9 1 1.4 2.1 3 3.7 2.9 1.5-.1 2.1-1 3.9-1s2.3 1 3.9 1c1.6 0 2.6-1.4 3.5-2.9a13 13 0 0 0 1.6-3.3 4.8 4.8 0 0 1-3.4-4.9ZM14.3 4.2A4.8 4.8 0 0 0 15.4.7a5 5 0 0 0-3.3 1.7A4.6 4.6 0 0 0 11 5.8a4.1 4.1 0 0 0 3.3-1.6Z" />
    </svg>
  );
}
