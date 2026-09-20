import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

const usuarioPublico = { id: true, nome: true, cpf: true, email: true, createdAt: true } as const;

export const usuarioRepository = {
  listarPublico: () => prisma.usuario.findMany({ select: usuarioPublico, orderBy: { nome: 'asc' } }),

  buscarPorEmail: (email: string) => prisma.usuario.findUnique({ where: { email } }),

  buscarDuplicado: (email: string, cpf: string) =>
    prisma.usuario.findFirst({ where: { OR: [{ email }, { cpf }] } }),

  criar: (dados: Prisma.UsuarioCreateInput) =>
    prisma.usuario.create({ data: dados, select: usuarioPublico }),
};
