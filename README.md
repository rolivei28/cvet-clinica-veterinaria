# CVET — Clínica Veterinária

Sistema de gestão de internações para clínicas veterinárias. Projeto desenvolvido para a UNIVESP.

## Stack

- **Frontend:** Next.js 16, Tailwind CSS, TypeScript
- **Backend:** Hono, Prisma, PostgreSQL
- **Infra:** Docker Compose (local) · Render (produção)

## Getting Started

### Pré-requisitos

- [Node.js 22+](https://nodejs.org)
- [Docker](https://www.docker.com) e Docker Compose

---

### Rodando com Docker (recomendado)

```bash
# Clone o repositório
git clone https://github.com/rolivei28/cvet-clinica-veterinaria.git
cd cvet-clinica-veterinaria

# Baixe imagens, instale dependências dentro dos containers, construa e inicie os três serviços
docker compose up --build -d
```

| Serviço   | URL                     |
|-----------|-------------------------|
| Frontend  | http://localhost:3000   |
| API       | http://localhost:3001   |
| PostgreSQL | localhost:5432 (`cvet`/`cvet`) |

O banco é criado e atualizado automaticamente na primeira execução, sem dados clínicos de demonstração. O Compose aguarda os healthchecks do banco e da API antes de iniciar o frontend.

Para acompanhar o ambiente:

```bash
docker compose ps
docker compose logs -f api
```

Para encerrar os serviços sem apagar dados:

```bash
docker compose down
```

O volume `cvet-db` preserva os dados. Para remover também o banco local, use `docker compose down -v`.

---

### Desenvolvimento com hot reload (Docker)

```bash
docker compose -f docker-compose.dev.yml up
```

O código de `backend/` e `frontend/` é montado nos containers: o backend reinicia
(`tsx watch`) e o frontend atualiza no navegador (Fast Refresh) ao salvar arquivos.
Na primeira subida o `npm install` roda dentro dos containers e pode demorar.
Use `docker compose -f docker-compose.dev.yml down -v` para limpar volumes e banco.

---

### Rodando localmente (sem Docker)

**Backend**

```bash
cd backend
npm run setup   # instala dependências e cria o .env
npm run dev     # gera o client Prisma, inicializa o banco e sobe o servidor
```

> Antes de rodar `npm run dev`, suba um Postgres local (ex: `docker compose up -d db`)
> e ajuste `DATABASE_URL` no `.env` se necessário.
>
> `npm run setup` só precisa ser executado uma vez após clonar o repositório
> ou após trocar a versão do Node.js. Depois disso, `npm run dev` é suficiente.

**Frontend** (em outro terminal)

```bash
cd frontend
npm install
npm run dev                # http://localhost:3000
```

---

### Testes

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

## Funcionalidades

- Cadastro de tutores com um ou mais pets
- CRUD de tutores e pets, com proteção de histórico de internações
- Catálogo pesquisável de raças caninas e felinas
- Cadastro de leitos Normal/UTI, diária e bloqueio de períodos sobrepostos
- Internações com seleção de pet e leito existentes, período, descrição e cálculo de diárias
- Controle de status por pet (Estável · Observação · Crítico)
- Gerenciamento de medicações por internação, com texto livre, unidade, preço por dose e doses aplicadas
- **Mapa de Execução** — grade de horários de medicação por pet
- Dashboard com analytics (espécie, status, volume)
- Financeiro com diárias, medicações aplicadas discriminadas, saldo e baixa automática da internação após quitação

## Documentação

- [RFC de internações e leitos](docs/rfc-internacoes-leitos.md)
- [DDL PostgreSQL](docs/schema-postgresql.sql)
- [Operação com Docker](docs/operacao-docker.md)
- [Guia de arquivos](docs/guia-arquivos.md)
- [Apresentação v2.0](docs/apresentacao-v2.0.md)

## Deploy

A aplicação é hospedada no [Render](https://render.com) e o deploy é acionado automaticamente após cada push na branch `main` que passe nos testes do CI.

- Frontend: https://cvet-web.onrender.com
- API: https://cvet-api.onrender.com

#### Banco de dados (Neon)

O banco é um PostgreSQL gratuito no [Neon](https://neon.tech). O `render.yaml`
declara `DATABASE_URL` com `sync: false`, então o valor é informado no dashboard
e nunca vai para o repositório.

1. No Neon, crie um projeto e copie a connection string (host `...neon.tech`).
   Ela deve terminar com `?sslmode=require`.
2. No Render, em **cvet-api > Environment**, defina `DATABASE_URL` com essa string.
3. Faça um novo deploy da API. O `docker-entrypoint.sh` executa `scripts/init-db.mjs`
   no start e cria o schema no banco novo.

O Neon suspende o banco após um período sem uso; a primeira requisição depois disso
pode demorar alguns segundos. Não commite a URL do banco, pois ela contém credenciais.
