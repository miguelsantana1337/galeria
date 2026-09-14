import Link from "next/link";
export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link className="brand" href="/">
        Minha Galeria<span className="brand-dot">.</span>
      </Link>
      <article>
        <span className="eyebrow">Privacidade e LGPD</span>
        <h1>Suas fotos, com escolhas claras.</h1>
        <p>
          A Minha Galeria disponibiliza fotografias de eventos por meio de um
          link privado fornecido pelo fotógrafo ou organizador. O reconhecimento
          facial é opcional: você pode explorar toda a galeria e filtrar pelo
          horário sem fornecer uma selfie.
        </p>
        <h2>Reconhecimento facial</h2>
        <p>
          Quando você escolhe a busca por selfie, a imagem é analisada no seu
          próprio aparelho. A selfie não é enviada nem armazenada. O
          consentimento registra apenas que a funcionalidade foi autorizada, sem
          guardar sua identidade ou imagem.
        </p>
        <h2>Fotos e prazo</h2>
        <p>
          As fotografias e os descritores associados permanecem disponíveis
          durante o prazo definido pelo responsável pelo evento. Ao final desse
          prazo, o evento, as fotos, os descritores e os arquivos de identidade
          visual são programados para exclusão automática.
        </p>
        <h2>Seus direitos</h2>
        <p>
          Para solicitar correção, acesso ou exclusão antecipada, entre em
          contato com o fotógrafo ou organizador responsável pelo link do
          evento. Ele é o responsável pelas imagens publicadas e pode excluir o
          evento pelo painel.
        </p>
        <h2>Segurança</h2>
        <p>
          As fotos ficam em armazenamento privado. As prévias e os downloads
          usam endereços temporários, e a galeria não é indexada por mecanismos
          de busca.
        </p>
        <small>Versão 1 · 14 de setembro de 2026</small>
      </article>
    </main>
  );
}
