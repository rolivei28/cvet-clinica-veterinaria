import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calcularDiariasPorPeso, encontrarFaixaPreco, normalizarTipoLeito } from '../lib/calculo-diarias.js';

describe('Cálculo de diárias por peso e fração de até 24h', () => {
  it('normaliza tipo de leito corretamente', () => {
    assert.strictEqual(normalizarTipoLeito('N'), 'NORMAL');
    assert.strictEqual(normalizarTipoLeito('NORMAL'), 'NORMAL');
    assert.strictEqual(normalizarTipoLeito('I'), 'UTI');
    assert.strictEqual(normalizarTipoLeito('UTI'), 'UTI');
    assert.strictEqual(normalizarTipoLeito(null), 'NORMAL');
  });

  it('encontra faixa correta para animal de pequeno porte (< 5kg)', () => {
    const faixa = encontrarFaixaPreco(3.5, 'NORMAL', []);
    assert.strictEqual(faixa.valorDiaria, 90.00);
  });

  it('encontra faixa correta para animal de médio porte (12kg)', () => {
    const faixa = encontrarFaixaPreco(12, 'NORMAL', []);
    assert.strictEqual(faixa.valorDiaria, 120.00);
  });

  it('encontra faixa correta para animal de grande porte (25kg)', () => {
    const faixa = encontrarFaixaPreco(25, 'NORMAL', []);
    assert.strictEqual(faixa.valorDiaria, 150.00);
  });

  it('encontra faixa correta para animal gigante (> 30kg)', () => {
    const faixa = encontrarFaixaPreco(45, 'NORMAL', []);
    assert.strictEqual(faixa.valorDiaria, 190.00);
  });

  it('aplica valor de UTI para animal de 10kg', () => {
    const faixa = encontrarFaixaPreco(10, 'UTI', []);
    assert.strictEqual(faixa.valorDiaria, 180.00);
  });

  it('cobra proporcionalmente por 8 horas', () => {
    const entrada = new Date('2026-05-10T10:00:00.000Z');
    const saida = new Date('2026-05-10T18:00:00.000Z'); // 8 horas
    const res = calcularDiariasPorPeso(8, 'NORMAL', entrada, saida);
    assert.strictEqual(res.quantidadeDiarias, 1 / 3);
    assert.strictEqual(res.valorDiarias, 40.00);
  });

  it('cobra uma diária completa por 24 horas', () => {
    const entrada = new Date('2026-05-10T10:00:00.000Z');
    const saida = new Date('2026-05-11T10:00:00.000Z');
    const res = calcularDiariasPorPeso(8, 'NORMAL', entrada, saida);
    assert.strictEqual(res.quantidadeDiarias, 1);
    assert.strictEqual(res.valorDiarias, 120.00);
  });

  it('cobra proporcionalmente por 26 horas', () => {
    const entrada = new Date('2026-05-10T10:00:00.000Z');
    const saida = new Date('2026-05-11T12:00:00.000Z'); // 26 horas
    const res = calcularDiariasPorPeso(8, 'NORMAL', entrada, saida);
    assert.strictEqual(res.quantidadeDiarias, 26 / 24);
    assert.strictEqual(res.valorDiarias, 130.00);
  });
});
