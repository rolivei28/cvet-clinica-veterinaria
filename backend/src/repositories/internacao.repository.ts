import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

type Db = typeof prisma | Prisma.TransactionClient;

const internacaoInclude = { pet: { include: { tutor: true } }, leito: true } as const;

export const internacaoRepository = {
  listarAtivas: () =>
    prisma.internacao.findMany({
      where: { baixa: false },
      orderBy: { entradaEm: 'desc' },
      include: { ...internacaoInclude, medicacoes: true },
    }),

  listarComFinanceiro: () =>
    prisma.internacao.findMany({
      include: {
        pet: { include: { tutor: true } },
        leito: true,
        medicacoes: true,
        pagamentos: { include: { formaPagamento: true }, orderBy: { pagoEm: 'desc' } },
      },
      orderBy: { entradaEm: 'desc' },
    }),

  listarParaAnalytics: () =>
    prisma.internacao.findMany({ select: { status: true, especie: true, entradaEm: true } }),

  buscarPorId: (id: string) =>
    prisma.internacao.findUnique({
      where: { id },
      include: { ...internacaoInclude, medicacoes: true },
    }),

  buscarComLeitoEMedicacoes: (id: string) =>
    prisma.internacao.findUnique({
      where: { id },
      include: { leito: true, medicacoes: true, pagamentos: true },
    }),

  verificarConflitoLeito: (leitoId: string, entradaEm: Date, dataSaida: Date) =>
    prisma.internacao.findFirst({
      where: { leitoId, entradaEm: { lte: dataSaida }, dataSaida: { gte: entradaEm } },
      select: { petNome: true, entradaEm: true, dataSaida: true },
    }),

  criar: (dados: Prisma.InternacaoUncheckedCreateInput) =>
    prisma.internacao.create({ data: dados, include: { ...internacaoInclude, medicacoes: true } }),

  atualizarStatus: (id: string, dados: Prisma.InternacaoUpdateInput) =>
    prisma.internacao.update({ where: { id }, data: dados, include: { ...internacaoInclude, medicacoes: true } }),

  remover: (id: string) => prisma.internacao.delete({ where: { id } }),

  baixar: (id: string, dados: Prisma.InternacaoUpdateInput, tx: Db = prisma) =>
    tx.internacao.update({ where: { id }, data: dados }),

  adicionarMedicacao: (dados: Prisma.MedicacaoUncheckedCreateInput) =>
    prisma.medicacao.create({ data: dados }),

  atualizarMedicacao: (internacaoId: string, medicacaoId: string, dados: Prisma.MedicacaoUpdateInput) =>
    prisma.medicacao.update({ where: { id: medicacaoId, internacaoId }, data: dados }),

  removerMedicacao: (medicacaoId: string) => prisma.medicacao.delete({ where: { id: medicacaoId } }),
};
