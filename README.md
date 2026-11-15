# OTO — Olympia Tourist System: Módulo de Pesquisas

Projeto desenvolvido na disciplina de **Projeto e Desenvolvimento de Sistemas de Informação**.

**Equipe:** Alessandro · João Prado · Ligia Keiko · Miguel Saffioti · Nayara · Yuri Faria

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + **TypeScript** |
| Backend | Node.js + Express.js + **TypeScript** + **Prisma ORM** |
| Banco de dados | PostgreSQL 16 |
| Infra local | Docker + Docker Compose |

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (inclui Docker Compose)
- [Node.js 20+](https://nodejs.org/) (para desenvolvimento local sem Docker)

---

## Subindo o ambiente completo (Docker)

```bash
# 1. Clone o repositório
git clone <url-do-repo>
cd Projeto-de-SI

# 2. Suba todos os serviços
docker compose up --build
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:3001 |
| Health check | http://localhost:3001/health |
| PostgreSQL | localhost:5432 (usuário: `oto_user`, senha: `oto_pass`, db: `oto`) |

> O banco é inicializado automaticamente com o schema em `database/schema.sql`.

Para parar:
```bash
docker compose down
```

Para parar e apagar os dados do banco:
```bash
docker compose down -v
```

---

## Desenvolvimento local (sem Docker)

### Backend

```bash
cd backend
cp .env.example .env     # ajuste DATABASE_URL se necessário
npm install
npm run db:push          # aplica o schema Prisma no banco
npm run dev              # inicia com tsx --watch, hot-reload
```

#### Comandos Prisma úteis

```bash
npm run db:push      # aplica prisma/schema.prisma no banco (dev)
npm run db:migrate   # cria e aplica uma migration versionada
npm run db:studio    # abre o Prisma Studio (UI do banco)
npm run db:generate  # regenera o Prisma Client
```

### Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

> O banco ainda precisa do Docker (ou PostgreSQL instalado localmente).  
> Para subir só o banco via Docker: `docker compose up db`

---

## Estrutura do projeto

```
Projeto-de-SI/
├── backend/                    # API Express.js + TypeScript + Prisma
│   ├── prisma/
│   │   └── schema.prisma       # fonte de verdade do banco (todos os modelos OTO)
│   ├── src/
│   │   ├── index.ts            # entry point, middlewares, rotas
│   │   └── lib/
│   │       └── prisma.ts       # singleton do PrismaClient
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── package.json
├── frontend/                   # App React + TypeScript (Vite)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   └── Dockerfile
├── database/
│   └── schema.sql              # schema SQL de referência (Prisma é o ativo)
├── docker-compose.yml
└── README.md
```

---

## Variáveis de ambiente

### Backend (`.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta da API |
| `DATABASE_URL` | `postgresql://oto_user:oto_pass@localhost:5432/oto` | String de conexão (Prisma) |

### Frontend

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | URL base da API |

---

## Documentação

- [Documento de Casos de Uso (OTO)](docs/) — 12 casos de uso, UC01–UC12
- [Schema do banco](database/schema.sql) — PostgreSQL, baseado no Documento de Requisitos validado
