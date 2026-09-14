import { PasswordResetForm } from "@/components/password-reset-form";
import Link from "next/link";

export default function PasswordResetPage() {
  return (
    <main className="auth-reset-page">
      <Link className="brand" href="/">
        Minha Galeria<span className="brand-dot">.</span>
      </Link>
      <section className="panel auth-reset-card">
        <span className="eyebrow">Recuperação de acesso</span>
        <h1>Crie uma nova senha.</h1>
        <p className="muted">
          Use pelo menos oito caracteres e não reutilize senhas de outros
          serviços.
        </p>
        <PasswordResetForm />
      </section>
    </main>
  );
}
