'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, FileText, Activity, Stethoscope, Syringe, AlertCircle, Plus, Thermometer, Heart, Wind, Printer } from 'lucide-react';
import { Internacao, InternacaoStatus, Medicacao, RegistroProntuario, TipoRegistroProntuario } from '@/types/internacao';
import { calcularHorarios, FREQUENCIAS, resolverProximaMedicacao } from '@/lib/horarios';
import { StatusBadge } from './status-badge';
import { AutocompleteSelect } from '@/components/autocomplete-select';
import { PrintModal } from '@/components/print-modal';
import { ProntuarioPrintContent } from './prontuario-print';

const STATUS_OPTIONS: { value: InternacaoStatus; label: string; classes: string }[] = [
  { value: 'estavel',    label: 'Estável',    classes: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { value: 'observacao', label: 'Observação', classes: 'border-amber-300  bg-amber-50  text-amber-700  hover:bg-amber-100'  },
  { value: 'critico',    label: 'Crítico',    classes: 'border-rose-300   bg-rose-50   text-rose-700   hover:bg-rose-100'   },
];

const CORES     = ['bg-teal-500','bg-amber-400','bg-blue-400','bg-rose-500','bg-purple-400','bg-orange-400'];
const UNIDADES  = ['Borrifada','Cápsula','cm','Comprimido','Drágea','g','Gota(s)','l','mcg','Medida','mg','ml','UN','Sachê','UI'];
const VIAS      = ['Enema','Epidural','Inalatória','Intramuscular','Intraóssea','Intraperitoneal','Intravenosa','Oftálmica','Oral','Otológica','Sonda','Subcutânea','Tópica'];

function defaultFimEm() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

type Props = { id: string };

export function InternacaoDetalhe({ id }: Props) {
  const [internacao, setInternacao] = useState<Internacao | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const router = useRouter();
  const [excluindo, setExcluindo]     = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  // Prontuário state
  const [prontuarios, setProntuarios] = useState<RegistroProntuario[]>([]);
  const [prontTipo, setProntTipo] = useState<TipoRegistroProntuario>('EVOLUCAO');
  const [prontTitulo, setProntTitulo] = useState('');
  const [prontDescricao, setProntDescricao] = useState('');
  const [prontTemp, setProntTemp] = useState('');
  const [prontFC, setProntFC] = useState('');
  const [prontFR, setProntFR] = useState('');
  const [prontResponsavel, setProntResponsavel] = useState('');
  const [salvandoPront, setSalvandoPront] = useState(false);
  const [erroPront, setErroPront] = useState<string | null>(null);
  const [showProntuarioPrint, setShowProntuarioPrint] = useState(false);

  // Form state
  const [medNome, setMedNome]                   = useState('');
  const [catalogoMedicamentos, setCatalogoMedicamentos] = useState<{ nome: string; categoria: string; unidadeEstoque: string; valorUnitario: number }[]>([]);
  const [medCor, setMedCor]                     = useState(CORES[0]);
  const [medVia, setMedVia]                     = useState('Oral');
  const [medUnidade, setMedUnidade]             = useState('mg');
  const [medQuantidade, setMedQuantidade]       = useState(1);
  const [medValorDose, setMedValorDose]         = useState(0);
  const [medPrimeiroHorario, setMedPrimeiroHorario] = useState('08:00');
  const [medFrequenciaHoras, setMedFrequenciaHoras] = useState(8);
  const [medFimEm, setMedFimEm]                 = useState(defaultFimEm);
  const [saving, setSaving]                     = useState(false);

  const medPreview = calcularHorarios(medPrimeiroHorario, medFrequenciaHoras);

  useEffect(() => {
    fetch(`/api/internacoes/${id}`)
      .then((r) => r.json())
      .then((data) => setInternacao({
        ...data,
        tutorCpf:      data.pet?.tutor?.cpf      ?? undefined,
        tutorTelefone: data.pet?.tutor?.telefone  ?? undefined,
      }))
      .catch(() => setError('Erro ao carregar internação.'))
      .finally(() => setLoading(false));

    fetch(`/api/internacoes/${id}/prontuario`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setProntuarios(data))
      .catch(() => {});

    fetch('/api/catalogo?tipo=MEDICAMENTO')
      .then((response) => response.ok ? response.json() : [])
      .then((itens) => setCatalogoMedicamentos(itens))
      .catch(() => {});
  }, [id]);

  async function deleteInternacao() {
    if (!internacao || !window.confirm(`Excluir a internação de ${internacao.petNome}? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    setErroExcluir(null);
    const res = await fetch(`/api/internacoes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/internacoes');
      return;
    }
    const body = await res.json().catch(() => null);
    setErroExcluir(body?.error ?? 'Não foi possível excluir a internação.');
    setExcluindo(false);
  }

  async function updateStatus(status: InternacaoStatus) {
    const res = await fetch(`/api/internacoes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setInternacao((prev) => prev ? { ...prev, status } : prev);
  }

  async function addMedicacao() {
    if (!medNome) return;
    setSaving(true);
    const res = await fetch(`/api/internacoes/${id}/medicacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: medNome, cor: medCor, via: medVia, unidade: medUnidade,
        quantidade: medQuantidade, valorDose: medValorDose, dosesAplicadas: 0, primeiroHorario: medPrimeiroHorario,
        frequenciaHoras: medFrequenciaHoras, fimEm: medFimEm || undefined,
      }),
    });
    if (res.ok) {
      const nova: Medicacao = await res.json();
      setInternacao((prev) =>
        prev ? { ...prev, medicacoes: [...prev.medicacoes, nova] } : prev
      );
      setMedNome('');
      setMedCor(CORES[0]);
      setMedVia('Oral');
      setMedUnidade('mg');
      setMedQuantidade(1);
      setMedValorDose(0);
      setMedPrimeiroHorario('08:00');
      setMedFrequenciaHoras(8);
      setMedFimEm(defaultFimEm());
    }
    setSaving(false);
  }

  async function removeMedicacao(medId: string) {
    const med = internacao?.medicacoes.find((m) => (m as Medicacao & { id: string }).id === medId);
    if (!window.confirm(`Remover a medicação ${med?.nome ?? ''}? Esta ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/internacoes/${id}/medicacoes/${medId}`, { method: 'DELETE' });
    if (!res.ok) { window.alert('Não foi possível remover a medicação.'); return; }
    setInternacao((prev) =>
      prev ? { ...prev, medicacoes: prev.medicacoes.filter((m) => (m as Medicacao & { id: string }).id !== medId) } : prev
    );
  }

  async function addProntuario(e: React.FormEvent) {
    e.preventDefault();
    if (!prontDescricao.trim() || !prontResponsavel.trim()) return;
    setSalvandoPront(true);
    setErroPront(null);
    try {
      const res = await fetch(`/api/internacoes/${id}/prontuario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: prontTipo,
          titulo: prontTitulo.trim() || prontTipo,
          descricao: prontDescricao.trim(),
          temperatura: prontTemp ? Number(prontTemp) : null,
          frequenciaCardiaca: prontFC ? Number(prontFC) : null,
          frequenciaRespiratoria: prontFR ? Number(prontFR) : null,
          responsavel: prontResponsavel.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErroPront(data.error ?? 'Erro ao salvar no prontuário.');
        return;
      }
      const novo: RegistroProntuario = await res.json();
      setProntuarios((prev) => [novo, ...prev]);
      setProntTitulo('');
      setProntDescricao('');
      setProntTemp('');
      setProntFC('');
      setProntFR('');
    } catch {
      setErroPront('Erro ao se conectar ao servidor.');
    } finally {
      setSalvandoPront(false);
    }
  }

  async function removeProntuario(regId: string) {
    if (!window.confirm('Excluir este registro do prontuário?')) return;
    const res = await fetch(`/api/internacoes/${id}/prontuario/${regId}`, { method: 'DELETE' });
    if (res.ok) {
      setProntuarios((prev) => prev.filter((r) => r.id !== regId));
    }
  }

  if (loading) return <p className="p-8 text-sm text-slate-500">Carregando...</p>;
  if (error || !internacao) return <p className="p-8 text-sm text-red-500">{error ?? 'Internação não encontrada.'}</p>;

  const entrada = new Date(internacao.entradaEm).toLocaleString('pt-BR', {
    dateStyle: 'short', timeStyle: 'short',
  });
  const saida = internacao.dataSaida ? new Date(internacao.dataSaida).toLocaleDateString('pt-BR') : 'Não definida';

  return (
    <main className="flex flex-col gap-6 p-6 lg:p-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/internacoes" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex flex-1 items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{internacao.id}</p>
            <h1 className="text-2xl font-bold text-slate-900">{internacao.petNome}</h1>
            <p className="text-sm text-slate-500">{internacao.especie}</p>
            <p className="text-sm text-slate-500">
              Tutor: {internacao.tutorNome}
              {internacao.tutorCpf && <> · CPF: {internacao.tutorCpf}</>}
              {internacao.tutorTelefone && <> · Tel: {internacao.tutorTelefone}</>}
            </p>
          </div>
          <StatusBadge status={internacao.status} />
        </div>
      </div>

      {/* Info grid */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem label="Entrada" value={entrada} />
        <InfoItem label="Saída" value={saida} />
        <InfoItem label="Peso na admissão" value={internacao.pesoMomento ? `${internacao.pesoMomento} kg` : 'Não informado'} />
        <InfoItem label="Diárias" value={`${internacao.quantidadeDiarias.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} · R$ ${internacao.valorDiarias.toFixed(2).replace('.', ',')}`} />
        <InfoItem label="Próxima medicação" value={resolverProximaMedicacao(internacao)} />
        <InfoItem label="Espécie" value={internacao.especie} />
        {internacao.observacao && <InfoItem label="Observação" value={internacao.observacao} />}
        <InfoItem label="Descrição" value={internacao.descricao} />
      </div>

      {/* Status control */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Alterar status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateStatus(opt.value)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${opt.classes} ${
                internacao.status === opt.value ? 'ring-2 ring-offset-1 ring-current' : ''
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {!internacao.baixa && (
        <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-rose-600">Zona de risco</p>
          <p className="mb-3 text-sm text-slate-500">Criou esta internação por engano? Excluir remove também medicações, prontuário e pagamentos vinculados.</p>
          {erroExcluir && <p className="mb-2 text-sm text-red-600">{erroExcluir}</p>}
          <button
            onClick={deleteInternacao}
            disabled={excluindo}
            className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            <Trash2 size={15} />
            {excluindo ? 'Excluindo…' : 'Excluir internação'}
          </button>
        </section>
      )}

      {/* Prontuário Clínico & Linha do Tempo */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-moss/10 text-moss">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Prontuário Clínico & Linha do Tempo</h2>
              <p className="text-xs text-slate-500">Histórico de condutas, procedimentos e parâmetros vitais realizados com o animal.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {prontuarios.length} registro(s)
            </span>
            <button
              onClick={() => setShowProntuarioPrint(true)}
              className="flex items-center gap-1.5 rounded-lg border border-moss/30 bg-moss/5 px-3 py-1.5 text-xs font-semibold text-moss hover:bg-moss/10 transition"
            >
              <Printer size={13} />
              Imprimir Prontuário
            </button>
          </div>
        </div>

        {/* Formulário de Novo Registro de Prontuário */}
        <form onSubmit={addProntuario} className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            <Plus size={16} className="text-moss" />
            Adicionar Registro ao Prontuário
          </h3>

          {erroPront && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">
              {erroPront}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Tipo de Registro</label>
              <select
                value={prontTipo}
                onChange={(e) => setProntTipo(e.target.value as TipoRegistroProntuario)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-moss"
              >
                <option value="EVOLUCAO">Evolução Clínica</option>
                <option value="PROCEDIMENTO">Procedimento</option>
                <option value="EXAME">Exame / Coleta</option>
                <option value="CURATIVO">Curativo / Manejo</option>
                <option value="OCORRENCIA">Ocorrência</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Título / Assunto</label>
              <input
                type="text"
                placeholder="Ex: Avaliação matinal, Curativo cirúrgico..."
                value={prontTitulo}
                onChange={(e) => setProntTitulo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-moss"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Responsável</label>
              <input
                type="text"
                required
                placeholder="Ex: Dra. Ana / Enf. Carlos"
                value={prontResponsavel}
                onChange={(e) => setProntResponsavel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-moss"
              />
            </div>

            <div className="grid grid-cols-3 gap-1">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500" title="Temperatura em °C">Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="38.5"
                  value={prontTemp}
                  onChange={(e) => setProntTemp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-center outline-none focus:border-moss"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500" title="Frequência Cardíaca em bpm">FC (bpm)</label>
                <input
                  type="number"
                  placeholder="110"
                  value={prontFC}
                  onChange={(e) => setProntFC(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-center outline-none focus:border-moss"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500" title="Frequência Respiratória em mpm">FR (mpm)</label>
                <input
                  type="number"
                  placeholder="24"
                  value={prontFR}
                  onChange={(e) => setProntFR(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-center outline-none focus:border-moss"
                />
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-semibold uppercase text-slate-600">Descrição do que foi feito com o paciente</label>
            <textarea
              required
              rows={2}
              placeholder="Descreva detalhadamente a conduta, medicações administradas, estado físico, alimentação, urina/fezes, etc."
              value={prontDescricao}
              onChange={(e) => setProntDescricao(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-moss"
            />
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={salvandoPront || !prontDescricao.trim() || !prontResponsavel.trim()}
              className="rounded-lg bg-moss px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-moss/90 transition disabled:opacity-60"
            >
              {salvandoPront ? 'Registrando...' : 'Registrar no Prontuário'}
            </button>
          </div>
        </form>

        {/* Linha do Tempo Cronológica */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Linha do Tempo de Atendimentos</h3>
          {prontuarios.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              Nenhum procedimento ou evolução registrada neste prontuário até o momento.
            </p>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
              {prontuarios.map((reg) => {
                const tipoCores: Record<string, { badge: string; dot: string }> = {
                  EVOLUCAO: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
                  PROCEDIMENTO: { badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
                  EXAME: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
                  CURATIVO: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
                  OCORRENCIA: { badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
                  MEDICACAO_ADMINISTRADA: { badge: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
                };
                const cor = tipoCores[reg.tipo] || tipoCores.EVOLUCAO;
                const d = new Date(reg.dataHora);
                const dataFormatada = d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

                return (
                  <div key={reg.id} className="relative pl-6">
                    <span className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white ${cor.dot} shadow-sm`} />
                    
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-50 transition">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${cor.badge}`}>
                            {reg.tipo}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">{reg.titulo || reg.tipo}</span>
                          <span className="text-xs text-slate-400">· {dataFormatada}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-slate-600">Por: {reg.responsavel}</span>
                          <button
                            onClick={() => removeProntuario(reg.id)}
                            title="Excluir este registro"
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {reg.descricao}
                      </p>

                      {(reg.temperatura != null || reg.frequenciaCardiaca != null || reg.frequenciaRespiratoria != null) && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                          {reg.temperatura != null && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 font-medium text-slate-700">
                              <Thermometer size={13} className="text-rose-500" /> {reg.temperatura} °C
                            </span>
                          )}
                          {reg.frequenciaCardiaca != null && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 font-medium text-slate-700">
                              <Heart size={13} className="text-red-500" /> {reg.frequenciaCardiaca} bpm
                            </span>
                          )}
                          {reg.frequenciaRespiratoria != null && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 font-medium text-slate-700">
                              <Wind size={13} className="text-cyan-500" /> {reg.frequenciaRespiratoria} mpm
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Medicações */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Medicações</p>

        {internacao.medicacoes.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">Nenhuma medicação registrada.</p>
        ) : (
          <ul className="mb-5 flex flex-col gap-2">
            {internacao.medicacoes.map((med) => {
              const m = med as Medicacao & { id: string };
              return (
                <li key={m.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${m.cor}`} />
                    <span className="font-medium text-slate-800">{m.nome}</span>
                    <span className="text-xs text-slate-500">{m.horarios.join(' · ')}</span>
                    {m.quantidade != null && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        {m.quantidade} {m.unidade}
                      </span>
                    )}
                    {m.via && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{m.via}</span>}
                  </div>
                  <button onClick={() => removeMedicacao(m.id)} className="text-slate-400 hover:text-rose-500 transition">
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Formulário de nova medicação */}
        <div className="grid gap-4 rounded-xl border border-dashed border-slate-300 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Nova medicação</p>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Nome
            <input
              value={medNome}
              onChange={(e) => {
                const nome = e.target.value;
                setMedNome(nome);
                const item = catalogoMedicamentos.find((produto) => produto.nome === nome);
                if (item) {
                  setMedValorDose(item.valorUnitario);
                  setMedUnidade(item.unidadeEstoque);
                }
              }}
              list="medicamentos-catalogo"
              placeholder="Ex: Dipirona"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
            />
            <datalist id="medicamentos-catalogo">
              {catalogoMedicamentos
                .filter((item) => !item.categoria.startsWith('Suporte à vida') || internacao.leito?.tipo === 'I')
                .map((item) => <option key={`${item.categoria}-${item.nome}`} value={item.nome}>{item.categoria} · {item.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/{item.unidadeEstoque}</option>)}
            </datalist>
          </label>

          <div className="grid gap-4 sm:grid-cols-4">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Quantidade
              <input
                type="number" min="0.1" step="0.1"
                value={medQuantidade}
                onChange={(e) => setMedQuantidade(Number(e.target.value))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
              />
            </label>
            <AutocompleteSelect label="Unidade" value={medUnidade} onChange={setMedUnidade} placeholder="Buscar unidade" emptyMessage="Nenhuma unidade encontrada." options={UNIDADES.map((unidade) => ({ value: unidade, label: unidade }))} />
            <AutocompleteSelect label="Via" value={medVia} onChange={setMedVia} placeholder="Buscar via" emptyMessage="Nenhuma via encontrada." options={VIAS.map((via) => ({ value: via, label: via }))} />
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Custo por dose (interno)
              <input
                type="number" min="0" step="0.01"
                value={medValorDose}
                onChange={(e) => setMedValorDose(Number(e.target.value))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
              />
            </label>
          </div>

          {/* Cor */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Cor</p>
            <div className="flex gap-2">
              {CORES.map((cor) => (
                <button key={cor} type="button" onClick={() => setMedCor(cor)}
                  className={`h-7 w-7 rounded-full ${cor} transition ${
                    medCor === cor ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Frequência */}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Frequência
              <select value={medFrequenciaHoras} onChange={(e) => setMedFrequenciaHoras(Number(e.target.value))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss">
                {FREQUENCIAS.map((f) => (
                  <option key={f.horas} value={f.horas}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Primeiro horário
              <input type="time" value={medPrimeiroHorario}
                onChange={(e) => setMedPrimeiroHorario(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Até quando
              <input type="date" value={medFimEm}
                onChange={(e) => setMedFimEm(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
              />
            </label>
          </div>

          {/* Preview */}
          <p className="text-xs text-slate-400">
            Doses diárias: <span className="font-medium text-slate-600">{medPreview.join(' · ')}</span>
          </p>

          <button
            onClick={addMedicacao}
            disabled={saving || !medNome}
            className="rounded-xl bg-moss px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Adicionar medicação'}
          </button>
        </div>
      </section>
      <PrintModal
        open={showProntuarioPrint}
        onClose={() => setShowProntuarioPrint(false)}
        title={`Prontuário de ${internacao.petNome}`}
      >
        <ProntuarioPrintContent
          petNome={internacao.petNome}
          especie={internacao.especie}
          tutorNome={internacao.tutorNome}
          tutorTelefone={internacao.tutorTelefone}
          entradaEm={internacao.entradaEm}
          pesoMomento={internacao.pesoMomento}
          prontuarios={prontuarios}
        />
      </PrintModal>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
