'use client';

import { Thermometer, Heart, Wind, FileText, Stethoscope } from 'lucide-react';
import { RegistroProntuario } from '@/types/internacao';

type Props = {
  petNome: string;
  especie: string;
  tutorNome: string;
  tutorTelefone?: string;
  entradaEm: string;
  pesoMomento?: number | null;
  prontuarios: RegistroProntuario[];
};

const TIPO_LABELS: Record<string, string> = {
  EVOLUCAO: 'Evolução Clínica',
  PROCEDIMENTO: 'Procedimento',
  EXAME: 'Exame / Coleta',
  CURATIVO: 'Curativo / Manejo',
  OCORRENCIA: 'Ocorrência',
  MEDICACAO_ADMINISTRADA: 'Medicação administrada',
};

const TIPO_CORES: Record<string, { badge: string; dot: string }> = {
  EVOLUCAO: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  PROCEDIMENTO: { badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  EXAME: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  CURATIVO: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  OCORRENCIA: { badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  MEDICACAO_ADMINISTRADA: { badge: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
};

export function ProntuarioPrintContent({
  petNome,
  especie,
  tutorNome,
  tutorTelefone,
  entradaEm,
  pesoMomento,
  prontuarios,
}: Props) {
  const dataEntrada = new Date(entradaEm).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const dataImpressao = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho do documento */}
      <div className="border-b-2 border-slate-800 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope size={20} className="text-moss" />
              <h1 className="text-xl font-bold text-ink">Prontuário Clínico Veterinário</h1>
            </div>
            <p className="text-xs text-slate-500">Clínica Veterinária — Registro de Atendimento</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Impresso em: {dataImpressao}</p>
          </div>
        </div>
      </div>

      {/* Dados do paciente */}
      <div className="print-no-break rounded-xl border border-slate-200 p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Dados do Paciente
        </h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-xs text-slate-400">Paciente:</span>
            <p className="font-semibold text-ink">{petNome}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Espécie:</span>
            <p className="font-medium text-slate-700">{especie}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Tutor:</span>
            <p className="font-medium text-slate-700">{tutorNome}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Telefone:</span>
            <p className="font-medium text-slate-700">{tutorTelefone || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Data de Entrada:</span>
            <p className="font-medium text-slate-700">{dataEntrada}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Peso na Admissão:</span>
            <p className="font-medium text-slate-700">{pesoMomento ? `${pesoMomento} kg` : '—'}</p>
          </div>
        </div>
      </div>

      {/* Registros do prontuário */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-moss" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Registros Clínicos ({prontuarios.length})
          </h2>
        </div>

        {prontuarios.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            Nenhum registro clínico encontrado para esta internação.
          </p>
        ) : (
          <div className="space-y-4">
            {prontuarios.map((reg) => {
              const cor = TIPO_CORES[reg.tipo] || TIPO_CORES.EVOLUCAO;
              const d = new Date(reg.dataHora);
              const dataFormatada = d.toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              return (
                <div key={reg.id} className="print-no-break rounded-xl border border-slate-200 p-4">
                  {/* Header do registro */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${cor.badge}`}>
                        {TIPO_LABELS[reg.tipo] || reg.tipo}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {reg.titulo || reg.tipo}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{dataFormatada}</span>
                      <span className="font-medium text-slate-600">por {reg.responsavel}</span>
                    </div>
                  </div>

                  {/* Descrição */}
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {reg.descricao}
                  </p>

                  {/* Parâmetros vitais */}
                  {(reg.temperatura != null ||
                    reg.frequenciaCardiaca != null ||
                    reg.frequenciaRespiratoria != null) && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      {reg.temperatura != null && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700">
                          <Thermometer size={13} className="text-rose-500" /> {reg.temperatura} °C
                        </span>
                      )}
                      {reg.frequenciaCardiaca != null && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700">
                          <Heart size={13} className="text-red-500" /> {reg.frequenciaCardiaca} bpm
                        </span>
                      )}
                      {reg.frequenciaRespiratoria != null && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700">
                          <Wind size={13} className="text-cyan-500" /> {reg.frequenciaRespiratoria}{' '}
                          mpm
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé do documento */}
      <div className="border-t-2 border-slate-300 pt-4 mt-8">
        <div className="grid grid-cols-2 gap-8 text-xs text-slate-400">
          <div>
            <p className="mb-8">Assinatura do Médico Veterinário:</p>
            <div className="border-b border-slate-400 w-64" />
            <p className="mt-1">CRMV: _______________</p>
          </div>
          <div className="text-right">
            <p>Documento gerado eletronicamente</p>
            <p>Data: {dataImpressao}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

