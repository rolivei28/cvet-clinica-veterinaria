'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, Check, PackageSearch, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

type TipoItem = 'MEDICAMENTO' | 'UTENSILIO';
type ItemCatalogo = {
  id: string;
  nome: string;
  tipo: TipoItem;
  categoria: string;
  unidadeEstoque: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  valorUnitario: number;
  descricao: string;
  ativo: boolean;
};

const vazio = {
  nome: '', tipo: 'MEDICAMENTO' as TipoItem, categoria: '', unidadeEstoque: 'un',
  quantidadeEstoque: 0, estoqueMinimo: 0, valorUnitario: 0, descricao: '', ativo: true,
};
const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CatalogoPage() {
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [filtro, setFiltro] = useState<'TODOS' | TipoItem>('TODOS');
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  async function carregar() {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (filtro !== 'TODOS') params.set('tipo', filtro);
      if (busca.trim()) params.set('busca', busca.trim());
      const response = await fetch(`/api/catalogo?${params.toString()}`);
      if (!response.ok) throw new Error('Não foi possível carregar o catálogo.');
      setItens(await response.json());
      setErro('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar o catálogo.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { void carregar(); }, [filtro, busca]);

  function novoItem(tipo = filtro === 'UTENSILIO' ? 'UTENSILIO' : 'MEDICAMENTO') {
    setEditando(null);
    setForm({ ...vazio, tipo: tipo as TipoItem });
    setAberto(true);
    setErro('');
    setSucesso('');
  }

  function editar(item: ItemCatalogo) {
    setEditando(item.id);
    setForm({
      nome: item.nome, tipo: item.tipo, categoria: item.categoria, unidadeEstoque: item.unidadeEstoque,
      quantidadeEstoque: item.quantidadeEstoque, estoqueMinimo: item.estoqueMinimo,
      valorUnitario: item.valorUnitario, descricao: item.descricao, ativo: item.ativo,
    });
    setAberto(true);
    setErro('');
    setSucesso('');
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      const response = await fetch(editando ? `/api/catalogo/${editando}` : '/api/catalogo', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível salvar o item.');
      setAberto(false);
      setSucesso(editando ? 'Item atualizado.' : 'Item cadastrado.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar o item.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: ItemCatalogo) {
    if (!window.confirm(`Excluir ${item.nome} do catálogo?`)) return;
    try {
      const response = await fetch(`/api/catalogo/${item.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setSucesso('Item excluído.');
      await carregar();
    } catch {
      setErro('Não foi possível excluir o item.');
    }
  }

  const estoqueBaixo = itens.filter((item) => item.ativo && item.estoqueMinimo > 0 && item.quantidadeEstoque <= item.estoqueMinimo).length;

  return (
    <main className="flex min-h-full flex-col gap-6 p-6 lg:p-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-moss"><PackageSearch size={20} /><p className="text-xs font-semibold uppercase tracking-[0.24em]">Insumos clínicos</p></div>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">Medicamentos e materiais</h1>
          <p className="mt-2 text-sm text-slate-500">Catálogo e saldo atual dos itens utilizados no atendimento.</p>
        </div>
        <button onClick={() => novoItem()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-moss px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss/90">
          <Plus size={17} /> Novo item
        </button>
      </header>

      {erro && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} />{erro}</div>}
      {sucesso && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><Check size={17} />{sucesso}</div>}

      <section className="flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar tipo de item">
          {(['TODOS', 'MEDICAMENTO', 'UTENSILIO'] as const).map((tipo) => (
            <button key={tipo} onClick={() => setFiltro(tipo)} className={`rounded-md px-3 py-2 text-sm font-medium ${filtro === tipo ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {tipo === 'TODOS' ? 'Todos' : tipo === 'MEDICAMENTO' ? 'Medicamentos' : 'Utensílios'}
            </button>
          ))}
        </div>
        <label className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar nome ou categoria" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-moss" />
        </label>
      </section>

      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-500">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</p>
        <p className={estoqueBaixo ? 'font-medium text-amber-700' : 'text-slate-500'}>{estoqueBaixo} abaixo do estoque mínimo</p>
      </div>

      <div className="overflow-x-auto border-y border-slate-200">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3 font-semibold">Item</th><th className="px-4 py-3 font-semibold">Categoria</th><th className="px-4 py-3 font-semibold">Saldo</th><th className="px-4 py-3 font-semibold">Mínimo</th><th className="px-4 py-3 font-semibold">Custo unitário</th><th className="px-4 py-3 font-semibold">Situação</th><th className="px-4 py-3 text-right font-semibold">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {carregando ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Carregando catálogo...</td></tr>
              : itens.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Nenhum item encontrado.</td></tr>
                : itens.map((item) => {
                  const baixo = item.ativo && item.estoqueMinimo > 0 && item.quantidadeEstoque <= item.estoqueMinimo;
                  return <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3"><p className="font-semibold text-ink">{item.nome}</p><p className="mt-0.5 text-xs text-slate-500">{item.tipo === 'MEDICAMENTO' ? 'Medicamento' : 'Utensílio'} · {item.unidadeEstoque}</p></td>
                    <td className="px-4 py-3 text-slate-600">{item.categoria}</td>
                    <td className={`px-4 py-3 font-medium ${baixo ? 'text-amber-700' : 'text-ink'}`}>{item.quantidadeEstoque} {item.unidadeEstoque}</td>
                    <td className="px-4 py-3 text-slate-600">{item.estoqueMinimo} {item.unidadeEstoque}</td>
                    <td className="px-4 py-3 text-slate-600">{moeda(item.valorUnitario)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${!item.ativo ? 'bg-slate-100 text-slate-500' : baixo ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{!item.ativo ? 'Inativo' : baixo ? 'Estoque baixo' : 'Ativo'}</span></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1"><button aria-label={`Editar ${item.nome}`} title="Editar" onClick={() => editar(item)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-ink"><Pencil size={16} /></button><button aria-label={`Excluir ${item.nome}`} title="Excluir" onClick={() => void excluir(item)} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button></div></td>
                  </tr>;
                })}
          </tbody>
        </table>
      </div>

      {aberto && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setAberto(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="form-title" className="max-h-[92vh] w-full overflow-y-auto bg-white p-5 shadow-xl sm:max-w-2xl sm:rounded-lg sm:p-7">
          <div className="flex items-start justify-between"><div><h2 id="form-title" className="text-xl font-semibold text-ink">{editando ? 'Editar item' : 'Cadastrar item'}</h2><p className="mt-1 text-sm text-slate-500">Informe o saldo e o custo conforme o inventário da clínica.</p></div><button onClick={() => setAberto(false)} aria-label="Fechar" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
          <form onSubmit={salvar} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase text-slate-600">Tipo<select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as TipoItem })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-ink"><option value="MEDICAMENTO">Medicamento</option><option value="UTENSILIO">Utensílio / material</option></select></label>
              <label className="text-xs font-semibold uppercase text-slate-600">Categoria<input required maxLength={80} value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })} placeholder="Ex.: Curativos" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal normal-case text-ink" /></label>
            </div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Nome do item<input required maxLength={120} value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal normal-case text-ink" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase text-slate-600">Saldo atual<input type="number" min="0" step="0.01" required value={form.quantidadeEstoque} onChange={(event) => setForm({ ...form, quantidadeEstoque: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal normal-case text-ink" /></label>
              <label className="text-xs font-semibold uppercase text-slate-600">Unidade<input required maxLength={20} value={form.unidadeEstoque} onChange={(event) => setForm({ ...form, unidadeEstoque: event.target.value })} placeholder="un, frasco, caixa..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal normal-case text-ink" /></label>
              <label className="text-xs font-semibold uppercase text-slate-600">Estoque mínimo<input type="number" min="0" step="0.01" required value={form.estoqueMinimo} onChange={(event) => setForm({ ...form, estoqueMinimo: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal normal-case text-ink" /></label>
              <label className="text-xs font-semibold uppercase text-slate-600">Custo unitário (R$)<input type="number" min="0" step="0.01" required value={form.valorUnitario} onChange={(event) => setForm({ ...form, valorUnitario: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal normal-case text-ink" /></label>
            </div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Observações<textarea rows={2} maxLength={500} value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal normal-case text-ink" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} className="h-4 w-4 accent-[#52684d]" />Item ativo</label>
            {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setAberto(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button><button disabled={salvando} type="submit" className="rounded-lg bg-moss px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss/90 disabled:opacity-60">{salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar item'}</button></div>
          </form>
        </section>
      </div>}
    </main>
  );
}