import type { AsaasPayment } from './asaasApi';
import type { Transaction } from '../../types';
import type { Visibilidade } from '../../domain/enums';

export const toMesCompetencia = (dateStr: string): string => {
  const [year, month] = dateStr.split('-');
  return `${month}-${year}`;
};

export const mapAsaasToTransaction = (
  payment: AsaasPayment,
  tenantId: string,
  txNumber: string,
  userId: string
): Omit<Transaction, 'id'> => {
  const paymentDate = payment.paymentDate ?? payment.dueDate;

  return {
    txNumber,
    tipo: 'ENTRADA',
    descricao: payment.description ?? `Cobrança Asaas #${payment.id}`,
    valor: payment.netValue,
    data: new Date(paymentDate),
    dataPagamento: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
    dataPrevisao: new Date(payment.dueDate),
    status: 'REALIZADO',
    categoryId: 'cat-receita-servicos',
    mesCompetencia: toMesCompetencia(paymentDate),
    cnpjAtrelado: 'DDL_PRINCIPAL',
    visibilidade: 'OPERACIONAL_PURO' as Visibilidade,
    origem: 'ASAAS_SYNC',
    asaasId: payment.id,
    fixedCostId: undefined,
    observacao: 'Sincronizado automaticamente do Asaas',
    isDeleted: false,
    version: 1,
    createdAt: new Date(),
    createdBy: userId,
    updatedAt: new Date(),
    updatedBy: userId,
  } as Omit<Transaction, 'id'>;
};
