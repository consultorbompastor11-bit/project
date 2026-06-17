import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  Timestamp,
  getFirestore,
  runTransaction,
} from 'firebase/firestore';
import { fetchPayments, type AsaasPayment, type AsaasStatus } from './asaasApi';
import { mapAsaasToTransaction } from './asaasMapper';

export interface SyncResult {
  total: number;
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: string[];
  syncStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

export interface SyncLog {
  id: string;
  tenantId: string;
  executadoEm: string;
  executadoPor: string;
  dataInicio: string;
  dataFim: string;
  total: number;
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: string[];
  syncStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  manualInterventionRequired: boolean;
  paymentsProcessed: number;
  paymentsManual: number;
  overdueCount?: number;
  overdueAmount?: number;
  pendingCount?: number;
  receivedAmount?: number;
}

async function generateTxNumber(tenantId: string): Promise<string> {
  const firestore = getFirestore();
  const counterRef = doc(firestore, 'tenants', tenantId, 'counters', 'transactions');

  const nextNumber = await runTransaction(firestore, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let currentNumber = 0;

    if (counterDoc.exists()) {
      currentNumber = counterDoc.data()?.lastNumber ?? 0;
    }

    const next = currentNumber + 1;
    transaction.set(counterRef, { lastNumber: next, updatedAt: Timestamp.now() }, { merge: true });
    return next;
  });

  return `TX-${String(nextNumber).padStart(6, '0')}`;
}

async function generateTxNumbers(count: number, tenantId: string): Promise<string[]> {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(await generateTxNumber(tenantId));
  }
  return result;
}

export async function syncAsaasPayments(
  params: { dataInicio: string; dataFim: string },
  tenantId: string,
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    total: 0,
    criados: 0,
    atualizados: 0,
    ignorados: 0,
    erros: [],
    syncStatus: 'SUCCESS',
  };

  const firestore = getFirestore();
  const transactionsColl = collection(firestore, 'tenants', tenantId, 'transactions');

  try {
    // 1. Buscar todos os payments RECEIVED no período (paginar até totalCount)
    let allPayments: AsaasPayment[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await fetchPayments({
        status: 'RECEIVED' as AsaasStatus,
        dueDate_ge: params.dataInicio,
        dueDate_le: params.dataFim,
        limit,
        offset,
      });

      allPayments = allPayments.concat(response.data);
      offset += response.data.length;
      hasMore = offset < response.totalCount;
    }

    result.total = allPayments.length;

    if (allPayments.length === 0) {
      await writeSyncLog(firestore, tenantId, result, params, userId, {
        overdueCount: 0,
        overdueAmount: 0,
      });
      return result;
    }

    // 2. Processar em batches de 500 (limite do Firebase)
    const batchSize = 500;
    let currentBatch = writeBatch(firestore);
    let batchCount = 0;

    interface PaymentProcessResult {
      payment: AsaasPayment;
      action: 'create' | 'update' | 'ignore';
      existingId?: string;
    }

    const processResults: PaymentProcessResult[] = [];

    for (const payment of allPayments) {
      try {
        // a. Query Firestore: transaction onde asaasId == payment.id
        const q = query(
          transactionsColl,
          where('asaasId', '==', payment.id),
          where('tenantId', '==', tenantId),
          where('isDeleted', '==', false)
        );
        const existingSnapshot = await getDocs(q);

        if (!existingSnapshot.empty) {
          const existingDoc = existingSnapshot.docs[0];
          const existingData = existingDoc.data();

          if (existingData.status === 'REALIZADO') {
            // b. Se existe E status==REALIZADO → ignorados++
            result.ignorados++;
            processResults.push({ payment, action: 'ignore', existingId: existingDoc.id });
          } else if (existingData.status === 'PLANEJADO') {
            // c. Se existe E status==PLANEJADO → atualizar para REALIZADO
            processResults.push({ payment, action: 'update', existingId: existingDoc.id });
            result.atualizados++;

            currentBatch.update(doc(transactionsColl, existingDoc.id), {
              status: 'REALIZADO',
              dataPagamento: payment.paymentDate
                ? Timestamp.fromDate(new Date(payment.paymentDate))
                : Timestamp.fromDate(new Date(payment.dueDate)),
              valor: payment.netValue,
              updatedAt: Timestamp.now(),
              updatedBy: userId,
              version: (existingData.version ?? 0) + 1,
            });
            batchCount++;
          }
        } else {
          // d. Se não existe → criar
          processResults.push({ payment, action: 'create' });
          result.criados++;
        }

        // Commit batch se atingiu o limite
        if (batchCount >= batchSize) {
          await currentBatch.commit();
          currentBatch = writeBatch(firestore);
          batchCount = 0;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.erros.push(`Payment ${payment.id}: ${errorMessage}`);
      }
    }

    // 3. Criar documentos para os payments novos (que não existiam)
    const novosPayments = processResults
      .filter(r => r.action === 'create')
      .map(r => r.payment);

    if (novosPayments.length > 0) {
      // Gerar txNumbers em lote
      const txNumbers = await generateTxNumbers(novosPayments.length, tenantId);

      for (let index = 0; index < novosPayments.length; index++) {
        const payment = novosPayments[index];
        const txData = mapAsaasToTransaction(payment, tenantId, txNumbers[index], userId);

        const docData: Record<string, unknown> = {
          ...txData,
          tenantId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const newDocRef = doc(transactionsColl);
        currentBatch.set(newDocRef, docData);
        batchCount++;

        if (batchCount >= batchSize) {
          await currentBatch.commit();
          currentBatch = writeBatch(firestore);
          batchCount = 0;
        }
      }
    }

    // Commit batch final
    if (batchCount > 0) {
      await currentBatch.commit();
    }

    // 4. Determinar syncStatus
    if (result.erros.length > 0) {
      result.syncStatus = result.criados + result.atualizados > 0 ? 'PARTIAL' : 'FAILED';
    }

    // 5. Buscar stats adicionais (overdue, pending)
    const overdueResponse = await fetchPayments({
      status: 'OVERDUE' as AsaasStatus,
      dueDate_le: new Date().toISOString().split('T')[0],
      limit: 100,
    });

    const pendingResponse = await fetchPayments({
      status: 'PENDING' as AsaasStatus,
      dueDate_ge: new Date().toISOString().split('T')[0],
      limit: 100,
    });

    const overdueCount = overdueResponse.totalCount;
    const overdueAmount = overdueResponse.data.reduce((sum, p) => sum + p.value, 0);
    const pendingCount = pendingResponse.totalCount;
    const receivedAmount = allPayments.reduce((sum, p) => sum + p.netValue, 0);

    // 6. Gravar SyncLog
    await writeSyncLog(firestore, tenantId, result, params, userId, {
      overdueCount,
      overdueAmount,
      pendingCount,
      receivedAmount,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.erros.push(errorMessage);
    result.syncStatus = 'FAILED';

    await writeSyncLog(firestore, tenantId, result, params, userId, {
      overdueCount: 0,
      overdueAmount: 0,
    });

    return result;
  }
}

async function writeSyncLog(
  firestore: ReturnType<typeof getFirestore>,
  tenantId: string,
  result: SyncResult,
  params: { dataInicio: string; dataFim: string },
  userId: string,
  stats: { overdueCount?: number; overdueAmount?: number; pendingCount?: number; receivedAmount?: number }
): Promise<void> {
  const syncLogsColl = collection(firestore, 'tenants', tenantId, 'syncLogs');
  const newDocRef = doc(syncLogsColl);

  const syncLog: Omit<SyncLog, 'id'> = {
    tenantId,
    executadoEm: new Date().toISOString(),
    executadoPor: userId,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
    total: result.total,
    criados: result.criados,
    atualizados: result.atualizados,
    ignorados: result.ignorados,
    erros: result.erros,
    syncStatus: result.syncStatus,
    manualInterventionRequired: result.erros.length > 0,
    paymentsProcessed: result.total,
    paymentsManual: 0,
    overdueCount: stats.overdueCount,
    overdueAmount: stats.overdueAmount,
    pendingCount: stats.pendingCount,
    receivedAmount: stats.receivedAmount,
  };

  const batch = writeBatch(firestore);
  batch.set(newDocRef, syncLog);
  await batch.commit();
}

export async function syncSinglePayment(
  asaasId: string,
  tenantId: string,
  userId: string
): Promise<'created' | 'updated' | 'ignored'> {
  const firestore = getFirestore();
  const transactionsColl = collection(firestore, 'tenants', tenantId, 'transactions');

  // Buscar payment no Asaas
  const response = await fetchPayments({ limit: 100 });
  const payment = response.data.find(p => p.id === asaasId);

  if (!payment) {
    throw new Error('Pagamento não encontrado no Asaas');
  }

  // Verificar se já existe
  const q = query(
    transactionsColl,
    where('asaasId', '==', asaasId),
    where('tenantId', '==', tenantId),
    where('isDeleted', '==', false)
  );
  const existingSnapshot = await getDocs(q);

  if (!existingSnapshot.empty) {
    const existingDoc = existingSnapshot.docs[0];
    const existingData = existingDoc.data();

    if (existingData.status === 'REALIZADO') {
      return 'ignored';
    }

    // Atualizar para REALIZADO
    const batch = writeBatch(firestore);
    batch.update(doc(transactionsColl, existingDoc.id), {
      status: 'REALIZADO',
      dataPagamento: payment.paymentDate
        ? Timestamp.fromDate(new Date(payment.paymentDate))
        : Timestamp.fromDate(new Date(payment.dueDate)),
      valor: payment.netValue,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      version: (existingData.version ?? 0) + 1,
    });
    await batch.commit();

    return 'updated';
  }

  // Criar novo
  const txNumber = await generateTxNumber(tenantId);
  const txData = mapAsaasToTransaction(payment, tenantId, txNumber, userId);

  const docData: Record<string, unknown> = {
    ...txData,
    tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const batch = writeBatch(firestore);
  batch.set(doc(transactionsColl), docData);
  await batch.commit();

  return 'created';
}
