# OTO — Olympia Tourist System: Módulo de Pesquisas

Projeto desenvolvido na disciplina de **Projeto e Desenvolvimento de Sistemas de Informação**.

**Equipe:** Alessandro · João Prado · Ligia Keiko · Miguel Saffioti · Nayara · Yuri Faria

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express.js |
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
npm run dev              # inicia com nodemon, hot-reload
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
├── backend/              # API Express.js
│   ├── src/
│   │   ├── index.js      # entry point, middlewares, rotas
│   │   └── db.js         # pool de conexão com PostgreSQL
│   ├── Dockerfile
│   └── package.json
├── frontend/             # App React (Vite)
│   ├── src/
│   │   ├── main.jsx
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── Dockerfile
├── database/
│   └── schema.sql        # schema PostgreSQL completo (OTO)
├── docker-compose.yml
└── README.md
```

---

## Variáveis de ambiente

### Backend (`.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta da API |
| `DATABASE_URL` | `postgres://oto_user:oto_pass@localhost:5432/oto` | String de conexão |

### Frontend

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | URL base da API |

---

## Documentação

- [Documento de Casos de Uso (OTO)](docs/) — 12 casos de uso, UC01–UC12
- [Schema do banco](database/schema.sql) — PostgreSQL, baseado no Documento de Requisitos validado
