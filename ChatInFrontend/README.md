# ChatIn Frontend

Aplicação Next.js estática para GitHub Pages. Configure `NEXT_PUBLIC_API_URL` em `.env.local` para desenvolvimento e como variável `NEXT_PUBLIC_API_URL` no repositório GitHub para produção.

## Arquitetura

O frontend utiliza **Feature-Based Architecture**, seguindo o mesmo padrão do VirtualGameCard. O App Router fica responsável apenas pelas rotas e pela composição; interface, integração e regras pertencem à feature correspondente.

```text
src/
├── app/                         # rotas e composição do Next.js
├── features/
│   ├── auth/
│   │   ├── api/                 # integração com a API de autenticação
│   │   ├── components/          # componentes exclusivos de auth
│   │   └── pages/               # páginas da feature
│   └── landing/
│       └── pages/               # experiência pública inicial
└── shared/
    └── styles/                  # estilos globais e design system
```

Novas funcionalidades, como conversas, contatos e perfil, devem ser criadas em `features`. Apenas código usado por mais de uma feature deve ser promovido para `shared`.

```powershell
npm install
npm run dev
```

O workflow em `.github/workflows/deploy-github-pages.yml` publica o diretório `out` após cada push na `main`.
