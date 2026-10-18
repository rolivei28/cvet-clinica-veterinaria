'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, Plus, Pencil, Trash2, Calculator, CheckCircle2, AlertCircle } from 'lucide-react';
import { FaixaPreco } from '@/types/internacao';

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const emptyForm: { id?: string; tipoLeito: 'NORMAL' | 'UTI'; pesoMin: number; pesoMax: number; valorDiaria: number; descricao: string } = {
  tipoLeito: 'NORMAL',
  pesoMin: 0,
  pesoMax: 5,
  valorDiaria: 90,
  descricao: '',
};

export default function ParametrizacaoPage() {
  const [faixas, setFaixas] = useState<FaixaPreco[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'NORMAL' | 'UTI'>('TODOS');

  // Form state
  const [form, setForm] = useState(emptyForm);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Simulador state
  const [simPeso, setSimPeso] = useState<number>(8.5);
  const [simTipo, setSimTipo] = useState<'NORMAL' | 'UTI'>('NORMAL');
  const [simDias, setSimDias] = useState<number>(1);

  async function carregar() {
    try {
      const res = await fetch('/api/parametrizacao');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFaixas(data);
    } catch {
      setErro('Não foi possível carregar a parametrização de diárias.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de dados
    carregar();
  }, []);

  const faixasFiltradas = useMemo(() => {
    if (filtroTipo === 'TODOS') return faixas;
    return faixas.filter((f) => f.tipoLeito === filtroTipo);
  }, [faixas, filtroTipo]);

  // Simulador em tempo real
  const simulacao = useMemo(() => {
    const doTipo = faixas.filter((f) => f.tipoLeito === simTipo);
    if (doTipo.length === 0) return null;
    const ordenada = [...doTipo].sort((a, b) => a.pesoMin - b.pesoMin);
    const faixaEncontrada = ordenada.find((f) => simPeso >= f.pesoMin && simPeso <= f.pesoMax)
      ?? (simPeso < ordenada[0].pesoMin ? ordenada[0] : ordenada[ordenada.length - 1]);
    const total = (simDias || 1) * faixaEncontrada.valorDiaria;
    return { faixa: faixaEncontrada, total };
  }, [faixas, simPeso, simTipo, simDias]);

  function iniciarEdicao(f: FaixaPreco) {
    setEditandoId(f.id);
    setForm({
      id: f.id,
      tipoLeito: f.tipoLeito,
      pesoMin: f.pesoMin,
      pesoMax: f.pesoMax,
      valorDiaria: f.valorDiaria,
      descricao: f.descricao,
    });
    setErro(null);
    setSucesso(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setSalvando(true);

    try {
      const url = editandoId ? `/api/parametrizacao/${editandoId}` : '/api/parametrizacao';
      const method = editandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao salvar faixa de preço.');
        return;
      }

      setSucesso(editandoId ? 'Faixa de preço atualizada com sucesso!' : 'Nova faixa de preço cadastrada!');
      cancelarEdicao();
      await carregar();
    } catch {
      setErro('Erro ao se comunicar com a API.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluirFaixa(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta faixa de preço?')) return;
    try {
      const res = await fetch(`/api/parametrizacao/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSucesso('Faixa removida com sucesso!');
      await carregar();
    } catch {
      setErro('Não foi possível excluir a faixa de preço.');
    }
  }

  return (
    <main className="flex min-h-full flex-col gap-6 p-6 lg:p-10">
      <header>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={22} className="text-moss" />
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-moss">Configuração Clínica</p>
        </div>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
          Parametrização de Diárias por Peso
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          A clínica adota a estratégia de cobrar a diária do leito com base no peso do animal em ciclos de até 24 horas.
          Defina as faixas de valores para internações Normais e UTI.
        </p>
      </header>

      {erro && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{erro}</span>
        </div>
      )}

      {sucesso && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          <span>{sucesso}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Coluna 1: Formulário e Simulador */}
        <div className="space-y-6">
          {/* Formulário de cadastro / edição */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">
              {editandoId ? 'Editar Faixa de Diária' : 'Cadastrar Nova Faixa de Diária'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Configure o limite de peso, o tipo de internação e o valor da fração de até 24h.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600">Tipo de Leito</label>
                  <select
                    value={form.tipoLeito}
                    onChange={(e) => setForm({ ...form, tipoLeito: e.target.value as 'NORMAL' | 'UTI' })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-moss"
                  >
                    <option value="NORMAL">Leito Normal (N)</option>
                    <option value="UTI">Leito UTI (I)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600">Valor Diária (até 24h)</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={form.valorDiaria}
                      onChange={(e) => setForm({ ...form, valorDiaria: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-moss"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600">Peso Mínimo (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={form.pesoMin}
                    onChange={(e) => setForm({ ...form, pesoMin: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600">Peso Máximo (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={form.pesoMax}
                    onChange={(e) => setForm({ ...form, pesoMax: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">Descrição / Rótulo</label>
                <input
                  type="text"
                  placeholder="Ex: Até 5 kg (Mini/Pequeno)"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={salvando}
                  className="inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-moss/90 transition"
                >
                  {salvando ? 'Salvando...' : editandoId ? 'Atualizar Faixa' : 'Adicionar Faixa'}
                </button>
                {editandoId && (
                  <button
                    type="button"
                    onClick={cancelarEdicao}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Simulador Interativo */}
          <section className="rounded-2xl border border-moss/30 bg-moss/5 p-6">
            <div className="flex items-center gap-2 text-moss">
              <Calculator size={20} />
              <h3 className="font-semibold">Simulador de Diária por Peso</h3>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Teste quanto custará a diária de internação para um peso específico.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-600">Peso do Pet (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={simPeso}
                  onChange={(e) => setSimPeso(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-600">Tipo de Leito</label>
                <select
                  value={simTipo}
                  onChange={(e) => setSimTipo(e.target.value as 'NORMAL' | 'UTI')}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="UTI">UTI</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-600">Diárias (24h cada)</label>
                <input
                  type="number"
                  min="1"
                  value={simDias}
                  onChange={(e) => setSimDias(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            {simulacao && (
              <div className="mt-4 rounded-xl border border-moss/20 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-full bg-moss/10 px-2.5 py-0.5 text-xs font-semibold text-moss">
                      {simulacao.faixa.tipoLeito}
                    </span>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {simulacao.faixa.descricao || `${simulacao.faixa.pesoMin} a ${simulacao.faixa.pesoMax} kg`}
                    </p>
                    <p className="text-xs text-slate-500">
                      Diária unitária (até 24h): {money(simulacao.faixa.valorDiaria)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase text-slate-500">{simDias} diária(s)</span>
                    <p className="text-xl font-bold text-moss">{money(simulacao.total)}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Coluna 2: Tabela de Faixas Cadastradas */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-slate-100 p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Tabela Atual de Preços</h2>
              <p className="text-xs text-slate-500">Valores cobrados por período de até 24h de leito.</p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
              <button
                onClick={() => setFiltroTipo('TODOS')}
                className={`rounded-md px-2.5 py-1 font-medium transition ${filtroTipo === 'TODOS' ? 'bg-white shadow text-ink' : 'text-slate-500 hover:text-ink'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroTipo('NORMAL')}
                className={`rounded-md px-2.5 py-1 font-medium transition ${filtroTipo === 'NORMAL' ? 'bg-white shadow text-ink' : 'text-slate-500 hover:text-ink'}`}
              >
                Normal
              </button>
              <button
                onClick={() => setFiltroTipo('UTI')}
                className={`rounded-md px-2.5 py-1 font-medium transition ${filtroTipo === 'UTI' ? 'bg-white shadow text-ink' : 'text-slate-500 hover:text-ink'}`}
              >
                UTI
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Faixa de Peso</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-right">Diária (24h)</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faixasFiltradas.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${f.tipoLeito === 'UTI' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                        {f.tipoLeito}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {f.pesoMin} kg — {f.pesoMax >= 999 ? 'acima' : `${f.pesoMax} kg`}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{f.descricao || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{money(f.valorDiaria)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => iniciarEdicao(f)}
                          title="Editar faixa"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-moss transition"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => excluirFaixa(f.id)}
                          title="Excluir faixa"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {faixasFiltradas.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                      Nenhuma faixa cadastrada para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

