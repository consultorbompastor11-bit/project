import { useQuery } from '@tanstack/react-query';
import { buildDREReport } from '../engines/dre/dreAggregator';
import { listByYear } from '../repositories/transactionRepository';
import { QUERY_KEYS } from './queryKeys';
import type { DREMode } from '../engines/dre/dreTypes';
import type { UserRole } from '../domain/enums';

export function useDRE(
  tenantId: string | undefined,
  year: number,
  mode: DREMode,
  role: UserRole | undefined,
  cnpjAccess: string[]
) {
  const isAdminView = role === 'ADMIN';

  return useQuery({
    queryKey: QUERY_KEYS.dre.report(tenantId ?? '', year, mode, isAdminView),
    queryFn: async () => {
      const allTransactions = await listByYear(tenantId!, year, role!, cnpjAccess);
      return buildDREReport(allTransactions, year, mode, isAdminView, tenantId!);
    },
    enabled: !!tenantId && !!role,
  });
}
