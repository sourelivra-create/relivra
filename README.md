# RELIVRA 📚

> Dê uma nova vida aos seus livros

Plataforma de economia circular de livros usados. Compre, venda e troque com IA que analisa e precifica automaticamente.

---

## Identidade visual

| Token | Valor | Uso |
|---|---|---|
| Verde Deep | `#2D6A4F` | Primário — CTAs, headers |
| Verde Mid | `#40916C` | Secundário — hover, gradientes |
| Verde Mint | `#74C69D` | Accent — destaques, "livra" do logo |
| Verde Pale | `#B7E4C7` | Badges e fundos suaves |
| Creme | `#F8F4ED` | Fundo base da aplicação |
| Grafite | `#1C1C1E` | Texto principal, fundos escuros |

Fontes: **Sora** (display/headings, peso 700–800) e **Inter** (corpo de texto), carregadas via `next/font/google`.

Logo: componente em `components/layout/Logo.tsx` — símbolo de ciclo (economia circular) + wordmark "Re**livra**" com "livra" sempre em verde mint. Nunca recriar o logo manualmente; sempre importar o componente.

---

## Stack

| Camada       | Tecnologia                         |
|--------------|------------------------------------|
| Frontend     | Next.js 14 (App Router)            |
| Backend      | Supabase (Auth + DB + Storage)     |
| Banco        | PostgreSQL via Supabase            |
| IA           | Anthropic Claude Vision            |
| Pagamento    | Mercado Pago                       |
| Deploy       | Netlify (via GitHub)               |
| CI           | GitHub Actions                     |

---

## Setup local

### 1. Clonar o repositório

```bash
git clone https://github.com/SEU_USUARIO/relivra.git
cd relivra
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas chaves:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
MERCADOPAGO_ACCESS_TOKEN=...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute o arquivo:

```
supabase/migrations/001_schema_inicial.sql
```

3. Copie as chaves em **Settings → API** para o `.env.local`

### 4. Rodar localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## Deploy (GitHub → Netlify)

### Passo 1 — Criar repositório no GitHub

```bash
git init
git add .
git commit -m "feat: setup inicial RELIVRA"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/relivra.git
git push -u origin main
```

### Passo 2 — Conectar Netlify ao GitHub

1. Acesse [app.netlify.com](https://app.netlify.com)
2. **Add new site → Import an existing project → GitHub**
3. Selecione o repositório `relivra`
4. Build settings (já estão no `netlify.toml`, mas confirme):
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Clique em **Deploy site**

### Passo 3 — Configurar variáveis no Netlify

Em **Site → Environment variables**, adicione todas as do `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
MERCADOPAGO_ACCESS_TOKEN
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
NEXT_PUBLIC_APP_URL  ← URL do seu site Netlify
```

### Passo 4 — Configurar GitHub Secrets (para CI)

Em **GitHub → Settings → Secrets and variables → Actions**, adicione as mesmas variáveis (exceto `NEXT_PUBLIC_APP_URL`).

### Passo 5 — Configurar URL do webhook do Mercado Pago

No painel do Mercado Pago, aponte as notificações para:

```
https://SEU_SITE.netlify.app/api/pagamento/webhook
```

### Passo 6 — Configurar URL permitida no Supabase Auth

Em **Supabase → Authentication → URL Configuration**:

```
Site URL: https://SEU_SITE.netlify.app
Redirect URLs: https://SEU_SITE.netlify.app/**
```

---

## Fluxo de desenvolvimento

```
feature/minha-feature  →  PR  →  CI (lint + build)  →  merge main  →  Netlify deploya
```

- Cada push na `main` gera deploy automático no Netlify
- PRs geram deploy de preview com URL única
- GitHub Actions valida lint e build antes do merge

---

## Estrutura de pastas

```
relivra/
├── app/
│   ├── (auth)/          # login, cadastro
│   ├── (main)/          # home, livro, vender, trocar, painel
│   └── api/             # ia/analisar, trocas, pagamento
├── components/
│   ├── layout/          # Header, Footer
│   └── livros/          # BookCard, FiltrosLivros
├── lib/
│   ├── supabase/        # client, server
│   ├── ia/              # analisar-livro.ts
│   └── preco/           # calcular.ts
├── types/
│   └── database.types.ts
└── supabase/
    └── migrations/
        └── 001_schema_inicial.sql
```

---

## Roadmap

- [x] Schema do banco com RLS
- [x] Auth com Supabase
- [x] Listagem e filtros de livros
- [x] Venda com análise por IA
- [x] Sistema de trocas
- [x] Pagamento Mercado Pago
- [x] Painel do usuário
- [ ] Notificações por email (Supabase Edge Functions)
- [ ] Chat entre comprador e vendedor
- [ ] Integração Mercado Envios
- [ ] App mobile (React Native / Expo)
