import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { calcularHorarios } from '../lib/horarios.js';
import { calcularDiariasPorPeso } from '../lib/calculo-diarias.js';
import { internacaoRepository } from '../repositories/internacao.repository.js';
import { leitoRepository } from '../repositories/leito.repository.js';
import { petRepository } from '../repositories/pet.repository.js';

const statusSchema = z.enum(['estavel', 'observacao', 'critico']);

const prontuarioSchema = z.object({
  tipo: z.enum(['EVOLUCAO', 'PROCEDIMENTO', 'EXAME', 'CURATIVO', 'OCORRENCIA']).default('EVOLUCAO'),
  titulo: z.string().trim().optional().default(''),
  descricao: z.string().trim().min(1, 'Descrição é obrigatória.'),
  temperatura: z.number().optional().nullable(),
  frequenciaCardiaca: z.number().int().optional().nullable(),
  frequenciaRespiratoria: z.number().int().optional().nullable(),
  responsavel: z.string().trim().min(1, 'Responsável é obrigatório.'),
  dataHora: z.string().optional(),
});

const medicacaoSchema = z.object({
  nome:            z.string().min(1),
  descricao:       z.string().trim().optional().default(''),
  primeiroHorario: z.string().regex(/^\d{2}:\d{2}$/),
  frequenciaHoras: z.number().int().positive(),
  fimEm:           z.string().optional(),
  cor:             z.string().default('bg-teal-500'),
  via:             z.string().default('Oral'),
  unidade:         z.string().default('mg'),
  quantidade:      z.number().positive().default(1),
  valorDose:       z.number().min(0).default(0),
  dosesAplicadas:  z.number().int().min(0).default(0),
});

const createSchema = z.object({
  petId:            z.string().min(1),
  leitoId:          z.string().trim().min(1),
  entradaEm:        z.string().datetime().or(z.string().date()),
  dataSaida:        z.string().datetime().or(z.string().date()),
  descricao:        z.string().trim().min(1),
  pesoMomento:      z.number().positive().optional().nullable(),
  status:           statusSchema.default('estavel'),
  proximaMedicacao: z.string().optional().default(''),
  observacao:       z.string().optional().default(''),
  medicacoes:       z.array(medicacaoSchema).optional().default([]),
});

const updateSchema = z.object({
  status:           statusSchema.optional(),
  proximaMedicacao: z.string().min(1).optional(),
  observacao:       z.string().optional(),
});

const administracaoSchema = z.object({
  horarioProgramado: z.string().datetime(),
  responsavel: z.string().trim().min(1),
});

function parseMeds(internacao: Record<string, unknown> & { medicacoes?: { horarios: string }[] }) {
  return {
    ...internacao,
    medicacoes: (internacao.medicacoes ?? []).map((m) => ({
      ...m,
      horarios: JSON.parse(m.horarios) as string[],
    })),
  };
}

export const internacoesRoutes = new Hono()

  // ── Internações ──────────────────────────────────────────────
  .get('/', async (c) => {
    const rows = await internacaoRepository.listarAtivas();
    return c.json(rows.map(parseMeds));
  })

  .post('/', zValidator('json', createSchema), async (c) => {
    const { medicacoes, petId, pesoMomento, ...data } = c.req.valid('json');
    const entradaEm = new Date(data.entradaEm.length === 10 ? `${data.entradaEm}T00:00:00.000Z` : data.entradaEm);
    const dataSaida = new Date(data.dataSaida.length === 10 ? `${data.dataSaida}T00:00:00.000Z` : data.dataSaida);

    if (dataSaida <= entradaEm) return c.json({ error: 'A data e hora de saída devem ser posteriores à entrada.' }, 400);

    const leito = await leitoRepository.buscarPorId(data.leitoId);
    if (!leito) return c.json({ error: 'Selecione um leito válido.' }, 400);

    const conflito = await internacaoRepository.verificarConflitoLeito(leito.id, entradaEm, dataSaida);
    if (conflito) {
      return c.json({
        error: `O leito ${leito.id} já está reservado para ${conflito.petNome} no período selecionado.`,
      }, 409);
    }

    const pet = await petRepository.buscarPorId(petId);
    if (!pet) return c.json({ error: 'Pet não encontrado.' }, 404);

    const pesoFinal = pesoMomento ?? pet.peso ?? 5.0;
    const faixas = await prisma.tabelaPrecoDiaria.findMany();
    const diariasCalc = calcularDiariasPorPeso(pesoFinal, leito.tipo, entradaEm, dataSaida, faixas);

    if (pesoMomento && (!pet.peso || pet.peso !== pesoMomento)) {
      await petRepository.atualizarPeso(pet.id, pesoMomento);
    }

    const internacao = await internacaoRepository.criar({
      ...data,
      pesoMomento: pesoFinal,
      entradaEm,
      dataSaida,
      quantidadeDiarias: diariasCalc.quantidadeDiarias,
      valorDiarias: diariasCalc.valorDiarias,
      petId: pet.id,
      petNome: pet.nome,
      especie: pet.especie,
      tutorNome: pet.tutor.nome,
      medicacoes: {
        create: medicacoes.map((m) => ({
          nome:            m.nome,
          horarios:        JSON.stringify(calcularHorarios(m.primeiroHorario, m.frequenciaHoras)),
          cor:             m.cor,
          via:             m.via,
          unidade:         m.unidade,
          quantidade:      m.quantidade,
          valorDose:       m.valorDose,
          dosesAplicadas:  m.dosesAplicadas,
          frequenciaHoras: m.frequenciaHoras,
          primeiroHorario: m.primeiroHorario,
          fimEm:           m.fimEm ? new Date(m.fimEm) : null,
        })),
      },
    });
    return c.json(parseMeds(internacao), 201);
  })

  .get('/:id', async (c) => {
    const row = await internacaoRepository.buscarPorId(c.req.param('id'));
    if (!row) return c.json({ error: 'Internação não encontrada.' }, 404);
    return c.json(parseMeds(row));
  })

  .patch('/:id', zValidator('json', updateSchema), async (c) => {
    const row = await internacaoRepository.atualizarStatus(c.req.param('id'), c.req.valid('json'));
    return c.json(parseMeds(row));
  })

  .delete('/:id', async (c) => {
    await internacaoRepository.remover(c.req.param('id'));
    return c.body(null, 204);
  })

  // ── Medicações ───────────────────────────────────────────────
  .post('/:id/medicacoes', zValidator('json', medicacaoSchema), async (c) => {
    const { nome, descricao, primeiroHorario, frequenciaHoras, fimEm, cor, via, unidade, quantidade, valorDose, dosesAplicadas } = c.req.valid('json');
    const horarios = calcularHorarios(primeiroHorario, frequenciaHoras);
    const med = await internacaoRepository.adicionarMedicacao({
      nome,
      descricao,
      horarios:        JSON.stringify(horarios),
      cor,
      via,
      unidade,
      quantidade,
      valorDose,
      dosesAplicadas,
      frequenciaHoras,
      primeiroHorario,
      fimEm:           fimEm ? new Date(fimEm) : null,
      internacaoId:    c.req.param('id'),
    });
    return c.json({ ...med, horarios }, 201);
  })

  .patch('/:id/medicacoes/:medId', zValidator('json', medicacaoSchema), async (c) => {
    const { nome, descricao, primeiroHorario, frequenciaHoras, fimEm, cor, via, unidade, quantidade, valorDose, dosesAplicadas } = c.req.valid('json');
    const horarios = calcularHorarios(primeiroHorario, frequenciaHoras);
    const med = await internacaoRepository.atualizarMedicacao(c.req.param('id'), c.req.param('medId'), {
      nome,
      descricao,
      horarios: JSON.stringify(horarios),
      cor,
      via,
      unidade,
      quantidade,
      valorDose,
      dosesAplicadas,
      frequenciaHoras,
      primeiroHorario,
      fimEm: fimEm ? new Date(fimEm) : null,
    });
    return c.json({ ...med, horarios });
  })

  .delete('/:id/medicacoes/:medId', async (c) => {
    await internacaoRepository.removerMedicacao(c.req.param('medId'));
    return c.body(null, 204);
  })

  .post('/:id/medicacoes/:medId/administrar', zValidator('json', administracaoSchema), async (c) => {
    const internacaoId = c.req.param('id');
    const medId = c.req.param('medId');
    const { horarioProgramado, responsavel } = c.req.valid('json');
    const horario = new Date(horarioProgramado);
    const med = await prisma.medicacao.findFirst({
      where: { id: medId, internacaoId },
    });
    if (!med) return c.json({ error: 'Medicação não encontrada.' }, 404);

    const existente = await prisma.registroProntuario.findFirst({
      where: { internacaoId, medicacaoId: medId, horarioProgramado: horario },
    });
    if (existente) return c.json(existente);

    const internacao = await prisma.internacao.findUnique({
      where: { id: internacaoId },
      select: { petId: true },
    });
    if (!internacao?.petId) return c.json({ error: 'Pet da internação não encontrado.' }, 404);

    const [registro] = await prisma.$transaction([
      prisma.registroProntuario.create({
        data: {
          petId: internacao.petId,
          internacaoId,
          tipo: 'MEDICACAO_ADMINISTRADA',
          titulo: med.nome,
          descricao: `${med.quantidade} ${med.unidade} · ${med.via}`,
          responsavel,
          dataHora: new Date(),
          medicacaoId: medId,
          horarioProgramado: horario,
        },
      }),
      prisma.medicacao.update({
        where: { id: medId },
        data: { dosesAplicadas: { increment: 1 } },
      }),
    ]);

    return c.json(registro, 201);
  })

  .get('/:id/prontuario', async (c) => {
    const internacaoId = c.req.param('id');
    const internacao = await prisma.internacao.findUnique({
      where: { id: internacaoId },
      select: { petId: true },
    });
    if (!internacao) return c.json({ error: 'Internação não encontrada.' }, 404);

    const registros = await prisma.registroProntuario.findMany({
      where: {
        OR: [
          { internacaoId },
          ...(internacao.petId ? [{ petId: internacao.petId, internacaoId: null }] : []),
        ],
      },
      orderBy: { dataHora: 'desc' },
    });
    return c.json(registros);
  })

  .post('/:id/prontuario', zValidator('json', prontuarioSchema), async (c) => {
    const internacaoId = c.req.param('id');
    const internacao = await prisma.internacao.findUnique({
      where: { id: internacaoId },
    });
    if (!internacao) return c.json({ error: 'Internação não encontrada.' }, 404);

    const data = c.req.valid('json');
    const registro = await prisma.registroProntuario.create({
      data: {
        internacaoId,
        petId: internacao.petId ?? 'desconhecido',
        tipo: data.tipo,
        titulo: data.titulo || data.tipo,
        descricao: data.descricao,
        temperatura: data.temperatura ?? null,
        frequenciaCardiaca: data.frequenciaCardiaca ?? null,
        frequenciaRespiratoria: data.frequenciaRespiratoria ?? null,
        responsavel: data.responsavel,
        dataHora: data.dataHora ? new Date(data.dataHora) : new Date(),
      },
    });

    return c.json(registro, 201);
  })

  .delete('/:id/prontuario/:registroId', async (c) => {
    const id = c.req.param('registroId');
    const reg = await prisma.registroProntuario.findUnique({ where: { id } });
    if (!reg) return c.json({ error: 'Registro não encontrado.' }, 404);

    const administracao = reg.tipo === 'MEDICACAO_ADMINISTRADA' && reg.medicacaoId
      ? await prisma.medicacao.findFirst({ where: { id: reg.medicacaoId, internacaoId: reg.internacaoId ?? '' } })
      : null;

    if (administracao && administracao.dosesAplicadas > 0) {
      await prisma.$transaction([
        prisma.registroProntuario.delete({ where: { id } }),
        prisma.medicacao.update({
          where: { id: administracao.id },
          data: { dosesAplicadas: { decrement: 1 } },
        }),
      ]);
    } else {
      await prisma.registroProntuario.delete({ where: { id } });
    }
    return c.body(null, 204);
  });
