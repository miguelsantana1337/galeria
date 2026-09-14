# Minha Galeria

Plataforma multi-evento white-label para explorar galerias, filtrar fotos pelo horário e usar reconhecimento facial opcional. O frontend roda na Vercel; autenticação, banco e fotos privadas usam Supabase.

## Arquitetura de privacidade

- A selfie é processada no navegador e não é enviada nem armazenada.
- O painel calcula os descritores das fotos uma vez durante o upload.
- As fotos ficam em bucket privado.
- A galeria privada recebe URLs temporárias para prévias otimizadas e downloads originais.

## Desenvolvimento

1. Crie um projeto Supabase e execute a migration em `supabase/migrations`.
2. Copie `.env.example` para `.env.local` e informe as três variáveis.
3. Instale dependências com `npm install`.
4. Rode `npm run dev`.

Os modelos do Human usados para detecção, malha e embedding ficam em `public/models`. O painel indexa os rostos no navegador durante o upload; a participante compara a selfie localmente e recebe URLs temporárias das fotos correspondentes.
