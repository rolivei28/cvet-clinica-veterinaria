# Planejamento Técnico: Projeto CVET - Gestão Veterinária
**Data de Atualização:** 04/09/2026
**Status:** MVP funcional em evolução

## 1. Visão Geral
O software **CVET** visa digitalizar o processo de internação da clínica do Dr. Lucas Bellucci em Socorro/SP. O foco é substituir fichas manuais por um fluxo digital centralizado, garantindo segurança e agilidade no monitoramento dos pets.

---

## 2. Engenharia de Requisitos

### 2.1 Requisitos de Usuário (Alto Nível)
- **RU01:** Registro e gestão do ciclo completo de internação.
- **RU02:** Registro de medicações, horários, doses aplicadas e valores por dose.
- **RU03:** Visualização do mapa de execução e da próxima medicação.
- **RU04:** Fechamento financeiro com diárias, medicações aplicadas e baixa da internação após quitação.

### 2.2 Requisitos de Sistema (Especificação Técnica)
- **RF01:** Validação lógica de datas (Entrada <= Saída).
- **RF02:** Dashboard operacional com filtros por status e pesquisa por paciente/tutor.
- **RF03:** CRUD de tutores e pets, com catálogo pesquisável de raças caninas e felinas.
- **RNF01 (Desempenho):** Tempo de resposta das rotas principais < 2s.
- **RNF02 (Segurança):** Comunicação via HTTPS e persistência de dados em Nuvem.

---

## 3. Arquitetura e Padrões de Software

### 3.1 Arquitetura em camadas
- **Dados:** PostgreSQL, Prisma e modelo relacional de tutores, pets, internações, medicações e pagamentos.
- **API:** Hono com validação Zod, regras de conflito de leitos e baixa financeira transacional.
- **Interface:** Next.js e Tailwind CSS, com componentes operacionais, tabelas e autoselects para listas extensas.

### 3.2 Padrões de Projeto (Design Patterns)
- **Prisma Client:** Acesso tipado e centralizado ao banco de dados.
- **Zod:** Validação de contratos HTTP na borda da API.
- **Docker Compose:** Orquestração local de PostgreSQL, API e frontend com healthchecks.

#### 3.2.1 Padrões GoF na arquitetura MVC

- **Repository (implementado):** todas as rotas Hono agora chamam repositórios em `backend/src/repositories/` (`internacao`, `leito`, `pet`, `tutor`, `pagamento`, `formaPagamento`, `usuario`, `raca`) em vez de `prisma.*` diretamente. Cada repositório centraliza as queries e `include`s do seu modelo; a regra de negócio (validação, cálculo de diárias, montagem da resposta) permanece nas rotas. A transação de quitação de pagamento (`financeiro.ts`) orquestra `internacaoRepository` e `pagamentoRepository` recebendo o mesmo client de transação (`tx`). O teste `internacoes.test.ts` foi reescrito para mockar os repositórios em vez do client Prisma.
- **Strategy:** O cálculo de diárias está duplicado com pequenas variações em `calcularDiarias` (internações) e `resumoFinanceiro`/`calcularCobranca` (financeiro). O campo `Leito.tipo` (Normal/UTI) já existe mas não influencia o cálculo. Proposta: `EstrategiaCobranca` com implementações `CobrancaPadraoStrategy` e `CobrancaUTIStrategy`, selecionadas por `leito.tipo`, unificando a lógica hoje espalhada em três funções.
- **Observer:** O Mapa de Execução (`mapa-grid.tsx`) marca doses como administradas apenas em estado local do React — isso não persiste no backend nem reflete no Financeiro (que calcula `valorMedicacoes` a partir de `dosesAplicadas`). Proposta: ao persistir a aplicação de uma dose, emitir um evento (`medicacao.aplicada`) consumido por observadores (recalcular financeiro, atualizar analytics, notificar tutor), sincronizando Mapa, detalhe da internação e financeiro.
- **Adapter:** A autenticação (`auth.ts`) implementa scrypt manualmente dentro da rota, mas o plano de reuso (seção 5) já prevê NextAuth/Firebase no futuro. Proposta: `AutenticacaoAdapter` com `autenticar(email, senha)`, tendo `SenhaLocalAdapter` (implementação atual) e, futuramente, `FirebaseAuthAdapter`, sem alterar a rota. O mesmo padrão se aplica a uma futura integração de catálogo de raças externo ou gateway de pagamento (Pix/Mercado Pago) em `FormaPagamento`.

**Prioridade sugerida:** Repository e Strategy resolvem duplicação de código já existente; Observer corrige uma lacuna real de sincronização no Mapa de Execução; Adapter prepara integrações (auth, pagamento) ainda não implementadas.

### 3.3 Visões da Arquitetura (Modelo 4+1)
1. **Lógica:** Diagramas de classes e entidades clínicas.
2. **Processo:** Fluxo de concorrência e integridade em tempo de execução.
3. **Desenvolvimento:** Organização modular de pastas (Controllers, Repositories, Services).
4. **Física:** Deploy em nuvem (Vercel/GCP) e acesso via navegadores web.

---

## 4. Estratégia de Implementação e Testes

### 4.1 Ciclo de Desenvolvimento
- **Metodologia Ágil:** Uso de Sprints para entregas incrementais.
- **TDD (Test Driven Development):** Aplicação em funções críticas de negócio (ex: cálculos de doses e validações de prontuário).

### 4.2 Qualidade e Entrega
- **Testes de Unidade:** Validação de funções isoladas.
- **Testes de Integração:** Checagem da comunicação entre as camadas do MVC.
- **CI/CD:** Automatização de testes e deploy via GitHub Actions para garantir que apenas código validado chegue à produção.

---

## 5. Componentes de Software (Reuso)
- **Autenticação:** NextAuth/Firebase (Segurança pronta).
- **UI:** Shadcn/UI ou Material UI (Consistência visual).
- **Persistência:** PostgreSQL (Integridade relacional).
