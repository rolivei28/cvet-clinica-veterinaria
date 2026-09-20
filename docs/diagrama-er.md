# Diagrama Entidade-Relacionamento (Mermaid)

Modelo gerado a partir de [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). Renderiza nativamente no GitHub e em qualquer visualizador com suporte a Mermaid.

```mermaid
erDiagram
    TUTOR ||--o{ PET : possui
    PET   |o--o{ INTERNACAO : gera
    LEITO |o--o{ INTERNACAO : hospeda
    INTERNACAO ||--o{ MEDICACAO : possui
    INTERNACAO ||--o{ PAGAMENTO : recebe
    FORMA_PAGAMENTO ||--o{ PAGAMENTO : usada_em

    USUARIO {
        string id PK
        string nome
        string cpf UK
        string email UK
        string senhaHash
        datetime createdAt
        datetime updatedAt
    }

    TUTOR {
        string id PK
        string nome
        string telefone
        string cpf
        string email
        datetime createdAt
        datetime updatedAt
    }

    PET {
        string id PK
        string nome
        string especie "enum: CANINO | FELINO | OUTROS"
        string raca "texto livre, sem FK para RACA"
        datetime dataNascimento
        string tutorId FK
        datetime createdAt
        datetime updatedAt
    }

    RACA {
        string id PK
        string nome
        string especie "enum: CANINO | FELINO | OUTROS"
        int grupoFci
        datetime createdAt
        datetime updatedAt
    }

    LEITO {
        string id PK
        string nome
        string tipo "N (Normal) | I (UTI)"
        float valorDiaria
        datetime createdAt
        datetime updatedAt
    }

    INTERNACAO {
        string id PK
        string petNome "snapshot histórico"
        string especie "snapshot histórico"
        string tutorNome "snapshot histórico"
        datetime entradaEm
        datetime dataSaida
        string descricao
        int quantidadeDiarias
        float valorDiarias
        string status "estavel | observacao | critico"
        boolean baixa
        string proximaMedicacao
        string observacao
        string petId FK
        string leitoId FK
        datetime createdAt
        datetime updatedAt
    }

    MEDICACAO {
        string id PK
        string nome
        string descricao
        string horarios "JSON array de horários"
        string cor
        string via
        string unidade
        float quantidade
        float valorDose
        int dosesAplicadas
        int frequenciaHoras
        string primeiroHorario
        datetime fimEm
        string internacaoId FK
        datetime createdAt
        datetime updatedAt
    }

    FORMA_PAGAMENTO {
        string id PK
        string nome UK
        datetime createdAt
    }

    PAGAMENTO {
        string id PK
        float valor
        datetime pagoEm
        string internacaoId FK
        string formaPagamentoId FK
        datetime createdAt
    }
```

## Notas de modelagem

- **`RACA` é um catálogo independente:** `Pet.raca` é um campo de texto livre, não uma chave estrangeira para `RACA`. A tabela serve apenas para consulta/autocomplete de raças caninas e felinas.
- **`USUARIO` não se relaciona com outras entidades:** usado exclusivamente para autenticação (login) e não referencia nem é referenciado por internações, pets ou tutores.
- **`INTERNACAO` guarda snapshots históricos** (`petNome`, `especie`, `tutorNome`) além das FKs para `PET` e `LEITO`, que são opcionais (`petId`/`leitoId` anuláveis) — preserva o histórico da internação mesmo que o pet ou o leito seja removido depois.
- **Exclusão em cascata:** `MEDICACAO` e `PAGAMENTO` são removidos automaticamente se a `INTERNACAO` associada for excluída (`onDelete: Cascade` no schema).
