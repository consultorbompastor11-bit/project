import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listGoals, getGoalByMesAno, upsertGoal } from '../repositories/goalRepository';
import { QUERY_KEYS } from './queryKeys';

export function useGoals(tenantId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.goals.all(tenantId ?? ''),
    queryFn: () => listGoals(tenantId!),
    enabled: !!tenantId,
  });
}

export function useGoalByMesAno(tenantId: string | undefined, mesAno: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.goals.byMesAno(tenantId ?? '', mesAno ?? ''),
    queryFn: () => getGoalByMesAno(tenantId!, mesAno!),
    enabled: !!tenantId && !!mesAno,
  });
}

export function useUpsertGoal(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { mesAno: string; valor: number; userId: string }) =>
      upsertGoal(tenantId!, params.mesAno, params.valor, params.userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goals.all(tenantId ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goals.byMesAno(tenantId ?? '', variables.mesAno) });
    },
  });
}
