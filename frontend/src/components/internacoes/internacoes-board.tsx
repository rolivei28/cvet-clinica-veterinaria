'use client';

import { useEffect, useMemo, useState } from 'react';
import { BedDouble, CalendarDays, CircleDollarSign, Search, X } from 'lucide-react';
import { Internacao, InternacaoStatus, NovaInternacao } from '@/types/internacao';
import { InternacaoCard } from './internacao-card';
import { InternacaoForm } from './internacao-form';

const STATUS_FILTROS: { value: InternacaoStatus; label: string }[] = [
  { value: 'critico',    label: 'Críticos'    },
  { value: 'observacao', label: 'Observação'  },
  { value: 'estavel',    label: 'Estáveis'    },
];

export function InternacoesBoard() {
  const [internacoes, setInternacoes]     = useState<Internacao[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [busca, setBusca]                 = useState('');
  const [filtroStatus, setFiltroStatus]   = useState<InternacaoStatus | null>(null);

  useEffect(() => {
    fetch('/api/internacoes')
      .then((res) => res.json())
      .then((data: Internacao[]) => setInternacoes(data))
      .catch(() => setError('Erro ao carregar internações.'))
      .finally(() => setLoading(false));
  }, []);

  const resumo = useMemo(() => ({
    total:      internacoes.length,
    criticos:   internacoes.filter((i) => i.status === 'critico').length,
    observacao: internacoes.filter((i) => i.status === 'observacao').length,
    estaveis:   internacoes.filter((i) => i.status === 'estavel').length,
  }), [internacoes]);

  const totalDiarias = useMemo(() => internacoes.reduce((total, internacao) => total + internacao.valorDiarias, 0), [internacoes]);

  const internacoesFiltradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return internacoes
      .filter((i) => !filtroStatus || i.status === filtroStatus)
      .filter((i) => !q || i.petNome.toLowerCase().includes(q) || i.tutorNome.toLowerCase().includes(q));
  }, [internacoes, busca, filtroStatus]);

  async function handleCreate(data: NovaInternacao): Promise<string | null> {
    const res = await fetch('/api/internacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return body?.error ?? body?.message ?? 'Não foi possível salvar a internação.';
    }
    const created: Internacao = await res.json();
    setInternacoes((current) => [created, ...current]);
    return null;
  }

  function toggleStatus(status: InternacaoStatus) {
    setFiltroStatus((prev) => (prev === status ? null : status));
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ResumoItem label="Internados" value={resumo.total} icon={BedDouble} />
        <ResumoItem label="Críticos" value={resumo.criticos} icon={CalendarDays} active={filtroStatus === 'critico'} onClick={() => toggleStatus('critico')} />
        <ResumoItem label="Observação" value={resumo.observacao} icon={CalendarDays} active={filtroStatus === 'observacao'} onClick={() => toggleStatus('observacao')} />
        <ResumoItem label="Estáveis" value={resumo.estaveis} icon={CalendarDays} active={filtroStatus === 'estavel'} onClick={() => toggleStatus('estavel')} />
        <ResumoItem label="Diárias previstas" value={`R$ ${totalDiarias.toFixed(2).replace('.', ',')}`} icon={CircleDollarSign} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink">Nova internação</h2><p className="mt-1 text-sm text-slate-500">Selecione um pet e um leito disponível para o período.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-lg bg-moss/10 px-3 py-2 text-sm font-semibold text-moss"><CalendarDays size={16} /> Período validado</span></div>
        <InternacaoForm onCreate={handleCreate} />
      </section>

      <section className="grid content-start gap-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por pet ou tutor…"
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-9 text-sm outline-none transition focus:border-moss"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {filtroStatus && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filtro:</span>
              {STATUS_FILTROS.filter((f) => f.value === filtroStatus).map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFiltroStatus(null)}
                  className="flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  {f.label} <X size={11} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading && <p className="text-sm text-slate-500">Carregando internações...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!loading && !error && internacoesFiltradas.length === 0 && (
            <p className="text-sm text-slate-500">{busca || filtroStatus ? 'Nenhum resultado para os filtros aplicados.' : 'Nenhuma internação ativa.'}</p>
          )}
          {!loading && !error && internacoesFiltradas.map((internacao) => (
            <InternacaoCard key={internacao.id} internacao={internacao} />
          ))}
        </div>
      </section>
    </div>
  );
}

type ResumoItemProps = {
  label: string;
  value: number | string;
  icon: typeof BedDouble;
  active?: boolean;
  onClick?: () => void;
};

function ResumoItem({ label, value, icon: Icon, active, onClick }: ResumoItemProps) {
  const base = 'rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition';
  const style = onClick
    ? `cursor-pointer select-none ${active ? 'bg-moss/10 ring-2 ring-moss/40' : 'bg-slate-50 hover:bg-slate-100'}`
    : '';

  return (
    <div className={`${base} ${style}`} onClick={onClick}>
      <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p><Icon size={16} className="text-moss" /></div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
