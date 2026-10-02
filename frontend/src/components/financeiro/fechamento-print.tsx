'use client';

import { BedDouble, Pill, WalletCards, CheckCircle2 } from 'lucide-react';

type MedicacaoCobrada = {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  valorDose: number;
  dosesAplicadas: number;
};

type FinanceiroItem = {
  id: string;
  petNome: string;
  pesoMomento?: number | null;
  entradaEm: string;
  dataSaida?: string | null;
  leito: { nome: string; tipo?: 'N' | 'I' } | null;
  pet: { peso?: number | null; tutor: { nome: string; telefone: string } } | null;
  medicacoes: MedicacaoCobrada[];
  financeiro: {
    diarias: number;
    valorDiaria: number;
    valorDiarias: number;
    faixaDescricao?: string;
    peso: number;
    tipoLeito: string;
    valorMedicacoes: number;
    valorTotal: number;
    valorPago: number;
    saldo: number;
    encerrada: boolean;
  };
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FechamentoFinanceiroPrint({ item }: { item: FinanceiroItem }) {
  const peso = item.financeiro.peso ?? item.pesoMomento ?? item.pet?.peso ?? 0;
  const dataEntrada = new Date(item.entradaEm).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const dataSaida = item.dataSaida
    ? new Date(item.dataSaida).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Em internação';
  const dataImpressao = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const aplicadas = item.medicacoes.filter((m) => m.dosesAplicadas > 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do documento */}
      <div className="border-b-2 border-slate-800 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <WalletCards size={20} className="text-moss" />
              <h1 className="text-xl font-bold text-ink">Fechamento Financeiro da Internação</h1>
            </div>
            <p className="text-xs text-slate-500">
              Clínica Veterinária — Extrato de Gastos e Cobrança
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Impresso em: {dataImpressao}</p>
          </div>
        </div>
      </div>

      {/* Dados do paciente e internação */}
      <div className="print-no-break rounded-xl border border-slate-200 p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Dados do Paciente e Internação
        </h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-xs text-slate-400">Paciente:</span>
            <p className="font-semibold text-ink">{item.petNome}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Peso na Admissão:</span>
            <p className="font-medium text-slate-700">{peso > 0 ? `${peso} kg` : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Tutor:</span>
            <p className="font-medium text-slate-700">
              {item.pet?.tutor.nome ?? 'Não informado'}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Telefone:</span>
            <p className="font-medium text-slate-700">{item.pet?.tutor.telefone ?? '—'}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Data de Entrada:</span>
            <p className="font-medium text-slate-700">{dataEntrada}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Data de Saída:</span>
            <p className="font-medium text-slate-700">{dataSaida}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Leito:</span>
            <p className="font-medium text-slate-700">
              {item.leito?.nome ?? 'Leito padrão'} ({item.financeiro.tipoLeito})
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Status:</span>
            <p className="font-medium text-slate-700">
              {item.financeiro.encerrada ? 'Internação Encerrada' : 'Em Internação'}
            </p>
          </div>
        </div>
      </div>

      {/* Detalhamento do Leito */}
      <div className="print-no-break rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 text-moss font-semibold text-sm mb-3">
          <BedDouble size={16} />
          <span>Cobrança de Leito (por peso em ciclos de até 24h)</span>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2 text-slate-500">Faixa Tarifária Aplicada</td>
              <td className="py-2 text-right font-medium text-slate-800">
                {item.financeiro.faixaDescricao || `Faixa para ${peso} kg`}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-slate-500">Valor da Diária (até 24h)</td>
              <td className="py-2 text-right font-medium text-slate-800">
                {money(item.financeiro.valorDiaria)}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-slate-500">Quantidade de Diárias (frações de 24h)</td>
              <td className="py-2 text-right font-medium text-slate-800">
                {item.financeiro.diarias} diária(s)
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td className="py-3 font-bold text-ink">Subtotal Leito</td>
              <td className="py-3 text-right font-bold text-moss text-base">
                {money(item.financeiro.valorDiarias)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Medicamentos Aplicados */}
      <div className="print-no-break rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 text-moss font-semibold text-sm mb-3">
          <Pill size={16} />
          <span>Gastos com Medicamentos Aplicados</span>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th className="py-2 text-left font-semibold">Medicamento</th>
              <th className="py-2 text-left font-semibold">Dose Unitária</th>
              <th className="py-2 text-center font-semibold">Doses Aplicadas</th>
              <th className="py-2 text-right font-semibold">Preço/Dose</th>
              <th className="py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {aplicadas.length > 0 ? (
              aplicadas.map((med) => (
                <tr key={med.id}>
                  <td className="py-2 font-medium text-slate-800">{med.nome}</td>
                  <td className="py-2 text-slate-500">
                    {med.quantidade} {med.unidade}
                  </td>
                  <td className="py-2 text-center font-bold text-moss">{med.dosesAplicadas}</td>
                  <td className="py-2 text-right text-slate-600">{money(med.valorDose)}</td>
                  <td className="py-2 text-right font-semibold text-slate-800">
                    {money(med.valorDose * med.dosesAplicadas)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
                  Nenhum medicamento com dose aplicada registrada.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td colSpan={4} className="py-3 font-bold text-ink">
                Subtotal Medicações
              </td>
              <td className="py-3 text-right font-bold text-moss text-base">
                {money(item.financeiro.valorMedicacoes)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Resumo Total */}
      <div className="print-no-break rounded-xl border-2 border-slate-800 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Resumo do Fechamento
        </h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2 text-slate-600">Subtotal Leito</td>
              <td className="py-2 text-right font-medium text-slate-800">
                {money(item.financeiro.valorDiarias)}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-slate-600">Subtotal Medicações</td>
              <td className="py-2 text-right font-medium text-slate-800">
                {money(item.financeiro.valorMedicacoes)}
              </td>
            </tr>
            <tr className="border-t-2 border-slate-400">
              <td className="py-3 text-base font-bold text-ink">Total da Internação</td>
              <td className="py-3 text-right text-lg font-bold text-ink">
                {money(item.financeiro.valorTotal)}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-slate-600">Total Quitado</td>
              <td className="py-2 text-right font-medium text-slate-800">
                {money(item.financeiro.valorPago)}
              </td>
            </tr>
            <tr>
              <td className="py-2 font-semibold text-slate-700">Saldo Restante</td>
              <td
                className={`py-2 text-right text-base font-bold ${
                  item.financeiro.saldo > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {money(item.financeiro.saldo)}
              </td>
            </tr>
          </tbody>
        </table>

        {item.financeiro.saldo <= 0 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={16} />
            Conta quitada integralmente
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div className="border-t-2 border-slate-300 pt-4 mt-8">
        <div className="grid grid-cols-2 gap-8 text-xs text-slate-400">
          <div>
            <p className="mb-8">Responsável pelo fechamento:</p>
            <div className="border-b border-slate-400 w-64" />
            <p className="mt-1">Nome / CRMV: _______________</p>
          </div>
          <div>
            <p className="mb-8">Ciente do Tutor:</p>
            <div className="border-b border-slate-400 w-64 ml-auto" />
            <p className="mt-1 text-right">CPF: _______________</p>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          Documento gerado eletronicamente — {dataImpressao}
        </p>
      </div>
    </div>
  );
}

