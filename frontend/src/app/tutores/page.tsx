'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Save, Search, Trash2, UserRound, UsersRound, X } from 'lucide-react';
import { AutocompleteSelect } from '@/components/autocomplete-select';

type EspeciePet = 'CANINO' | 'FELINO' | 'OUTROS';
type Pet = { id?: string; nome: string; especie: EspeciePet; raca: string | null; peso?: number | null; dataNascimento: string | null };
type Tutor = { id: string; nome: string; telefone: string; cpf: string | null; email: string | null; pets: Pet[] };
type Raca = { id: string; nome: string; especie: EspeciePet; grupoFci: number | null };
type PetForm = { id?: string; nome: string; especie: EspeciePet; raca: string; peso: string; dataNascimento: string };

const emptyForm = { nome: '', telefone: '', cpf: '', email: '' };
const emptyPet = (): PetForm => ({ nome: '', especie: 'CANINO', raca: '', peso: '', dataNascimento: '' });
const especieLabel: Record<EspeciePet, string> = { CANINO: 'Canino', FELINO: 'Felino', OUTROS: 'Outros' };

export default function TutoresPage() {
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [racas, setRacas] = useState<Raca[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [pets, setPets] = useState<PetForm[]>([emptyPet()]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [focoBusca, setFocoBusca] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarTutores();
    Promise.all([fetch('/api/racas?especie=CANINO'), fetch('/api/racas?especie=FELINO')])
      .then(async (responses) => {
        if (responses.some((response) => !response.ok)) throw new Error();
        setRacas((await Promise.all(responses.map((response) => response.json()))).flat());
      })
      .catch(() => setErro('Não foi possível carregar o catálogo de raças.'));
  }, []);

  async function carregarTutores() {
    try {
      const response = await fetch('/api/tutores');
      if (!response.ok) throw new Error();
      setTutores(await response.json());
    } catch { setErro('Não foi possível carregar os tutores.'); }
  }

  const tutoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return termo ? tutores.filter((tutor) => `${tutor.nome} ${tutor.telefone} ${tutor.email ?? ''} ${tutor.pets.map((pet) => pet.nome).join(' ')}`.toLocaleLowerCase('pt-BR').includes(termo)) : tutores;
  }, [busca, tutores]);

  const sugestoes = busca.trim() ? tutoresFiltrados.slice(0, 6) : [];

  function limparFormulario() {
    setForm(emptyForm);
    setPets([emptyPet()]);
    setEditandoId(null);
    setErro('');
  }

  function editarTutor(tutor: Tutor) {
    setForm({ nome: tutor.nome, telefone: tutor.telefone, cpf: tutor.cpf ?? '', email: tutor.email ?? '' });
    setPets(tutor.pets.map((pet) => ({ id: pet.id, nome: pet.nome, especie: pet.especie, raca: pet.raca ?? '', peso: pet.peso != null ? String(pet.peso) : '', dataNascimento: pet.dataNascimento?.slice(0, 10) ?? '' })));
    setEditandoId(tutor.id);
    setErro('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvarTutor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const response = await fetch(editandoId ? `/api/tutores/${editandoId}` : '/api/tutores', {
        method: editandoId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          pets: pets.map((p) => ({ ...p, peso: p.peso ? Number(p.peso) : null })),
        }),
      });
      const data = await response.json();
      if (!response.ok) { setErro(data.message ?? 'Não foi possível salvar o tutor.'); return; }
      setTutores((current) => editandoId ? current.map((tutor) => tutor.id === editandoId ? data : tutor).sort(ordenarTutores) : [...current, data].sort(ordenarTutores));
      limparFormulario();
    } catch { setErro('Não foi possível conectar ao serviço.'); } finally { setSalvando(false); }
  }

  async function excluirTutor(tutor: Tutor) {
    if (!window.confirm(`Excluir ${tutor.nome} e os pets sem histórico de internação?`)) return;
    setErro('');
    try {
      const response = await fetch(`/api/tutores/${tutor.id}`, { method: 'DELETE' });
      if (!response.ok) { setErro((await response.json()).message ?? 'Não foi possível excluir o tutor.'); return; }
      setTutores((current) => current.filter((item) => item.id !== tutor.id));
      if (editandoId === tutor.id) limparFormulario();
    } catch { setErro('Não foi possível conectar ao serviço.'); }
  }

  function atualizarPet(index: number, patch: Partial<PetForm>) {
    setPets((current) => current.map((pet, itemIndex) => itemIndex === index ? { ...pet, ...patch } : pet));
  }

  return <main className="flex min-h-full flex-col gap-5 p-5 lg:p-7">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss">Cadastro clínico</p><h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">Tutores e pets</h1></div>
      <p className="text-sm text-slate-500"><strong className="font-semibold text-ink">{tutores.length}</strong> tutores cadastrados</p>
    </header>

    {erro && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erro}</p>}

    <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <form onSubmit={salvarTutor} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-moss/10 text-moss"><UserRound size={16} /></span><div><h2 className="text-base font-semibold text-ink">{editandoId ? 'Editar tutor' : 'Novo tutor'}</h2><p className="text-xs text-slate-500">{editandoId ? 'Atualize os dados abaixo.' : 'Responsável e pacientes.'}</p></div></div>{editandoId && <IconButton icon={<X size={16} />} label="Cancelar edição" onClick={limparFormulario} />}</div>
        <div className="grid gap-3"><Field label="Nome completo" value={form.nome} onChange={(nome) => setForm({ ...form, nome })} required /><Field label="Telefone" value={form.telefone} onChange={(telefone) => setForm({ ...form, telefone })} required inputMode="tel" /><Field label="CPF" value={form.cpf} onChange={(cpf) => setForm({ ...form, cpf })} /><Field label="E-mail" value={form.email} onChange={(email) => setForm({ ...form, email })} type="email" /></div>
        <div className="border-t border-slate-100 pt-3"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-ink">Pets</h3><button type="button" onClick={() => setPets((current) => [...current, emptyPet()])} className="inline-flex items-center gap-1 text-xs font-semibold text-moss"><Plus size={15} />Adicionar</button></div><div className="grid gap-2">{pets.map((pet, index) => <PetEditor key={pet.id ?? index} pet={pet} index={index} racas={racas} removivel={pets.length > 1} onChange={atualizarPet} onRemove={() => setPets((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</div></div>
        <button disabled={salvando} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-moss px-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-70">{editandoId ? <Save size={16} /> : <Plus size={16} />}{salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar tutor'}</button>
      </form>

      <section className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold text-ink">Base de tutores</h2><p className="text-xs text-slate-500">{tutoresFiltrados.length} registro(s) encontrado(s)</p></div><div className="relative w-full sm:w-80"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={busca} onFocus={() => setFocoBusca(true)} onBlur={() => setFocoBusca(false)} onChange={(event) => { setBusca(event.target.value); setFocoBusca(true); }} placeholder="Buscar tutor, telefone ou pet" className="h-9 w-full rounded-md border border-slate-300 pl-8 pr-8 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/15" />{busca && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setBusca('')} title="Limpar busca" className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100"><X size={15} /></button>}{focoBusca && sugestoes.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">{sugestoes.map((tutor) => <button key={tutor.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setBusca(tutor.nome); setFocoBusca(false); editarTutor(tutor); }} className="w-full px-3 py-2 text-left hover:bg-moss/5"><span className="block text-sm font-medium text-ink">{tutor.nome}</span><span className="block text-xs text-slate-500">{tutor.pets.map((pet) => pet.nome).join(' · ') || 'Sem pets'} · {tutor.telefone}</span></button>)}</div>}</div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500"><tr><th className="px-4 py-2.5">Tutor</th><th className="px-4 py-2.5">Contato</th><th className="px-4 py-2.5">Pets</th><th className="w-20 px-3 py-2.5"><span className="sr-only">Ações</span></th></tr></thead><tbody className="divide-y divide-slate-100">{tutoresFiltrados.map((tutor) => <tr key={tutor.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-ink">{tutor.nome}<p className="mt-0.5 text-xs font-normal text-slate-500">{tutor.cpf || 'CPF não informado'}</p></td><td className="px-4 py-3 text-slate-600">{tutor.telefone}<p className="mt-0.5 text-xs text-slate-500">{tutor.email || 'E-mail não informado'}</p></td><td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{tutor.pets.length ? tutor.pets.map((pet) => <span key={pet.id} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">{pet.nome} {pet.peso ? <strong className="text-moss font-medium">({pet.peso}kg)</strong> : ''} <span className="text-slate-400">{especieLabel[pet.especie]}</span></span>) : <span className="text-xs text-slate-400">Sem pets</span>}</div></td><td className="px-3 py-3"><div className="flex justify-end gap-1"><IconButton icon={<Pencil size={16} />} label={`Editar ${tutor.nome}`} onClick={() => editarTutor(tutor)} /><IconButton icon={<Trash2 size={16} />} label={`Excluir ${tutor.nome}`} onClick={() => excluirTutor(tutor)} destructive /></div></td></tr>)}{tutoresFiltrados.length === 0 && <tr><td colSpan={4} className="px-4 py-16 text-center"><UsersRound size={26} className="mx-auto mb-2 text-slate-300" /><p className="text-sm text-slate-500">Nenhum tutor encontrado.</p></td></tr>}</tbody></table></div>
      </section>
    </div>
  </main>;
}

function PetEditor({ pet, index, racas, removivel, onChange, onRemove }: { pet: PetForm; index: number; racas: Raca[]; removivel: boolean; onChange: (index: number, patch: Partial<PetForm>) => void; onRemove: () => void }) {
  const racasDaEspecie = racas.filter((raca) => raca.especie === pet.especie);
  return <fieldset className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
    <div className="flex items-center justify-between"><legend className="text-xs font-semibold text-slate-600">Pet {index + 1}</legend>{removivel && <IconButton icon={<Trash2 size={14} />} label="Remover pet" onClick={onRemove} destructive />}</div>
    <Field label="Nome" value={pet.nome} onChange={(nome) => onChange(index, { nome })} required />
    <div className="grid gap-2 sm:grid-cols-2">
      <SelectEspecie value={pet.especie} onChange={(especie) => onChange(index, { especie, raca: '' })} />
      <label className="grid gap-1 text-xs font-medium text-slate-600">
        Peso (kg)
        <input
          type="number"
          step="0.1"
          min="0.1"
          placeholder="Ex: 8.5"
          value={pet.peso}
          onChange={(e) => onChange(index, { peso: e.target.value })}
          className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
        />
      </label>
    </div>
    <div>{pet.especie === 'OUTROS' ? <Field label="Raça" value={pet.raca} onChange={(raca) => onChange(index, { raca })} /> : <AutocompleteSelect label="Raça" value={pet.raca} onChange={(raca) => onChange(index, { raca })} placeholder="Buscar raça" emptyMessage="Nenhuma raça encontrada." options={racasDaEspecie.map((raca) => ({ value: raca.nome, label: raca.nome, description: raca.grupoFci ? `Grupo FCI ${raca.grupoFci}` : undefined }))} />}</div>
    <Field label="Nascimento" value={pet.dataNascimento} onChange={(dataNascimento) => onChange(index, { dataNascimento })} type="date" />
  </fieldset>;
}

function Field({ label, value, onChange, required, type = 'text', inputMode, className = '' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; inputMode?: 'tel'; className?: string }) { return <label className={`grid gap-1 text-xs font-medium text-slate-600 ${className}`}>{label}<input type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" /></label>; }
function SelectEspecie({ value, onChange }: { value: EspeciePet; onChange: (value: EspeciePet) => void }) { return <label className="grid gap-1 text-xs font-medium text-slate-600">Espécie<select value={value} onChange={(event) => onChange(event.target.value as EspeciePet)} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-ink outline-none focus:border-moss"><option value="CANINO">Canino</option><option value="FELINO">Felino</option><option value="OUTROS">Outros</option></select></label>; }
function IconButton({ icon, label, onClick, destructive = false }: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean }) { return <button type="button" onClick={onClick} title={label} aria-label={label} className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${destructive ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-moss hover:bg-moss/10'}`}>{icon}</button>; }
function ordenarTutores(a: Tutor, b: Tutor) { return a.nome.localeCompare(b.nome, 'pt-BR'); }