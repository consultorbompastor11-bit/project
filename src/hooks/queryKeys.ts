export const QUERY_KEYS = {
  transactions: {
    all: (tenantId: string) => ['transactions', tenantId] as const,
    list: (tenantId: string, filters: unknown) => ['transactions', tenantId, 'list', filters] as const,
    byYear: (tenantId: string, year: number) => ['transactions', tenantId, 'year', year] as const,
    detail: (tenantId: string, id: string) => ['transactions', tenantId, 'detail', id] as const,
  },
  fixedCosts: {
    all: (tenantId: string) => ['fixedCosts', tenantId] as const,
    detail: (tenantId: string, id: string) => ['fixedCosts', tenantId, 'detail', id] as const,
  },
  goals: {
    all: (tenantId: string) => ['goals', tenantId] as const,
    byMesAno: (tenantId: string, mesAno: string) => ['goals', tenantId, mesAno] as const,
  },
  debts: {
    all: (tenantId: string) => ['debts', tenantId] as const,
    vencendoEm7Dias: (tenantId: string) => ['debts', tenantId, 'vencendo-7-dias'] as const,
  },
  dre: {
    report: (tenantId: string, year: number, mode: string, isAdminView: boolean) =>
      ['dre', tenantId, year, mode, isAdminView] as const,
  },
} as const;
