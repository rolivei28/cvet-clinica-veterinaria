'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import type { Internacao, RegistroProntuario } from '@/types/internacao';

const POLL_MS = 30_000;
const ANTECEDENCIA_MIN = 5;   // avisa até 5 min antes do horário
const TOLERANCIA_MIN = 120;   // continua avisando até 2 h depois, se não for administrada

type Lembrete = {
  key: string;
  petNome: string;
  leito: string;
  medicamento: string;
  dose: string;
  horario: string;
  diffMin: number; // >0 = faltam X min; <=0 = atrasada
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function carregarLembretes(): Promise<Lembrete[]> {
  const resposta = await fetch('/api/internacoes');
  if (!resposta.ok) return [];
  const internacoes: Internacao[] = await resposta.json();
  const agora = new Date();
  const hoje = ymd(agora);

  const administradas = new Set<string>();
  await Promise.all(internacoes.map(async (internacao) => {
    const r = await fetch(`/api/internacoes/${internacao.id}/prontuario`);
    if (!r.ok) return;
    const registros: RegistroProntuario[] = await r.json();
    for (const reg of registros) {
      if (!reg.medicacaoId || !reg.horarioProgramado) continue;
      const prog = new Date(reg.horarioProgramado);
      administradas.add(`${internacao.id}-${reg.medicacaoId}-${ymd(prog)}-${hhmm(prog)}`);
    }
  }));

  const lembretes: Lembrete[] = [];
  for (const internacao of internacoes) {
    if (internacao.baixa) continue;
    for (const med of internacao.medicacoes ?? []) {
      if (med.fimEm && hoje > med.fimEm.slice(0, 10)) continue;
      for (const horario of med.horarios) {
        const [h, m] = horario.split(':').map(Number);
        const previsto = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m);
        const diffMin = Math.round((previsto.getTime() - agora.getTime()) / 60_000);
        if (diffMin > ANTECEDENCIA_MIN || diffMin < -TOLERANCIA_MIN) continue;
        if (administradas.has(`${internacao.id}-${med.id}-${hoje}-${horario}`)) continue;
        lembretes.push({
          key: `${hoje}-${internacao.id}-${med.id}-${horario}`,
          petNome: internacao.petNome,
          leito: internacao.leito ? `${internacao.leito.id} - ${internacao.leito.nome}` : 'Leito não definido',
          medicamento: med.nome,
          dose: `${med.quantidade} ${med.unidade} · ${med.via}`,
          horario,
          diffMin,
        });
      }
    }
  }
  return lembretes.sort((a, b) => a.diffMin - b.diffMin);
}

export function MedicacaoLembretes() {
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [dispensados, setDispensados] = useState<Set<string>>(new Set());

  const atualizar = useCallback(async () => {
    try {
      setLembretes(await carregarLembretes());
    } catch {
      // falha de rede: mantém os lembretes atuais e tenta de novo no próximo ciclo
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- polling de dados externos
    atualizar();
    const timer = setInterval(atualizar, POLL_MS);
    return () => clearInterval(timer);
  }, [atualizar]);

  const visiveis = lembretes.filter((l) => !dispensados.has(l.key));
  if (visiveis.length === 0) return null;

  return (
    <div className="print-hide fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" role="region" aria-live="polite" aria-label="Lembretes de medicação">
      {visiveis.slice(0, 4).map((l) => {
        const atrasada = l.diffMin < 0;
        return (
          <div key={l.key} className={`rounded-xl border bg-white p-4 shadow-lg ${atrasada ? 'border-rose-300' : 'border-amber-300'}`}>
            <div className="flex items-start gap-3">
              <BellRing size={18} className={`mt-0.5 shrink-0 ${atrasada ? 'text-rose-500' : 'text-amber-500'}`} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-ink">
                  {atrasada ? `Medicação atrasada ${-l.diffMin} min` : l.diffMin === 0 ? 'Hora da medicação' : `Medicação em ${l.diffMin} min`} · {l.horario}
                </p>
                <p className="mt-0.5 text-slate-700"><strong>{l.medicamento}</strong> — {l.petNome}</p>
                <p className="text-xs text-slate-500">{l.dose} · Leito {l.leito}</p>
                <Link href="/mapa" className="mt-2 inline-block text-xs font-semibold text-moss hover:underline">Registrar no Mapa de Execução</Link>
              </div>
              <button type="button" aria-label="Dispensar lembrete" onClick={() => setDispensados((prev) => new Set(prev).add(l.key))} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
      {visiveis.length > 4 && <p className="rounded-lg bg-ink px-3 py-1.5 text-center text-xs text-white">+{visiveis.length - 4} lembretes pendentes</p>}
    </div>
  );
}
