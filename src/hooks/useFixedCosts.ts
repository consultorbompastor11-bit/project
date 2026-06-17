import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fixedCostService from '../services/fixedCostService';
import { listFixedCosts, getFixedCost } from '../repositories/fixedCostRepository';
import { QUERY_KEYS } from './queryKeys';
import type { CreateFixedCostDTO, UpdateFixedCostDTO } from '../types';

export function useFixedCosts(tenantId: string | undefined, apenasAtivos = false) {
  return useQuery({
    queryKey: QUERY_KEYS.fixedCosts.all(tenantId ?? ''),
    queryFn: () => listFixedCosts(tenantId!, apenasAtivos),
    enabled: !!tenantId,
  });
}

export function useFixedCost(tenantId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.fixedCosts.detail(tenantId ?? '', id ?? ''),
    queryFn: () => getFixedCost(tenantId!, id!),
    enabled: !!tenantId && !!id,
  });
}

export function useCreateFixedCost(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { dto: CreateFixedCostDTO; userId: string; userEmail: string }) =>
      fixedCostService.createFixedCost(tenantId!, params.dto, params.userId, params.userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fixedCosts.all(tenantId ?? '') });
    },
  });
}

export function useUpdateFixedCost(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      updates: UpdateFixedCostDTO;
      userId: string;
      userEmail: string;
    }) => fixedCostService.updateFixedCost(tenantId!, params.id, params.updates, params.userId, params.userEmail),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fixedCosts.all(tenantId ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fixedCosts.detail(tenantId ?? '', variables.id) });
    },
  });
}

export function useDeleteFixedCost(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; userId: string; userEmail: string }) =>
      fixedCostService.deleteFixedCost(tenantId!, params.id, params.userId, params.userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fixedCosts.all(tenantId ?? '') });
    },
  });
}

export function useGenerateMonthlyTransactions(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { mesAno: string; userId: string; userEmail: string }) =>
      fixedCostService.generateMonthTransactions(tenantId!, params.mesAno, params.userId, params.userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all(tenantId ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fixedCosts.all(tenantId ?? '') });
      queryClient.invalidateQueries({ queryKey: ['dre', tenantId] });
    },
  });
}
