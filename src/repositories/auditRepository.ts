import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AuditLog } from '../utils/auditDiff';
import type { AuditAction, AuditEntity } from '../domain/enums';

const AUDIT_LOGS_COLLECTION = 'auditLogs';

function getTenantCollection(tenantId: string) {
  return collection(db, 'tenants', tenantId, AUDIT_LOGS_COLLECTION);
}

export interface CreateAuditLogParams {
  entity: AuditEntity;
  entityId: string;
  txNumber?: string;
  action: AuditAction;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changedFields?: string[];
  userId: string;
  userEmail: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(tenantId: string, params: CreateAuditLogParams): Promise<void> {
  const coll = getTenantCollection(tenantId);

  const auditLog = {
    createdAt: Timestamp.now(),
    entity: params.entity,
    entityId: params.entityId,
    txNumber: params.txNumber ?? null,
    action: params.action,
    before: params.before ?? null,
    after: params.after ?? null,
    changedFields: params.changedFields ?? null,
    userId: params.userId,
    userEmail: params.userEmail,
    metadata: params.metadata ?? null,
  };

  await addDoc(coll, auditLog);
}

export async function listAuditLogs(
  tenantId: string,
  entityId?: string,
  limitCount: number = 100
): Promise<AuditLog[]> {
  const coll = getTenantCollection(tenantId);

  let q;
  if (entityId) {
    q = query(coll, where('entityId', '==', entityId), orderBy('createdAt', 'desc'), limit(limitCount));
  } else {
    q = query(coll, orderBy('createdAt', 'desc'), limit(limitCount));
  }

  const snapshot = await getDocs(q);
  const logs: AuditLog[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    logs.push({
      id: docSnap.id,
      createdAt: (data.createdAt as Timestamp).toDate(),
      entity: data.entity as AuditEntity,
      entityId: data.entityId,
      txNumber: data.txNumber ?? undefined,
      action: data.action as AuditAction,
      before: data.before ?? undefined,
      after: data.after ?? undefined,
      changedFields: data.changedFields ?? undefined,
      userId: data.userId,
      userEmail: data.userEmail,
      metadata: data.metadata ?? undefined,
    });
  });

  return logs;
}
