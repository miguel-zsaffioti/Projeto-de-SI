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
npm run db:seed          # popula admin, inventário, RHC e parâmetros
npm run dev              # inicia com tsx --watch, hot-reload
```

#### Comandos Prisma úteis

```bash
npm run db:push      # aplica prisma/schema.prisma no banco (dev)
npm run db:migrate   # cria e aplica uma migration versionada
npm run db:studio    # abre o Prisma Studio (UI do banco)
npm run db:generate  # regenera o Prisma Client
npm run db:seed      # dados iniciais (pode rodar várias vezes sem duplicar)
npm run db:seed:demo # cria uma pesquisa de teste e imprime os links únicos
npm run testar       # roteiro guiado de testes (com a API rodando); "npm run testar -- 2" roda só a parte 2
```

Com Docker, rode o seed dentro do container: `docker compose exec backend npm run db:seed`.

#### Dados do seed

| Dado | Conteúdo |
|---|---|
| Administrador | `admin@oto.local` / `Admin@123` (mude com `ADMIN_EMAIL`, `ADMIN_SENHA`, `ADMIN_NOME`) |
| Inventário | 13 meios de hospedagem fictícios (resorts, hotéis, pousadas, flat, hostel) com e-mail e WhatsApp |
| RHC | 850 UH, 2 a 4 leitos por UH |
| Parâmetros | day use 15,15% e diária média de exemplo por tipo (aritmética e ponderada) |

---

## API

Erros sempre seguem o formato `{ "erro": "mensagem", "codigo": "CODIGO", "campos": [{ "campo", "mensagem" }] }`.  
IDs são devolvidos como texto (`"1"`).

### Login do administrador (UC01)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Body `{ "email", "senha" }` → `{ token, administrador }` |
| GET | `/api/auth/me` | Header `Authorization: Bearer <token>` → dados do admin logado |

Credenciais erradas retornam `401 CREDENCIAIS_INVALIDAS` com mensagem genérica. Rotas protegidas sem token válido retornam `401 NAO_AUTENTICADO` (o front deve redirecionar para o login).

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oto.local","senha":"Admin@123"}'
```

### Pesquisas e links únicos (UC02 / UC03)

Rotas do administrador: exigem `Authorization: Bearer <token>` (sem token válido: `401 NAO_AUTENTICADO`).

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/pesquisas` | Cria a pesquisa e gera um link único para cada meio de hospedagem ativo do inventário |
| GET | `/api/pesquisas` | Lista as pesquisas (mais recentes primeiro) com totais de períodos, convites e respondidos |
| GET | `/api/pesquisas/prazo-sugerido` | Prazo padrão de 5 dias úteis a partir de agora, para pré-preencher a tela |

Body do `POST /api/pesquisas`:

```json
{
  "tipo": "CONSOLIDADA",
  "periodos": [
    { "nome": "Outubro/2026", "dataInicio": "2026-10-01", "dataFim": "2026-10-31", "tipoDado": "REALIZADO" },
    { "nome": "Finados 2026", "dataInicio": "2026-10-31", "dataFim": "2026-11-02", "tipoDado": "REALIZADO" }
  ],
  "prazoResposta": "2026-11-27"
}
```

- `tipo`: `CONSOLIDADA` ou `EXPECTATIVA`. `tipoDado` de cada período: `REALIZADO` ou `ESPERADO`.
- Datas no formato `AAAA-MM-DD`; a data de fim pode ser igual à de início, mas não anterior. Não pode repetir o mesmo período na pesquisa.
- `tipo` e `tipoDado` precisam combinar: `CONSOLIDADA` aceita só períodos `REALIZADO`, e `EXPECTATIVA` só `ESPERADO` (senão, `400` apontando `periodos.N.tipoDado`).
- `prazoResposta` é opcional: sem ele, vale 5 dias úteis após a abertura (hoje só sábado e domingo são dias não úteis; a regra está isolada em `backend/src/lib/diasUteis.ts`, onde dá para incluir feriados). Aceita `AAAA-MM-DD` (vale até 23:59:59 de Brasília desse dia) ou data e hora ISO, e precisa ser futuro.
- Períodos que já existem (mesmo nome, datas e tipo de dado) são reaproveitados.

Resposta `201`: `pesquisa` (com `periodos` e `ordemExibicao`), `totalConvites` e `convites[]` com `id`, `status` (`PENDENTE`), `estabelecimento` e `link` (`<BASE_URL>/responder/<token>`).

**Como o link é formado:** o token é um HMAC-SHA256 do par (id da pesquisa, id do estabelecimento) com o segredo `LINK_TOKEN_SECRET` (se não existir, usa o `JWT_SECRET`). O banco guarda só o hash do token (RNF03). Como o token é reproduzível, o reenvio (RN08) refaz o mesmo link com `gerarTokenConviteDeterministico(pesquisaId, estabelecimentoId, env.linkTokenSecret)` e `<BASE_URL>/responder/<token>`, sem gerar link novo. Cada convite é único por pesquisa e estabelecimento.

> **Atenção ao segredo:** trocar `LINK_TOKEN_SECRET` (ou o `JWT_SECRET`, se for ele o usado) invalida os links das pesquisas já criadas. Use um segredo próprio e não o troque durante uma pesquisa aberta.

| Status | Código | Quando |
|---|---|---|
| 400 | `DADOS_INVALIDOS` | Tipo ausente/inválido, sem períodos, tipo de dado incompatível com o tipo da pesquisa, data inválida ou fim antes do início, período repetido, prazo inválido ou no passado |
| 401 | `NAO_AUTENTICADO` | Sem token ou token expirado |
| 422 | `INVENTARIO_VAZIO` | Não há meio de hospedagem ativo no inventário |

### Formulário de resposta (UC04 / UC05)

Público, sem login. O `token` é a parte final do link único (`/responder/<token>`).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/formulario/:token` | Nome fantasia, períodos da pesquisa e a resposta anterior (ou `null`) |
| POST | `/api/formulario/:token/resposta` | Envia a resposta; se já existir, retifica e grava o histórico |

Body do POST:

```json
{
  "ocupacoes": [
    { "periodoId": "1", "taxaOcupacao": 72.5 },
    { "periodoId": "2", "taxaOcupacao": 95 }
  ],
  "preferenciaBoletim": "EMAIL",
  "emailConfirmacao": "gerente@hotel.com"
}
```

- `preferenciaBoletim`: `NAO_QUERO`, `WHATSAPP`, `EMAIL` ou `OUTRO`. `emailConfirmacao` é obrigatório só com `EMAIL`.
- Uma taxa de 0 a 100 é obrigatória para cada período da pesquisa.
- `201` na primeira resposta, `200` na retificação (`retificada: true`, `camposAlterados`).

| Status | Código | Quando |
|---|---|---|
| 400 | `DADOS_INVALIDOS` | Taxa vazia/fora de 0–100, período faltando ou de outra pesquisa, e-mail ausente |
| 404 | `LINK_INVALIDO` | Token não existe |
| 410 | `PESQUISA_ENCERRADA` | Pesquisa fechada ou prazo vencido |

Para testar: `npm run db:seed:demo` imprime um link por estabelecimento; use o token no GET/POST.

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
│   ├── prisma/dados/           # inventário, RHC e parâmetros usados no seed
│   ├── prisma/seed.ts          # npm run db:seed
│   ├── src/
│   │   ├── index.ts            # sobe o servidor
│   │   ├── app.ts              # middlewares e rotas
│   │   ├── config/             # variáveis de ambiente
│   │   ├── errors/             # ErroHttp
│   │   ├── middlewares/        # autenticação do admin e tratamento de erros
│   │   ├── modules/
│   │   │   ├── auth/           # login do administrador
│   │   │   ├── pesquisas/      # criar pesquisa e gerar links únicos
│   │   │   └── formulario/     # formulário de resposta por link único
│   │   └── lib/
│   │       ├── prisma.ts       # singleton do PrismaClient
│   │       ├── diasUteis.ts    # regra de dias úteis (ponto único para incluir feriados)
│   │       ├── prazo.ts        # prazo padrão de 5 dias úteis (horário de Brasília)
│   │       └── token.ts        # geração e hash dos tokens dos links
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
| `JWT_SECRET` | — (obrigatória) | Segredo para assinar o token de login |
| `JWT_EXPIRES_IN` | `8h` | Validade do token de login |
| `LINK_TOKEN_SECRET` | usa o `JWT_SECRET` | Segredo que gera os links únicos dos convites (use um próprio) |
| `BASE_URL` | `http://localhost:5173` | Endereço do frontend, usado para montar os links únicos |
| `ADMIN_EMAIL` / `ADMIN_SENHA` / `ADMIN_NOME` | `admin@oto.local` / `Admin@123` | Admin criado pelo seed |

### Frontend

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | URL base da API |

---

## Documentação

- [Documento de Casos de Uso (OTO)](docs/) — 12 casos de uso, UC01–UC12
- [Schema do banco](database/schema.sql) — PostgreSQL, baseado no Documento de Requisitos validado
