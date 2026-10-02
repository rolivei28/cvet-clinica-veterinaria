'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BedDouble, Plus } from 'lucide-react';

type Leito = { id: string; nome: string; tipo: 'N' | 'I' };

export default function LeitosPage() {
  const [leitos, setLeitos] = useState<Leito[]>([]);
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<Leito['tipo']>('N');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch('/api/leitos').then((response) => response.json()).then(setLeitos).catch(() => setErro('Não foi possível carregar os leitos.'));
  }, []);

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro('');
    setSalvando(true);

    try {
      const response = await fetch('/api/leitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: numero, nome, tipo }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErro(data.message ?? 'Não foi possível cadastrar o leito.');
        return;
      }
      setLeitos((atual) => [...atual, data].sort((a, b) => Number(a.id) - Number(b.id)));
      setNumero('');
      setNome('');
      setTipo('N');
    } catch {
      setErro('Não foi possível conectar ao serviço.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="flex min-h-full flex-col gap-6 p-6 lg:p-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-moss">Estrutura</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">Leitos</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Cadastre os leitos disponíveis para a internação dos pacientes.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <form onSubmit={cadastrar} className="grid content-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-ink"><Plus size={19} className="text-moss" /><h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">Novo leito</h2></div>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">Número do leito<input type="text" inputMode="numeric" pattern="[0-9]+" value={numero} onChange={(event) => setNumero(event.target.value.replace(/\D/g, ''))} required className="h-10 rounded-lg border border-slate-300 px-3 outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" /></label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">Nome do leito<input value={nome} onChange={(event) => setNome(event.target.value)} required minLength={2} className="h-10 rounded-lg border border-slate-300 px-3 outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" placeholder="Ex: Canil 01" /></label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">Tipo do leito<select value={tipo} onChange={(event) => setTipo(event.target.value as Leito['tipo'])} className="h-10 rounded-lg border border-slate-300 bg-white px-3 outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"><option value="N">N - Normal</option><option value="I">I - UTI</option></select></label>
          {erro && <p role="alert" className="text-sm font-medium text-red-600">{erro}</p>}
          <button disabled={salvando} className="h-11 rounded-lg bg-moss text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-70">{salvando ? 'Salvando...' : 'Cadastrar leito'}</button>
        </form>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink">Leitos cadastrados</h2><span className="text-sm font-medium text-slate-500">{leitos.length} leito(s)</span></div>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
            {leitos.map((leito) => <article key={leito.id} className="flex items-center gap-3 bg-white p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-moss/10 text-sm font-bold text-moss">{leito.id}</span><div><h3 className="font-semibold text-ink">{leito.nome}</h3><p className="text-xs text-slate-500">Leito {leito.id} · {leito.tipo === 'I' ? 'UTI' : 'Normal'}</p></div></article>)}
            {leitos.length === 0 && <div className="col-span-full flex min-h-48 flex-col items-center justify-center gap-2 bg-white text-slate-500"><BedDouble size={28} className="text-slate-300" /><p className="text-sm">Nenhum leito cadastrado.</p></div>}
          </div>
        </section>
      </div>
    </main>
  );
}