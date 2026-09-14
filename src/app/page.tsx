import Link from "next/link";
import { Camera, LockKeyhole } from "lucide-react";

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
            <Camera size={15} /> Sua história, no seu rosto
          </span>
          <h1>Encontre o seu momento.</h1>
          <p className="lead">
            Abra o link privado enviado pelo fotógrafo e use uma selfie. Em
            poucos instantes, você vê apenas as fotos em que aparece.
          </p>
          <Link className="button inline-button" href="/entrar">
            Sou fotógrafo
          </Link>
          <p className="privacy">
            <LockKeyhole size={15} /> Sua selfie é analisada no seu aparelho e
            não fica armazenada.
          </p>
        </div>
      </section>
    </main>
  );
}
