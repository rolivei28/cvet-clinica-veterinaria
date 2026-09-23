import { prisma } from '../lib/prisma.js';
import type { EspeciePet } from '../../generated/prisma/client.js';

export const racaRepository = {
  listarPorEspecie: (especie: EspeciePet) =>
    prisma.raca.findMany({
      where: { especie },
      select: { id: true, nome: true, especie: true, grupoFci: true },
      orderBy: { nome: 'asc' },
    }),
};
