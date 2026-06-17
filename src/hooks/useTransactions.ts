import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DocumentSnapshot } from 'firebase/firestore';
import * as transactionService from '../services/transactionService';
import { listTransactions, getTransaction, listByYear } from '../repositories/transactionRepository';
import { QUERY_KEYS } from './queryKeys';
import type { TransactionFilters, CreateTransactionDTO, UpdateTransactionDTO, Transaction } from '../types';
import type { UserRole } from '../domain/enums';

export function useTransactionsInfinite(
  tenantId: string | undefined,
  filters: TransactionFilters,
  role: UserRole | undefined,
  cnpjAccess: string[],
  pageSize = 50
) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.transactions.list(tenantId ?? '', filters),
    queryFn: ({ pageParam }) =>
      listTransactions(tenantId!, filters, role!, cnpjAccess, pageSize, pageParam ?? null),
    initialPageParam: null as DocumentSnapshot | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!tenantId && !!role,
  });
}

export function useTransaction(tenantId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.transactions.detail(tenantId ?? '', id ?? ''),
    queryFn: () => getTransaction(tenantId!, id!),
    enabled: !!tenantId && !!id,
  });
}

export function useTransactionsByYear(
  tenantId: string | undefined,
  year: number,
  role: UserRole | undefined,
  cnpjAccess: string[]
) {
  return useQuery({
    queryKey: QUERY_KEYS.transactions.byYear(tenantId ?? '', year),
    queryFn: () => listByYear(tenantId!, year, role!, cnpjAccess),
    enabled: !!tenantId && !!role,
  });
}

export function useCreateTransaction(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { dto: CreateTransactionDTO; userId: string; userEmail: string }) =>
      transactionService.createTransaction(tenantId!, params.dto, params.userId, params.userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all(tenantId ?? '') });
      queryClient.invalidateQueries({ queryKey: ['dre', tenantId] });
    },
  });
}

export function useUpdateTransaction(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      updates: UpdateTransactionDTO;
      userId: string;
      userEmail: string;
    }) => transactionService.updateTransaction(tenantId!, params.id, params.updates, params.userId, params.userEmail),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all(tenantId ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.detail(tenantId ?? '', variables.id) });
      queryClient.invalidateQueries({ queryKey: ['dre', tenantId] });
    },
  });
}

export function useDeleteTransaction(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; userId: string; userEmail: string }) =>
      transactionService.deleteTransaction(tenantId!, params.id, params.userId, params.userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all(tenantId ?? '') });
      queryClient.invalidateQueries({ queryKey: ['dre', tenantId] });
    },
  });
}

export function useExportTransactionsCSV(tenantId: string | undefined) {
  return useMutation({
    mutationFn: (params: {
      filters: TransactionFilters;
      role: UserRole;
      cnpjAccess: string[];
      userId: string;
      userEmail: string;
    }) =>
      transactionService.exportCSV(
        tenantId!,
        params.filters,
        params.role,
        params.cnpjAccess,
        params.userId,
        params.userEmail
      ),
  });
}
