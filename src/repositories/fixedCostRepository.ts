import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  type DocumentSnapshot,
  writeBatch,
} from 'firebase/firestore';
import Decimal from 'decimal.js';
import { db } from '../config/firebase';
import type { FixedCost, CreateFixedCostDTO, UpdateFixedCostDTO } from '../types';
import type { FixedCostRecorrencia, Visibilidade } from '../domain/enums';

const FIXED_COSTS_COLLECTION = 'fixedCosts';
const TRANSACTIONS_COLLECTION = 'transactions';

function getTenantCollection(tenantId: string) {
  return collection(db, 'tenants', tenantId, FIXED_COSTS_COLLECTION);
}

function getTenantDoc(tenantId: string, id: string) {
  return doc(db, 'tenants', tenantId, FIXED_COSTS_COLLECTION, id);
}

function getTransactionsCollection(tenantId: string) {
  return collection(db, 'tenants', tenantId, TRANSACTIONS_COLLECTION);
}

function mapFirestoreToFixedCost(docSnap: DocumentSnapshot): FixedCost | null {
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    descricao: data.descricao,
    valor: new Decimal(data.valor).toNumber(),
    diaVencimento: data.diaVencimento,
    categoriaId: data.categoriaId,
    categoriaRef: data.categoriaRef,
    contaDestino: data.contaDestino ?? undefined,
    cnpjAtrelado: data.cnpjAtrelado ?? undefined,
    observacao: data.observacao ?? undefined,
    recorrencia: data.recorrencia as FixedCostRecorrencia,
    ativo: data.ativo ?? true,
    dataInicio: data.dataInicio ? (data.dataInicio as Timestamp).toDate() : undefined,
    dataFim: data.dataFim ? (data.dataFim as Timestamp).toDate() : undefined,
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

export async function listFixedCosts(tenantId: string, apenasAtivos?: boolean): Promise<FixedCost[]> {
  const coll = getTenantCollection(tenantId);
  const constraints: Array<ReturnType<typeof where>> = [where('isDeleted', '==', false)];

  if (apenasAtivos) {
    constraints.push(where('ativo', '==', true));
  }

  const q = query(coll, ...constraints);
  const snapshot = await getDocs(q);
  const data: FixedCost[] = [];

  snapshot.forEach((docSnap) => {
    const fixedCost = mapFirestoreToFixedCost(docSnap);
    if (fixedCost) {
      data.push(fixedCost);
    }
  });

  return data;
}

export async function getFixedCost(tenantId: string, id: string): Promise<FixedCost | null> {
  const docRef = getTenantDoc(tenantId, id);
  const snapshot = await getDoc(docRef);
  return mapFirestoreToFixedCost(snapshot);
}

export async function createFixedCost(tenantId: string, data: CreateFixedCostDTO, userId: string): Promise<FixedCost> {
  const coll = getTenantCollection(tenantId);
  const now = Timestamp.now();

  const firestoreData = {
    descricao: data.descricao,
    valor: new Decimal(data.valor).toNumber(),
    diaVencimento: data.diaVencimento,
    categoriaId: data.categoriaId,
    contaDestino: data.contaDestino ?? null,
    cnpjAtrelado: data.cnpjAtrelado ?? null,
    observacao: data.observacao ?? null,
    recorrencia: data.recorrencia,
    dataInicio: data.dataInicio ? Timestamp.fromDate(new Date(data.dataInicio)) : null,
    dataFim: data.dataFim ? Timestamp.fromDate(new Date(data.dataFim)) : null,
    ativo: true,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    version: 1,
    isDeleted: false,
  };

  const docRef = await addDoc(coll, firestoreData);
  const snapshot = await getDoc(docRef);
  const fixedCost = mapFirestoreToFixedCost(snapshot);

  if (!fixedCost) {
    throw new Error('Failed to create fixed cost');
  }

  return fixedCost;
}

export async function updateFixedCost(
  tenantId: string,
  id: string,
  updates: UpdateFixedCostDTO,
  userId: string
): Promise<FixedCost> {
  const docRef = getTenantDoc(tenantId, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Fixed cost not found');
  }

  const existing = mapFirestoreToFixedCost(snapshot);
  if (!existing) {
    throw new Error('Fixed cost not found');
  }

  if (snapshot.data()?.version !== existing.version) {
    throw new Error('Concurrent modification detected');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
    updatedBy: userId,
    version: existing.version + 1,
  };

  if (updates.descricao !== undefined) updateData.descricao = updates.descricao;
  if (updates.valor !== undefined) updateData.valor = new Decimal(updates.valor).toNumber();
  if (updates.diaVencimento !== undefined) updateData.diaVencimento = updates.diaVencimento;
  if (updates.categoriaId !== undefined) updateData.categoriaId = updates.categoriaId;
  if (updates.contaDestino !== undefined) updateData.contaDestino = updates.contaDestino ?? null;
  if (updates.cnpjAtrelado !== undefined) updateData.cnpjAtrelado = updates.cnpjAtrelado ?? null;
  if (updates.observacao !== undefined) updateData.observacao = updates.observacao ?? null;
  if (updates.recorrencia !== undefined) updateData.recorrencia = updates.recorrencia;
  if (updates.ativo !== undefined) updateData.ativo = updates.ativo;
  if (updates.dataInicio !== undefined) {
    updateData.dataInicio = updates.dataInicio ? Timestamp.fromDate(new Date(updates.dataInicio)) : null;
  }
  if (updates.dataFim !== undefined) {
    updateData.dataFim = updates.dataFim ? Timestamp.fromDate(new Date(updates.dataFim)) : null;
  }

  await updateDoc(docRef, updateData);

  const updatedSnapshot = await getDoc(docRef);
  const fixedCost = mapFirestoreToFixedCost(updatedSnapshot);

  if (!fixedCost) {
    throw new Error('Failed to update fixed cost');
  }

  return fixedCost;
}

export async function softDeleteFixedCost(tenantId: string, id: string, userId: string): Promise<void> {
  const docRef = getTenantDoc(tenantId, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Fixed cost not found');
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

export async function generateMonthlyTransactions(
  tenantId: string,
  mesAno: string,
  userId: string
): Promise<{ criadas: number; ignoradas: number }> {
  const [mes, ano] = mesAno.split('-').map(Number);
  const fixedCosts = await listFixedCosts(tenantId, true);

  let criadas = 0;
  let ignoradas = 0;

  const transactionsColl = getTransactionsCollection(tenantId);
  const batch = writeBatch(db);

  for (const fixedCost of fixedCosts) {
    if (fixedCost.recorrencia === 'UNICA') {
      if (fixedCost.dataInicio) {
        const inicioMes = fixedCost.dataInicio.getMonth() + 1;
        const inicioAno = fixedCost.dataInicio.getFullYear();
        if (mes !== inicioMes || ano !== inicioAno) {
          ignoradas++;
          continue;
        }
      }
    }

    if (fixedCost.dataFim) {
      const fimMes = fixedCost.dataFim.getMonth() + 1;
      const fimAno = fixedCost.dataFim.getFullYear();
      if (ano > fimAno || (ano === fimAno && mes > fimMes)) {
        ignoradas++;
        continue;
      }
    }

    const existingQuery = query(
      transactionsColl,
      where('fixedCostId', '==', fixedCost.id),
      where('mesCompetencia', '==', mesAno),
      where('isDeleted', '==', false)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      ignoradas++;
      continue;
    }

    const dataVencimento = new Date(ano, mes - 1, fixedCost.diaVencimento);

    const transactionData: Record<string, unknown> = {
      txNumber: `FC-${fixedCost.id.substring(0, 8)}-${mesAno}`,
      tipo: 'SAIDA',
      descricao: fixedCost.descricao,
      valor: fixedCost.valor,
      data: Timestamp.fromDate(dataVencimento),
      status: 'PLANEJADO',
      categoryId: fixedCost.categoriaId,
      contaDestino: fixedCost.contaDestino ?? null,
      cnpjAtrelado: fixedCost.cnpjAtrelado ?? null,
      observacao: fixedCost.observacao ?? null,
      mesCompetencia: mesAno,
      visibilidade: 'OPERACIONAL_PURO' as Visibilidade,
      origem: 'FIXED_COST_GENERATED',
      fixedCostId: fixedCost.id,
      createdAt: Timestamp.now(),
      createdBy: userId,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      version: 1,
      isDeleted: false,
    };

    const newDocRef = doc(transactionsColl);
    batch.set(newDocRef, transactionData);
    criadas++;
  }

  if (criadas > 0) {
    await batch.commit();
  }

  return { criadas, ignoradas };
}
