'use client';

import React, { useEffect, useState } from 'react';
import { InternacaoStatus, NovaInternacao } from '@/types/internacao';
import { AutocompleteSelect } from '@/components/autocomplete-select';
import Link from 'next/link';

type InternacaoFormProps = {
  onCreate: (data: NovaInternacao) => Promise<string | null>;
};

type Pet = { id: string; nome: string; especie: string; tutor: { nome: string; telefone: string; cpf?: string | null } };
type Leito = { id: string; nome: string; tipo: 'N' | 'I'; valorDiaria: number };
type EspeciePet = 'CANINO' | 'FELINO' | 'OUTROS';
type Raca = { id: string; nome: string; especie: EspeciePet };
type ModoPet = 'existente' | 'novo';

const statusOptions: { value: InternacaoStatus; label: string }[] = [
  { value: 'estavel',    label: 'Estável' },
  { value: 'observacao', label: 'Observação' },
  { value: 'critico',    label: 'Crítico' },
];

const especieLabel: Record<EspeciePet, string> = { CANINO: 'Canino', FELINO: 'Felino', OUTROS: 'Outros' };

const emptyTutor = { nome: '', telefone: '', cpf: '', email: '' };
const emptyPet = { nome: '', especie: 'CANINO' as EspeciePet, raca: '', dataNascimento: '' };

function defaultFimEm() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function InternacaoForm({ onCreate }: InternacaoFormProps) {
  const [pets, setPets]               = useState<Pet[]>([]);
  const [petId, setPetId]             = useState('');
  const [leitos, setLeitos]           = useState<Leito[]>([]);
  const [leitoId, setLeitoId]         = useState('');
  const [entradaEm, setEntradaEm]     = useState(() => dateInputValue(new Date()));
  const [dataSaida, setDataSaida]     = useState(() => defaultFimEm());
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

  useEffect(() => {
    Promise.all([fetch('/api/leitos'), fetch('/api/pets')])
      .then(async ([leitosResponse, petsResponse]) => {
        if (!leitosResponse.ok || !petsResponse.ok) throw new Error();
        setLeitos(await leitosResponse.json());
        setPets(await petsResponse.json());
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
  const leitoSelecionado = leitos.find((leito) => leito.id === leitoId);
  const quantidadeDiarias = entradaEm && dataSaida
    ? Math.max(1, Math.ceil((new Date(`${dataSaida}T00:00:00`).getTime() - new Date(`${entradaEm}T00:00:00`).getTime()) / 86_400_000))
    : 0;
  const valorEstimado = quantidadeDiarias * (leitoSelecionado?.valorDiaria ?? 0);
  const racasDaEspecie = racas.filter((raca) => raca.especie === novoPet.especie);

  function resetForm() {
    setPetId(''); setLeitoId(''); setEntradaEm(dateInputValue(new Date())); setDataSaida(defaultFimEm()); setDescricao(''); setStatus('observacao');
    setObservacao(''); setModoPet('existente'); setNovoTutor(emptyTutor); setNovoPet(emptyPet);
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leitoId || !entradaEm || !dataSaida || !descricao) return;
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
          body: JSON.stringify({ ...novoTutor, pets: [novoPet] }),
        });
        const tutorCriado = await response.json();
        if (!response.ok) {
          setSaveError(tutorCriado.message ?? 'Não foi possível cadastrar o tutor e o pet.');
          setSubmitting(false);
          return;
        }
        const petCriado = tutorCriado.pets[0];
        setPets((current) => [...current, { id: petCriado.id, nome: petCriado.nome, especie: petCriado.especie, tutor: { nome: tutorCriado.nome, telefone: tutorCriado.telefone, cpf: tutorCriado.cpf } }]);
        pet = { id: petCriado.id, nome: petCriado.nome, especie: petCriado.especie, tutorNome: tutorCriado.nome, tutorTelefone: tutorCriado.telefone, tutorCpf: tutorCriado.cpf || undefined };
      } catch {
        setSaveError('Não foi possível conectar ao serviço.');
        setSubmitting(false);
        return;
      }
    } else {
      pet = { id: petSelecionado!.id, nome: petSelecionado!.nome, especie: petSelecionado!.especie, tutorNome: petSelecionado!.tutor.nome, tutorTelefone: petSelecionado!.tutor.telefone, tutorCpf: petSelecionado!.tutor.cpf || undefined };
    }

    const error = await onCreate({
      petId: pet.id, petNome: pet.nome, especie: pet.especie, tutorNome: pet.tutorNome,
      tutorTelefone: pet.tutorTelefone, tutorCpf: pet.tutorCpf, leitoId,
      entradaEm, dataSaida, descricao,
      status, proximaMedicacao: '', observacao, medicacoes: [],
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
            <AutocompleteSelect label="Pet cadastrado" value={petId} onChange={setPetId} placeholder="Buscar por pet, espécie ou tutor" emptyMessage="Nenhum pet encontrado." required options={pets.map((pet) => ({ value: pet.id, label: pet.nome, description: `${pet.especie} · Tutor: ${pet.tutor.nome}` }))} />
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

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Leito
        <span className="flex items-center gap-3">
          <select value={leitoId} onChange={(e) => setLeitoId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" required>
            <option value="">Selecione o leito</option>
            {leitos.map((leito) => <option key={leito.id} value={leito.id}>Leito {leito.id} - {leito.nome} ({leito.tipo === 'I' ? 'UTI' : 'Normal'}) - R$ {leito.valorDiaria.toFixed(2).replace('.', ',')}/dia</option>)}
          </select>
          <Link href="/leitos" className="shrink-0 text-xs font-semibold text-moss hover:underline">Cadastrar leito</Link>
        </span>
      </label>
      {leitoSelecionado && <div className="grid gap-2 rounded-xl border border-moss/20 bg-moss/5 p-4 sm:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leito</p><p className="mt-1 font-semibold text-ink">{leitoSelecionado.id} · {leitoSelecionado.nome}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diária</p><p className="mt-1 font-semibold text-ink">R$ {leitoSelecionado.valorDiaria.toFixed(2).replace('.', ',')}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total estimado</p><p className="mt-1 font-semibold text-moss">R$ {valorEstimado.toFixed(2).replace('.', ',')} · {quantidadeDiarias} diária(s)</p></div></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">Data de entrada<input type="date" value={entradaEm} onChange={(e) => setEntradaEm(e.target.value)} required className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" /></label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">Data de saída<input type="date" min={entradaEm} value={dataSaida} onChange={(e) => setDataSaida(e.target.value)} required className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-moss" /></label>
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
