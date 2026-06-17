import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import Decimal from 'decimal.js';
import { db } from '../config/firebase';
import type { Goal } from '../types';

const GOALS_COLLECTION = 'goals';

function getTenantCollection(tenantId: string) {
  return collection(db, 'tenants', tenantId, GOALS_COLLECTION);
}

function getTenantDoc(tenantId: string, mesAno: string) {
  return doc(db, 'tenants', tenantId, GOALS_COLLECTION, mesAno);
}

function mapFirestoreToGoal(docSnap: DocumentSnapshot): Goal | null {
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    mesAno: data.mesAno,
    valor: new Decimal(data.valor).toNumber(),
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

export async function listGoals(tenantId: string): Promise<Goal[]> {
  const coll = getTenantCollection(tenantId);
  const q = query(coll, where('isDeleted', '==', false));

  const snapshot = await getDocs(q);
  const data: Goal[] = [];

  snapshot.forEach((docSnap) => {
    const goal = mapFirestoreToGoal(docSnap);
    if (goal) {
      data.push(goal);
    }
  });

  return data;
}

export async function getGoalByMesAno(tenantId: string, mesAno: string): Promise<Goal | null> {
  const docRef = getTenantDoc(tenantId, mesAno);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;
  if (snapshot.data()?.isDeleted) return null;

  return mapFirestoreToGoal(snapshot);
}

export async function upsertGoal(
  tenantId: string,
  mesAno: string,
  valor: string | number | Decimal,
  userId: string
): Promise<Goal> {
  const docRef = getTenantDoc(tenantId, mesAno);
  const snapshot = await getDoc(docRef);

  const valorDecimal = new Decimal(valor);
  const now = Timestamp.now();

  if (snapshot.exists() && !snapshot.data()?.isDeleted) {
    const currentVersion = snapshot.data()?.version ?? 0;

    await setDoc(docRef, {
      mesAno,
      valor: valorDecimal.toNumber(),
      updatedAt: now,
      updatedBy: userId,
      version: currentVersion + 1,
      isDeleted: false,
    }, { merge: true });
  } else {
    await setDoc(docRef, {
      mesAno,
      valor: valorDecimal.toNumber(),
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
      version: 1,
      isDeleted: false,
    });
  }

  const updatedSnapshot = await getDoc(docRef);
  const goal = mapFirestoreToGoal(updatedSnapshot);

  if (!goal) {
    throw new Error('Failed to upsert goal');
  }

  return goal;
}
