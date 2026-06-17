import { useState, useCallback } from 'react';
import { syncAsaasPayments, type SyncResult } from './asaasSync';

export interface AsaasSyncState {
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  lastSyncAt: Date | null;
  error: string | null;
}

export interface UseAsaasSyncStateReturn {
  state: AsaasSyncState;
  startSync: (params: { dataInicio: string; dataFim: string }, tenantId: string, userId: string) => Promise<void>;
  resetError: () => void;
}

export function useAsaasSyncState(): UseAsaasSyncStateReturn {
  const [state, setState] = useState<AsaasSyncState>({
    isSyncing: false,
    lastSyncResult: null,
    lastSyncAt: null,
    error: null,
  });

  const startSync = useCallback(
    async (params: { dataInicio: string; dataFim: string }, tenantId: string, userId: string) => {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));

      try {
        const result = await syncAsaasPayments(params, tenantId, userId);

        setState({
          isSyncing: false,
          lastSyncResult: result,
          lastSyncAt: new Date(),
          error: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        setState(prev => ({
          ...prev,
          isSyncing: false,
          error: errorMessage,
        }));
      }
    },
    []
  );

  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    startSync,
    resetError,
  };
}
