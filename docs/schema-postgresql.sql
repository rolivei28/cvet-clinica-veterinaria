-- CVET: esquema PostgreSQL de referência
-- Compatível com PostgreSQL 16+. Execute em um banco vazio.

BEGIN;

CREATE TYPE "EspeciePet" AS ENUM ('CANINO', 'FELINO', 'OUTROS');

CREATE TABLE "Usuario" (
  "id" TEXT PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "cpf" TEXT UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "senhaHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Tutor" (
  "id" TEXT PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "telefone" TEXT NOT NULL,
  "cpf" TEXT,
  "email" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Pet" (
  "id" TEXT PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "especie" "EspeciePet" NOT NULL,
  "raca" TEXT,
  "peso" DOUBLE PRECISION,
  "dataNascimento" TIMESTAMP,
  "tutorId" TEXT NOT NULL REFERENCES "Tutor"("id"),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Raca" (
  "id" TEXT PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "especie" "EspeciePet" NOT NULL,
  "grupoFci" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("nome", "especie")
);

CREATE TABLE "Leito" (
  "id" TEXT PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'N' CHECK ("tipo" IN ('N', 'I')),
  "valorDiaria" DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK ("valorDiaria" >= 0),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Internacao" (
  "id" TEXT PRIMARY KEY,
  "petNome" TEXT NOT NULL,
  "especie" TEXT NOT NULL,
  "tutorNome" TEXT NOT NULL,
  "entradaEm" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataSaida" TIMESTAMP,
  "descricao" TEXT NOT NULL DEFAULT '',
  "pesoMomento" DOUBLE PRECISION,
  "quantidadeDiarias" DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK ("quantidadeDiarias" >= 0),
  "valorDiarias" DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK ("valorDiarias" >= 0),
  "status" TEXT NOT NULL DEFAULT 'estavel' CHECK ("status" IN ('estavel', 'observacao', 'critico')),
  "baixa" BOOLEAN NOT NULL DEFAULT FALSE,
  "proximaMedicacao" TEXT NOT NULL DEFAULT '',
  "observacao" TEXT NOT NULL DEFAULT '',
  "petId" TEXT REFERENCES "Pet"("id"),
  "leitoId" TEXT REFERENCES "Leito"("id"),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("dataSaida" IS NULL OR "dataSaida" >= "entradaEm")
);

CREATE TABLE "Medicacao" (
  "id" TEXT PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "descricao" TEXT NOT NULL DEFAULT '',
  "horarios" TEXT NOT NULL DEFAULT '[]',
  "cor" TEXT NOT NULL DEFAULT 'bg-teal-500',
  "via" TEXT NOT NULL DEFAULT 'Oral',
  "unidade" TEXT NOT NULL DEFAULT 'mg',
  "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 1 CHECK ("quantidade" > 0),
  "valorDose" DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK ("valorDose" >= 0),
  "dosesAplicadas" INTEGER NOT NULL DEFAULT 0 CHECK ("dosesAplicadas" >= 0),
  "frequenciaHoras" INTEGER NOT NULL DEFAULT 8 CHECK ("frequenciaHoras" > 0),
  "primeiroHorario" TEXT NOT NULL DEFAULT '08:00',
  "fimEm" TIMESTAMP,
  "internacaoId" TEXT NOT NULL REFERENCES "Internacao"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "FormaPagamento" (
  "id" TEXT PRIMARY KEY,
  "nome" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Pagamento" (
  "id" TEXT PRIMARY KEY,
  "valor" DOUBLE PRECISION NOT NULL CHECK ("valor" > 0),
  "pagoEm" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "internacaoId" TEXT NOT NULL REFERENCES "Internacao"("id") ON DELETE CASCADE,
  "formaPagamentoId" TEXT NOT NULL REFERENCES "FormaPagamento"("id"),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TabelaPrecoDiaria" (
  "id" TEXT PRIMARY KEY,
  "tipoLeito" TEXT NOT NULL DEFAULT 'NORMAL' CHECK ("tipoLeito" IN ('NORMAL', 'UTI')),
  "pesoMin" DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK ("pesoMin" >= 0),
  "pesoMax" DOUBLE PRECISION NOT NULL CHECK ("pesoMax" > "pesoMin"),
  "descricao" TEXT NOT NULL DEFAULT '',
  "valorDiaria" DOUBLE PRECISION NOT NULL CHECK ("valorDiaria" > 0),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RegistroProntuario" (
  "id" TEXT PRIMARY KEY,
  "petId" TEXT NOT NULL REFERENCES "Pet"("id") ON DELETE CASCADE,
  "internacaoId" TEXT REFERENCES "Internacao"("id") ON DELETE SET NULL,
  "tipo" TEXT NOT NULL DEFAULT 'EVOLUCAO' CHECK ("tipo" IN ('EVOLUCAO', 'PROCEDIMENTO', 'EXAME', 'CURATIVO', 'OCORRENCIA', 'MEDICACAO_ADMINISTRADA')),
  "titulo" TEXT NOT NULL DEFAULT '',
  "descricao" TEXT NOT NULL,
  "temperatura" DOUBLE PRECISION,
  "frequenciaCardiaca" INTEGER,
  "frequenciaRespiratoria" INTEGER,
  "responsavel" TEXT NOT NULL DEFAULT '',
  "dataHora" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "medicacaoId" TEXT,
  "horarioProgramado" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Pet_tutorId_idx" ON "Pet"("tutorId");
CREATE INDEX "Internacao_petId_idx" ON "Internacao"("petId");
CREATE INDEX "Internacao_leitoId_idx" ON "Internacao"("leitoId");
CREATE INDEX "Internacao_baixa_idx" ON "Internacao"("baixa");
CREATE INDEX "RegistroProntuario_internacaoId_tipo_horarioProgramado_idx" ON "RegistroProntuario"("internacaoId", "tipo", "horarioProgramado");
CREATE INDEX "Medicacao_internacaoId_idx" ON "Medicacao"("internacaoId");
CREATE INDEX "Pagamento_internacaoId_idx" ON "Pagamento"("internacaoId");
CREATE INDEX "RegistroProntuario_petId_idx" ON "RegistroProntuario"("petId");
CREATE INDEX "RegistroProntuario_internacaoId_idx" ON "RegistroProntuario"("internacaoId");
CREATE INDEX "TabelaPrecoDiaria_tipoLeito_idx" ON "TabelaPrecoDiaria"("tipoLeito");

INSERT INTO "FormaPagamento" ("id", "nome") VALUES
  ('dinheiro', 'Dinheiro'), ('credito', 'Crédito'), ('debito', 'Débito'),
  ('pix', 'PIX'), ('transferencia', 'Transferência');

INSERT INTO "TabelaPrecoDiaria" ("id", "tipoLeito", "pesoMin", "pesoMax", "descricao", "valorDiaria") VALUES
  ('preco-norm-1', 'NORMAL', 0, 5.0, 'Até 5 kg (Mini/Pequeno)', 90.00),
  ('preco-norm-2', 'NORMAL', 5.01, 15.0, '5.1 a 15 kg (Médio)', 120.00),
  ('preco-norm-3', 'NORMAL', 15.01, 30.0, '15.1 a 30 kg (Grande)', 150.00),
  ('preco-norm-4', 'NORMAL', 30.01, 999.0, 'Acima de 30 kg (Gigante)', 190.00),
  ('preco-uti-1', 'UTI', 0, 5.0, 'UTI - Até 5 kg (Mini/Pequeno)', 135.00),
  ('preco-uti-2', 'UTI', 5.01, 15.0, 'UTI - 5.1 a 15 kg (Médio)', 180.00),
  ('preco-uti-3', 'UTI', 15.01, 30.0, 'UTI - 15.1 a 30 kg (Grande)', 225.00),
  ('preco-uti-4', 'UTI', 30.01, 999.0, 'UTI - Acima de 30 kg (Gigante)', 285.00)
ON CONFLICT ("id") DO NOTHING;

COMMIT;