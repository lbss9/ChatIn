<div align="center">

  # ChatIn

  **Chat em tempo real com uma interface dark, moderna e pronta para portfólio.**

  Autenticação completa, conversas persistidas, WebSocket, perfil editável, badges, marcações e deploy com **Next.js**, **NestJS**, **MongoDB Atlas**, **Render** e **GitHub Pages**.

  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-111111?style=for-the-badge&logo=nextdotjs&logoColor=white" />
    <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=111111" />
    <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-e0234e?style=for-the-badge&logo=nestjs&logoColor=white" />
    <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB_Atlas-8-47a248?style=for-the-badge&logo=mongodb&logoColor=white" />
    <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white" />
  </p>

  <p>
    <a href="#-sobre-o-projeto">Sobre</a> ·
    <a href="#-recursos">Recursos</a> ·
    <a href="#-arquitetura">Arquitetura</a> ·
    <a href="#-começando">Começando</a> ·
    <a href="#-produção">Produção</a>
  </p>
</div>

---

## ✨ Sobre o projeto

O **ChatIn** é uma aplicação full stack de mensagens em tempo real criada para demonstrar uma experiência de chat com qualidade de produto: visual escuro, layout inspirado em apps modernos de comunicação, autenticação, perfil rico, mensagens persistidas e comunicação instantânea via WebSocket.

O projeto não é um monorepo. O frontend e o backend vivem em pastas separadas para manter responsabilidades, scripts, dependências e deploys independentes.

```text
ChatIn/
├── ChatInBackend/       # API NestJS, MongoDB Atlas, WebSocket e Docker
├── ChatInFrontend/      # Next.js estático para GitHub Pages
├── .github/workflows/   # Deploy do frontend com GitHub Actions
├── render.yaml          # Blueprint raiz do backend no Render
└── README.md
```

## 💬 Recursos

- Cadastro, login, refresh token, recuperação e redefinição de senha.
- Registro com nome completo, apelido, e-mail e senha.
- Chat em tempo real com **Socket.IO/WebSocket**.
- Conversas diretas e grupos.
- Persistência das mensagens no MongoDB.
- Histórico de conversas e mensagens.
- Criação de novos contatos.
- Nova conversa apenas com contatos que já possuem conversa anterior.
- Modal de criação de grupo.
- Perfil editável com:
  - nome completo;
  - apelido;
  - bio;
  - avatar;
  - capa do perfil;
  - reposicionamento visual da capa;
  - badges;
  - alteração de senha;
  - fluxo separado para e-mail;
  - logout;
  - exclusão de conta.
- Badges persistidas no usuário e renderizadas como ícones com tooltip.
- Marcações personalizadas com cor, emoji ou imagem.
- Upload local para assets de perfil/marcações.
- Emoji picker próprio, leve e otimizado para evitar bibliotecas pesadas.
- Menus contextuais customizados.
- Loading skeletons para melhorar percepção de velocidade.
- Healthcheck de produção com verificação do MongoDB.
- Deploy backend no Render.
- Deploy frontend preparado para GitHub Pages.

## 🧭 Rotas principais

### Frontend

| Rota | Acesso | Descrição |
|---|---|---|
| `/` | Pública | Landing page / entrada do produto |
| `/login` | Pública | Login do usuário |
| `/register` | Pública | Criação de conta |
| `/recover-password` | Pública | Solicitação de recuperação de senha |
| `/reset-password` | Pública | Redefinição de senha |
| `/chat` | Protegida | Experiência principal do chat |

### Backend

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/api/auth/register` | Cria usuário e emite sessão |
| `POST` | `/api/auth/login` | Autentica usuário |
| `POST` | `/api/auth/refresh` | Rotaciona refresh token |
| `POST` | `/api/auth/recover-password` | Inicia recuperação de senha |
| `POST` | `/api/auth/reset-password` | Redefine senha |
| `GET` | `/api/health` | Verifica API e MongoDB |
| `GET` | `/api/conversations` | Lista conversas do usuário |
| `POST` | `/api/conversations/direct` | Abre conversa direta |
| `POST` | `/api/conversations/groups` | Cria grupo |
| `GET` | `/api/conversations/:id/messages` | Lista histórico de mensagens |
| `GET/POST/PATCH/DELETE` | `/api/tags` | Gerencia marcações |
| `POST` | `/api/uploads/*` | Uploads autenticados |

## 🧩 Arquitetura

### Backend

O backend usa **NestJS** com uma divisão inspirada em **Clean Architecture** e **Arquitetura Hexagonal**. A regra de negócio fica longe de detalhes de framework, banco e transporte.

```text
ChatInBackend/src/
├── config/                       # validação e leitura de ambiente
├── modules/
│   ├── auth/
│   │   ├── application/          # casos de uso, portas e serviços
│   │   ├── infrastructure/       # JWT, bcrypt, mail e guards
│   │   └── presentation/         # controllers e DTOs
│   ├── chat/
│   │   ├── application/          # envio/listagem/criação de conversas
│   │   ├── domain/               # entidades e contratos
│   │   ├── infrastructure/       # repositórios Mongoose
│   │   └── presentation/         # controllers, gateway e DTOs
│   ├── health/                   # healthcheck
│   ├── tags/                     # marcações do usuário
│   ├── uploads/                  # armazenamento local
│   └── users/                    # usuário, perfil e persistência
└── shared/                       # erros, filtros, storage e websocket
```

Princípios adotados:

- Casos de uso independentes de controller.
- Repositórios declarados como portas do domínio.
- Mongoose isolado na infraestrutura.
- DTOs apenas na borda HTTP/WebSocket.
- Guards e validações centralizados.
- Configuração por env validada na inicialização.
- Healthcheck real do MongoDB para produção.

### Frontend

O frontend usa **Next.js App Router** com organização por feature. Componentes compartilhados ficam em `shared`, enquanto fluxos de negócio ficam em `features`.

```text
ChatInFrontend/src/
├── app/                         # rotas Next.js
├── features/
│   ├── auth/                    # login, registro e senha
│   ├── chat/                    # tela principal do chat
│   ├── landing/                 # apresentação inicial
│   ├── profile/                 # modal e edição de perfil
│   └── tags/                    # criação/edição de marcações
└── shared/
    ├── components/              # emoji picker, context menu e UI base
    ├── hooks/                   # hooks reutilizáveis
    └── styles/                  # estilos globais
```

Princípios adotados:

- Componentes por responsabilidade visual.
- Hooks para comportamentos reutilizáveis.
- Estado local próximo da interface que o consome.
- Emoji picker próprio para reduzir peso e melhorar performance.
- CSS focado em microinterações, responsividade e visual dark.
- Consumo da API por clients dedicados em cada feature.

## 🚀 Começando

### Requisitos

- Node.js 24 ou superior
- npm 11 ou superior
- Docker Desktop
- MongoDB Atlas CLI
- Render CLI

### 1. Clonar e instalar

```bash
git clone https://github.com/lbss9/ChatIn.git
cd ChatIn

cd ChatInBackend
npm install

cd ../ChatInFrontend
npm install
```

### 2. Subir MongoDB local com Docker

```bash
cd ChatInBackend
docker compose up -d
```

### 3. Configurar ambientes

Backend:

```bash
cd ChatInBackend
Copy-Item .env.example .env
```

Frontend:

```bash
cd ChatInFrontend
Copy-Item .env.example .env.local
```

Valores locais recomendados:

```env
NEXT_PUBLIC_API_URL=http://localhost:3003/api
NEXT_PUBLIC_WS_URL=http://localhost:3003/chat
```

### 4. Rodar em desenvolvimento

Terminal 1:

```bash
cd ChatInBackend
npm run start:dev
```

Terminal 2:

```bash
cd ChatInFrontend
npm run dev
```

Abra:

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3003/api](http://localhost:3003/api)
- Healthcheck: [http://localhost:3003/api/health](http://localhost:3003/api/health)

## 🔌 WebSocket

O chat usa **Socket.IO** no namespace `/chat`.

Eventos principais:

| Evento | Direção | Descrição |
|---|---|---|
| `chat:join` | client → server | Entra em uma conversa |
| `chat:leave` | client → server | Sai de uma conversa |
| `chat:message` | client → server | Envia mensagem |
| `chat:message:new` | server → client | Notifica nova mensagem |
| `chat:ping` | client → server | Teste de conexão |

Em produção, o frontend usa:

```env
NEXT_PUBLIC_WS_URL=https://chatin-api.onrender.com/chat
```

## 🌍 Produção

### MongoDB Atlas

Configuração criada via Atlas CLI:

- Projeto: `ChatIn`
- Cluster: `ChatInCluster`
- Database: `chatin`
- Usuário da aplicação: `chatin_app`

O backend recebe a connection string por:

```env
MONGODB_URI=mongodb+srv://...
```

### Render

O backend está preparado com Docker e blueprint:

- [`render.yaml`](render.yaml)
- [`ChatInBackend/Dockerfile`](ChatInBackend/Dockerfile)
- [`ChatInBackend/render.yaml`](ChatInBackend/render.yaml)

Serviço criado:

```text
https://chatin-api.onrender.com
```

Healthcheck:

```text
https://chatin-api.onrender.com/api/health
```

Env vars importantes no Render:

| Nome | Uso |
|---|---|
| `NODE_ENV` | Ambiente da aplicação |
| `PORT` | Porta usada pelo Render |
| `MONGODB_URI` | Connection string do Atlas |
| `WEB_ORIGIN` | Origem pública do frontend |
| `WEBSOCKET_ORIGIN` | Origem liberada para Socket.IO |
| `APP_URL` | URL pública da API |
| `JWT_ACCESS_SECRET` | Assinatura do access token |
| `JWT_REFRESH_SECRET` | Assinatura do refresh token |
| `SMTP_HOST` | Host SMTP |
| `SMTP_USER` | Usuário SMTP |
| `SMTP_PASS` | Senha SMTP |
| `MAIL_FROM` | Remetente dos e-mails |

### GitHub Pages

O frontend está preparado para deploy estático com GitHub Actions:

- [`.github/workflows/deploy-github-pages.yml`](.github/workflows/deploy-github-pages.yml)

Variáveis configuradas no repositório:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://chatin-api.onrender.com/api` |
| `NEXT_PUBLIC_WS_URL` | `https://chatin-api.onrender.com/chat` |

> Observação: para publicar via GitHub Pages, o repositório precisa ter Pages habilitado. Em repositórios privados, isso depende do plano/conta do GitHub.

## 🔐 Segurança

- Senhas com hash usando `bcrypt`.
- JWT access token e refresh token separados.
- Refresh token rotacionado.
- Recuperação de senha sem revelar se o e-mail existe.
- Helmet habilitado no backend.
- Throttling global para reduzir abuso.
- Guards para rotas protegidas.
- CORS e WebSocket origin configuráveis por ambiente.
- Validação de payloads com `class-validator`.
- Dados sensíveis fora do repositório.

## 🛠️ Scripts

### Backend

| Comando | Função |
|---|---|
| `npm run start:dev` | Inicia NestJS em watch mode |
| `npm run build` | Compila para produção |
| `npm run start` | Executa `dist/main` |
| `npm run lint` | Verifica TypeScript |
| `npm run test` | Executa testes |

### Frontend

| Comando | Função |
|---|---|
| `npm run dev` | Inicia Next.js local |
| `npm run build` | Gera build/export de produção |
| `npm run start` | Serve build Next.js |
| `npm run lint` | Executa ESLint |

Checklist antes de entregar uma mudança:

```bash
cd ChatInBackend
npm run build

cd ../ChatInFrontend
npm run build
```

## 🎨 Identidade visual

O ChatIn usa uma estética dark com painéis pretos, cartões arredondados, acento verde-limão, avatares marcantes, microinterações e modais com profundidade suave. A ideia visual é parecer um produto real de comunicação, não apenas uma tela demonstrativa.

## 📜 Licença e uso

Este projeto é público para fins de **portfólio, demonstração e revisão de código**.

Nenhuma permissão é concedida para copiar, modificar, distribuir, hospedar, comercializar ou criar trabalhos derivados sem autorização prévia e expressa do autor.

---

<div align="center">
  <strong>ChatIn</strong><br />
  <sub>Seu próximo chat começa aqui. ✦</sub>
</div>
