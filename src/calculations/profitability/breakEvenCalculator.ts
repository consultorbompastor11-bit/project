import { divideSafe } from '../../utils/money';

export interface BreakEvenResult {
  pontoEquilibrio: number;
  diasParaEquilibrar: number;
  margemSeguranca: number;
  margemSegurancaPercent: number;
}

export function calculateBreakEven(
  custoFixoTotal: number,
  cmvPercent: number,
  faturamentoAtual?: number
): BreakEvenResult {
  const margemContribuicao = 1 - divideSafe(cmvPercent, 100);

  // PE = Custo Fixo Total / (1 - CMV%)
  const pontoEquilibrio = divideSafe(custoFixoTotal, margemContribuicao);

  const margemSeguranca = faturamentoAtual
    ? Math.max(0, faturamentoAtual - pontoEquilibrio)
    : 0;

  const faturamentoDiario = faturamentoAtual
    ? divideSafe(faturamentoAtual, 30)
    : 0;

  const diasParaEquilibrar = faturamentoDiario > 0
    ? Math.ceil(divideSafe(pontoEquilibrio, faturamentoDiario))
    : 0;

  const margemSegurancaPercent = faturamentoAtual
    ? divideSafe(margemSeguranca, faturamentoAtual) * 100
    : 0;

  return {
    pontoEquilibrio,
    diasParaEquilibrar,
    margemSeguranca,
    margemSegurancaPercent,
  };
}
