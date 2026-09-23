import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

type Db = typeof prisma | Prisma.TransactionClient;

export const pagamentoRepository = {
  criar: (dados: Prisma.PagamentoUncheckedCreateInput, tx: Db = prisma) =>
    tx.pagamento.create({ data: dados, include: { formaPagamento: true } }),
};
