import { prisma } from '../lib/prisma.js';

export const formaPagamentoRepository = {
  listar: () => prisma.formaPagamento.findMany({ orderBy: { nome: 'asc' } }),
};
