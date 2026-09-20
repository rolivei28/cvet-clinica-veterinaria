import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { internacoesRoutes } from '../routes/internacoes.js';

vi.mock('../repositories/internacao.repository.js', () => ({
  internacaoRepository: {
    listarAtivas:          vi.fn(),
    buscarPorId:           vi.fn(),
    verificarConflitoLeito: vi.fn(),
    criar:                 vi.fn(),
    atualizarStatus:       vi.fn(),
    remover:               vi.fn(),
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

beforeEach(async () => {
  const { internacaoRepository, leitoRepository, petRepository } = await repos();
  vi.mocked(internacaoRepository.listarAtivas).mockResolvedValue([fakeInternacao()] as never);
  vi.mocked(internacaoRepository.buscarPorId).mockResolvedValue(fakeInternacao() as never);
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

describe('DELETE /api/internacoes/:id', () => {
  it('retorna 204 ao deletar', async () => {
    const res = await app.request('/api/internacoes/int-1', { method: 'DELETE' });
    expect(res.status).toBe(204);
  });
});
