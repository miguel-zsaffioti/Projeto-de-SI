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
npm run testar       # roteiro guiado de testes (com a API rodando); "npm run testar -- 4" roda só a parte 4
npm test             # testes unitários do cálculo dos indicadores (não precisa de banco nem API)
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

### Correção de resposta pelo administrador (UC08)

Exige login (`Authorization: Bearer <token>`). O admin corrige **um campo por vez**, mesmo com a pesquisa encerrada; cada alteração vai para o histórico com o admin, a data/hora e o valor anterior.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/respostas/:respostaId` | Resposta com estabelecimento e taxas por período |
| PATCH | `/api/respostas/:respostaId` | Corrige ou apaga um campo |
| GET | `/api/respostas/:respostaId/historico` | Alterações da resposta, a mais recente primeiro (estabelecimento e admin) |

Body do PATCH (um dos formatos):

```json
{ "campo": "taxaOcupacao", "periodoId": "1", "valor": 80 }
{ "campo": "taxaOcupacao", "periodoId": "1", "valor": null }
{ "campo": "preferenciaBoletim", "valor": "EMAIL" }
{ "campo": "emailConfirmacao", "valor": "gerente@hotel.com" }
```

A resposta traz `alterado` (`false` se o valor já era esse) e `indicadoresRecalculados`: se a pesquisa já tinha indicadores calculados, corrigir uma taxa recalcula na hora. A retificação pelo próprio estabelecimento continua pelo formulário (`POST /api/formulario/:token/resposta`) enquanto a pesquisa estiver aberta.

### Indicadores (UC09)

Exige login. Cada cálculo cria uma nova execução por período; as anteriores ficam guardadas.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/pesquisas/:pesquisaId/indicadores/calcular` | Calcula todos os períodos com os parâmetros ativos |
| GET | `/api/pesquisas/:pesquisaId/indicadores` | Último cálculo de cada período (`status: null` se ainda não calculou) |

Cada período traz `status` (`CONCLUIDO` ou `FALHOU` quando ninguém respondeu aquele período), `mensagem` (ex.: RevPAR pendente por falta de diária média) e a lista `indicadores` com `{ codigo, dimensao, valor, unidade }`:

| Código | Dimensão | O que é |
|---|---|---|
| `TAXA_OCUPACAO_PONDERADA` | TOTAL | Σ(taxa × UH) / Σ UH dos respondentes |
| `TURISTAS_RESPONDENTES`, `TURISTAS_NAO_RESPONDENTES`, `TURISTAS_MEIOS_REGULARES` | TOTAL | Leitos médios × taxa × diárias |
| `TURISTAS_RHC` | TOTAL | Leitos médios do RHC × taxa ponderada × diárias |
| `TURISTAS_DAY_USE`, `TURISTAS_DAY_USE_POR_DIA` | TOTAL | Hospedados por dia / (1 − % day use) − hospedados por dia |
| `TURISTAS_TOTAL`, `TURISTAS_POR_DIA` | TOTAL | Regulares + RHC + day use |
| `COBERTURA_ESTABELECIMENTOS`, `COBERTURA_LEITOS` | TOTAL | % de respondentes |
| `ESTABELECIMENTOS_RESPONDENTES`, `LEITOS_RESPONDENTES` | TOTAL | Base da cobertura |
| `ESTABELECIMENTOS_POR_FAIXA` | EXCELENTE, OTIMA, BOA, REGULAR, RUIM | Faixas 81–100, 61–80, 41–60, 21–40, 0–20 |
| `TAXA_OCUPACAO_POR_TIPO` | HOTEL, RESORT, POUSADA, GERAL | Taxa ponderada só daquele tipo (sem respondentes do tipo, usa a geral) |
| `REVPAR_ARITMETICA`, `REVPAR_PONDERADA` | HOTEL, RESORT, POUSADA, GERAL | Diária média × taxa do tipo |
| `RECEITA_ESTIMADA_ARITMETICA`, `RECEITA_ESTIMADA_PONDERADA` | HOTEL, RESORT, POUSADA, GERAL | RevPAR × UH do tipo no inventário × diárias |

Diárias do período = dias de início a fim, contando os dois (outubro = 31, 31/10 a 02/11 = 3).

| Status | Código | Quando |
|---|---|---|
| 404 | `PESQUISA_NAO_ENCONTRADA` | Pesquisa não existe |
| 422 | `SEM_RESPOSTAS` | Ninguém respondeu a pesquisa ainda |
| 422 | `PARAMETROS_AUSENTES` / `RHC_AUSENTE` / `INVENTARIO_INCOMPLETO` | Falta dado de base para o cálculo |

O cálculo fica em `backend/src/modules/indicadores/calculo.ts` (sem banco), conferido por `npm test` contra a planilha de conferência em `backend/tests/planilha-oto.ts`.

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
│   │   │   ├── formulario/     # formulário de resposta por link único
│   │   │   ├── indicadores/    # cálculo dos indicadores (calculo.ts) e rotas
│   │   │   └── respostas/      # correção pelo admin e histórico
│   │   └── lib/
│   │       ├── prisma.ts       # singleton do PrismaClient
│   │       └── token.ts        # geração e hash dos tokens dos links
│   ├── tests/                  # testes unitários e planilha de conferência
│   ├── scripts/                # roteiro guiado de testes (npm run testar)
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
| `ADMIN_EMAIL` / `ADMIN_SENHA` / `ADMIN_NOME` | `admin@oto.local` / `Admin@123` | Admin criado pelo seed |

### Frontend

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | URL base da API |

---

## Documentação

- [Documento de Casos de Uso (OTO)](docs/) — 12 casos de uso, UC01–UC12
- [Schema do banco](database/schema.sql) — PostgreSQL, baseado no Documento de Requisitos validado
