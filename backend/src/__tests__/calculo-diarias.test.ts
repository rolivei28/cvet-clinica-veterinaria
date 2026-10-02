import { describe, expect, it } from 'vitest';
import { calcularDiariasPorPeso, encontrarFaixaPreco, normalizarTipoLeito } from '../lib/calculo-diarias.js';

describe('Cálculo de diárias por peso e fração de até 24h', () => {
  it('normaliza tipo de leito corretamente', () => {
    expect(normalizarTipoLeito('N')).toBe('NORMAL');
    expect(normalizarTipoLeito('NORMAL')).toBe('NORMAL');
    expect(normalizarTipoLeito('I')).toBe('UTI');
    expect(normalizarTipoLeito('UTI')).toBe('UTI');
    expect(normalizarTipoLeito(null)).toBe('NORMAL');
  });

  it('encontra faixa correta para animal de pequeno porte (< 5kg)', () => {
    const faixa = encontrarFaixaPreco(3.5, 'NORMAL', []);
    expect(faixa.valorDiaria).toBe(90.00);
  });

  it('encontra faixa correta para animal de médio porte (12kg)', () => {
    const faixa = encontrarFaixaPreco(12, 'NORMAL', []);
    expect(faixa.valorDiaria).toBe(120.00);
  });

  it('encontra faixa correta para animal de grande porte (25kg)', () => {
    const faixa = encontrarFaixaPreco(25, 'NORMAL', []);
    expect(faixa.valorDiaria).toBe(150.00);
  });

  it('encontra faixa correta para animal gigante (> 30kg)', () => {
    const faixa = encontrarFaixaPreco(45, 'NORMAL', []);
    expect(faixa.valorDiaria).toBe(190.00);
  });

  it('aplica valor de UTI para animal de 10kg', () => {
    const faixa = encontrarFaixaPreco(10, 'UTI', []);
    expect(faixa.valorDiaria).toBe(180.00);
  });

  it('cobra proporcionalmente por 8 horas', () => {
    const entrada = new Date('2026-05-10T10:00:00.000Z');
    const saida = new Date('2026-05-10T18:00:00.000Z'); // 8 horas
    const res = calcularDiariasPorPeso(8, 'NORMAL', entrada, saida);
    expect(res.quantidadeDiarias).toBe(1 / 3);
    expect(res.valorDiarias).toBe(40.00);
  });

  it('cobra uma diária completa por 24 horas', () => {
    const entrada = new Date('2026-05-10T10:00:00.000Z');
    const saida = new Date('2026-05-11T10:00:00.000Z');
    const res = calcularDiariasPorPeso(8, 'NORMAL', entrada, saida);
    expect(res.quantidadeDiarias).toBe(1);
    expect(res.valorDiarias).toBe(120.00);
  });

  it('cobra proporcionalmente por 26 horas', () => {
    const entrada = new Date('2026-05-10T10:00:00.000Z');
    const saida = new Date('2026-05-11T12:00:00.000Z'); // 26 horas
    const res = calcularDiariasPorPeso(8, 'NORMAL', entrada, saida);
    expect(res.quantidadeDiarias).toBe(26 / 24);
    expect(res.valorDiarias).toBe(130.00);
  });
});
