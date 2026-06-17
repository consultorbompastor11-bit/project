export type UserRole = 'ADMIN' | 'OPERACIONAL';

export type TransactionStatus = 'REALIZADO' | 'PLANEJADO' | 'CANCELADO';
export type TransactionType = 'ENTRADA' | 'SAIDA';
export type TransactionOrigem = 'MANUAL' | 'ASAAS_SYNC' | 'FIXED_COST_GENERATED';
export type Visibilidade = 'OPERACIONAL_PURO' | 'RESTRITO_PATRAO';
export type DebtStatus = 'EM_DIA' | 'VENCIDO' | 'PAGO';
export type DebtType = 'IMPOSTO' | 'EMPRESTIMO' | 'FINANCIAMENTO' | 'FORNECEDOR' | 'OUTROS';
export type FixedCostRecorrencia = 'MENSAL' | 'UNICA';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'EXPORT_CSV';
export type AuditEntity = 'transaction' | 'fixedCost' | 'goal' | 'debt';

export type DREGroup =
  | 'FATURAMENTO'
  | 'DEDUCOES'
  | 'MAO_DE_OBRA'
  | 'PROLABORE'
  | 'MARKETING'
  | 'DESPESAS_EMPRESA'
  | 'PASSIVOS';

export type DREResultLine =
  | 'RECEITA_BRUTA'
  | 'TOTAL_DEDUCOES'
  | 'RECEITA_LIQUIDA'
  | 'TOTAL_MAO_DE_OBRA'
  | 'TOTAL_PROLABORE'
  | 'TOTAL_CUSTOS'
  | 'MARGEM_CONTRIBUICAO'
  | 'TOTAL_MARKETING'
  | 'TOTAL_DESPESAS_EMP'
  | 'TOTAL_DESPESAS'
  | 'RESULTADO_OPERACIONAL'
  | 'TOTAL_PASSIVOS'
  | 'RESULTADO_LIQUIDO'
  | 'MARGEM_PERCENT';

export const DRE_CATEGORY_MAP: Record<string, DREGroup> = {
  'cat-receita-servicos': 'FATURAMENTO',
  'cat-receita-produtos': 'FATURAMENTO',
  'cat-receita-recorrente': 'FATURAMENTO',
  'cat-receita-outras': 'FATURAMENTO',
  'cat-despesa-pessoal': 'MAO_DE_OBRA',
  'cat-despesa-pessoal-salarios': 'MAO_DE_OBRA',
  'cat-despesa-pessoal-beneficios': 'MAO_DE_OBRA',
  'cat-despesa-operacional': 'DESPESAS_EMPRESA',
  'cat-despesa-operacional-aluguel': 'DESPESAS_EMPRESA',
  'cat-despesa-operacional-energia': 'DESPESAS_EMPRESA',
  'cat-despesa-operacional-internet': 'DESPESAS_EMPRESA',
  'cat-despesa-operacional-telefone': 'DESPESAS_EMPRESA',
  'cat-despesa-marketing': 'MARKETING',
  'cat-despesa-impostos': 'DEDUCOES',
  'cat-despesa-impostos-iss': 'DEDUCOES',
  'cat-despesa-impostos-irpj': 'PASSIVOS',
  'cat-despesa-impostos-csll': 'PASSIVOS',
  'cat-despesa-impostos-pis': 'DEDUCOES',
  'cat-despesa-impostos-cofins': 'DEDUCOES',
  'cat-despesa-software': 'DESPESAS_EMPRESA',
  'cat-despesa-equipamentos': 'DESPESAS_EMPRESA',
  'cat-despesa-bancarias': 'DESPESAS_EMPRESA',
  'cat-despesa-taxas-cartoes': 'DEDUCOES',
};