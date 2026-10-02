import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const tutorSchema = z.object({
  nome: z.string().trim().min(2),
  telefone: z.string().trim().min(8),
  cpf: z.string().trim().optional(),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  pets: z.array(z.object({
    id: z.string().min(1).optional(),
    nome: z.string().trim().min(1),
    especie: z.enum(['CANINO', 'FELINO', 'OUTROS']),
    raca: z.string().trim().optional(),
    peso: z.number().positive().optional().nullable(),
    dataNascimento: z.string().date().optional(),
  })).min(1, 'Cadastre ao menos um pet.'),
});

export const tutoresRoutes = new Hono()
  .get('/', async (c) => {
    const tutores = await prisma.tutor.findMany({
      include: { pets: { select: { id: true, nome: true, especie: true, raca: true, peso: true, dataNascimento: true } } },
      orderBy: { nome: 'asc' },
    });
    return c.json(tutores);
  })
  .post('/', zValidator('json', tutorSchema), async (c) => {
    const { nome, telefone, cpf, email, pets } = c.req.valid('json');
    const tutorExistente = await prisma.tutor.findFirst({ where: { nome, telefone } });

    if (tutorExistente) {
      return c.json({ message: 'Já existe um tutor cadastrado com este nome e telefone.' }, 409);
    }

    const tutor = await prisma.tutor.create({
      data: {
        nome,
        telefone,
        cpf: cpf || null,
        email: email || null,
        pets: {
          create: pets.map((pet) => ({
            nome: pet.nome,
            especie: pet.especie,
            raca: pet.raca || null,
            peso: pet.peso != null ? Number(pet.peso) : null,
            dataNascimento: pet.dataNascimento ? new Date(pet.dataNascimento) : null,
          })),
        },
      },
      include: { pets: { select: { id: true, nome: true, especie: true, raca: true, peso: true, dataNascimento: true } } },
    });
    return c.json(tutor, 201);
  })
  .put('/:id', zValidator('json', tutorSchema), async (c) => {
    const id = c.req.param('id');
    const { nome, telefone, cpf, email, pets } = c.req.valid('json');
    const tutor = await prisma.tutor.findUnique({ where: { id }, include: { pets: { select: { id: true, internacoes: { select: { id: true }, take: 1 } } } } });
    if (!tutor) return c.json({ message: 'Tutor não encontrado.' }, 404);

    const existente = await prisma.tutor.findFirst({ where: { nome, telefone, NOT: { id } } });
    if (existente) return c.json({ message: 'Já existe um tutor cadastrado com este nome e telefone.' }, 409);

    const idsExistentes = new Set(tutor.pets.map((pet) => pet.id));
    if (pets.some((pet) => pet.id && !idsExistentes.has(pet.id))) return c.json({ message: 'Pet não pertence a este tutor.' }, 400);
    const idsEnviados = new Set(pets.flatMap((pet) => pet.id ? [pet.id] : []));
    const petsRemovidos = tutor.pets.filter((pet) => !idsEnviados.has(pet.id));
    if (petsRemovidos.some((pet) => pet.internacoes.length > 0)) return c.json({ message: 'Não é possível remover um pet com internações.' }, 409);

    const atualizado = await prisma.tutor.update({
      where: { id },
      data: {
        nome, telefone, cpf: cpf || null, email: email || null,
        pets: {
          deleteMany: { id: { in: petsRemovidos.map((pet) => pet.id) } },
          create: pets.filter((pet) => !pet.id).map((pet) => ({
            nome: pet.nome,
            especie: pet.especie,
            raca: pet.raca || null,
            peso: pet.peso != null ? Number(pet.peso) : null,
            dataNascimento: pet.dataNascimento ? new Date(pet.dataNascimento) : null,
          })),
          update: pets.filter((pet) => pet.id).map((pet) => ({
            where: { id: pet.id! },
            data: {
              nome: pet.nome,
              especie: pet.especie,
              raca: pet.raca || null,
              peso: pet.peso != null ? Number(pet.peso) : null,
              dataNascimento: pet.dataNascimento ? new Date(pet.dataNascimento) : null,
            },
          })),
        },
      },
      include: { pets: { select: { id: true, nome: true, especie: true, raca: true, peso: true, dataNascimento: true } } },
    });
    return c.json(atualizado);
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const tutor = await prisma.tutor.findUnique({ where: { id }, include: { pets: { select: { id: true, internacoes: { select: { id: true }, take: 1 } } } } });
    if (!tutor) return c.json({ message: 'Tutor não encontrado.' }, 404);
    if (tutor.pets.some((pet) => pet.internacoes.length > 0)) return c.json({ message: 'Não é possível excluir um tutor que possui pets com internações.' }, 409);

    await prisma.tutor.delete({ where: { id } });
    return c.body(null, 204);
  });