import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const leitoSchema = z.object({
  id: z.string().trim().regex(/^\d+$/, 'O número do leito deve conter apenas dígitos.'),
  nome: z.string().trim().min(2),
  tipo: z.enum(['N', 'I']),
});

export const leitosRoutes = new Hono()
  .get('/', async (c) => c.json(await prisma.leito.findMany({ orderBy: { id: 'asc' } })))
  .post('/', zValidator('json', leitoSchema), async (c) => {
    const { id, nome, tipo } = c.req.valid('json');
    const leito = await prisma.leito.findUnique({ where: { id } });

    if (leito) return c.json({ message: 'Este número de leito já está cadastrado.' }, 409);

    return c.json(await prisma.leito.create({ data: { id, nome, tipo } }), 201);
  });