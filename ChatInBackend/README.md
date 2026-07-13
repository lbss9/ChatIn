# ChatIn Backend

API NestJS com MongoDB Atlas, JWT de acesso/refresh e recuperação de senha. O projeto usa **Clean Architecture com portas e adapters da Arquitetura Hexagonal**, organizado por módulos de negócio.

## Arquitetura

```text
src/
├── config/                         # validação das variáveis de ambiente
├── modules/
│   ├── auth/
│   │   ├── application/
│   │   │   ├── ports/              # contratos para JWT, hash e e-mail
│   │   │   ├── services/           # serviços de aplicação compartilhados
│   │   │   └── use-cases/          # login, registro, refresh e recuperação
│   │   ├── infrastructure/         # adapters bcrypt, JWT e SMTP
│   │   └── presentation/           # controller e DTOs HTTP
│   ├── users/
│   │   ├── domain/                 # entidade e porta do repositório
│   │   └── infrastructure/         # schema, mapper e repository Mongoose
│   ├── chat/                       # gateway WebSocket do chat
│   └── health/                     # health check do MongoDB com Terminus
└── shared/
    ├── domain/                     # erros independentes de HTTP
    ├── infrastructure/             # adapters compartilhados, como Socket.IO
    └── presentation/               # tradução de erros para respostas HTTP
```

Direção das dependências:

```text
Presentation → Application → Domain
Infrastructure → Application / Domain
Domain → nenhuma tecnologia externa
```

O domínio não importa NestJS, Mongoose, JWT, bcrypt ou Nodemailer. O `AuthModule` funciona como composition root e associa cada porta ao adapter concreto.

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d
npm run start:dev
```

O Compose inicia somente o MongoDB em `localhost:27018`, mantendo a API em execução local pelo npm. Em desenvolvimento, a API usa `http://localhost:3003`, a documentação Swagger fica em `http://localhost:3003/docs`, o health check em `http://localhost:3003/api/health`, e o WebSocket do chat usa Socket.IO no namespace `/chat`.

Comandos úteis:

```powershell
docker compose ps
docker compose logs -f mongodb
docker compose down
```

O volume `chatin_mongodb_data` preserva os usuários ao reiniciar ou remover o container. Use `docker compose down -v` somente quando quiser apagar todos os dados locais.

## Qualidade

```powershell
npm run build
npm test
npm run test:cov
```

As variáveis obrigatórias são verificadas antes da aplicação iniciar. Em produção há Helmet, CORS restrito, rate limiting global, logs JSON, shutdown hooks e health check real do MongoDB. O `render.yaml` e o `Dockerfile` são autocontidos.
