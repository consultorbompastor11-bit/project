import { z } from 'zod';
import Decimal from 'decimal.js';
import * as transactionRepository from '../repositories/transactionRepository';
import * as auditService from './auditService';
import type { Transaction, TransactionFilters, CreateTransactionDTO, UpdateTransactionDTO } from '../types';

const transactionSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.union([z.string(), z.number()]).refine((val) => {
    try {
      return new Decimal(val).greaterThan(0);
    } catch {
      return false;
    }
  }, 'Valor deve ser maior que zero'),
  data: z.union([z.date(), z.string()]),
  status: z.enum(['REALIZADO', 'PLANEJADO', 'CANCELADO']),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  contaDestino: z.string().optional(),
  cnpjAtrelado: z.string().optional(),
  documento: z.string().optional(),
  observacao: z.string().optional(),
  mesCompetencia: z.string().regex(/^\d{2}-\d{4}$/, 'Mês de competência inválido (MM-YYYY)'),
  visibilidade: z.enum(['OPERACIONAL_PURO', 'RESTRITO_PATRAO']),
  origem: z.enum(['MANUAL', 'ASAAS_SYNC', 'FIXED_COST_GENERATED']),
  asaasId: z.string().optional(),
  fixedCostId: z.string().optional(),
});

const updateSchema = transactionSchema.partial();

function sanitizeForCsv(value: unknown): string {
  if (value === null || value === undefined) return '';

  let str = String(value);

  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }

  str = str.replace(/"/g, '""');

  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    str = `"${str}"`;
  }

  return str;
}

export async function createTransaction(
  tenantId: string,
  dto: CreateTransactionDTO,
  userId: string,
  userEmail: string
): Promise<Transaction> {
  const validated = transactionSchema.parse(dto);

  const createData: CreateTransactionDTO = {
    ...validated,
    data: validated.data instanceof Date ? validated.data : new Date(validated.data),
    valor: new Decimal(validated.valor).toNumber(),
  };

  const transaction = await transactionRepository.createTransaction(tenantId, createData, userId);

  await auditService.log(tenantId, {
    entity: 'transaction',
    entityId: transaction.id,
    txNumber: transaction.txNumber,
    action: 'CREATE',
    after: {
      tipo: transaction.tipo,
      descricao: transaction.descricao,
      valor: transaction.valor,
      data: transaction.data instanceof Date ? transaction.data.toISOString() : transaction.data,
      status: transaction.status,
      categoryId: transaction.categoryId,
      mesCompetencia: transaction.mesCompetencia,
    },
    userId,
    userEmail,
  });

  return transaction;
}

export async function updateTransaction(
  tenantId: string,
  id: string,
  updates: UpdateTransactionDTO,
  userId: string,
  userEmail: string
): Promise<Transaction> {
  const before = await transactionRepository.getTransaction(tenantId, id);

  if (!before) {
    throw new Error('Transaction not found');
  }

  const validated = updateSchema.parse(updates);

  const updateData: UpdateTransactionDTO = {
    ...validated,
    data: validated.data instanceof Date ? validated.data : validated.data ? new Date(validated.data) : undefined,
    valor: validated.valor ? new Decimal(validated.valor).toNumber() : undefined,
  };

  const after = await transactionRepository.updateTransaction(tenantId, id, updateData, userId, before);

  await auditService.log(tenantId, {
    entity: 'transaction',
    entityId: after.id,
    txNumber: after.txNumber,
    action: 'UPDATE',
    before: {
      tipo: before.tipo,
      descricao: before.descricao,
      valor: before.valor,
      data: before.data instanceof Date ? before.data.toISOString() : before.data,
      status: before.status,
      categoryId: before.categoryId,
      mesCompetencia: before.mesCompetencia,
    },
    after: {
      tipo: after.tipo,
      descricao: after.descricao,
      valor: after.valor,
      data: after.data instanceof Date ? after.data.toISOString() : after.data,
      status: after.status,
      categoryId: after.categoryId,
      mesCompetencia: after.mesCompetencia,
    },
    userId,
    userEmail,
  });

  return after;
}

export async function deleteTransaction(
  tenantId: string,
  id: string,
  userId: string,
  userEmail: string
): Promise<void> {
  const transaction = await transactionRepository.getTransaction(tenantId, id);

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  await transactionRepository.softDeleteTransaction(tenantId, id, userId);

  await auditService.log(tenantId, {
    entity: 'transaction',
    entityId: id,
    txNumber: transaction.txNumber,
    action: 'DELETE',
    before: {
      tipo: transaction.tipo,
      descricao: transaction.descricao,
      valor: transaction.valor,
    },
    userId,
    userEmail,
  });
}

export async function exportCSV(
  tenantId: string,
  filters: TransactionFilters,
  role: 'ADMIN' | 'OPERACIONAL',
  cnpjAccess: string[],
  userId: string,
  userEmail: string
): Promise<string> {
  const allTransactions = await transactionRepository.listByYear(
    tenantId,
    new Date().getFullYear(),
    role,
    cnpjAccess
  );

  let filtered = allTransactions;

  if (filters.tipo) {
    filtered = filtered.filter((t) => t.tipo === filters.tipo);
  }
  if (filters.status) {
    filtered = filtered.filter((t) => t.status === filters.status);
  }
  if (filters.categoryId) {
    filtered = filtered.filter((t) => t.categoryId === filters.categoryId);
  }
  if (filters.cnpjAtrelado) {
    filtered = filtered.filter((t) => t.cnpjAtrelado === filters.cnpjAtrelado);
  }
  if (filters.origem) {
    filtered = filtered.filter((t) => t.origem === filters.origem);
  }
  if (filters.mesCompetencia) {
    filtered = filtered.filter((t) => t.mesCompetencia === filters.mesCompetencia);
  }
  if (filters.dataInicio) {
    const startDate = new Date(filters.dataInicio + 'T00:00:00');
    filtered = filtered.filter((t) => {
      const tDate = t.data instanceof Date ? t.data : new Date(t.data.seconds * 1000);
      return tDate >= startDate;
    });
  }
  if (filters.dataFim) {
    const endDate = new Date(filters.dataFim + 'T23:59:59');
    filtered = filtered.filter((t) => {
      const tDate = t.data instanceof Date ? t.data : new Date(t.data.seconds * 1000);
      return tDate <= endDate;
    });
  }

  const headers = [
    'Número',
    'Tipo',
    'Descrição',
    'Valor',
    'Data',
    'Status',
    'Categoria ID',
    'Mês Competência',
    'Origem',
    'CNPJ',
    'Visibilidade',
  ];

  const rows = filtered.map((t) => {
    const tDate = t.data instanceof Date ? t.data : new Date((t.data as { seconds: number }).seconds * 1000);
    return [
      sanitizeForCsv(t.txNumber),
      sanitizeForCsv(t.tipo),
      sanitizeForCsv(t.descricao),
      sanitizeForCsv(t.valor),
      sanitizeForCsv(tDate.toISOString().split('T')[0]),
      sanitizeForCsv(t.status),
      sanitizeForCsv(t.categoryId),
      sanitizeForCsv(t.mesCompetencia),
      sanitizeForCsv(t.origem),
      sanitizeForCsv(t.cnpjAtrelado),
      sanitizeForCsv(t.visibilidade),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  await auditService.log(tenantId, {
    entity: 'transaction',
    entityId: 'export',
    action: 'EXPORT_CSV',
    userId,
    userEmail,
    metadata: {
      filtros: filters,
      qtdLinhas: filtered.length,
      periodo:
        filters.dataInicio && filters.dataFim ? `${filters.dataInicio} a ${filters.dataFim}` : undefined,
    },
  });

  return csvContent;
}
