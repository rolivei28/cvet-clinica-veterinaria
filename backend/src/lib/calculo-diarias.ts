export type FaixaPreco = {
  id?: string;
  tipoLeito: string;
  pesoMin: number;
  pesoMax: number;
  valorDiaria: number;
  descricao?: string;
};

export const FAIXAS_PADRAO: FaixaPreco[] = [
  { tipoLeito: 'NORMAL', pesoMin: 0,     pesoMax: 5.0,   valorDiaria: 90.00,  descricao: 'Até 5 kg (Mini/Pequeno)' },
  { tipoLeito: 'NORMAL', pesoMin: 5.01,  pesoMax: 15.0,  valorDiaria: 120.00, descricao: '5.1 a 15 kg (Médio)' },
  { tipoLeito: 'NORMAL', pesoMin: 15.01, pesoMax: 30.0,  valorDiaria: 150.00, descricao: '15.1 a 30 kg (Grande)' },
  { tipoLeito: 'NORMAL', pesoMin: 30.01, pesoMax: 999.0, valorDiaria: 190.00, descricao: 'Acima de 30 kg (Gigante)' },
  { tipoLeito: 'UTI',    pesoMin: 0,     pesoMax: 5.0,   valorDiaria: 135.00, descricao: 'UTI - Até 5 kg (Mini/Pequeno)' },
  { tipoLeito: 'UTI',    pesoMin: 5.01,  pesoMax: 15.0,  valorDiaria: 180.00, descricao: 'UTI - 5.1 a 15 kg (Médio)' },
  { tipoLeito: 'UTI',    pesoMin: 15.01, pesoMax: 30.0,  valorDiaria: 225.00, descricao: 'UTI - 15.1 a 30 kg (Grande)' },
  { tipoLeito: 'UTI',    pesoMin: 30.01, pesoMax: 999.0, valorDiaria: 285.00, descricao: 'UTI - Acima de 30 kg (Gigante)' },
];

export function normalizarTipoLeito(tipo?: string | null): 'NORMAL' | 'UTI' {
  if (!tipo) return 'NORMAL';
  const t = tipo.trim().toUpperCase();
  if (t === 'I' || t === 'UTI') return 'UTI';
  return 'NORMAL';
}

export function encontrarFaixaPreco(peso: number, tipoLeito: string, tabela: FaixaPreco[]): FaixaPreco {
  const tipoNorm = normalizarTipoLeito(tipoLeito);
  const faixasDoTipo = tabela.filter((f) => normalizarTipoLeito(f.tipoLeito) === tipoNorm);
  const fonte = faixasDoTipo.length > 0 ? faixasDoTipo : FAIXAS_PADRAO.filter((f) => f.tipoLeito === tipoNorm);

  const ordenada = [...fonte].sort((a, b) => a.pesoMin - b.pesoMin);

  // Busca faixa onde peso se encaixa
  const encontrada = ordenada.find((f) => peso >= f.pesoMin && peso <= f.pesoMax);
  if (encontrada) return encontrada;

  // Se for menor que a menor faixa, pega a menor
  if (peso < ordenada[0].pesoMin) return ordenada[0];

  // Se for maior que a maior faixa, pega a maior
  return ordenada[ordenada.length - 1];
}

export function calcularDiariasPorPeso(
  peso: number,
  tipoLeito: string,
  entradaEm: Date,
  dataSaida: Date,
  tabela: FaixaPreco[] = FAIXAS_PADRAO
) {
  const diffMs = Math.max(0, dataSaida.getTime() - entradaEm.getTime());
  const quantidadeDiarias = diffMs / 86_400_000;
  const faixa = encontrarFaixaPreco(peso, tipoLeito, tabela);
  const valorDiaria = faixa.valorDiaria;
  const valorDiarias = Math.round(quantidadeDiarias * valorDiaria * 100) / 100;

  return {
    quantidadeDiarias,
    valorDiaria,
    valorDiarias,
    faixaDescricao: faixa.descricao ?? `${faixa.pesoMin} a ${faixa.pesoMax} kg`,
    tipoLeito: normalizarTipoLeito(tipoLeito),
  };
}

