import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <main className="page"><header className="page-header"><span className="eyebrow">Área do fotógrafo</span><h1>Bem-vindo de volta.</h1><p className="lead" style={{ margin: 0 }}>Entre para criar eventos, enviar fotos e acompanhar as galerias.</p></header><section className="panel" style={{ maxWidth: 520 }}><LoginForm /></section></main>;
}
