import { Decimal } from 'decimal.js';
import type { Transaction, DREGroup } from '../../domain/enums';
import { getGroupForCategory } from './dreGroups';
import { calculateDREFormulas, calculateDRETotals, type DREGroupsByMonth } from './dreFormulas';
import type { DREReport, DREMonth, DRECategoryValue, DREResultValue, DREMode } from './dreTypes';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getMonthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${year}`;
}

function getSortableKey(mesAno: string): string {
  // Convert "MM-YYYY" to "YYYY-MM" for proper string comparison
  const [month, year] = mesAno.split('-');
  return `${year}-${month}`;
}

function initializeGroupsByMonth(): DREGroupsByMonth {
  return {
    FATURAMENTO: {},
    DEDUCOES: {},
    MAO_DE_OBRA: {},
    PROLABORE: {},
    MARKETING: {},
    DESPESAS_EMPRESA: {},
    PASSIVOS: {},
  };
}

export function buildDREReport(
  transactions: Transaction[],
  year: number,
  mode: DREMode,
  isAdminView: boolean,
  tenantId: string
): DREReport {
  const now = new Date();
  const currentMonthKey = getMonthKey(now);
  const currentSortableKey = getSortableKey(currentMonthKey);

  // Generate 12 months for the year
  const months: DREMonth[] = [];
  for (let m = 0; m < 12; m++) {
    const monthNum = String(m + 1).padStart(2, '0');
    const mesAno = `${monthNum}-${year}`;
    const sortableKey = getSortableKey(mesAno);
    const isFuture = sortableKey > currentSortableKey;
    months.push({
      mesAno,
      label: MONTH_LABELS[m],
      isFuture,
    });
  }

  // Step 1: Filter transactions by year and mode
  const filteredTransactions = transactions.filter((tx) => {
    if (tx.isDeleted) return false;
    if (tx.status === 'CANCELADO') return false;

    if (mode === 'caixa') {
      if (tx.status !== 'REALIZADO') return false;
      const paymentDate = tx.dataPagamento;
      if (!paymentDate) return false;
      return paymentDate.getFullYear() === year;
    } else {
      // competencia mode
      const previewDate = tx.dataPrevisao || tx.data;
      if (!previewDate) return false;
      if (!['REALIZADO', 'PLANEJADO'].includes(tx.status)) return false;
      return previewDate.getFullYear() === year;
    }
  });

  // Step 2: Group by category and month
  const groupsByMonth = initializeGroupsByMonth();
  const categoriesByGroup: Record<DREGroup, Set<string>> = {
    FATURAMENTO: new Set(),
    DEDUCOES: new Set(),
    MAO_DE_OBRA: new Set(),
    PROLABORE: new Set(),
    MARKETING: new Set(),
    DESPESAS_EMPRESA: new Set(),
    PASSIVOS: new Set(),
  };

  // Category values for detailed report
  const categoryValues: Map<string, { group: DREGroup; values: Record<string, number> }> = new Map();

  for (const tx of filteredTransactions) {
    const group = getGroupForCategory(tx.categoryId);
    if (!group) {
      console.error(`[DRE Engine] Category without mapping: ${tx.categoryId}`);
      continue;
    }

    // Skip PASSIVOS for non-admin view
    if (!isAdminView && group === 'PASSIVOS') {
      continue;
    }

    const date = mode === 'caixa' ? (tx.dataPagamento as Date) : (tx.dataPrevisao || tx.data);
    const monthKey = getMonthKey(date);

    // Determine value: ENTRADA is positive, SAIDA is negative
    const valor = tx.tipo === 'ENTRADA'
      ? new Decimal(tx.valor).toNumber()
      : new Decimal(tx.valor).negated().toNumber();

    // Accumulate in group
    if (!groupsByMonth[group][monthKey]) {
      groupsByMonth[group][monthKey] = 0;
    }
    groupsByMonth[group][monthKey] = new Decimal(groupsByMonth[group][monthKey]).plus(new Decimal(valor)).toNumber();

    // Track category for detailed output
    categoriesByGroup[group].add(tx.categoryId);

    if (!categoryValues.has(tx.categoryId)) {
      categoryValues.set(tx.categoryId, { group, values: {} });
    }
    const catVal = categoryValues.get(tx.categoryId)!;
    if (!catVal.values[monthKey]) {
      catVal.values[monthKey] = 0;
    }
    catVal.values[monthKey] = new Decimal(catVal.values[monthKey]).plus(new Decimal(valor)).toNumber();
  }

  // Step 3: Build groups for report
  const groups: Record<DREGroup, DRECategoryValue[]> = {
    FATURAMENTO: [],
    DEDUCOES: [],
    MAO_DE_OBRA: [],
    PROLABORE: [],
    MARKETING: [],
    DESPESAS_EMPRESA: [],
    PASSIVOS: [],
  };

  const monthKeys = months.map(m => m.mesAno);

  for (const group of Object.keys(groups) as DREGroup[]) {
    for (const categoria of categoriesByGroup[group]) {
      const catData = categoryValues.get(categoria)!;
      const values: Record<string, number> = {};
      for (const monthKey of monthKeys) {
        values[monthKey] = catData.values[monthKey] || 0;
      }
      const total = Object.values(values).reduce(
        (sum, val) => new Decimal(sum).plus(new Decimal(val)).toNumber(),
        0
      );
      groups[group].push({
        categoria,
        group,
        values,
        total,
      });
    }
  }

  // Step 4: Calculate result lines
  const results: DREResultValue[] = [];
  const resultLabels: { key: keyof ReturnType<typeof calculateDREFormulas>; label: string }[] = [
    { key: 'RECEITA_BRUTA', label: '= Receita Bruta' },
    { key: 'TOTAL_DEDUCOES', label: '(-) Deduções' },
    { key: 'RECEITA_LIQUIDA', label: '= Receita Líquida' },
    { key: 'TOTAL_MAO_DE_OBRA', label: '(-) Mão de Obra' },
    { key: 'TOTAL_PROLABORE', label: '(-) Prolabore' },
    { key: 'TOTAL_CUSTOS', label: '= Total Custos Variáveis' },
    { key: 'MARGEM_CONTRIBUICAO', label: '= Margem de Contribuição' },
    { key: 'TOTAL_MARKETING', label: '(-) Marketing' },
    { key: 'TOTAL_DESPESAS_EMP', label: '(-) Despesas da Empresa' },
    { key: 'TOTAL_DESPESAS', label: '= Total Despesas' },
    { key: 'RESULTADO_OPERACIONAL', label: '= Resultado Operacional' },
    { key: 'TOTAL_PASSIVOS', label: '(-) Passivos' },
    { key: 'RESULTADO_LIQUIDO', label: '= Resultado Líquido' },
    { key: 'MARGEM_PERCENT', label: 'Margem %' },
  ];

  for (const { key, label } of resultLabels) {
    if (key === 'TOTAL_PASSIVOS' && !isAdminView) continue;

    const values: Record<string, number> = {};
    for (const monthKey of monthKeys) {
      const monthResult = calculateDREFormulas(groupsByMonth, monthKey, isAdminView);
      const val = monthResult[key];
      values[monthKey] = typeof val === 'number' ? val : 0;
    }

    const totals = calculateDRETotals(groupsByMonth, monthKeys, isAdminView);
    const total = typeof totals[key] === 'number' ? totals[key] : 0;

    results.push({
      line: key.replace('TOTAL_', 'TOTAL_').replace('_', '_') as any,
      label,
      values,
      total,
    });
  }

  return {
    year,
    mode,
    months,
    groups,
    results,
    meta: {
      generatedAt: new Date().toISOString(),
      tenantId,
      isAdminView,
    },
  };
}
