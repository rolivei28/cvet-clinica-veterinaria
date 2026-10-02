import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const itemSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  tipo: z.enum(['MEDICAMENTO', 'UTENSILIO']),
  categoria: z.string().trim().min(1).max(80),
  unidadeEstoque: z.string().trim().min(1).max(20).default('un'),
  quantidadeEstoque: z.number().min(0).default(0),
  estoqueMinimo: z.number().min(0).default(0),
  valorUnitario: z.number().min(0).default(0),
  descricao: z.string().trim().max(500).default(''),
  ativo: z.boolean().default(true),
});

export const catalogoRoutes = new Hono()
  .get('/', async (c) => {
    const tipo = c.req.query('tipo');
    const busca = c.req.query('busca')?.trim();
    const itens = await prisma.itemCatalogo.findMany({
      where: {
        ...(tipo === 'MEDICAMENTO' || tipo === 'UTENSILIO' ? { tipo } : {}),
        ...(busca ? { OR: [{ nome: { contains: busca, mode: 'insensitive' } }, { categoria: { contains: busca, mode: 'insensitive' } }] } : {}),
      },
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    });
    return c.json(itens);
  })
  .post('/', zValidator('json', itemSchema), async (c) => {
    const data = c.req.valid('json');
    const existente = await prisma.itemCatalogo.findUnique({ where: { tipo_nome: { tipo: data.tipo, nome: data.nome } } });
    if (existente) return c.json({ error: 'Já existe um item com esse nome e tipo.' }, 409);
    const item = await prisma.itemCatalogo.create({ data });
    return c.json(item, 201);
  })
  .put('/:id', zValidator('json', itemSchema), async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const existente = await prisma.itemCatalogo.findUnique({ where: { id } });
    if (!existente) return c.json({ error: 'Item não encontrado.' }, 404);
    const duplicado = await prisma.itemCatalogo.findUnique({ where: { tipo_nome: { tipo: data.tipo, nome: data.nome } } });
    if (duplicado && duplicado.id !== id) return c.json({ error: 'Já existe um item com esse nome e tipo.' }, 409);
    const atualizado = await prisma.itemCatalogo.update({ where: { id }, data });
    return c.json(atualizado);
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const existente = await prisma.itemCatalogo.findUnique({ where: { id } });
    if (!existente) return c.json({ error: 'Item não encontrado.' }, 404);
    await prisma.itemCatalogo.delete({ where: { id } });
    return c.body(null, 204);
  });