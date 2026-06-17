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
  type DocumentData,
  type DocumentSnapshot,
  type Query,
} from 'firebase/firestore';
import Decimal from 'decimal.js';
import { db } from '../config/firebase';
import type { Debt, DebtParcela, CreateDebtDTO, UpdateDebtDTO } from '../types';
import type { UserRole, DebtStatus, DebtType, Visibilidade } from '../domain/enums';

const DEBTS_COLLECTION = 'debts';

function getTenantCollection(tenantId: string) {
  return collection(db, 'tenants', tenantId, DEBTS_COLLECTION);
}

function getTenantDoc(tenantId: string, id: string) {
  return doc(db, 'tenants', tenantId, DEBTS_COLLECTION, id);
}

function mapParcelaFromFirestore(parcela: Record<string, unknown>): DebtParcela {
  return {
    numero: parcela.numero as number,
    valor: new Decimal(parcela.valor as string).toNumber(),
    dataVencimento: (parcela.dataVencimento as Timestamp).toDate(),
    dataPagamento: parcela.dataPagamento ? (parcela.dataPagamento as Timestamp).toDate() : null,
    status: parcela.status as DebtStatus,
    observacao: parcela.observacao as string | undefined,
  };
}

function mapFirestoreToDebt(docSnap: DocumentSnapshot): Debt | null {
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  const parcelas = (data.parcelas as Array<Record<string, unknown>>).map(mapParcelaFromFirestore);

  return {
    id: docSnap.id,
    tipo: data.tipo as DebtType,
    descricao: data.descricao,
    credor: data.credor,
    valorTotal: new Decimal(data.valorTotal).toNumber(),
    parcelas,
    dataVencimentoFinal: (data.dataVencimentoFinal as Timestamp).toDate(),
    visibilidade: data.visibilidade as Visibilidade,
    cnpjAtrelado: data.cnpjAtrelado ?? undefined,
    observacao: data.observacao ?? undefined,
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

function mapParcelaToFirestore(
  parcela: DebtParcela | { numero: number; valor: string | number | Decimal; dataVencimento: Date | string; observacao?: string }
): Record<string, unknown> {
  const valor =
    parcela.valor instanceof Decimal ? parcela.valor.toNumber() : new Decimal(parcela.valor).toNumber();

  const dataVencimento =
    parcela.dataVencimento instanceof Date
      ? Timestamp.fromDate(parcela.dataVencimento)
      : Timestamp.fromDate(new Date(parcela.dataVencimento));

  const result: Record<string, unknown> = {
    numero: parcela.numero,
    valor,
    dataVencimento,
    status: 'status' in parcela ? parcela.status : 'EM_DIA',
  };

  if ('observacao' in parcela && parcela.observacao) {
    result.observacao = parcela.observacao;
  }

  if ('dataPagamento' in parcela && parcela.dataPagamento) {
    result.dataPagamento =
      parcela.dataPagamento instanceof Date
        ? Timestamp.fromDate(parcela.dataPagamento)
        : Timestamp.fromDate(new Date(parcela.dataPagamento));
  }

  return result;
}

export async function listDebts(tenantId: string, role: UserRole): Promise<Debt[]> {
  const coll = getTenantCollection(tenantId);
  const constraints: Array<ReturnType<typeof where>> = [where('isDeleted', '==', false)];

  if (role === 'OPERACIONAL') {
    constraints.push(where('visibilidade', '!=', 'RESTRITO_PATRAO'));
  }

  const q = query(coll, ...constraints);
  const snapshot = await getDocs(q);
  const data: Debt[] = [];

  snapshot.forEach((docSnap) => {
    const debt = mapFirestoreToDebt(docSnap);
    if (debt) {
      if (role === 'OPERACIONAL' && debt.visibilidade === 'RESTRITO_PATRAO') {
        return;
      }
      data.push(debt);
    }
  });

  return data;
}

export async function getDebt(tenantId: string, id: string): Promise<Debt | null> {
  const docRef = getTenantDoc(tenantId, id);
  const snapshot = await getDoc(docRef);
  return mapFirestoreToDebt(snapshot);
}

export async function createDebt(tenantId: string, data: CreateDebtDTO, userId: string): Promise<Debt> {
  const coll = getTenantCollection(tenantId);
  const now = Timestamp.now();

  const parcelasFirestore = data.parcelas.map(mapParcelaToFirestore);

  const ultimaParcela = data.parcelas.reduce((prev, current) => {
    const prevDate = prev.dataVencimento instanceof Date ? prev.dataVencimento : new Date(prev.dataVencimento);
    const currDate = current.dataVencimento instanceof Date ? current.dataVencimento : new Date(current.dataVencimento);
    return currDate > prevDate ? current : prev;
  });

  const dataVencimentoFinal =
    ultimaParcela.dataVencimento instanceof Date
      ? ultimaParcela.dataVencimento
      : new Date(ultimaParcela.dataVencimento);

  const firestoreData = {
    tipo: data.tipo,
    descricao: data.descricao,
    credor: data.credor,
    valorTotal: new Decimal(data.valorTotal).toNumber(),
    parcelas: parcelasFirestore,
    dataVencimentoFinal: Timestamp.fromDate(dataVencimentoFinal),
    visibilidade: data.visibilidade,
    cnpjAtrelado: data.cnpjAtrelado ?? null,
    observacao: data.observacao ?? null,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    version: 1,
    isDeleted: false,
  };

  const docRef = await addDoc(coll, firestoreData);
  const snapshot = await getDoc(docRef);
  const debt = mapFirestoreToDebt(snapshot);

  if (!debt) {
    throw new Error('Failed to create debt');
  }

  return debt;
}

export async function updateDebt(
  tenantId: string,
  id: string,
  updates: UpdateDebtDTO,
  userId: string
): Promise<Debt> {
  const docRef = getTenantDoc(tenantId, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Debt not found');
  }

  const existing = mapFirestoreToDebt(snapshot);
  if (!existing) {
    throw new Error('Debt not found');
  }

  if (snapshot.data()?.version !== existing.version) {
    throw new Error('Concurrent modification detected');
  }

  const now = Timestamp.now();
  const updateData: Record<string, unknown> = {
    updatedAt: now,
    updatedBy: userId,
    version: existing.version + 1,
  };

  if (updates.tipo !== undefined) updateData.tipo = updates.tipo;
  if (updates.descricao !== undefined) updateData.descricao = updates.descricao;
  if (updates.credor !== undefined) updateData.credor = updates.credor;
  if (updates.valorTotal !== undefined) updateData.valorTotal = new Decimal(updates.valorTotal).toNumber();
  if (updates.visibilidade !== undefined) updateData.visibilidade = updates.visibilidade;
  if (updates.cnpjAtrelado !== undefined) updateData.cnpjAtrelado = updates.cnpjAtrelado ?? null;
  if (updates.observacao !== undefined) updateData.observacao = updates.observacao ?? null;

  if (updates.parcelas !== undefined) {
    const parcelasFirestore = updates.parcelas.map(mapParcelaToFirestore);
    updateData.parcelas = parcelasFirestore;

    const ultimaParcela = updates.parcelas.reduce((prev, current) => {
      const prevDate = prev.dataVencimento instanceof Date ? prev.dataVencimento : new Date(prev.dataVencimento);
      const currDate = current.dataVencimento instanceof Date ? current.dataVencimento : new Date(current.dataVencimento);
      return currDate > prevDate ? current : prev;
    });

    const dataVencimentoFinal =
      ultimaParcela.dataVencimento instanceof Date
        ? ultimaParcela.dataVencimento
        : new Date(ultimaParcela.dataVencimento);
    updateData.dataVencimentoFinal = Timestamp.fromDate(dataVencimentoFinal);
  }

  await updateDoc(docRef, updateData);

  const updatedSnapshot = await getDoc(docRef);
  const debt = mapFirestoreToDebt(updatedSnapshot);

  if (!debt) {
    throw new Error('Failed to update debt');
  }

  return debt;
}

export async function softDeleteDebt(tenantId: string, id: string, userId: string): Promise<void> {
  const docRef = getTenantDoc(tenantId, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Debt not found');
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

export async function listVencendoEm7Dias(tenantId: string): Promise<Debt[]> {
  const coll = getTenantCollection(tenantId);
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const startTimestamp = Timestamp.fromDate(now);
  const endTimestamp = Timestamp.fromDate(sevenDaysLater);

  const q = query(
    coll,
    where('isDeleted', '==', false),
    where('dataVencimentoFinal', '>=', startTimestamp),
    where('dataVencimentoFinal', '<=', endTimestamp)
  );

  const snapshot = await getDocs(q);
  const data: Debt[] = [];

  snapshot.forEach((docSnap) => {
    const debt = mapFirestoreToDebt(docSnap);
    if (debt) {
      const parcelasVencendo = debt.parcelas.filter((p) => {
        const vencimento = p.dataVencimento;
        return vencimento >= now && vencimento <= sevenDaysLater && p.status === 'EM_DIA';
      });

      if (parcelasVencendo.length > 0) {
        data.push(debt);
      }
    }
  });

  return data;
}
