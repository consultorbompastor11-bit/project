import { z } from 'zod';
import Decimal from 'decimal.js';
import * as fixedCostRepository from '../repositories/fixedCostRepository';
import * as auditService from './auditService';
import type { FixedCost, CreateFixedCostDTO, UpdateFixedCostDTO } from '../types';

const fixedCostSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.union([z.string(), z.number()]).refine((val) => {
    try {
      return new Decimal(val).greaterThan(0);
    } catch {
      return false;
    }
  }, 'Valor deve ser maior que zero'),
  diaVencimento: z.number().int().min(1).max(31),
  categoriaId: z.string().min(1, 'Categoria é obrigatória'),
  contaDestino: z.string().optional(),
  cnpjAtrelado: z.string().optional(),
  observacao: z.string().optional(),
  recorrencia: z.enum(['MENSAL', 'UNICA']),
  dataInicio: z.union([z.date(), z.string()]).optional(),
  dataFim: z.union([z.date(), z.string()]).optional(),
});

const updateFixedCostSchema = fixedCostSchema.partial().extend({
  ativo: z.boolean().optional(),
});

export async function createFixedCost(
  tenantId: string,
  dto: CreateFixedCostDTO,
  userId: string,
  userEmail: string
): Promise<FixedCost> {
  const validated = fixedCostSchema.parse(dto);

  const createData: CreateFixedCostDTO = {
    ...validated,
    dataInicio:
      validated.dataInicio instanceof Date
        ? validated.dataInicio
        : validated.dataInicio
        ? new Date(validated.dataInicio)
        : undefined,
    dataFim:
      validated.dataFim instanceof Date
        ? validated.dataFim
        : validated.dataFim
        ? new Date(validated.dataFim)
        : undefined,
    valor: new Decimal(validated.valor).toNumber(),
  };

  const fixedCost = await fixedCostRepository.createFixedCost(tenantId, createData, userId);

  await auditService.log(tenantId, {
    entity: 'fixedCost',
    entityId: fixedCost.id,
    action: 'CREATE',
    after: {
      descricao: fixedCost.descricao,
      valor: fixedCost.valor,
      diaVencimento: fixedCost.diaVencimento,
      categoriaId: fixedCost.categoriaId,
      recorrencia: fixedCost.recorrencia,
      ativo: fixedCost.ativo,
    },
    userId,
    userEmail,
  });

  return fixedCost;
}

export async function updateFixedCost(
  tenantId: string,
  id: string,
  updates: UpdateFixedCostDTO,
  userId: string,
  userEmail: string
): Promise<FixedCost> {
  const before = await fixedCostRepository.getFixedCost(tenantId, id);

  if (!before) {
    throw new Error('Fixed cost not found');
  }

  const validated = updateFixedCostSchema.parse(updates);

  const updateData: UpdateFixedCostDTO = {
    ...validated,
    dataInicio:
      validated.dataInicio instanceof Date
        ? validated.dataInicio
        : validated.dataInicio
        ? new Date(validated.dataInicio)
        : undefined,
    dataFim:
      validated.dataFim instanceof Date
        ? validated.dataFim
        : validated.dataFim
        ? new Date(validated.dataFim)
        : undefined,
    valor: validated.valor ? new Decimal(validated.valor).toNumber() : undefined,
  };

  const after = await fixedCostRepository.updateFixedCost(tenantId, id, updateData, userId);

  await auditService.log(tenantId, {
    entity: 'fixedCost',
    entityId: after.id,
    action: 'UPDATE',
    before: {
      descricao: before.descricao,
      valor: before.valor,
      diaVencimento: before.diaVencimento,
      categoriaId: before.categoriaId,
      recorrencia: before.recorrencia,
      ativo: before.ativo,
    },
    after: {
      descricao: after.descricao,
      valor: after.valor,
      diaVencimento: after.diaVencimento,
      categoriaId: after.categoriaId,
      recorrencia: after.recorrencia,
      ativo: after.ativo,
    },
    userId,
    userEmail,
  });

  return after;
}

export async function deleteFixedCost(
  tenantId: string,
  id: string,
  userId: string,
  userEmail: string
): Promise<void> {
  const fixedCost = await fixedCostRepository.getFixedCost(tenantId, id);

  if (!fixedCost) {
    throw new Error('Fixed cost not found');
  }

  await fixedCostRepository.softDeleteFixedCost(tenantId, id, userId);

  await auditService.log(tenantId, {
    entity: 'fixedCost',
    entityId: id,
    action: 'DELETE',
    before: {
      descricao: fixedCost.descricao,
      valor: fixedCost.valor,
    },
    userId,
    userEmail,
  });
}

export async function generateMonthTransactions(
  tenantId: string,
  mesAno: string,
  userId: string,
  userEmail: string
): Promise<{ criadas: number; ignoradas: number }> {
  const result = await fixedCostRepository.generateMonthlyTransactions(tenantId, mesAno, userId);

  await auditService.log(tenantId, {
    entity: 'fixedCost',
    entityId: 'generate-transactions',
    action: 'UPDATE',
    userId,
    userEmail,
    metadata: {
      mesAno,
      criadas: result.criadas,
      ignoradas: result.ignoradas,
    },
  });

  return result;
}
