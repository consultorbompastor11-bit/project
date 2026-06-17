import { createAuditLog } from '../repositories/auditRepository';
import { computeDiff } from '../utils/auditDiff';
import type { AuditAction, AuditEntity } from '../domain/enums';

export interface LogParams {
  entity: AuditEntity;
  entityId: string;
  txNumber?: string;
  action: AuditAction;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  userId: string;
  userEmail: string;
  metadata?: Record<string, unknown>;
}

export async function log(tenantId: string, params: LogParams): Promise<void> {
  let changedFields: string[] | undefined;

  if (params.action === 'UPDATE' && params.before && params.after) {
    changedFields = computeDiff(params.before, params.after);
  }

  await createAuditLog(tenantId, {
    entity: params.entity,
    entityId: params.entityId,
    txNumber: params.txNumber,
    action: params.action,
    before: params.before,
    after: params.after,
    changedFields,
    userId: params.userId,
    userEmail: params.userEmail,
    metadata: params.metadata,
  });
}
