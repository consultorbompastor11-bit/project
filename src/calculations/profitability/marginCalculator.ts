import { sumSafe, divideSafe, percentSafe } from '../../utils/money';

export interface ProfitabilityResult {
  receitaBruta: number;
  totalDespesas: number;
  resultadoLiquido: number;
  margemBrutaPercent: number;
  margemLiquidaPercent: number;
  cmvPercent: number;
  margemContribuicaoPercent: number;
}

export function calculateProfitability(
  receitas: number[],
  despesas: number[],
  cmvPercent: number
): ProfitabilityResult {
  const receitaBruta = sumSafe(receitas);
  const totalDespesas = sumSafe(despesas);
  const custoVariavel = divideSafe(receitaBruta * cmvPercent, 100);
  const margemBruta = receitaBruta - custoVariavel;
  const resultado = receitaBruta - totalDespesas;

  return {
    receitaBruta,
    totalDespesas,
    resultadoLiquido: resultado,
    margemBrutaPercent: percentSafe(margemBruta, receitaBruta),
    margemLiquidaPercent: percentSafe(resultado, receitaBruta),
    cmvPercent,
    margemContribuicaoPercent: percentSafe(margemBruta, receitaBruta),
  };
}
