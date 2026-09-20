import { prisma } from '../lib/prisma.js';

export const petRepository = {
  listarComTutor: () =>
    prisma.pet.findMany({
      include: { tutor: { select: { id: true, nome: true, telefone: true } } },
      orderBy: { nome: 'asc' },
    }),

  buscarPorId: (id: string) => prisma.pet.findUnique({ where: { id }, include: { tutor: true } }),
};
