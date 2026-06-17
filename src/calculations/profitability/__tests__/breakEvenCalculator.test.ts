import { describe, it, expect } from 'vitest';
import { calculateBreakEven } from '../breakEvenCalculator';

describe('Break-even Calculator', () => {
  it('PE = 5000 / (1 - 0.35) = 7692.31', () => {
    const result = calculateBreakEven(5000, 35);
    expect(result.pontoEquilibrio).toBeCloseTo(7692.31, 2);
  });

  it('não divide por zero se CMV = 100%', () => {
    const result = calculateBreakEven(5000, 100);
    expect(result.pontoEquilibrio).toBe(0);
  });

  it('margemSeguranca = 0 se faturamento < pontoEquilibrio', () => {
    const result = calculateBreakEven(5000, 35, 5000);
    expect(result.margemSeguranca).toBe(0);
  });

  it('margemSeguranca > 0 se faturamento > pontoEquilibrio', () => {
    const result = calculateBreakEven(5000, 35, 10000);
    expect(result.margemSeguranca).toBeGreaterThan(0);
    expect(result.margemSeguranca).toBeCloseTo(10000 - 7692.31, 2);
  });

  it('diasParaEquilibrar é calculado corretamente', () => {
    // Faturamento 10000/mês = ~333.33/dia
    // PE = 7692.31
    // Dias = 7692.31 / 333.33 = ~23
    const result = calculateBreakEven(5000, 35, 10000);
    expect(result.diasParaEquilibrar).toBeGreaterThanOrEqual(23);
    expect(result.diasParaEquilibrar).toBeLessThanOrEqual(24);
  });

  it('diasParaEquilibrar = 0 se faturamentoAtual não informado', () => {
    const result = calculateBreakEven(5000, 35);
    expect(result.diasParaEquilibrar).toBe(0);
  });

  it('margemSegurancaPercent calculado corretamente', () => {
    const result = calculateBreakEven(5000, 35, 10000);
    expect(result.margemSegurancaPercent).toBeGreaterThan(0);
    expect(result.margemSegurancaPercent).toBeCloseTo(23.08, 1);
  });

  it('custo fixo zero retorna PE = 0', () => {
    const result = calculateBreakEven(0, 35, 10000);
    expect(result.pontoEquilibrio).toBe(0);
  });
});
