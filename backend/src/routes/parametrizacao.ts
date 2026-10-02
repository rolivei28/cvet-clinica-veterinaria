import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { FAIXAS_PADRAO, calcularDiariasPorPeso, encontrarFaixaPreco, normalizarTipoLeito } from '../lib/calculo-diarias.js';

const faixaSchema = z.object({
  tipoLeito: z.enum(['NORMAL', 'UTI']),
  pesoMin: z.number().min(0),
  pesoMax: z.number().positive(),
  valorDiaria: z.number().positive(),
  descricao: z.string().trim().optional().default(''),
});

const simularSchema = z.object({
  peso: z.number().positive(),
  tipoLeito: z.string().default('NORMAL'),
  entradaEm: z.string().optional(),
  dataSaida: z.string().optional(),
});

export const parametrizacaoRoutes = new Hono()
  .get('/', async (c) => {
    let faixas = await prisma.tabelaPrecoDiaria.findMany({
      orderBy: [{ tipoLeito: 'asc' }, { pesoMin: 'asc' }],
    });

    if (faixas.length === 0) {
      // Se ainda não houver no banco, inicializa com as faixas padrão
      for (const f of FAIXAS_PADRAO) {
        await prisma.tabelaPrecoDiaria.create({
          data: {
            tipoLeito: f.tipoLeito,
            pesoMin: f.pesoMin,
            pesoMax: f.pesoMax,
            valorDiaria: f.valorDiaria,
            descricao: f.descricao ?? '',
          },
        });
      }
      faixas = await prisma.tabelaPrecoDiaria.findMany({
        orderBy: [{ tipoLeito: 'asc' }, { pesoMin: 'asc' }],
      });
    }

    return c.json(faixas);
  })

  .post('/', zValidator('json', faixaSchema), async (c) => {
    const data = c.req.valid('json');
    if (data.pesoMax <= data.pesoMin) {
      return c.json({ error: 'O peso máximo deve ser estritamente maior que o peso mínimo.' }, 400);
    }

    const criada = await prisma.tabelaPrecoDiaria.create({
      data: {
        tipoLeito: data.tipoLeito,
        pesoMin: data.pesoMin,
        pesoMax: data.pesoMax,
        valorDiaria: data.valorDiaria,
        descricao: data.descricao || `${data.pesoMin} a ${data.pesoMax} kg (${data.tipoLeito})`,
      },
    });

    return c.json(criada, 201);
  })

  .put('/:id', zValidator('json', faixaSchema), async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');

    if (data.pesoMax <= data.pesoMin) {
      return c.json({ error: 'O peso máximo deve ser estritamente maior que o peso mínimo.' }, 400);
    }

    const existente = await prisma.tabelaPrecoDiaria.findUnique({ where: { id } });
    if (!existente) return c.json({ error: 'Faixa de preço não encontrada.' }, 404);

    const atualizada = await prisma.tabelaPrecoDiaria.update({
      where: { id },
      data: {
        tipoLeito: data.tipoLeito,
        pesoMin: data.pesoMin,
        pesoMax: data.pesoMax,
        valorDiaria: data.valorDiaria,
        descricao: data.descricao || `${data.pesoMin} a ${data.pesoMax} kg (${data.tipoLeito})`,
      },
    });

    return c.json(atualizada);
  })

  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const existente = await prisma.tabelaPrecoDiaria.findUnique({ where: { id } });
    if (!existente) return c.json({ error: 'Faixa não encontrada.' }, 404);

    await prisma.tabelaPrecoDiaria.delete({ where: { id } });
    return c.body(null, 204);
  })

  .post('/simular', zValidator('json', simularSchema), async (c) => {
    const { peso, tipoLeito, entradaEm, dataSaida } = c.req.valid('json');
    const faixas = await prisma.tabelaPrecoDiaria.findMany();
    const tabela = faixas.length > 0 ? faixas : FAIXAS_PADRAO;

    const entrada = entradaEm ? new Date(entradaEm) : new Date();
    const saida = dataSaida ? new Date(dataSaida) : new Date(entrada.getTime() + 86_400_000);

    const calculo = calcularDiariasPorPeso(peso, tipoLeito, entrada, saida, tabela);
    return c.json(calculo);
  });

