export type InternacaoStatus = 'estavel' | 'observacao' | 'critico';

export type Medicacao = {
  id: string;
  nome: string;
  descricao: string;
  horarios: string[];
  cor: string;
  via: string;
  unidade: string;
  quantidade: number;
  valorDose: number;
  dosesAplicadas: number;
  primeiroHorario: string;
  frequenciaHoras: number;
  fimEm?: string;
};

export type MedicacaoInput = Omit<Medicacao, 'id' | 'horarios' | 'descricao'> & {
  horarios?: string[];
  descricao?: string;
};

export type Internacao = {
  id: string;
  petId?: string;
  petNome: string;
  especie: string;
  tutorNome: string;
  tutorTelefone?: string;
  tutorCpf?: string;
  leitoId?: string;
  leito?: { id: string; nome: string; tipo: 'N' | 'I' } | null;
  pesoMomento?: number | null;
  entradaEm: string;
  dataSaida?: string;
  descricao: string;
  quantidadeDiarias: number;
  valorDiarias: number;
  status: InternacaoStatus;
  baixa: boolean;
  proximaMedicacao: string;
  observacao: string;
  medicacoes: Medicacao[];
};

export type NovaInternacao = Omit<Internacao, 'id' | 'quantidadeDiarias' | 'valorDiarias' | 'leito' | 'medicacoes' | 'baixa'> & {
  medicacoes: MedicacaoInput[];
};

export type TipoRegistroProntuario = 'EVOLUCAO' | 'PROCEDIMENTO' | 'EXAME' | 'CURATIVO' | 'OCORRENCIA' | 'MEDICACAO_ADMINISTRADA';

export type RegistroProntuario = {
  id: string;
  petId: string;
  internacaoId?: string | null;
  tipo: TipoRegistroProntuario;
  titulo: string;
  descricao: string;
  temperatura?: number | null;
  frequenciaCardiaca?: number | null;
  frequenciaRespiratoria?: number | null;
  responsavel: string;
  dataHora: string;
  medicacaoId?: string | null;
  horarioProgramado?: string | null;
  createdAt?: string;
};

export type FaixaPreco = {
  id: string;
  tipoLeito: 'NORMAL' | 'UTI';
  pesoMin: number;
  pesoMax: number;
  descricao: string;
  valorDiaria: number;
};
