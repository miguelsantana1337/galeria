# Auditoria de produto — Minha Galeria

Data: 14 de setembro de 2026  
Superfície: produção em `galeria-pi-weld.vercel.app`  
Fluxos observados: entrada da participante, galeria do evento e busca por selfie. O painel autenticado foi analisado pela implementação e pelo estado real do evento; a auditoria visual não percorreu novamente o login por e-mail.

## Veredito

A base visual é forte, simples e com personalidade. O caminho principal cabe no primeiro viewport mobile e não apresenta rolagem horizontal. A prioridade seguinte não é decoração: é fortalecer privacidade, confiabilidade de upload e clareza operacional.

## Etapas

1. Entrada da participante — saudável, com uma ação principal clara. A busca por nome ainda é uma etapa desnecessária quando o fotógrafo já pode compartilhar o link direto.
2. Página do evento — saudável, rápida e coerente com a marca. A promessa de privacidade precisa explicar melhor o que é processado e o que o evento armazena.
3. Envio da selfie — visualmente saudável e com CTA visível no primeiro viewport mobile. Falta consentimento explícito e orientação visual de uma boa selfie.
4. Resultado — não validado visualmente com uma selfie real nesta auditoria. O fallback de baixa confiança pode expor pessoas erradas e deve ser removido antes de escalar.
5. Painel e upload — operacional, mas frágil para lotes grandes: processamento sequencial, sem retomada, sem miniaturas e com mensagens técnicas quando há falha.

## Prioridades

### P0 — antes de novos clientes

- Não mostrar fotos sugeridas quando não houver correspondência forte.
- Proteger cada galeria com token aleatório no link, separado do nome legível.
- Rever a entrega pública dos embeddings faciais e retirar cache público desses dados.
- Adicionar consentimento de reconhecimento facial, política de retenção e exclusão completa do evento.

### P1 — experiência profissional

- Upload retomável, processamento paralelo controlado e botão para repetir apenas falhas.
- Miniaturas, contagem de fotos sem rosto e revisão antes de publicar.
- Estado de preparação: enviando, analisando, pronto para revisar e publicado.
- Tela final com baixar todas, compartilhar e tentar outra selfie.
- Personalização por evento: capa, mensagem, logo e cor do cliente.

### P2 — produto escalável

- Métricas de visitas, selfies processadas, matches e downloads sem guardar selfie.
- Expiração automática da galeria e eliminação confirmada de fotos e embeddings.
- Domínio próprio, e-mail transacional e remetente profissional.
- Testes automatizados de RLS, criação, publicação, upload e busca.
- Limites por plano/conta, convite de equipe e trilha de auditoria.

## Acessibilidade

- Pontos positivos: estrutura semântica básica, labels presentes, CTA grande, foco nativo e respeito a movimento reduzido.
- A verificar: contraste de textos secundários em telas de baixa qualidade, anúncio de progresso por leitor de tela, foco depois de erros e resultados, navegação integral por teclado e zoom a 200%.

## Evidência e limites

Foram observadas as telas de entrada e busca em produção, inclusive em viewport de 390 × 844. O CTA da selfie termina em 413 px, não há overflow horizontal e o título permanece no primeiro viewport. O resultado com match real não foi capturado porque exigiria transmitir uma selfie pessoal durante a auditoria.
