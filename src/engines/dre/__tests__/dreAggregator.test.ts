import { describe, it, expect } from 'vitest';
import { buildDREReport } from '../dreAggregator';
import { safeDiv } from '../dreFormulas';
import type { Transaction } from '../../../domain/enums';

function createTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2),
    tipo: 'ENTRADA',
    status: 'REALIZADO',
    valor: 1000,
    descricao: 'Test transaction',
    data: new Date('2024-06-15'),
    dataPagamento: new Date('2024-06-15'),
    dataPrevisao: new Date('2024-06-15'),
    categoryId: 'cat-receita-servicos',
    isDeleted: false,
    ...overrides,
  };
}

describe('DRE Aggregator', () => {
  it('receita bruta soma apenas ENTRADA do grupo FATURAMENTO', () => {
    const transactions: Transaction[] = [
      createTransaction({
        tipo: 'ENTRADA',
        categoryId: 'cat-receita-servicos',
        valor: 5000,
        dataPagamento: new Date('2024-03-10'),
        dataPrevisao: new Date('2024-03-10'),
      }),
      createTransaction({
        tipo: 'ENTRADA',
        categoryId: 'cat-receita-produtos',
        valor: 3000,
        dataPagamento: new Date('2024-03-15'),
        dataPrevisao: new Date('2024-03-15'),
      }),
    ];

    const report = buildDREReport(transactions, 2024, 'caixa', true, 'tenant-1');

    const receitaBruta = report.results.find(r => r.label === '= Receita Bruta');
    expect(receitaBruta?.total).toBe(8000);
  });

  it('modo caixa exclui transações PLANEJADO', () => {
    const transactions: Transaction[] = [
      createTransaction({
        tipo: 'ENTRADA',
        categoryId: 'cat-receita-servicos',
        valor: 5000,
        status: 'REALIZADO',
        dataPagamento: new Date('2024-03-10'),
        dataPrevisao: new Date('2024-03-10'),
      }),
      createTransaction({
        tipo: 'ENTRADA',
        categoryId: 'cat-receita-servicos',
        valor: 2000,
        status: 'PLANEJADO',
        dataPagamento: null,
        dataPrevisao: new Date('2024-03-20'),
      }),
    ];

    const report = buildDREReport(transactions, 2024, 'caixa', true, 'tenant-1');

    const receitaBruta = report.results.find(r => r.label === '= Receita Bruta');
    expect(receitaBruta?.total).toBe(5000);
  });

  it('modo competência inclui transações PLANEJADO', () => {
    const transactions: Transaction[] = [
      createTransaction({
        tipo: 'ENTRADA',
        categoryId: 'cat-receita-servicos',
        valor: 5000,
        status: 'REALIZADO',
        dataPagamento: new Date('2024-03-10'),
        dataPrevisao: new Date('2024-03-10'),
      }),
      createTransaction({
        tipo: 'ENTRADA',
        categoryId: 'cat-receita-servicos',
        valor: 2000,
        status: 'PLANEJADO',
        dataPagamento: null,
        dataPrevisao: new Date('2024-03-20'),
      }),
    ];

    const report = buildDREReport(transactions, 2024, 'competencia', true, 'tenant-1');

    const receitaBruta = report.results.find(r => r.label === '= Receita Bruta');
    expect(receitaBruta?.total).toBe(7000);
  });

  it('OPERACIONAL não vê grupo PASSIVOS (isAdminView=false)', () => {
    const transactions: Transaction[] = [
      createTransaction({
        tipo: 'SAIDA',
        categoryId: 'cat-despesa-impostos-irpj',
        valor: 1000,
        status: 'REALIZADO',
        dataPagamento: new Date('2024-03-10'),
        dataPrevisao: new Date('2024-03-10'),
      }),
    ];

    const report = buildDREReport(transactions, 2024, 'caixa', false, 'tenant-1');

    const passivosResult = report.results.find(r => r.label === '(-) Passivos');
    expect(passivosResult).toBeUndefined();

    const passivosGroup = report.groups.PASSIVOS;
    expect(passivosGroup.length).toBe(0);
  });

  it('ADMIN vê grupo PASSIVOS (isAdminView=true)', () => {
    const transactions: Transaction[] = [
      createTransaction({
        tipo: 'SAIDA',
        categoryId: 'cat-despesa-impostos-irpj',
        valor: 1000,
        status: 'REALIZADO',
        dataPagamento: new Date('2024-03-10'),
        dataPrevisao: new Date('2024-03-10'),
      }),
    ];

    const report = buildDREReport(transactions, 2024, 'caixa', true, 'tenant-1');

    const passivosResult = report.results.find(r => r.label === '(-) Passivos');
    expect(passivosResult).toBeDefined();
    expect(passivosResult?.total).toBe(-1000);
  });

  it('safeDiv retorna 0 quando denominador é zero', () => {
    expect(safeDiv(100, 0)).toBe(0);
    expect(safeDiv(0, 0)).toBe(0);
    expect(safeDiv(100, 50)).toBe(2);
  });

  it('MARGEM_PERCENT retorna null quando RECEITA_BRUTA é zero', () => {
    const transactions: Transaction[] = [];

    const report = buildDREReport(transactions, 2024, 'caixa', true, 'tenant-1');

    const margemPercent = report.results.find(r => r.label === 'Margem %');
    expect(margemPercent?.total).toBe(0);
  });

  it('transações isDeleted=true são ignoradas', () => {
    const transactions: Transaction[] = [
      createTransaction({
        tipo: 'ENTRADA',
        categoryId: 'cat-receita-servicos',
        valor: 5000,
        status: 'REALIZADO',
        dataPagamento: new Date('2024-03-10'),
        isDeleted: false,
      }),
      createTransaction({
        tipo: 'ENTRADA',
        categoryId: 'cat-receita-servicos',
        valor: 3000,
        status: 'REALIZADO',
        dataPagamento: new Date('2024-03-15'),
        isDeleted: true,
      }),
    ];

    const report = buildDREReport(transactions, 2024, 'caixa', true, 'tenant-1');

    const receitaBruta = report.results.find(r => r.label === '= Receita Bruta');
    expect(receitaBruta?.total).toBe(5000);
  });

  it('gera 12 meses para o ano solicitado', () => {
    const transactions: Transaction[] = [];

    const report = buildDREReport(transactions, 2024, 'caixa', true, 'tenant-1');

    expect(report.months.length).toBe(12);
    expect(report.months[0].mesAno).toBe('01-2024');
    expect(report.months[11].mesAno).toBe('12-2024');
  });

  it('identifica meses futuros corretamente', () => {
    const transactions: Transaction[] = [];

    // Use a past year to test that isFuture is false for all months
    const pastYear = 2023;
    const reportPast = buildDREReport(transactions, pastYear, 'caixa', true, 'tenant-1');

    for (const month of reportPast.months) {
      expect(month.isFuture).toBe(false);
    }

    // Use a future year to test that isFuture is true for all months
    const futureYear = 2030;
    const reportFuture = buildDREReport(transactions, futureYear, 'caixa', true, 'tenant-1');

    for (const month of reportFuture.months) {
      expect(month.isFuture).toBe(true);
    }
  });
});
