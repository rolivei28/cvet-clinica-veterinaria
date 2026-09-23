import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { leitoRepository } from '../repositories/leito.repository.js';

const leitoSchema = z.object({
  id: z.string().trim().regex(/^\d+$/, 'O número do leito deve conter apenas dígitos.'),
  nome: z.string().trim().min(2),
  tipo: z.enum(['N', 'I']),
  valorDiaria: z.number().nonnegative(),
});

export const leitosRoutes = new Hono()
  .get('/', async (c) => c.json(await leitoRepository.listar()))
  .post('/', zValidator('json', leitoSchema), async (c) => {
    const { id, nome, tipo, valorDiaria } = c.req.valid('json');
    const leito = await leitoRepository.buscarPorId(id);

    if (leito) return c.json({ message: 'Este número de leito já está cadastrado.' }, 409);

    return c.json(await leitoRepository.criar({ id, nome, tipo, valorDiaria }), 201);
  });
