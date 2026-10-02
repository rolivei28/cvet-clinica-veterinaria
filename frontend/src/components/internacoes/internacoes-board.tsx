'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BedDouble, CalendarDays, ChevronDown, ChevronUp, CircleDollarSign, Plus, Save, Search, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { Internacao, InternacaoStatus, Medicacao, NovaInternacao } from '@/types/internacao';
import { resolverProximaMedicacao } from '@/lib/horarios';
import { InternacaoCard } from './internacao-card';
import { InternacaoForm } from './internacao-form';
import { StatusBadge } from './status-badge';

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

type LinhaInternacaoProps = {
  internacao: Internacao;
  expandida: boolean;
  onAlternarMedicacoes: () => void;
  onAtualizarMedicacoes: (medicacoes: Medicacao[]) => void;
};

function LinhaInternacao({ internacao, expandida, onAlternarMedicacoes, onAtualizarMedicacoes }: LinhaInternacaoProps) {
  const entrada = new Date(internacao.entradaEm).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return <>
    <tr className="transition hover:bg-moss/5">
      <td className="px-5 py-4"><p className="font-semibold text-slate-900">{internacao.petNome}</p><p className="mt-0.5 text-xs text-slate-500">{internacao.especie} · Tutor: {internacao.tutorNome}</p></td>
      <td className="px-5 py-4"><StatusBadge status={internacao.status} /></td>
      <td className="px-5 py-4">{internacao.leito ? `${internacao.leito.id} - ${internacao.leito.nome}` : 'Não definido'}</td>
      <td className="whitespace-nowrap px-5 py-4">{entrada}</td>
      <td className="px-5 py-4">{resolverProximaMedicacao(internacao)}</td>
      <td className="whitespace-nowrap px-5 py-4">{internacao.quantidadeDiarias.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} · R$ {internacao.valorDiarias.toFixed(2).replace('.', ',')}</td>
      <td className="px-3 py-4 text-right"><div className="flex justify-end gap-1">
        <button type="button" onClick={onAlternarMedicacoes} aria-label={`Gerenciar medicações de ${internacao.petNome}`} title="Gerenciar medicações" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-moss transition hover:bg-moss/10">
          {expandida ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
        <Link href={`/internacoes/${internacao.id}`} aria-label={`Abrir internação de ${internacao.petNome}`} title={`Abrir internação de ${internacao.petNome}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-moss transition hover:bg-moss/10"><ArrowUpRight size={17} /></Link>
      </div></td>
    </tr>
    {expandida && <tr className="bg-slate-50"><td colSpan={7} className="px-5 py-4"><TabelaMedicacoes internacao={internacao} onAtualizar={onAtualizarMedicacoes} /></td></tr>}
  </>;
}

const NOVA_MEDICACAO: Omit<Medicacao, 'id' | 'horarios'> = {
  nome: '', descricao: '', cor: 'bg-teal-500', via: 'Oral', unidade: 'mg', quantidade: 1, valorDose: 0, dosesAplicadas: 0, primeiroHorario: '08:00', frequenciaHoras: 8,
};

function TabelaMedicacoes({ internacao, onAtualizar }: { internacao: Internacao; onAtualizar: (medicacoes: Medicacao[]) => void }) {
  const [novaMedicacao, setNovaMedicacao] = useState(NOVA_MEDICACAO);
  const [salvando, setSalvando] = useState<string | null>(null);

  function editarLocal(medId: string, campo: keyof Medicacao, valor: string | number) {
    onAtualizar(internacao.medicacoes.map((med) => med.id === medId ? { ...med, [campo]: valor } : med));
  }

  async function salvar(medicacao: Omit<Medicacao, 'id' | 'horarios'>, medId?: string) {
    if (!medicacao.nome.trim()) return;
    const chave = medId ?? 'nova';
    setSalvando(chave);
    const url = `/api/internacoes/${internacao.id}/medicacoes${medId ? `/${medId}` : ''}`;
    const resposta = await fetch(url, { method: medId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(medicacao) });
    if (resposta.ok) {
      const salva: Medicacao = await resposta.json();
      onAtualizar(medId ? internacao.medicacoes.map((med) => med.id === medId ? salva : med) : [...internacao.medicacoes, salva]);
      if (!medId) setNovaMedicacao(NOVA_MEDICACAO);
    }
    setSalvando(null);
  }

  async function remover(medId: string) {
    setSalvando(medId);
    const resposta = await fetch(`/api/internacoes/${internacao.id}/medicacoes/${medId}`, { method: 'DELETE' });
    if (resposta.ok) onAtualizar(internacao.medicacoes.filter((med) => med.id !== medId));
    setSalvando(null);
  }

  return <div className="rounded-md border border-slate-200 bg-white p-4">
    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">Medicações de {internacao.petNome}</h3><span className="text-xs text-slate-500">{internacao.medicacoes.length} registrada(s)</span></div>
    <table className="w-full min-w-[1120px] text-left text-xs"><thead className="text-slate-500"><tr><th className="pb-2">Medicamento</th><th className="pb-2">Descrição livre</th><th className="pb-2">Quantidade</th><th className="pb-2">Unidade</th><th className="pb-2">Via</th><th className="pb-2">Valor/dose</th><th className="pb-2">Aplicadas</th><th className="pb-2">Primeira dose</th><th className="pb-2">Frequência</th><th className="w-20 pb-2"><span className="sr-only">Ações</span></th></tr></thead>
      <tbody className="divide-y divide-slate-100">
        {internacao.medicacoes.map((med) => <LinhaMedicacao key={med.id} medicacao={med} salvando={salvando === med.id} onEditar={editarLocal} onSalvar={() => salvar(med, med.id)} onRemover={() => remover(med.id)} />)}
        <LinhaMedicacao medicacao={novaMedicacao} salvando={salvando === 'nova'} nova onEditar={(_, campo, valor) => setNovaMedicacao((atual) => ({ ...atual, [campo]: valor }))} onSalvar={() => salvar(novaMedicacao)} />
      </tbody>
    </table>
  </div>;
}

type LinhaMedicacaoProps = { medicacao: Omit<Medicacao, 'id' | 'horarios'> & { id?: string }; salvando: boolean; nova?: boolean; onEditar: (id: string, campo: keyof Medicacao, valor: string | number) => void; onSalvar: () => void; onRemover?: () => void };

function LinhaMedicacao({ medicacao, salvando, nova, onEditar, onSalvar, onRemover }: LinhaMedicacaoProps) {
  const classes = 'w-full rounded border border-slate-200 px-2 py-1.5 outline-none focus:border-moss';
  const editar = (campo: keyof Medicacao, valor: string | number) => onEditar(medicacao.id ?? '', campo, valor);
  return <tr><td className="py-2 pr-2"><input value={medicacao.nome} onChange={(event) => editar('nome', event.target.value)} placeholder="Nova medicação" className={classes} /></td><td className="py-2 pr-2"><input value={medicacao.descricao} onChange={(event) => editar('descricao', event.target.value)} placeholder="Instruções ou observações" className={classes} /></td><td className="py-2 pr-2"><input type="number" min="0.1" step="0.1" value={medicacao.quantidade} onChange={(event) => editar('quantidade', Number(event.target.value))} className={classes} /></td><td className="py-2 pr-2"><input value={medicacao.unidade} onChange={(event) => editar('unidade', event.target.value)} className={classes} /></td><td className="py-2 pr-2"><input value={medicacao.via} onChange={(event) => editar('via', event.target.value)} className={classes} /></td><td className="py-2 pr-2"><input type="number" min="0" step="0.01" value={medicacao.valorDose} onChange={(event) => editar('valorDose', Number(event.target.value))} className={classes} /></td><td className="py-2 pr-2"><input type="number" min="0" step="1" value={medicacao.dosesAplicadas} onChange={(event) => editar('dosesAplicadas', Number(event.target.value))} className={classes} /></td><td className="py-2 pr-2"><input type="time" value={medicacao.primeiroHorario} onChange={(event) => editar('primeiroHorario', event.target.value)} className={classes} /></td><td className="py-2 pr-2"><select value={medicacao.frequenciaHoras} onChange={(event) => editar('frequenciaHoras', Number(event.target.value))} className={classes}><option value={4}>4 h</option><option value={6}>6 h</option><option value={8}>8 h</option><option value={12}>12 h</option><option value={24}>24 h</option></select></td><td className="py-2 text-right"><div className="flex justify-end gap-1"><button type="button" disabled={salvando || !medicacao.nome.trim()} onClick={onSalvar} title={nova ? 'Adicionar medicação' : 'Salvar medicação'} className="inline-flex h-8 w-8 items-center justify-center rounded text-moss hover:bg-moss/10 disabled:opacity-40">{nova ? <Plus size={16} /> : <Save size={16} />}</button>{!nova && <button type="button" disabled={salvando} onClick={onRemover} title="Remover medicação" className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"><Trash2 size={16} /></button>}</div></td></tr>;
}

function TabelaMensagem({ message, erro = false }: { message: string; erro?: boolean }) {
  return (
    <tr>
      <td colSpan={7} className={`px-5 py-8 text-center ${erro ? 'text-red-500' : 'text-slate-500'}`}>
        {message}
      </td>
    </tr>
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
