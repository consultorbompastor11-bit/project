import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listDebts, getDebt, listVencendoEm7Dias } from '../repositories/debtRepository';
import { QUERY_KEYS } from './queryKeys';
import type { UserRole } from '../domain/enums';
import type { CreateDebtDTO, UpdateDebtDTO } from '../types';

export function useDebts(tenantId: string | undefined, role: UserRole | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.debts.all(tenantId ?? ''),
    queryFn: () => listDebts(tenantId!, role!),
    enabled: !!tenantId && !!role,
  });
}

export function useDebt(tenantId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: ['debts', tenantId, id],
    queryFn: () => getDebt(tenantId!, id!),
    enabled: !!tenantId && !!id,
  });
}

export function useDebtsVencendoEm7Dias(tenantId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.debts.vencendoEm7Dias(tenantId ?? ''),
    queryFn: () => listVencendoEm7Dias(tenantId!),
    enabled: !!tenantId,
  });
}

export function useCreateDebt(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { dto: CreateDebtDTO; userId: string }) =>
      import('../repositories/debtRepository').then(({ createDebt }) =>
        createDebt(tenantId!, params.dto, params.userId)
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.debts.all(tenantId ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.debts.vencendoEm7Dias(tenantId ?? '') });
    },
  });
}

export function useUpdateDebt(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; updates: UpdateDebtDTO; userId: string }) =>
      import('../repositories/debtRepository').then(({ updateDebt }) =>
        updateDebt(tenantId!, params.id, params.updates, params.userId)
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.debts.all(tenantId ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.debts.vencendoEm7Dias(tenantId ?? '') });
    },
  });
}

export function useDeleteDebt(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; userId: string }) =>
      import('../repositories/debtRepository').then(({ softDeleteDebt }) =>
        softDeleteDebt(tenantId!, params.id, params.userId)
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.debts.all(tenantId ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.debts.vencendoEm7Dias(tenantId ?? '') });
    },
  });
}
