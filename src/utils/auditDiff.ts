import type { AuditEntity, AuditAction } from '../domain/enums';

export interface AuditLog {
  id: string;
  createdAt: Date;
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in (value as object)) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as object) &&
    'nanoseconds' in (value as object)
  ) {
    const ts = value as { seconds: number; nanoseconds: number };
    return new Date(ts.seconds * 1000 + ts.nanoseconds / 1000000).toISOString();
  }
  return value;
}

export function computeDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): string[] {
  if (!before || !after) return [];

  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  const excludedFields = new Set([
    'id',
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    'version',
    'isDeleted',
    'deletedAt',
    'deletedBy',
  ]);

  for (const key of allKeys) {
    if (excludedFields.has(key)) continue;

    const beforeVal = normalizeValue(before[key]);
    const afterVal = normalizeValue(after[key]);

    if (beforeVal !== afterVal) {
      if (
        isObject(beforeVal) &&
        isObject(afterVal) &&
        JSON.stringify(beforeVal) !== JSON.stringify(afterVal)
      ) {
        changedFields.push(key);
      } else if (!isObject(beforeVal) || !isObject(afterVal)) {
        changedFields.push(key);
      }
    }
  }

  return changedFields;
}
