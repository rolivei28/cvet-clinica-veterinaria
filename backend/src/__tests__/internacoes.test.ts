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
    pet: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tabelaPrecoDiaria: {
      findMany: vi.fn(),
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

vi.mock('../repositories/internacao.repository.js', () => ({
  internacaoRepository: {
    listarAtivas:          vi.fn(),
    listarComFinanceiro:   vi.fn(),
    buscarPorId:           vi.fn(),
    buscarComLeitoEMedicacoes: vi.fn(),
    verificarConflitoLeito: vi.fn(),
    criar:                 vi.fn(),
    atualizarStatus:       vi.fn(),
    remover:               vi.fn(),
    baixar:                vi.fn(),
    adicionarMedicacao:    vi.fn(),
    atualizarMedicacao:    vi.fn(),
    removerMedicacao:      vi.fn(),
  },
}));

vi.mock('../repositories/leito.repository.js', () => ({
  leitoRepository: {
    buscarPorId: vi.fn(),
  },
}));

vi.mock('../repositories/pet.repository.js', () => ({
  petRepository: {
    buscarPorId: vi.fn(),
    atualizarPeso: vi.fn(),
  },
}));

const fakeInternacao = () => ({
  id: 'int-1',
  petNome: 'Luna',
  especie: 'CANINO',
  tutorNome: 'João',
  entradaEm: new Date('2026-04-18T00:00:00.000Z'),
  dataSaida: new Date('2026-04-20T00:00:00.000Z'),
  descricao: 'Observação pós-cirúrgica',
  quantidadeDiarias: 2,
  valorDiarias: 200,
  status: 'estavel',
  baixa: false,
  proximaMedicacao: '08:00',
  observacao: '',
  petId: 'pet-1',
  leitoId: '101',
  createdAt: new Date(),
  updatedAt: new Date(),
  medicacoes: [],
  pet: null,
  leito: null,
});

const fakeLeito = () => ({
  id: '101', nome: 'Leito 101', tipo: 'N', valorDiaria: 100, createdAt: new Date(), updatedAt: new Date(),
});

const fakePet = () => ({
  id: 'pet-1', nome: 'Luna', especie: 'CANINO', raca: null, dataNascimento: null, tutorId: 'tutor-1',
  createdAt: new Date(), updatedAt: new Date(),
  tutor: { id: 'tutor-1', nome: 'João', telefone: '11999990001', cpf: null, email: null, createdAt: new Date(), updatedAt: new Date() },
});

const app = new Hono().route('/api/internacoes', internacoesRoutes);

async function repos() {
  const { internacaoRepository } = await import('../repositories/internacao.repository.js');
  const { leitoRepository } = await import('../repositories/leito.repository.js');
  const { petRepository } = await import('../repositories/pet.repository.js');
  return { internacaoRepository, leitoRepository, petRepository };
}

async function prismaMock() {
  const { prisma } = await import('../lib/prisma.js');
  return prisma;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const p = await prismaMock();
  vi.mocked(p.internacao.findMany).mockResolvedValue([fakeInternacao()] as never);
  vi.mocked(p.internacao.findUnique).mockResolvedValue(fakeInternacao() as never);
  vi.mocked(p.internacao.create).mockResolvedValue(fakeInternacao() as never);
  vi.mocked(p.internacao.update).mockResolvedValue(fakeInternacao() as never);
  vi.mocked(p.internacao.delete).mockResolvedValue(undefined as never);
  vi.mocked(p.pet.findUnique).mockResolvedValue(fakePet() as never);
  vi.mocked(p.pet.update).mockResolvedValue(fakePet() as never);
  vi.mocked(p.tabelaPrecoDiaria.findMany).mockResolvedValue([]);
  vi.mocked(p.medicacao.findFirst).mockResolvedValue({ id: 'med-1', nome: 'Dipirona', quantidade: 1, unidade: 'ml', via: 'Oral', dosesAplicadas: 1 } as never);
  vi.mocked(p.medicacao.update).mockResolvedValue({ dosesAplicadas: 1 } as never);
  vi.mocked(p.registroProntuario.findFirst).mockResolvedValue(null);
  vi.mocked(p.registroProntuario.findMany).mockResolvedValue([]);
  vi.mocked(p.registroProntuario.findUnique).mockResolvedValue(null);
  vi.mocked(p.registroProntuario.create).mockResolvedValue({ id: 'reg-1', tipo: 'MEDICACAO_ADMINISTRADA' } as never);
  vi.mocked(p.registroProntuario.delete).mockResolvedValue({ id: 'reg-1' } as never);
  vi.mocked(p.$transaction).mockResolvedValue([{ id: 'reg-1' }] as never);
  const { internacaoRepository, leitoRepository, petRepository } = await repos();
  vi.mocked(internacaoRepository.listarComFinanceiro).mockResolvedValue([fakeInternacao()] as never);
  vi.mocked(internacaoRepository.listarAtivas).mockResolvedValue([fakeInternacao()] as never);
  vi.mocked(internacaoRepository.buscarPorId).mockResolvedValue(fakeInternacao() as never);
  vi.mocked(internacaoRepository.buscarComLeitoEMedicacoes).mockResolvedValue(fakeInternacao() as never);
  vi.mocked(internacaoRepository.verificarConflitoLeito).mockResolvedValue(null as never);
  vi.mocked(internacaoRepository.criar).mockResolvedValue(fakeInternacao() as never);
  vi.mocked(internacaoRepository.atualizarStatus).mockResolvedValue(fakeInternacao() as never);
  vi.mocked(internacaoRepository.remover).mockResolvedValue(undefined as never);
  vi.mocked(leitoRepository.buscarPorId).mockResolvedValue(fakeLeito() as never);
  vi.mocked(petRepository.buscarPorId).mockResolvedValue(fakePet() as never);
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
    const { internacaoRepository } = await repos();
    vi.mocked(internacaoRepository.buscarPorId).mockResolvedValueOnce(null as never);
    const res = await app.request('/api/internacoes/nao-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/internacoes', () => {
  it('retorna 400 para dados inválidos', async () => {
    const res = await app.request('/api/internacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId: 'pet-1' }),
    });
    expect(res.status).toBe(400);
  });

  it('retorna 201 para dados válidos', async () => {
    const res = await app.request('/api/internacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petId: 'pet-1',
        leitoId: '101',
        entradaEm: '2026-04-18',
        dataSaida: '2026-04-20',
        descricao: 'Observação pós-cirúrgica',
        status: 'estavel',
        proximaMedicacao: '08:00',
        observacao: '',
      }),
    });
    expect(res.status).toBe(201);
  });

  it('retorna 409 quando o leito já está reservado no período', async () => {
    const { internacaoRepository } = await repos();
    vi.mocked(internacaoRepository.verificarConflitoLeito).mockResolvedValueOnce({
      petNome: 'Rex', entradaEm: new Date('2026-04-17'), dataSaida: new Date('2026-04-21'),
    } as never);
    const res = await app.request('/api/internacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petId: 'pet-1',
        leitoId: '101',
        entradaEm: '2026-04-18',
        dataSaida: '2026-04-20',
        descricao: 'Observação pós-cirúrgica',
      }),
    });
    expect(res.status).toBe(409);
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
