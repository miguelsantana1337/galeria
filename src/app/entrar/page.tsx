import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const {
    data: { user },
  } = await (await createSupabaseServerClient()).auth.getUser();
  if (user) redirect("/painel");
  const error = (await searchParams).erro;
  const settingsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
    {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      cache: "no-store",
    },
  );
  const authSettings = settingsResponse.ok
    ? await settingsResponse.json()
    : { external: {} };
  const socialProviders = (["google", "apple"] as const).filter((provider) =>
    Boolean(authSettings.external?.[provider]),
  );
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link className="brand" href="/">
          Minha Galeria<span className="brand-dot">.</span>
        </Link>
        <div>
          <span className="eyebrow">Área do fotógrafo</span>
          <h1>Suas galerias, em um só lugar.</h1>
          <p>
            Crie eventos, encontre pessoas e entregue fotografias com uma
            experiência feita para o celular.
          </p>
        </div>
        <small>
          Organização para você. Memórias fáceis para seus clientes.
        </small>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-heading">
          <span className="eyebrow">Acesso seguro</span>
          <h2>Comece por aqui.</h2>
          <p>Use sua conta preferida ou entre com e-mail e senha.</p>
        </div>
        <LoginForm
          socialProviders={[...socialProviders]}
          initialError={
            error
              ? "Não foi possível concluir o acesso social. Tente novamente."
              : ""
          }
        />
      </section>
    </main>
  );
}
