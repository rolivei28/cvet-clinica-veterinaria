import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { calcularDiariasPorPeso, FaixaPreco, FAIXAS_PADRAO } from '../lib/calculo-diarias.js';
import { internacaoRepository } from '../repositories/internacao.repository.js';
import { pagamentoRepository } from '../repositories/pagamento.repository.js';
import { formaPagamentoRepository } from '../repositories/formaPagamento.repository.js';

const pagamentoSchema = z.object({
  internacaoId: z.string().min(1),
  formaPagamentoId: z.string().min(1),
  valor: z.number().positive(),
  pagoEm: z.string().date().optional(),
});

const TOLERANCIA_SALDO = 1.0;

function resumoFinanceiro(
  internacao: {
    entradaEm: Date;
    dataSaida: Date | null;
    baixa: boolean;
    quantidadeDiarias: number;
    valorDiarias: number;
    pesoMomento: number | null;
    pet?: { peso: number | null } | null;
    leito: { tipo: string } | null;
    medicacoes: { valorDose: number; dosesAplicadas: number }[];
    pagamentos: { valor: number }[];
  },
  faixas: FaixaPreco[] = FAIXAS_PADRAO
) {
  const hoje = new Date();
  const fim = internacao.baixa
    ? internacao.dataSaida ?? internacao.entradaEm
    : internacao.dataSaida && internacao.dataSaida < hoje ? internacao.dataSaida : hoje;
  const peso = internacao.pesoMomento ?? internacao.pet?.peso ?? 5.0;
  const tipoLeito = internacao.leito?.tipo ?? 'NORMAL';

  const calculoLeito = calcularDiariasPorPeso(peso, tipoLeito, internacao.entradaEm, fim, faixas);
  const diarias = internacao.baixa ? internacao.quantidadeDiarias : calculoLeito.quantidadeDiarias;
  const valorDiaria = calculoLeito.valorDiaria;
  const valorDiarias = internacao.baixa ? internacao.valorDiarias : calculoLeito.valorDiarias;
  const faixaDescricao = calculoLeito.faixaDescricao;

  const valorMedicacoes = internacao.medicacoes.reduce((total, medicacao) => total + medicacao.valorDose * medicacao.dosesAplicadas, 0);
  const valorTotal = valorDiarias + valorMedicacoes;
  const valorPago = internacao.pagamentos.reduce((total, pagamento) => total + pagamento.valor, 0);
  return {
    diarias,
    valorDiaria,
    valorDiarias,
    faixaDescricao,
    peso,
    tipoLeito: calculoLeito.tipoLeito,
    valorMedicacoes,
    valorTotal,
    valorPago,
    saldo: Math.max(0, valorTotal - valorPago),
    encerrada: internacao.baixa,
  };
}

function calcularCobranca(
  internacao: {
    entradaEm: Date;
    pesoMomento: number | null;
    pet?: { peso: number | null } | null;
    leito: { tipo: string } | null;
    medicacoes: { valorDose: number; dosesAplicadas: number }[];
    pagamentos: { valor: number }[];
  },
  encerradaEm: Date,
  faixas: FaixaPreco[] = FAIXAS_PADRAO
) {
  const peso = internacao.pesoMomento ?? internacao.pet?.peso ?? 5.0;
  const tipoLeito = internacao.leito?.tipo ?? 'NORMAL';

  const calculoLeito = calcularDiariasPorPeso(peso, tipoLeito, internacao.entradaEm, encerradaEm, faixas);
  const diarias = calculoLeito.quantidadeDiarias;
  const valorDiaria = calculoLeito.valorDiaria;
  const valorDiarias = calculoLeito.valorDiarias;
  const faixaDescricao = calculoLeito.faixaDescricao;

  const valorMedicacoes = internacao.medicacoes.reduce((total, medicacao) => total + medicacao.valorDose * medicacao.dosesAplicadas, 0);
  const valorTotal = valorDiarias + valorMedicacoes;
  const valorPago = internacao.pagamentos.reduce((total, pagamento) => total + pagamento.valor, 0);
  return { diarias, valorDiaria, valorDiarias, faixaDescricao, peso, valorMedicacoes, valorTotal, saldo: Math.max(0, valorTotal - valorPago) };
}

export const financeiroRoutes = new Hono()
  .get('/', async (c) => {
    const [internacoes, formasPagamento, faixasPreco] = await Promise.all([
      internacaoRepository.listarComFinanceiro(),
      formaPagamentoRepository.listar(),
      prisma.tabelaPrecoDiaria.findMany(),
    ]);
    const faixas = faixasPreco.length > 0 ? faixasPreco : FAIXAS_PADRAO;
    return c.json({
      internacoes: internacoes.map((internacao) => ({ ...internacao, financeiro: resumoFinanceiro(internacao, faixas) })),
      formasPagamento,
    });
  })
  .post('/pagamentos', zValidator('json', pagamentoSchema), async (c) => {
    const { internacaoId, formaPagamentoId, valor, pagoEm } = c.req.valid('json');
    const [internacao, faixasPreco] = await Promise.all([
      internacaoRepository.buscarComLeitoEMedicacoes(internacaoId),
      prisma.tabelaPrecoDiaria.findMany(),
    ]);
    if (!internacao) return c.json({ error: 'Internação não encontrada.' }, 404);
    if (internacao.baixa) return c.json({ error: 'Esta internação já foi encerrada.' }, 409);

    // pagoEm é só uma data: se for hoje (ou futura), usa o instante atual, igual ao saldo exibido na tela.
    // Em datas passadas, usa o fim do dia, sem nunca ficar antes da entrada.
    const agora = new Date();
    let encerradaEm = agora;
    if (pagoEm) {
      const fimDoDia = new Date(`${pagoEm}T23:59:59.999Z`);
      encerradaEm = fimDoDia < agora ? fimDoDia : agora;
    }
    // Igual ao extrato (resumoFinanceiro): se a saída já passou, a cobrança vai só até ela.
    if (internacao.dataSaida && internacao.dataSaida < encerradaEm) encerradaEm = internacao.dataSaida;
    if (encerradaEm < internacao.entradaEm) encerradaEm = internacao.entradaEm;

    const faixas = faixasPreco.length > 0 ? faixasPreco : FAIXAS_PADRAO;
    const cobranca = calcularCobranca(internacao, encerradaEm, faixas);
    // O saldo cresce com o tempo (diária proporcional), então o valor exibido na tela já nasce defasado.
    // Aceita uma margem e registra o saldo real calculado agora.
    if (cobranca.saldo <= 0) return c.json({ error: 'Esta internação não possui saldo a pagar.' }, 400);
    if (Math.abs(valor - cobranca.saldo) > TOLERANCIA_SALDO) {
      return c.json({ error: `O pagamento deve quitar o saldo de R$ ${cobranca.saldo.toFixed(2)}.` }, 400);
    }
    const valorQuitacao = Math.round(cobranca.saldo * 100) / 100;

    const pagamento = await prisma.$transaction(async (tx) => {
      const registrado = await pagamentoRepository.criar({ internacaoId, formaPagamentoId, valor: valorQuitacao, pagoEm: encerradaEm }, tx);
      await internacaoRepository.baixar(internacaoId, { baixa: true, dataSaida: encerradaEm, quantidadeDiarias: cobranca.diarias, valorDiarias: cobranca.valorDiarias }, tx);
      return registrado;
    });
    return c.json(pagamento, 201);
  });
