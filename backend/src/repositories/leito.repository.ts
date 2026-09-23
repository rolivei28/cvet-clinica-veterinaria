import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

export const leitoRepository = {
  listar: () => prisma.leito.findMany({ orderBy: { id: 'asc' } }),

  buscarPorId: (id: string) => prisma.leito.findUnique({ where: { id } }),

  criar: (dados: Prisma.LeitoCreateInput) => prisma.leito.create({ data: dados }),
};
