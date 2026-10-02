import { Hono } from 'hono';
import { z } from 'zod';
import { racaRepository } from '../repositories/raca.repository.js';

const especieSchema = z.enum(['CANINO', 'FELINO', 'OUTROS']);

export const racasRoutes = new Hono().get('/', async (c) => {
  const especie = especieSchema.safeParse(c.req.query('especie'));
  if (!especie.success) return c.json({ error: 'Informe uma espécie válida.' }, 400);

  const racas = await racaRepository.listarPorEspecie(especie.data);
  return c.json(racas);
});
