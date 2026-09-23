'use client';

import { FormEvent, useEffect, useState } from 'react';
import { WalletCards } from 'lucide-react';

type FormaPagamento = { id: string; nome: string };
type MedicacaoCobrada = { id: string; nome: string; quantidade: number; unidade: string; valorDose: number; dosesAplicadas: number };
type ItemFinanceiro = {
  id: string;
  petNome: string;
  tutorNome: string;
  leito: { nome: string } | null;
  pet: { tutor: { telefone: string } } | null;
  medicacoes: MedicacaoCobrada[];
  financeiro: { diarias: number; valorDiarias: number; valorMedicacoes: number; valorTotal: number; valorPago: number; saldo: number; encerrada: boolean };
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinanceiroPage() {
  const [internacoes, setInternacoes] = useState<ItemFinanceiro[]>([]);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const response = await fetch('/api/financeiro');
      const data = await response.json();
      setInternacoes(data.internacoes);
      setFormas(data.formasPagamento);
    } catch { setErro('Não foi possível carregar os dados financeiros.'); }
  }

  useEffect(() => { carregar(); }, []);

  async function registrarPagamento(event: FormEvent<HTMLFormElement>, internacaoId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/financeiro/pagamentos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internacaoId, formaPagamentoId: form.get('formaPagamentoId'), valor: Number(form.get('valor')), pagoEm: form.get('pagoEm') }),
    });
    if (!response.ok) { setErro('Não foi possível registrar o pagamento.'); return; }
    await carregar();
  }

  return <main className="flex min-h-full flex-col gap-6 p-6 lg:p-10">
    <header><p className="text-sm font-semibold uppercase tracking-[0.3em] text-moss">Financeiro</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">Diárias e pagamentos</h1><p className="mt-2 text-sm text-slate-500">O total inclui diárias e as doses de medicação efetivamente aplicadas.</p></header>
    {erro && <p role="alert" className="text-sm font-medium text-red-600">{erro}</p>}
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">
      {internacoes.map((item) => <article key={item.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div><div className="flex items-center gap-2"><WalletCards size={18} className="text-moss" /><h2 className="font-semibold text-ink">{item.petNome}</h2></div><p className="mt-1 text-sm text-slate-500">Tutor: {item.tutorNome} · {item.pet?.tutor.telefone ?? ''}</p><p className="mt-1 text-sm text-slate-500">{item.leito?.nome ?? 'Sem leito'} · {item.financeiro.diarias} diária(s) · {item.financeiro.encerrada ? 'Internação encerrada' : 'Em internação'}</p><MedicacoesAplicadas medicacoes={item.medicacoes} /></div>
        <div className="grid gap-2 text-sm lg:min-w-80"><p>Diárias: <strong>{money(item.financeiro.valorDiarias)}</strong> · Medicações: <strong>{money(item.financeiro.valorMedicacoes)}</strong></p><p>Total: <strong>{money(item.financeiro.valorTotal)}</strong> · Pago: {money(item.financeiro.valorPago)} · Saldo: <strong className="text-moss">{money(item.financeiro.saldo)}</strong></p>{!item.financeiro.encerrada && item.financeiro.saldo > 0 && <form onSubmit={(event) => registrarPagamento(event, item.id)} className="grid gap-2 sm:grid-cols-3"><select name="formaPagamentoId" required className="rounded-lg border border-slate-300 px-2 py-2 text-sm"><option value="">Pagamento</option>{formas.map((forma) => <option key={forma.id} value={forma.id}>{forma.nome}</option>)}</select><input name="valor" type="number" min="0.01" step="0.01" value={item.financeiro.saldo} readOnly required className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-600" /><input name="pagoEm" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="rounded-lg border border-slate-300 px-2 py-2 text-sm" /><button className="rounded-lg bg-moss px-3 py-2 text-sm font-semibold text-white sm:col-span-3">Quitar e encerrar internação</button></form>}</div>
      </article>)}
      {internacoes.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nenhuma internação para exibir.</p>}
    </div></section>
  </main>;
}

function MedicacoesAplicadas({ medicacoes }: { medicacoes: MedicacaoCobrada[] }) {
  const aplicadas = medicacoes.filter((medicacao) => medicacao.dosesAplicadas > 0);
  return <div className="mt-4 overflow-x-auto rounded-md border border-slate-200"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 font-semibold">Medicação aplicada</th><th className="px-3 py-2 font-semibold">Unidade por dose</th><th className="px-3 py-2 font-semibold">Unidades aplicadas</th><th className="px-3 py-2 font-semibold">Preço unitário</th><th className="px-3 py-2 text-right font-semibold">Valor total</th></tr></thead><tbody className="divide-y divide-slate-100">{aplicadas.map((medicacao) => <tr key={medicacao.id}><td className="px-3 py-2 text-slate-800">{medicacao.nome}</td><td className="px-3 py-2">{medicacao.quantidade} {medicacao.unidade}</td><td className="px-3 py-2">{medicacao.dosesAplicadas} dose(s)</td><td className="px-3 py-2">{money(medicacao.valorDose)}</td><td className="px-3 py-2 text-right font-medium">{money(medicacao.valorDose * medicacao.dosesAplicadas)}</td></tr>)}{aplicadas.length === 0 && <tr><td colSpan={5} className="px-3 py-3 text-slate-500">Nenhuma dose aplicada registrada.</td></tr>}</tbody></table></div>;
}