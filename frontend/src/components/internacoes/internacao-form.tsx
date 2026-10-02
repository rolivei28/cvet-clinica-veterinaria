'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FaixaPreco, InternacaoStatus, NovaInternacao } from '@/types/internacao';
import { calcularHorarios, FREQUENCIAS } from '@/lib/horarios';
import { AutocompleteSelect } from '@/components/autocomplete-select';

type InternacaoFormProps = {
  onCreate: (data: NovaInternacao) => Promise<string | null>;
};

type FormMed = {
  nome: string;
  primeiroHorario: string;
  frequenciaHoras: number;
  fimEm: string;
  cor: string;
  via: string;
  unidade: string;
  quantidade: number;
  valorDose: number;
  dosesAplicadas: number;
};

const statusOptions: { value: InternacaoStatus; label: string }[] = [
  { value: 'estavel',    label: 'Estável' },
  { value: 'observacao', label: 'Observação' },
  { value: 'critico',    label: 'Crítico' },
];

const COR_OPTIONS = ['bg-teal-500','bg-blue-500','bg-orange-500','bg-purple-500','bg-rose-500','bg-yellow-500'];
const UNIDADES    = ['Borrifada','Cápsula','cm','Comprimido','Drágea','g','Gota(s)','l','mcg','Medida','mg','ml','UN','Sachê','UI'];
const VIAS        = ['Enema','Epidural','Inalatória','Intramuscular','Intraóssea','Intraperitoneal','Intravenosa','Oftálmica','Oral','Otológica','Sonda','Subcutânea','Tópica'];

function dateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function defaultFimEm() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return dateInputValue(d);
}

export function InternacaoForm({ onCreate }: InternacaoFormProps) {
  const [pets, setPets]               = useState<{ id: string; nome: string; especie: string; peso?: number | null; tutor: { nome: string; telefone: string; cpf?: string | null } }[]>([]);
  const [petId, setPetId]             = useState('');
  const [pesoMomento, setPesoMomento] = useState<number | ''>('');
  const [leitos, setLeitos]           = useState<{ id: string; nome: string; tipo: 'N' | 'I' }[]>([]);
  const [leitoId, setLeitoId]         = useState('');
  const [faixas, setFaixas]           = useState<FaixaPreco[]>([]);
  const [entradaEm, setEntradaEm]     = useState(() => dateInputValue(new Date()));
  const [dataSaida, setDataSaida]     = useState(() => defaultFimEm());
  const [horaEntrada, setHoraEntrada] = useState(() => new Date().toTimeString().slice(0, 5));
  const [horaSaida, setHoraSaida]     = useState(() => new Date().toTimeString().slice(0, 5));
  const [descricao, setDescricao]     = useState('');
  const [status, setStatus]           = useState<InternacaoStatus>('observacao');
  const [manualHora, setManualHora]   = useState('');
  const [manualNome, setManualNome]   = useState('');
  const [observacao, setObservacao]   = useState('');
  const [medicacoes, setMedicacoes]   = useState<FormMed[]>([]);
  const [submitting, setSubmitting]   = useState(false);
  const [loadError, setLoadError]     = useState('');
  const [saveError, setSaveError]     = useState('');

  const agora = new Date().toTimeString().slice(0, 5);

  useEffect(() => {
    Promise.all([fetch('/api/leitos'), fetch('/api/pets'), fetch('/api/parametrizacao')])
      .then(async ([leitosResponse, petsResponse, faixasResponse]) => {
        if (!leitosResponse.ok || !petsResponse.ok) throw new Error();
        setLeitos(await leitosResponse.json());
        setPets(await petsResponse.json());
        if (faixasResponse.ok) {
          setFaixas(await faixasResponse.json());
        }
      })
      .catch(() => setLoadError('Não foi possível carregar pets e leitos do banco. Atualize a página e tente novamente.'));
  }, []);

  const petSelecionado = pets.find((pet) => pet.id === petId);

  useEffect(() => {
    if (petSelecionado && petSelecionado.peso != null) {
      setPesoMomento(petSelecionado.peso);
    }
  }, [petId, petSelecionado]);

  const leitoSelecionado = leitos.find((leito) => leito.id === leitoId);
  const duracaoMs = entradaEm && dataSaida && horaEntrada && horaSaida
    ? Math.max(0, new Date(`${dataSaida}T${horaSaida}`).getTime() - new Date(`${entradaEm}T${horaEntrada}`).getTime())
    : 0;
  const quantidadeDiarias = duracaoMs / 86_400_000;

  const pesoCalculo = Number(pesoMomento) || petSelecionado?.peso || 5.0;
  const tipoNorm = leitoSelecionado?.tipo === 'I' ? 'UTI' : 'NORMAL';
  const faixasDoTipo = faixas.filter((f) => f.tipoLeito === tipoNorm);
  const faixaAplicada = faixasDoTipo.find((f) => pesoCalculo >= f.pesoMin && pesoCalculo <= f.pesoMax)
    ?? (faixasDoTipo.length > 0 ? (pesoCalculo < faixasDoTipo[0].pesoMin ? faixasDoTipo[0] : faixasDoTipo[faixasDoTipo.length - 1]) : null);
  const valorDiariaCalculada = faixaAplicada?.valorDiaria ?? 0;
  const valorEstimado = quantidadeDiarias * valorDiariaCalculada;

  const autoMed = useMemo(() => {
    const all = medicacoes
      .filter((m) => m.nome && m.primeiroHorario)
      .flatMap((m) =>
        calcularHorarios(m.primeiroHorario, m.frequenciaHoras).map((h) => ({ h, nome: m.nome }))
      )
      .sort((a, b) => a.h.localeCompare(b.h));
    return all.find((x) => x.h >= agora) ?? all[0] ?? null;
  }, [medicacoes, agora]);

  const proxHora = autoMed?.h ?? manualHora;
  const proxNome = autoMed?.nome ?? manualNome;

  function addMedicacao() {
    setMedicacoes((prev) => [
      ...prev,
      { nome: '', primeiroHorario: '08:00', frequenciaHoras: 8, fimEm: defaultFimEm(),
        cor: 'bg-teal-500', via: 'Oral', unidade: 'mg', quantidade: 1, valorDose: 0, dosesAplicadas: 0 },
    ]);
  }

  function removeMedicacao(i: number) {
    setMedicacoes((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateMed(i: number, patch: Partial<FormMed>) {
    setMedicacoes((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!petSelecionado || !leitoId || !entradaEm || !horaEntrada || !dataSaida || !horaSaida || !descricao) return;
    setSaveError('');

    const proximaMedicacao = proxHora
      ? (proxNome ? `${proxHora} — ${proxNome}` : proxHora)
      : '';

    const medicacoesValidas = medicacoes
      .filter((m) => m.nome.trim())
      .map((m) => ({
        ...m,
        horarios: calcularHorarios(m.primeiroHorario, m.frequenciaHoras),
      }));

    setSubmitting(true);
    const error = await onCreate({
      petId, petNome: petSelecionado.nome, especie: petSelecionado.especie, tutorNome: petSelecionado.tutor.nome,
      tutorTelefone: petSelecionado.tutor.telefone, tutorCpf: petSelecionado.tutor.cpf || undefined, leitoId,
      pesoMomento: pesoMomento ? Number(pesoMomento) : (petSelecionado.peso ?? undefined),
      entradaEm: new Date(`${entradaEm}T${horaEntrada}`).toISOString(),
      dataSaida: new Date(`${dataSaida}T${horaSaida}`).toISOString(),
      descricao,
      status, proximaMedicacao, observacao, medicacoes: medicacoesValidas,
    });
    setSubmitting(false);
    if (error) {
      setSaveError(error);
      return;
    }

    const agora = new Date();
    setPetId(''); setPesoMomento(''); setLeitoId(''); setEntradaEm(dateInputValue(agora)); setDataSaida(defaultFimEm()); setHoraEntrada(agora.toTimeString().slice(0, 5)); setHoraSaida(agora.toTimeString().slice(0, 5)); setDescricao(''); setStatus('observacao'); setManualHora(''); setManualNome('');
    setObservacao(''); setMedicacoes([]);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      {loadError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{loadError}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <AutocompleteSelect label="Pet cadastrado" value={petId} onChange={setPetId} placeholder="Buscar por pet, espécie ou tutor" emptyMessage="Nenhum pet encontrado." required options={pets.map((pet) => ({ value: pet.id, label: pet.nome, description: `${pet.especie} · ${pet.peso ? `${pet.peso}kg · ` : ''}Tutor: ${pet.tutor.nome}` }))} />
        
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Peso na admissão (kg)
          <input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="Ex: 8.5"
            value={pesoMomento}
            onChange={(e) => setPesoMomento(e.target.value ? Number(e.target.value) : '')}
            className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as InternacaoStatus)}
            className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss"
          >
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>
      {petSelecionado && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><span className="font-semibold">Tutor:</span> {petSelecionado.tutor.nome} · {petSelecionado.tutor.telefone} {petSelecionado.peso ? `· Peso cadastrado: ${petSelecionado.peso} kg` : ''}</div>}
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Leito
        <select value={leitoId} onChange={(e) => setLeitoId(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" required>
          <option value="">Selecione o leito</option>
          {leitos.map((leito) => <option key={leito.id} value={leito.id}>Leito {leito.id} - {leito.nome} ({leito.tipo === 'I' ? 'UTI' : 'Normal'})</option>)}
        </select>
      </label>
      {leitoSelecionado && <div className="grid gap-2 rounded-xl border border-moss/20 bg-moss/5 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leito</p>
          <p className="mt-1 font-semibold text-ink">{leitoSelecionado.id} · {leitoSelecionado.nome} ({tipoNorm})</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diária (até 24h por peso)</p>
          <p className="mt-1 font-semibold text-ink">
            R$ {valorDiariaCalculada.toFixed(2).replace('.', ',')}
            <span className="block text-[11px] font-normal text-slate-500">{faixaAplicada?.descricao || `Faixa para ${pesoCalculo} kg`}</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total estimado</p>
          <p className="mt-1 font-semibold text-moss">R$ {valorEstimado.toFixed(2).replace('.', ',')} · {quantidadeDiarias.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} diária(s)</p>
        </div>
      </div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">Data de entrada<input type="date" value={entradaEm} onChange={(e) => setEntradaEm(e.target.value)} required className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" /></label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">Hora de entrada<input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} required className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" /></label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">Data de saída<input type="date" min={entradaEm} value={dataSaida} onChange={(e) => setDataSaida(e.target.value)} required className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" /></label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">Hora de saída prevista<input type="time" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} required className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" /></label>
      </div>
      <label className="grid gap-2 text-sm font-medium text-slate-700">Descrição da internação<textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} required className="min-h-20 rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" placeholder="Ex: recuperação pós-operatória" /></label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Observação
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss"
          placeholder="Ex: manter monitoramento da temperatura"
        />
      </label>

      {saveError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{saveError}</p>}

      <button
        type="submit"
        disabled={submitting || Boolean(loadError)}
        className="rounded-xl bg-moss px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
      >
        {submitting ? 'Registrando...' : 'Registrar internação'}
      </button>
    </form>
  );
}
