import Link from "next/link";
import { Images, LockKeyhole } from "lucide-react";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Minha Galeria<span className="brand-dot">.</span>
        </Link>
        <Link href="/entrar">Área do fotógrafo</Link>
      </header>
      <section className="hero">
        <div className="hero-card">
          <span className="eyebrow">
            <Images size={15} /> Seus eventos, suas memórias
          </span>
          <h1>Encontre o seu momento.</h1>
          <p className="lead">
            Abra o link privado enviado pelo fotógrafo, explore todos os
            registros e encontre seus momentos pelo horário ou por uma selfie.
          </p>
          <Link className="button inline-button" href="/entrar">
            Sou fotógrafo
          </Link>
          <p className="privacy">
            <LockKeyhole size={15} /> Galerias privadas e reconhecimento facial
            opcional.
          </p>
        </div>
      </section>
    </main>
  );
}
