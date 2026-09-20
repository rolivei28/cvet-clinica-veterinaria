import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

const petResumo = { id: true, nome: true, especie: true, raca: true, dataNascimento: true } as const;

export const tutorRepository = {
  listarComPets: () =>
    prisma.tutor.findMany({ include: { pets: { select: petResumo } }, orderBy: { nome: 'asc' } }),

  buscarPorNomeTelefone: (nome: string, telefone: string, excluirId?: string) =>
    prisma.tutor.findFirst({ where: { nome, telefone, ...(excluirId ? { NOT: { id: excluirId } } : {}) } }),

  buscarComPetsEInternacoes: (id: string) =>
    prisma.tutor.findUnique({
      where: { id },
      include: { pets: { select: { id: true, internacoes: { select: { id: true }, take: 1 } } } },
    }),

  criar: (dados: Prisma.TutorCreateInput) =>
    prisma.tutor.create({ data: dados, include: { pets: { select: petResumo } } }),

  atualizar: (id: string, dados: Prisma.TutorUpdateInput) =>
    prisma.tutor.update({ where: { id }, data: dados, include: { pets: { select: petResumo } } }),

  remover: (id: string) => prisma.tutor.delete({ where: { id } }),
};
