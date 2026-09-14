import Link from "next/link";
import { Camera, LockKeyhole } from "lucide-react";
import { EventCodeForm } from "@/components/event-code-form";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">Fotos do Santana<span className="brand-dot">.</span></Link>
        <Link href="/entrar">Área do fotógrafo</Link>
      </header>
      <section className="hero">
        <div className="hero-card">
          <span className="eyebrow"><Camera size={15} /> Sua história, no seu rosto</span>
          <h1>Encontre o seu momento.</h1>
          <p className="lead">Digite o código do evento e envie uma selfie. Em poucos instantes, você vê apenas as fotos em que aparece.</p>
          <EventCodeForm />
          <p className="privacy"><LockKeyhole size={15} /> Sua selfie é analisada no seu aparelho e não fica armazenada.</p>
        </div>
      </section>
    </main>
  );
}
