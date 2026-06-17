import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  runTransaction,
  getFirestore,
  type Query,
  type DocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import Decimal from 'decimal.js';
import { db } from '../config/firebase';
import type { Transaction, TransactionFilters, CreateTransactionDTO, UpdateTransactionDTO } from '../types';
import type { UserRole, TransactionStatus, TransactionType, TransactionOrigem, Visibilidade } from '../domain/enums';

const TRANSACTIONS_COLLECTION = 'transactions';
const COUNTERS_COLLECTION = 'counters';

function getTenantCollection(tenantId: string) {
  return collection(db, 'tenants', tenantId, TRANSACTIONS_COLLECTION);
}

function getTenantDoc(tenantId: string, id: string) {
  return doc(db, 'tenants', tenantId, TRANSACTIONS_COLLECTION, id);
}

function toFirestoreCreateDTO(data: CreateTransactionDTO & { txNumber: string }, userId: string): Record<string, unknown> {
  const now = Timestamp.now();
  return {
    txNumber: data.txNumber,
    tipo: data.tipo,
    descricao: data.descricao,
    valor: new Decimal(data.valor).toNumber(),
    data: data.data instanceof Date ? Timestamp.fromDate(data.data) : Timestamp.fromDate(new Date(data.data)),
    status: data.status,
    categoryId: data.categoryId,
    contaDestino: data.contaDestino ?? null,
    cnpjAtrelado: data.cnpjAtrelado ?? null,
    documento: data.documento ?? null,
    observacao: data.observacao ?? null,
    mesCompetencia: data.mesCompetencia,
    visibilidade: data.visibilidade,
    origem: data.origem,
    asaasId: data.asaasId ?? null,
    fixedCostId: data.fixedCostId ?? null,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    version: 1,
    isDeleted: false,
  };
}

function toFirestoreUpdateDTO(updates: UpdateTransactionDTO, userId: string, currentVersion: number): Record<string, unknown> {
  const result: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
    updatedBy: userId,
    version: currentVersion + 1,
  };

  if (updates.tipo !== undefined) result.tipo = updates.tipo;
  if (updates.descricao !== undefined) result.descricao = updates.descricao;
  if (updates.valor !== undefined) result.valor = new Decimal(updates.valor).toNumber();
  if (updates.data !== undefined) {
    result.data = updates.data instanceof Date ? Timestamp.fromDate(updates.data) : Timestamp.fromDate(new Date(updates.data));
  }
  if (updates.status !== undefined) result.status = updates.status;
  if (updates.categoryId !== undefined) result.categoryId = updates.categoryId;
  if (updates.contaDestino !== undefined) result.contaDestino = updates.contaDestino ?? null;
  if (updates.cnpjAtrelado !== undefined) result.cnpjAtrelado = updates.cnpjAtrelado ?? null;
  if (updates.documento !== undefined) result.documento = updates.documento ?? null;
  if (updates.observacao !== undefined) result.observacao = updates.observacao ?? null;
  if (updates.mesCompetencia !== undefined) result.mesCompetencia = updates.mesCompetencia;
  if (updates.visibilidade !== undefined) result.visibilidade = updates.visibilidade;

  return result;
}

function mapFirestoreToTransaction(docSnap: DocumentSnapshot): Transaction | null {
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    txNumber: data.txNumber,
    tipo: data.tipo as TransactionType,
    descricao: data.descricao,
    valor: new Decimal(data.valor).toNumber(),
    data: (data.data as Timestamp).toDate(),
    status: data.status as TransactionStatus,
    categoryId: data.categoryId,
    categoryRef: data.categoryRef,
    contaDestino: data.contaDestino ?? undefined,
    cnpjAtrelado: data.cnpjAtrelado ?? undefined,
    documento: data.documento ?? undefined,
    observacao: data.observacao ?? undefined,
    mesCompetencia: data.mesCompetencia,
    visibilidade: data.visibilidade as Visibilidade,
    origem: data.origem as TransactionOrigem,
    asaasId: data.asaasId ?? undefined,
    fixedCostId: data.fixedCostId ?? undefined,
    createdAt: (data.createdAt as Timestamp).toDate(),
    createdBy: data.createdBy,
    updatedAt: (data.updatedAt as Timestamp).toDate(),
    updatedBy: data.updatedBy,
    version: data.version,
    isDeleted: data.isDeleted ?? false,
    deletedAt: data.deletedAt ? (data.deletedAt as Timestamp).toDate() : null,
    deletedBy: data.deletedBy ?? null,
  };
}

export function buildTransactionQuery(
  tenantId: string,
  filters: TransactionFilters,
  role: UserRole,
  _cnpjAccess: string[]
): Query<DocumentData> {
  const coll = getTenantCollection(tenantId);
  const constraints: Array<ReturnType<typeof where> | ReturnType<typeof orderBy>> = [];

  constraints.push(where('isDeleted', '==', false));

  if (role === 'OPERACIONAL') {
    constraints.push(where('visibilidade', '!=', 'RESTRITO_PATRAO'));
  }

  if (filters.tipo) constraints.push(where('tipo', '==', filters.tipo));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  if (filters.categoryId) constraints.push(where('categoryId', '==', filters.categoryId));
  if (filters.cnpjAtrelado) constraints.push(where('cnpjAtrelado', '==', filters.cnpjAtrelado));
  if (filters.origem) constraints.push(where('origem', '==', filters.origem));
  if (filters.mesCompetencia) constraints.push(where('mesCompetencia', '==', filters.mesCompetencia));

  if (filters.dataInicio) {
    constraints.push(where('data', '>=', Timestamp.fromDate(new Date(filters.dataInicio + 'T00:00:00'))));
  }
  if (filters.dataFim) {
    constraints.push(where('data', '<=', Timestamp.fromDate(new Date(filters.dataFim + 'T23:59:59'))));
  }

  constraints.push(orderBy('data', 'desc'));

  return query(coll, ...constraints);
}

export async function listTransactions(
  tenantId: string,
  filters: TransactionFilters,
  role: UserRole,
  cnpjAccess: string[],
  pageSize: number = 50,
  cursor?: DocumentSnapshot | null
): Promise<{ data: Transaction[]; nextCursor: DocumentSnapshot | null }> {
  let q = buildTransactionQuery(tenantId, filters, role, cnpjAccess);
  q = query(q, limit(pageSize));

  if (cursor) {
    q = query(q, startAfter(cursor));
  }

  const snapshot = await getDocs(q);
  const data: Transaction[] = [];

  snapshot.forEach((docSnap) => {
    const transaction = mapFirestoreToTransaction(docSnap);
    if (transaction) {
      if (transaction.cnpjAtrelado && cnpjAccess.length > 0 && !cnpjAccess.includes(transaction.cnpjAtrelado)) {
        return;
      }
      data.push(transaction);
    }
  });

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor = snapshot.size === pageSize ? lastDoc || null : null;

  return { data, nextCursor };
}

export async function getTransaction(tenantId: string, id: string): Promise<Transaction | null> {
  const docRef = getTenantDoc(tenantId, id);
  const snapshot = await getDoc(docRef);
  return mapFirestoreToTransaction(snapshot);
}

async function generateTxNumber(tenantId: string): Promise<string> {
  const firestore = getFirestore();
  const counterRef = doc(firestore, 'tenants', tenantId, COUNTERS_COLLECTION, 'transactions');

  return runTransaction(firestore, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let currentNumber = 0;

    if (counterDoc.exists()) {
      currentNumber = counterDoc.data()?.lastNumber ?? 0;
    }

    const nextNumber = currentNumber + 1;
    transaction.set(counterRef, { lastNumber: nextNumber, updatedAt: Timestamp.now() }, { merge: true });

    return `TX-${String(nextNumber).padStart(6, '0')}`;
  });
}

export async function createTransaction(
  tenantId: string,
  data: CreateTransactionDTO,
  userId: string
): Promise<Transaction> {
  const txNumber = await generateTxNumber(tenantId);
  const coll = getTenantCollection(tenantId);
  const firestoreData = toFirestoreCreateDTO({ ...data, txNumber }, userId);

  const docRef = await addDoc(coll, firestoreData);
  const snapshot = await getDoc(docRef);
  const transaction = mapFirestoreToTransaction(snapshot);

  if (!transaction) {
    throw new Error('Failed to create transaction');
  }

  return transaction;
}

export async function updateTransaction(
  tenantId: string,
  id: string,
  updates: UpdateTransactionDTO,
  userId: string,
  before: Transaction
): Promise<Transaction> {
  const docRef = getTenantDoc(tenantId, id);

  const currentDoc = await getDoc(docRef);
  if (currentDoc.exists() && currentDoc.data()?.version !== before.version) {
    throw new Error('Concurrent modification detected');
  }

  const firestoreData = toFirestoreUpdateDTO(updates, userId, before.version);
  await updateDoc(docRef, firestoreData);

  const snapshot = await getDoc(docRef);
  const transaction = mapFirestoreToTransaction(snapshot);

  if (!transaction) {
    throw new Error('Failed to update transaction');
  }

  return transaction;
}

export async function softDeleteTransaction(tenantId: string, id: string, userId: string): Promise<void> {
  const docRef = getTenantDoc(tenantId, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Transaction not found');
  }

  const currentVersion = snapshot.data()?.version ?? 0;

  await updateDoc(docRef, {
    isDeleted: true,
    deletedAt: Timestamp.now(),
    deletedBy: userId,
    version: currentVersion + 1,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

export async function listByMesCompetencia(
  tenantId: string,
  mesAno: string,
  role: UserRole,
  cnpjAccess: string[]
): Promise<Transaction[]> {
  const coll = getTenantCollection(tenantId);
  const constraints: Array<ReturnType<typeof where>> = [
    where('isDeleted', '==', false),
    where('mesCompetencia', '==', mesAno),
  ];

  if (role === 'OPERACIONAL') {
    constraints.push(where('visibilidade', '!=', 'RESTRITO_PATRAO'));
  }

  const q = query(coll, ...constraints);
  const snapshot = await getDocs(q);
  const data: Transaction[] = [];

  snapshot.forEach((docSnap) => {
    const transaction = mapFirestoreToTransaction(docSnap);
    if (transaction) {
      if (transaction.cnpjAtrelado && cnpjAccess.length > 0 && !cnpjAccess.includes(transaction.cnpjAtrelado)) {
        return;
      }
      data.push(transaction);
    }
  });

  return data;
}

export async function listByYear(
  tenantId: string,
  year: number,
  role: UserRole,
  cnpjAccess: string[]
): Promise<Transaction[]> {
  const coll = getTenantCollection(tenantId);
  const startOfYear = Timestamp.fromDate(new Date(year, 0, 1));
  const endOfYear = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59));

  const constraints: Array<ReturnType<typeof where>> = [
    where('isDeleted', '==', false),
    where('data', '>=', startOfYear),
    where('data', '<=', endOfYear),
  ];

  if (role === 'OPERACIONAL') {
    constraints.push(where('visibilidade', '!=', 'RESTRITO_PATRAO'));
  }

  const q = query(coll, ...constraints);
  const snapshot = await getDocs(q);
  const data: Transaction[] = [];

  snapshot.forEach((docSnap) => {
    const transaction = mapFirestoreToTransaction(docSnap);
    if (transaction) {
      if (transaction.cnpjAtrelado && cnpjAccess.length > 0 && !cnpjAccess.includes(transaction.cnpjAtrelado)) {
        return;
      }
      data.push(transaction);
    }
  });

  return data;
}

export async function upsertByAsaasId(
  tenantId: string,
  asaasId: string,
  data: CreateTransactionDTO,
  userId: string
): Promise<'created' | 'updated' | 'ignored'> {
  const coll = getTenantCollection(tenantId);
  const q = query(coll, where('asaasId', '==', asaasId), where('isDeleted', '==', false));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return 'ignored';
  }

  await createTransaction(tenantId, data, userId);
  return 'created';
}
