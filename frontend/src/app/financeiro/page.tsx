'use client';

import { FormEvent, useEffect, useState } from 'react';
import { WalletCards, BedDouble, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { PrintModal } from '@/components/print-modal';
import { FechamentoFinanceiroPrint } from '@/components/financeiro/fechamento-print';

type FormaPagamento = { id: string; nome: string };
type ItemFinanceiro = {
  id: string;
  petNome: string;
  tutorNome: string;
  pesoMomento?: number | null;
  entradaEm: string;
  dataSaida?: string | null;
  leito: { nome: string; tipo?: 'N' | 'I' } | null;
  pet: { peso?: number | null; tutor: { nome: string; telefone: string } } | null;
  financeiro: {
    diarias: number;
    valorDiaria: number;
    valorDiarias: number;
    faixaDescricao?: string;
    peso: number;
    tipoLeito: string;
    custoMedicacoes: number;
    valorTotal: number;
    valorPago: number;
    saldo: number;
    encerrada: boolean;
  };
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinanceiroPage() {
  const [internacoes, setInternacoes] = useState<ItemFinanceiro[]>([]);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<'TODOS' | 'ATIVAS' | 'ENCERRADAS'>('TODOS');
  const [aba, setAba] = useState<'EXTRATO' | 'BALANCO'>('EXTRATO');
  const [printId, setPrintId] = useState<string | null>(null);

  async function carregar() {
    try {
      const response = await fetch('/api/financeiro');
      const data = await response.json();
      setInternacoes(data.internacoes);
      setFormas(data.formasPagamento);
    } catch {
      setErro('Não foi possível carregar o extrato financeiro das internações.');
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de dados
    carregar();
  }, []);

  async function registrarPagamento(event: FormEvent<HTMLFormElement>, internacaoId: string) {
    event.preventDefault();
    setErro('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/financeiro/pagamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internacaoId,
        formaPagamentoId: form.get('formaPagamentoId'),
        valor: Number(form.get('valor')),
        pagoEm: form.get('pagoEm'),
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setErro(body?.error ?? 'Não foi possível registrar o pagamento.');
      return;
    }
    await carregar();
  }

  // Extrato: apenas internações em andamento. Balanço: todas (filtráveis).
  const internacoesExtrato = internacoes.filter((item) => !item.financeiro.encerrada);
  const internacoesBalanco = internacoes.filter((item) => {
    if (filtro === 'ATIVAS') return !item.financeiro.encerrada;
    if (filtro === 'ENCERRADAS') return item.financeiro.encerrada;
    return true;
  });

  return (
    <main className="flex min-h-full flex-col gap-6 p-6 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <WalletCards size={22} className="text-moss" />
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-moss">Extrato de Gastos</p>
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
            Extrato de Gastos da Internação
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Detalhamento da diária de leito cobrada pelo peso do animal (fração de até 24h). Medicamentos e materiais não são cobrados do tutor.
          </p>
        </div>

        {aba === 'BALANCO' && <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm">
          <button
            onClick={() => setFiltro('ATIVAS')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${filtro === 'ATIVAS' ? 'bg-moss text-white' : 'text-slate-600 hover:text-ink'}`}
          >
            Em Internação
          </button>
          <button
            onClick={() => setFiltro('ENCERRADAS')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${filtro === 'ENCERRADAS' ? 'bg-moss text-white' : 'text-slate-600 hover:text-ink'}`}
          >
            Encerradas / Baixadas
          </button>
          <button
            onClick={() => setFiltro('TODOS')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${filtro === 'TODOS' ? 'bg-moss text-white' : 'text-slate-600 hover:text-ink'}`}
          >
            Todas
          </button>
        </div>}
      </header>

      {erro && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{erro}</span>
        </div>
      )}

      <div className="print-hide inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm">
        <button
          onClick={() => setAba('EXTRATO')}
          className={`rounded-lg px-3 py-1.5 font-medium transition ${aba === 'EXTRATO' ? 'bg-ink text-white' : 'text-slate-600 hover:text-ink'}`}
        >
          Extrato
        </button>
        <button
          onClick={() => setAba('BALANCO')}
          className={`rounded-lg px-3 py-1.5 font-medium transition ${aba === 'BALANCO' ? 'bg-ink text-white' : 'text-slate-600 hover:text-ink'}`}
        >
          Balanço
        </button>
      </div>

      {aba === 'BALANCO' && <BalancoTabela itens={internacoesBalanco} />}

      <div className={`space-y-6 ${aba === 'BALANCO' ? 'hidden' : ''}`}>
        {internacoesExtrato.map((item) => {
          const peso = item.financeiro.peso ?? item.pesoMomento ?? item.pet?.peso ?? 5.0;
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden"
            >
              {/* Header do Card */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-ink">{item.petNome}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-700">
                      Peso: {peso} kg
                    </span>
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                        item.financeiro.encerrada
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {item.financeiro.encerrada ? 'Internação Encerrada' : 'Em Internação'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Tutor: <strong className="text-slate-700">{item.pet?.tutor.nome ?? 'Não informado'}</strong> · Tel: {item.pet?.tutor.telefone ?? '-'}
                  </p>
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                  <span className="text-xs uppercase text-slate-400">Total a Pagar na Internação</span>
                  <p className="text-2xl font-bold text-ink">{money(item.financeiro.valorTotal)}</p>
                  <button
                    onClick={() => setPrintId(item.id)}
                    className="print-hide flex items-center gap-1.5 rounded-lg border border-moss/30 bg-moss/5 px-3 py-1.5 text-xs font-semibold text-moss hover:bg-moss/10 transition"
                  >
                    <Printer size={13} />
                    Imprimir Fechamento
                  </button>
                </div>
              </div>

              {/* Extrato do Leito */}
              <div className="mt-5">
                {/* Bloco 1: Detalhamento do Leito por Peso */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center gap-2 text-moss font-semibold text-sm mb-3">
                    <BedDouble size={16} />
                    <span>Cobrança de Leito (por Peso em ciclos de até 24h)</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Leito / Tipo:</span>
                      <span className="font-semibold text-slate-800">
                        {item.leito?.nome ?? 'Leito padrão'} ({item.financeiro.tipoLeito})
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Faixa Tarifária Aplicada:</span>
                      <span className="font-medium text-slate-800">
                        {item.financeiro.faixaDescricao || `Faixa para ${peso} kg`}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Diária de até 24h:</span>
                      <span className="font-medium text-slate-800">{money(item.financeiro.valorDiaria)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Ciclos de Diária (frações de 24h):</span>
                      <span className="font-medium text-slate-800">{item.financeiro.diarias} diária(s)</span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-bold text-ink">
                      <span>Subtotal Leito:</span>
                      <span className="text-moss">{money(item.financeiro.valorDiarias)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bloco 3: Resumo de Pagamento e Quitação */}
              <div className="mt-5 border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Total Cobrado</span>
                    <strong className="text-base text-ink">{money(item.financeiro.valorTotal)}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Total Quitado</span>
                    <span className="text-base text-slate-600 font-medium">{money(item.financeiro.valorPago)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Saldo Restante</span>
                    <strong className={`text-base ${item.financeiro.saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {money(item.financeiro.saldo)}
                    </strong>
                  </div>
                </div>

                {!item.financeiro.encerrada && item.financeiro.saldo > 0 ? (
                  <form
                    onSubmit={(event) => registrarPagamento(event, item.id)}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <select
                      name="formaPagamentoId"
                      required
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-moss"
                    >
                      <option value="">Forma de pagamento</option>
                      {formas.map((forma) => (
                        <option key={forma.id} value={forma.id}>
                          {forma.nome}
                        </option>
                      ))}
                    </select>

                    <input
                      name="valor"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.financeiro.saldo}
                      readOnly
                      required
                      className="w-28 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                    />

                    <input
                      name="pagoEm"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      required
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-moss"
                    />

                    <button
                      type="submit"
                      className="rounded-xl bg-moss px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-moss/90 transition"
                    >
                      Quitar e Dar Baixa
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={16} />
                    <span>Conta quitada integralmente</span>
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {internacoesExtrato.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            <p className="text-sm">Nenhuma internação em andamento.</p>
          </div>
        )}
      </div>

      {/* Modal de Impressão do Fechamento Financeiro */}
      {printId && (() => {
        const printItem = internacoes.find((i) => i.id === printId);
        if (!printItem) return null;
        return (
          <PrintModal
            open={true}
            onClose={() => setPrintId(null)}
            title={`Fechamento Financeiro — ${printItem.petNome}`}
          >
            <FechamentoFinanceiroPrint item={printItem} />
          </PrintModal>
        );
      })()}
    </main>
  );
}

function BalancoTabela({ itens }: { itens: ItemFinanceiro[] }) {
  const total = itens.reduce(
    (acc, item) => ({
      leito: acc.leito + item.financeiro.valorDiarias,
      custo: acc.custo + item.financeiro.custoMedicacoes,
      gasto: acc.gasto + item.financeiro.valorTotal,
      pago: acc.pago + item.financeiro.valorPago,
      saldo: acc.saldo + item.financeiro.saldo,
    }),
    { leito: 0, custo: 0, gasto: 0, pago: 0, saldo: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs uppercase text-slate-400">Total a Receber (diárias)</span>
          <p className="text-2xl font-bold text-ink">{money(total.gasto)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs uppercase text-slate-400">Total Recebido</span>
          <p className="text-2xl font-bold text-emerald-600">{money(total.pago)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs uppercase text-slate-400">Saldo em Aberto</span>
          <p className="text-2xl font-bold text-amber-600">{money(total.saldo)}</p>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 shadow-sm sm:col-span-3">
          <span className="text-xs uppercase text-slate-400">Custo interno com medicamentos e materiais (não cobrado do tutor)</span>
          <p className="text-2xl font-bold text-slate-700">{money(total.custo)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Pet / Tutor</th>
              <th className="px-4 py-3 font-semibold">Situação</th>
              <th className="px-4 py-3 text-right font-semibold">Leito</th>
                            <th className="px-4 py-3 text-right font-semibold">Total Cobrado</th>
              <th className="px-4 py-3 text-right font-semibold">Pago</th>
              <th className="px-4 py-3 text-right font-semibold">Saldo</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-400">Custo interno (medic./mat.)</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <strong className="text-ink">{item.petNome}</strong>
                  <span className="block text-xs text-slate-500">{item.pet?.tutor.nome ?? item.tutorNome}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{item.financeiro.encerrada ? 'Encerrada' : 'Em internação'}</td>
                <td className="px-4 py-3 text-right">{money(item.financeiro.valorDiarias)}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink">{money(item.financeiro.valorTotal)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{money(item.financeiro.valorPago)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${item.financeiro.saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {money(item.financeiro.saldo)}
                </td>
                <td className="px-4 py-3 text-right text-slate-500">{money(item.financeiro.custoMedicacoes)}</td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  Nenhuma internação encontrada para este filtro.
                </td>
              </tr>
            )}
          </tbody>
          {itens.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-bold text-ink">
              <tr>
                <td className="px-4 py-3" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right">{money(total.leito)}</td>
                <td className="px-4 py-3 text-right">{money(total.gasto)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{money(total.pago)}</td>
                <td className="px-4 py-3 text-right text-amber-600">{money(total.saldo)}</td>
                <td className="px-4 py-3 text-right text-slate-500">{money(total.custo)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
