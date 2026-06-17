import type { DREGroup, DREResultLine } from '../../domain/enums';

export type DREMode = 'caixa' | 'competencia';

export interface DREMonth {
  mesAno: string; // "MM-YYYY"
  label: string; // "Jan", "Fev", etc.
  isFuture: boolean;
}

export interface DRECategoryValue {
  categoria: string;
  group: DREGroup;
  values: Record<string, number>; // chave = "MM-YYYY"
  total: number;
}

export interface DREResultValue {
  line: DREResultLine;
  label: string; // ex: "= Receita Líquida"
  values: Record<string, number>;
  total: number;
}

export interface DREReport {
  year: number;
  mode: DREMode;
  months: DREMonth[];
  groups: Record<DREGroup, DRECategoryValue[]>;
  results: DREResultValue[];
  meta: {
    generatedAt: string;
    tenantId: string;
    isAdminView: boolean;
  };
}
