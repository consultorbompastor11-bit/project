import { Decimal } from 'decimal.js';
import type { DREGroup } from '../../domain/enums';

export function safeDiv(a: number, b: number): number {
  if (b === 0) return 0;
  return new Decimal(a).dividedBy(new Decimal(b)).toNumber();
}

export function sumGroupValues(groupValues: Record<string, number>): number {
  return Object.values(groupValues).reduce((sum, val) => new Decimal(sum).plus(new Decimal(val)).toNumber(), 0);
}

export interface DREIntermediateValues {
  RECEITA_BRUTA: number;
  TOTAL_DEDUCOES: number;
  RECEITA_LIQUIDA: number;
  TOTAL_MAO_DE_OBRA: number;
  TOTAL_PROLABORE: number;
  TOTAL_CUSTOS: number;
  MARGEM_CONTRIBUICAO: number;
  TOTAL_MARKETING: number;
  TOTAL_DESPESAS_EMP: number;
  TOTAL_DESPESAS: number;
  RESULTADO_OPERACIONAL: number;
  TOTAL_PASSIVOS: number;
  RESULTADO_LIQUIDO: number;
  MARGEM_PERCENT: number | null;
}

export interface DREGroupSums {
  [key: string]: number; // "MM-YYYY" -> sum
}

export interface DREGroupsByMonth {
  FATURAMENTO: Record<string, number>;
  DEDUCOES: Record<string, number>;
  MAO_DE_OBRA: Record<string, number>;
  PROLABORE: Record<string, number>;
  MARKETING: Record<string, number>;
  DESPESAS_EMPRESA: Record<string, number>;
  PASSIVOS: Record<string, number>;
}

export function calculateDREFormulas(
  groupsByMonth: DREGroupsByMonth,
  monthKey: string,
  isAdminView: boolean
): DREIntermediateValues {
  const dec = (val: number) => new Decimal(val);

  const receitaBruta = dec(groupsByMonth.FATURAMENTO[monthKey] || 0);
  const totalDeducoes = dec(groupsByMonth.DEDUCOES[monthKey] || 0);
  const receitaLiquida = receitaBruta.plus(totalDeducoes);

  const totalMaoDeObra = dec(groupsByMonth.MAO_DE_OBRA[monthKey] || 0);
  const totalProlabore = dec(groupsByMonth.PROLABORE[monthKey] || 0);
  const totalCustos = totalMaoDeObra.plus(totalProlabore);

  const margemContribuicao = receitaLiquida.plus(totalCustos);

  const totalMarketing = dec(groupsByMonth.MARKETING[monthKey] || 0);
  const totalDespesasEmp = dec(groupsByMonth.DESPESAS_EMPRESA[monthKey] || 0);
  const totalDespesas = totalMarketing.plus(totalDespesasEmp);

  const resultadoOperacional = margemContribuicao.plus(totalDespesas);

  const totalPassivos = isAdminView
    ? dec(groupsByMonth.PASSIVOS[monthKey] || 0)
    : dec(0);

  const resultadoLiquido = resultadoOperacional.plus(totalPassivos);

  const margemPercent = receitaBruta.isZero()
    ? null
    : resultadoLiquido.dividedBy(receitaBruta).times(100).toNumber();

  return {
    RECEITA_BRUTA: receitaBruta.toNumber(),
    TOTAL_DEDUCOES: totalDeducoes.toNumber(),
    RECEITA_LIQUIDA: receitaLiquida.toNumber(),
    TOTAL_MAO_DE_OBRA: totalMaoDeObra.toNumber(),
    TOTAL_PROLABORE: totalProlabore.toNumber(),
    TOTAL_CUSTOS: totalCustos.toNumber(),
    MARGEM_CONTRIBUICAO: margemContribuicao.toNumber(),
    TOTAL_MARKETING: totalMarketing.toNumber(),
    TOTAL_DESPESAS_EMP: totalDespesasEmp.toNumber(),
    TOTAL_DESPESAS: totalDespesas.toNumber(),
    RESULTADO_OPERACIONAL: resultadoOperacional.toNumber(),
    TOTAL_PASSIVOS: totalPassivos.toNumber(),
    RESULTADO_LIQUIDO: resultadoLiquido.toNumber(),
    MARGEM_PERCENT: margemPercent,
  };
}

export function calculateDRETotals(
  groupsByMonth: DREGroupsByMonth,
  months: string[],
  isAdminView: boolean
): DREIntermediateValues {
  const dec = (val: number) => new Decimal(val);

  const sumValues = (group: DREGroup) =>
    months.reduce((sum, month) => sum.plus(dec(groupsByMonth[group]?.[month] || 0)), new Decimal(0));

  const receitaBruta = sumValues('FATURAMENTO');
  const totalDeducoes = sumValues('DEDUCOES');
  const receitaLiquida = receitaBruta.plus(totalDeducoes);

  const totalMaoDeObra = sumValues('MAO_DE_OBRA');
  const totalProlabore = sumValues('PROLABORE');
  const totalCustos = totalMaoDeObra.plus(totalProlabore);

  const margemContribuicao = receitaLiquida.plus(totalCustos);

  const totalMarketing = sumValues('MARKETING');
  const totalDespesasEmp = sumValues('DESPESAS_EMPRESA');
  const totalDespesas = totalMarketing.plus(totalDespesasEmp);

  const resultadoOperacional = margemContribuicao.plus(totalDespesas);

  const totalPassivos = isAdminView
    ? sumValues('PASSIVOS')
    : new Decimal(0);

  const resultadoLiquido = resultadoOperacional.plus(totalPassivos);

  const margemPercent = receitaBruta.isZero()
    ? null
    : resultadoLiquido.dividedBy(receitaBruta).times(100).toNumber();

  return {
    RECEITA_BRUTA: receitaBruta.toNumber(),
    TOTAL_DEDUCOES: totalDeducoes.toNumber(),
    RECEITA_LIQUIDA: receitaLiquida.toNumber(),
    TOTAL_MAO_DE_OBRA: totalMaoDeObra.toNumber(),
    TOTAL_PROLABORE: totalProlabore.toNumber(),
    TOTAL_CUSTOS: totalCustos.toNumber(),
    MARGEM_CONTRIBUICAO: margemContribuicao.toNumber(),
    TOTAL_MARKETING: totalMarketing.toNumber(),
    TOTAL_DESPESAS_EMP: totalDespesasEmp.toNumber(),
    TOTAL_DESPESAS: totalDespesas.toNumber(),
    RESULTADO_OPERACIONAL: resultadoOperacional.toNumber(),
    TOTAL_PASSIVOS: totalPassivos.toNumber(),
    RESULTADO_LIQUIDO: resultadoLiquido.toNumber(),
    MARGEM_PERCENT: margemPercent,
  };
}
