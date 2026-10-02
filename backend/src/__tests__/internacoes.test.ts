import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { internacoesRoutes } from '../routes/internacoes.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    internacao: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
    },
    tutor: {
      findFirst: vi.fn(),
      create:    vi.fn(),
    },
    pet: {
      findFirst: vi.fn(),
      create:    vi.fn(),
    },
    medicacao: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    registroProntuario: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const fakeInternacao = () => ({
  id: 'int-1',
  petNome: 'Luna',
  especie: 'Canina',
  tutorNome: 'João',
  entradaEm: new Date('2026-04-18T09:00:00'),
  status: 'estavel',
  proximaMedicacao: '08:00',
  observacao: '',
  petId: 'pet-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  medicacoes: [],
  pet: null,
});

const app = new Hono().route('/api/internacoes', internacoesRoutes);

async function prismaMock() {
  const { prisma } = await import('../lib/prisma.js');
  return prisma;
}

beforeEach(async () => {
  const p = await prismaMock();
  vi.mocked(p.internacao.findMany).mockResolvedValue([fakeInternacao()] as never);
  vi.mocked(p.internacao.findUnique).mockResolvedValue(fakeInternacao() as never);
  vi.mocked(p.internacao.create).mockResolvedValue(fakeInternacao() as never);
  vi.mocked(p.internacao.update).mockResolvedValue(fakeInternacao() as never);
  vi.mocked(p.internacao.delete).mockResolvedValue(undefined as never);
  vi.mocked(p.tutor.findFirst).mockResolvedValue(null);
  vi.mocked(p.tutor.create).mockResolvedValue({ id: 'tutor-1', nome: 'João', telefone: '11999', cpf: null, email: null, createdAt: new Date(), updatedAt: new Date() });
  vi.mocked(p.pet.findFirst).mockResolvedValue(null);
  vi.mocked(p.pet.create).mockResolvedValue({ id: 'pet-1', nome: 'Luna', especie: 'CANINO', raca: null, peso: null, dataNascimento: null, tutorId: 'tutor-1', createdAt: new Date(), updatedAt: new Date() });
  vi.mocked(p.medicacao.findFirst).mockResolvedValue({ id: 'med-1', nome: 'Dipirona', quantidade: 1, unidade: 'ml', via: 'Oral' } as never);
  vi.mocked(p.medicacao.update).mockResolvedValue({ dosesAplicadas: 1 } as never);
  vi.mocked(p.registroProntuario.findFirst).mockResolvedValue(null);
  vi.mocked(p.registroProntuario.findMany).mockResolvedValue([]);
  vi.mocked(p.registroProntuario.findUnique).mockResolvedValue(null);
  vi.mocked(p.registroProntuario.create).mockResolvedValue({ id: 'reg-1', tipo: 'MEDICACAO_ADMINISTRADA' } as never);
  vi.mocked(p.registroProntuario.delete).mockResolvedValue({ id: 'reg-1' } as never);
  vi.mocked(p.$transaction).mockResolvedValue([{ id: 'reg-1' }] as never);
});

describe('GET /api/internacoes', () => {
  it('retorna 200 com lista de internações', async () => {
    const res = await app.request('/api/internacoes');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('GET /api/internacoes/:id', () => {
  it('retorna 200 quando internação existe', async () => {
    const res = await app.request('/api/internacoes/int-1');
    expect(res.status).toBe(200);
  });

  it('retorna 404 quando internação não existe', async () => {
    const p = await prismaMock();
    vi.mocked(p.internacao.findUnique).mockResolvedValueOnce(null);
    const res = await app.request('/api/internacoes/nao-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/internacoes', () => {
  it('retorna 400 para dados inválidos', async () => {
    const res = await app.request('/api/internacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petNome: 'Luna' }),
    });
    expect(res.status).toBe(400);
  });

  it('retorna 201 para dados válidos', async () => {
    const res = await app.request('/api/internacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petNome: 'Luna',
        especie: 'Canina',
        tutorNome: 'João',
        tutorTelefone: '11999990001',
        status: 'estavel',
        proximaMedicacao: '08:00',
        observacao: '',
      }),
    });
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/internacoes/:id', () => {
  it('atualiza o status da internação', async () => {
    const res = await app.request('/api/internacoes/int-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'critico' }),
    });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/internacoes/:id/medicacoes/:medId/administrar', () => {
  it('registra a dose no prontuário e contabiliza a aplicação', async () => {
    const p = await prismaMock();
    const res = await app.request('/api/internacoes/int-1/medicacoes/med-1/administrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horarioProgramado: '2026-04-18T11:00:00.000Z', responsavel: 'Maria' }),
    });

    expect(res.status).toBe(201);
    expect(p.registroProntuario.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tipo: 'MEDICACAO_ADMINISTRADA',
        medicacaoId: 'med-1',
        responsavel: 'Maria',
      }),
    }));
    expect(p.$transaction).toHaveBeenCalledOnce();
  });

  it('não duplica uma administração já registrada para o horário', async () => {
    const p = await prismaMock();
    vi.mocked(p.registroProntuario.findFirst).mockResolvedValueOnce({ id: 'reg-existente' } as never);
    const res = await app.request('/api/internacoes/int-1/medicacoes/med-1/administrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horarioProgramado: '2026-04-18T11:00:00.000Z', responsavel: 'Maria' }),
    });

    expect(res.status).toBe(200);
    expect(p.$transaction).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/internacoes/:id/prontuario/:registroId', () => {
  it('remove uma administração e estorna o contador de doses', async () => {
    const p = await prismaMock();
    vi.mocked(p.registroProntuario.findUnique).mockResolvedValueOnce({
      id: 'reg-1', tipo: 'MEDICACAO_ADMINISTRADA', medicacaoId: 'med-1', internacaoId: 'int-1',
    } as never);
    const res = await app.request('/api/internacoes/int-1/prontuario/reg-1', { method: 'DELETE' });

    expect(res.status).toBe(204);
    expect(p.registroProntuario.delete).toHaveBeenCalledWith({ where: { id: 'reg-1' } });
    expect(p.$transaction).toHaveBeenCalledOnce();
    expect(p.medicacao.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { dosesAplicadas: { decrement: 1 } },
    }));
  });
});

describe('DELETE /api/internacoes/:id', () => {
  it('retorna 204 ao deletar', async () => {
    const res = await app.request('/api/internacoes/int-1', { method: 'DELETE' });
    expect(res.status).toBe(204);
  });
});
