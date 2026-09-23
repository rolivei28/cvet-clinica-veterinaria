import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { internacaoRepository } from '../repositories/internacao.repository.js';
import { pagamentoRepository } from '../repositories/pagamento.repository.js';
import { formaPagamentoRepository } from '../repositories/formaPagamento.repository.js';

const pagamentoSchema = z.object({
  internacaoId: z.string().min(1),
  formaPagamentoId: z.string().min(1),
  valor: z.number().positive(),
  pagoEm: z.string().date().optional(),
});

function resumoFinanceiro(internacao: { entradaEm: Date; dataSaida: Date | null; baixa: boolean; quantidadeDiarias: number; valorDiarias: number; leito: { valorDiaria: number } | null; medicacoes: { valorDose: number; dosesAplicadas: number }[]; pagamentos: { valor: number }[] }) {
  const valorMedicacoes = internacao.medicacoes.reduce((total, medicacao) => total + medicacao.valorDose * medicacao.dosesAplicadas, 0);
  const valorPago = internacao.pagamentos.reduce((total, pagamento) => total + pagamento.valor, 0);

  // Internação encerrada: usa os valores congelados na quitação, não o preço atual do leito.
  if (internacao.baixa) {
    const valorTotal = internacao.valorDiarias + valorMedicacoes;
    return { diarias: internacao.quantidadeDiarias, valorDiarias: internacao.valorDiarias, valorMedicacoes, valorTotal, valorPago, saldo: Math.max(0, valorTotal - valorPago), encerrada: true };
  }

  const hoje = new Date();
  const fim = internacao.dataSaida && internacao.dataSaida < hoje ? internacao.dataSaida : hoje;
  const diarias = Math.max(1, Math.ceil((fim.getTime() - internacao.entradaEm.getTime()) / 86_400_000));
  const valorDiarias = diarias * (internacao.leito?.valorDiaria ?? 0);
  const valorTotal = valorDiarias + valorMedicacoes;
  return { diarias, valorDiarias, valorMedicacoes, valorTotal, valorPago, saldo: Math.max(0, valorTotal - valorPago), encerrada: false };
}

function calcularCobranca(internacao: { entradaEm: Date; leito: { valorDiaria: number } | null; medicacoes: { valorDose: number; dosesAplicadas: number }[]; pagamentos: { valor: number }[] }, encerradaEm: Date) {
  const diarias = Math.max(1, Math.ceil((encerradaEm.getTime() - internacao.entradaEm.getTime()) / 86_400_000));
  const valorDiarias = diarias * (internacao.leito?.valorDiaria ?? 0);
  const valorMedicacoes = internacao.medicacoes.reduce((total, medicacao) => total + medicacao.valorDose * medicacao.dosesAplicadas, 0);
  const valorTotal = valorDiarias + valorMedicacoes;
  const valorPago = internacao.pagamentos.reduce((total, pagamento) => total + pagamento.valor, 0);
  return { diarias, valorDiarias, valorMedicacoes, valorTotal, saldo: Math.max(0, valorTotal - valorPago) };
}

export const financeiroRoutes = new Hono()
  .get('/', async (c) => {
    const [internacoes, formasPagamento] = await Promise.all([
      internacaoRepository.listarComFinanceiro(),
      formaPagamentoRepository.listar(),
    ]);
    return c.json({ internacoes: internacoes.map((internacao) => ({ ...internacao, financeiro: resumoFinanceiro(internacao) })), formasPagamento });
  })
  .post('/pagamentos', zValidator('json', pagamentoSchema), async (c) => {
    const { internacaoId, formaPagamentoId, valor, pagoEm } = c.req.valid('json');
    const encerradaEm = pagoEm ? new Date(`${pagoEm}T12:00:00.000Z`) : new Date();
    const internacao = await internacaoRepository.buscarComLeitoEMedicacoes(internacaoId);
    if (!internacao) return c.json({ error: 'Internação não encontrada.' }, 404);
    if (internacao.baixa) return c.json({ error: 'Esta internação já foi encerrada.' }, 409);

    const cobranca = calcularCobranca(internacao, encerradaEm);
    if (Math.abs(valor - cobranca.saldo) > 0.01) {
      return c.json({ error: `O pagamento deve quitar o saldo de R$ ${cobranca.saldo.toFixed(2)}.` }, 400);
    }

    const pagamento = await prisma.$transaction(async (tx) => {
      const registrado = await pagamentoRepository.criar({ internacaoId, formaPagamentoId, valor, pagoEm: encerradaEm }, tx);
      await internacaoRepository.baixar(internacaoId, { baixa: true, dataSaida: encerradaEm, quantidadeDiarias: cobranca.diarias, valorDiarias: cobranca.valorDiarias }, tx);
      return registrado;
    });
    return c.json(pagamento, 201);
  });
