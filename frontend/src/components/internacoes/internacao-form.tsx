'use client';

import React, { useEffect, useState } from 'react';
import { FaixaPreco, InternacaoStatus, NovaInternacao } from '@/types/internacao';
import { AutocompleteSelect } from '@/components/autocomplete-select';
import { calcularHorarios } from '@/lib/horarios';
import Link from 'next/link';

type InternacaoFormProps = {
  onCreate: (data: NovaInternacao) => Promise<string | null>;
};

type Pet = { id: string; nome: string; especie: string; peso?: number | null; tutor: { nome: string; telefone: string; cpf?: string | null } };
type Leito = { id: string; nome: string; tipo: 'N' | 'I' };
type EspeciePet = 'CANINO' | 'FELINO' | 'OUTROS';
type Raca = { id: string; nome: string; especie: EspeciePet };
type ModoPet = 'existente' | 'novo';
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

const especieLabel: Record<EspeciePet, string> = { CANINO: 'Canino', FELINO: 'Felino', OUTROS: 'Outros' };

const emptyTutor = { nome: '', telefone: '', cpf: '', email: '' };
const emptyPet = { nome: '', especie: 'CANINO' as EspeciePet, raca: '', dataNascimento: '', peso: '' };
const coresMedicacao = ['bg-teal-500', 'bg-blue-500', 'bg-orange-500', 'bg-rose-500'];
const unidadesMedicacao = ['mg', 'ml', 'comprimido', 'cápsula', 'gota', 'UI', 'g'];
const viasMedicacao = ['Oral', 'Intravenosa', 'Intramuscular', 'Subcutânea', 'Tópica', 'Inalatória'];

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
  const [pets, setPets]               = useState<Pet[]>([]);
  const [petId, setPetId]             = useState('');
  const [pesoMomento, setPesoMomento] = useState<number | ''>('');
  const [leitos, setLeitos]           = useState<Leito[]>([]);
  const [leitoId, setLeitoId]         = useState('');
  const [faixas, setFaixas]           = useState<FaixaPreco[]>([]);
  const [entradaEm, setEntradaEm]     = useState(() => dateInputValue(new Date()));
  const [dataSaida, setDataSaida]     = useState(() => defaultFimEm());
  const [horaEntrada, setHoraEntrada] = useState(() => new Date().toTimeString().slice(0, 5));
  const [horaSaida, setHoraSaida]     = useState(() => new Date().toTimeString().slice(0, 5));
  const [descricao, setDescricao]     = useState('');
  const [status, setStatus]           = useState<InternacaoStatus>('observacao');
  const [observacao, setObservacao]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [loadError, setLoadError]     = useState('');
  const [saveError, setSaveError]     = useState('');

  const [modoPet, setModoPet]   = useState<ModoPet>('existente');
  const [novoTutor, setNovoTutor] = useState(emptyTutor);
  const [novoPet, setNovoPet]     = useState(emptyPet);
  const [racas, setRacas]         = useState<Raca[]>([]);
  const [racasCarregadas, setRacasCarregadas] = useState(false);
  const [medicacoes, setMedicacoes] = useState<FormMed[]>([]);

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

  function ativarModoNovo() {
    setModoPet('novo');
    setSaveError('');
    if (!racasCarregadas) {
      setRacasCarregadas(true);
      Promise.all([fetch('/api/racas?especie=CANINO'), fetch('/api/racas?especie=FELINO')])
        .then(async (responses) => {
          if (responses.some((response) => !response.ok)) throw new Error();
          setRacas((await Promise.all(responses.map((response) => response.json()))).flat());
        })
        .catch(() => setLoadError('Não foi possível carregar o catálogo de raças.'));
    }
  }

  const petSelecionado = pets.find((pet) => pet.id === petId);

  function selecionarPet(id: string) {
    setPetId(id);
    const pet = pets.find((item) => item.id === id);
    if (pet && pet.peso != null) setPesoMomento(pet.peso);
  }

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
  const racasDaEspecie = racas.filter((raca) => raca.especie === novoPet.especie);
  const agora = new Date().toTimeString().slice(0, 5);
  const horariosMedicacao = medicacoes.flatMap((medicacao) =>
    medicacao.nome && medicacao.primeiroHorario
      ? calcularHorarios(medicacao.primeiroHorario, medicacao.frequenciaHoras).map((horario) => ({ horario, nome: medicacao.nome }))
      : []
  ).sort((a, b) => a.horario.localeCompare(b.horario));
  const proximaMedicacao = horariosMedicacao.find((item) => item.horario >= agora) ?? horariosMedicacao[0];

  function adicionarMedicacao() {
    const fim = new Date();
    fim.setDate(fim.getDate() + 7);
    setMedicacoes((atuais) => [...atuais, {
      nome: '', primeiroHorario: '08:00', frequenciaHoras: 8, fimEm: dateInputValue(fim),
      cor: coresMedicacao[atuais.length % coresMedicacao.length], via: 'Oral', unidade: 'mg',
      quantidade: 1, valorDose: 0, dosesAplicadas: 0,
    }]);
  }

  function atualizarMedicacao(indice: number, alteracoes: Partial<FormMed>) {
    setMedicacoes((atuais) => atuais.map((medicacao, posicao) => posicao === indice ? { ...medicacao, ...alteracoes } : medicacao));
  }

  function resetForm() {
    const agora = new Date();
    setPetId(''); setPesoMomento(''); setLeitoId(''); setEntradaEm(dateInputValue(agora)); setDataSaida(defaultFimEm());
    setHoraEntrada(agora.toTimeString().slice(0, 5)); setHoraSaida(agora.toTimeString().slice(0, 5)); setDescricao(''); setStatus('observacao');
    setObservacao(''); setModoPet('existente'); setNovoTutor(emptyTutor); setNovoPet(emptyPet);
    setMedicacoes([]);
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leitoId || !entradaEm || !horaEntrada || !dataSaida || !horaSaida || !descricao || !pesoMomento) return;
    if (modoPet === 'existente' && !petSelecionado) return;
    if (modoPet === 'novo' && (!novoTutor.nome.trim() || !novoTutor.telefone.trim() || !novoPet.nome.trim())) return;
    setSaveError('');
    setSubmitting(true);

    let pet: { id: string; nome: string; especie: string; tutorNome: string; tutorTelefone: string; tutorCpf?: string };

    if (modoPet === 'novo') {
      try {
        const response = await fetch('/api/tutores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...novoTutor, pets: [{ ...novoPet, peso: Number(pesoMomento) }] }),
        });
        const tutorCriado = await response.json();
        if (!response.ok) {
          setSaveError(tutorCriado.message ?? 'Não foi possível cadastrar o tutor e o pet.');
          setSubmitting(false);
          return;
        }
        const petCriado = tutorCriado.pets[0];
        setPets((current) => [...current, { id: petCriado.id, nome: petCriado.nome, especie: petCriado.especie, peso: petCriado.peso, tutor: { nome: tutorCriado.nome, telefone: tutorCriado.telefone, cpf: tutorCriado.cpf } }]);
        pet = { id: petCriado.id, nome: petCriado.nome, especie: petCriado.especie, tutorNome: tutorCriado.nome, tutorTelefone: tutorCriado.telefone, tutorCpf: tutorCriado.cpf || undefined };
      } catch {
        setSaveError('Não foi possível conectar ao serviço.');
        setSubmitting(false);
        return;
      }
    } else {
      pet = { id: petSelecionado!.id, nome: petSelecionado!.nome, especie: petSelecionado!.especie, tutorNome: petSelecionado!.tutor.nome, tutorTelefone: petSelecionado!.tutor.telefone, tutorCpf: petSelecionado!.tutor.cpf || undefined };
    }

      const medicacoesValidas = medicacoes.filter((medicacao) => medicacao.nome.trim()).map((medicacao) => ({
          ...medicacao,
          horarios: calcularHorarios(medicacao.primeiroHorario, medicacao.frequenciaHoras),
        }));
      const error = await onCreate({
      petId: pet.id, petNome: pet.nome, especie: pet.especie, tutorNome: pet.tutorNome,
      tutorTelefone: pet.tutorTelefone, tutorCpf: pet.tutorCpf, leitoId,
      pesoMomento: Number(pesoMomento),
      entradaEm: new Date(`${entradaEm}T${horaEntrada}`).toISOString(),
      dataSaida: new Date(`${dataSaida}T${horaSaida}`).toISOString(),
      descricao,
      status,
      proximaMedicacao: proximaMedicacao ? `${proximaMedicacao.horario} — ${proximaMedicacao.nome}` : '',
      observacao,
      medicacoes: medicacoesValidas,
    });
    setSubmitting(false);
    if (error) {
      setSaveError(error);
      return;
    }

    resetForm();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      {loadError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{loadError}</p>}

      <div className="grid gap-3">
        <div className="inline-flex w-fit rounded-lg border border-slate-300 bg-slate-50 p-1 text-sm font-medium">
          <button type="button" onClick={() => setModoPet('existente')} className={`rounded-md px-3 py-1.5 transition ${modoPet === 'existente' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>Pet cadastrado</button>
          <button type="button" onClick={ativarModoNovo} className={`rounded-md px-3 py-1.5 transition ${modoPet === 'novo' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>Novo pet e tutor</button>
        </div>

        {modoPet === 'existente' ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <AutocompleteSelect label="Pet cadastrado" value={petId} onChange={selecionarPet} placeholder="Buscar por pet, espécie ou tutor" emptyMessage="Nenhum pet encontrado." required options={pets.map((pet) => ({ value: pet.id, label: pet.nome, description: `${pet.especie} · Tutor: ${pet.tutor.nome}` }))} />
          </div>
        ) : (
          <div className="grid gap-3 rounded-xl border border-moss/20 bg-moss/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tutor</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium text-slate-600">Nome completo<input value={novoTutor.nome} onChange={(e) => setNovoTutor({ ...novoTutor, nome: e.target.value })} required className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" /></label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">Telefone<input value={novoTutor.telefone} onChange={(e) => setNovoTutor({ ...novoTutor, telefone: e.target.value })} required inputMode="tel" className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" /></label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">CPF<input value={novoTutor.cpf} onChange={(e) => setNovoTutor({ ...novoTutor, cpf: e.target.value })} className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" /></label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">E-mail<input type="email" value={novoTutor.email} onChange={(e) => setNovoTutor({ ...novoTutor, email: e.target.value })} className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" /></label>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Pet</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium text-slate-600">Nome<input value={novoPet.nome} onChange={(e) => setNovoPet({ ...novoPet, nome: e.target.value })} required className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" /></label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">Espécie<select value={novoPet.especie} onChange={(e) => setNovoPet({ ...novoPet, especie: e.target.value as EspeciePet, raca: '' })} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-ink outline-none focus:border-moss">{Object.entries(especieLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {novoPet.especie === 'OUTROS' ? (
                <label className="grid gap-1 text-xs font-medium text-slate-600">Raça<input value={novoPet.raca} onChange={(e) => setNovoPet({ ...novoPet, raca: e.target.value })} className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" /></label>
              ) : (
                <AutocompleteSelect label="Raça" value={novoPet.raca} onChange={(raca) => setNovoPet({ ...novoPet, raca })} placeholder="Buscar raça" emptyMessage="Nenhuma raça encontrada." options={racasDaEspecie.map((raca) => ({ value: raca.nome, label: raca.nome }))} />
              )}
              <label className="grid gap-1 text-xs font-medium text-slate-600">Nascimento<input type="date" value={novoPet.dataNascimento} onChange={(e) => setNovoPet({ ...novoPet, dataNascimento: e.target.value })} className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" /></label>
            </div>
          </div>
        )}
      </div>

      {modoPet === 'existente' && petSelecionado && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><span className="font-semibold">Tutor:</span> {petSelecionado.tutor.nome} · {petSelecionado.tutor.telefone}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Peso na admissão (kg)
          <input type="number" min="0.1" step="0.1" required value={pesoMomento} onChange={(event) => setPesoMomento(event.target.value ? Number(event.target.value) : '')} className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" placeholder="Ex.: 8,5" />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as InternacaoStatus)} className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss">
            {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Leito
        <span className="flex items-center gap-3">
          <select value={leitoId} onChange={(e) => setLeitoId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" required>
            <option value="">Selecione o leito</option>
            {leitos.map((leito) => <option key={leito.id} value={leito.id}>Leito {leito.id} - {leito.nome} ({leito.tipo === 'I' ? 'UTI' : 'Normal'})</option>)}
          </select>
          <Link href="/leitos" className="shrink-0 text-xs font-semibold text-moss hover:underline">Cadastrar leito</Link>
        </span>
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
      <section className="grid gap-4 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold text-ink">Medicações iniciais</h3><p className="mt-1 text-xs text-slate-500">A próxima dose será calculada a partir dos horários cadastrados.</p></div>
          <button type="button" onClick={adicionarMedicacao} className="rounded-lg border border-moss/30 px-3 py-2 text-sm font-semibold text-moss hover:bg-moss/5">Adicionar medicação</button>
        </div>
        {medicacoes.map((medicacao, indice) => (
          <div key={indice} className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-xs font-medium text-slate-600">Nome<input value={medicacao.nome} onChange={(event) => atualizarMedicacao(indice, { nome: event.target.value })} placeholder="Ex.: Dipirona" className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-ink" /></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Quantidade por dose<input type="number" min="0.1" step="0.1" value={medicacao.quantidade} onChange={(event) => atualizarMedicacao(indice, { quantidade: Number(event.target.value) })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-ink" /></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Unidade<select value={medicacao.unidade} onChange={(event) => atualizarMedicacao(indice, { unidade: event.target.value })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink">{unidadesMedicacao.map((unidade) => <option key={unidade}>{unidade}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Via<select value={medicacao.via} onChange={(event) => atualizarMedicacao(indice, { via: event.target.value })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink">{viasMedicacao.map((via) => <option key={via}>{via}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Custo por dose (R$, interno)<input type="number" min="0" step="0.01" value={medicacao.valorDose} onChange={(event) => atualizarMedicacao(indice, { valorDose: Number(event.target.value) })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-ink" /></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Frequência<select value={medicacao.frequenciaHoras} onChange={(event) => atualizarMedicacao(indice, { frequenciaHoras: Number(event.target.value) })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink">{[4, 6, 8, 12, 24].map((horas) => <option key={horas} value={horas}>A cada {horas} h</option>)}</select></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Primeiro horário<input type="time" value={medicacao.primeiroHorario} onChange={(event) => atualizarMedicacao(indice, { primeiroHorario: event.target.value })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-ink" /></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Até<input type="date" value={medicacao.fimEm} onChange={(event) => atualizarMedicacao(indice, { fimEm: event.target.value })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-ink" /></label>
            <button type="button" onClick={() => setMedicacoes((atuais) => atuais.filter((_, posicao) => posicao !== indice))} className="justify-self-start text-xs font-semibold text-red-700 hover:underline lg:col-span-4">Remover medicação</button>
          </div>
        ))}
      </section>
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
