import type { Timestamp } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import Decimal from 'decimal.js';
import type {
  UserRole,
  TransactionStatus,
  TransactionType,
  TransactionOrigem,
  Visibilidade,
  DebtStatus,
  DebtType,
  FixedCostRecorrencia,
} from '../domain/enums';

export interface BaseEntity {
  id: string;
  createdAt: Date | Timestamp;
  createdBy: string;
  updatedAt: Date | Timestamp;
  updatedBy: string;
  version: number;
  isDeleted: boolean;
  deletedAt?: Date | Timestamp | null;
  deletedBy?: string | null;
}

export interface TransactionFilters {
  tipo?: TransactionType;
  status?: TransactionStatus;
  categoryId?: string;
  dataInicio?: string;
  dataFim?: string;
  cnpjAtrelado?: string;
  origem?: TransactionOrigem;
  mesCompetencia?: string;
}

export interface Transaction extends BaseEntity {
  txNumber: string;
  tipo: TransactionType;
  descricao: string;
  valor: number;
  data: Date | Timestamp;
  dataPagamento?: Date | Timestamp;
  dataPrevisao?: Date | Timestamp;
  status: TransactionStatus;
  categoryId: string;
  categoryRef?: DocumentReference;
  contaDestino?: string;
  cnpjAtrelado?: string;
  documento?: string;
  observacao?: string;
  mesCompetencia: string;
  visibilidade: Visibilidade;
  origem: TransactionOrigem;
  asaasId?: string;
  fixedCostId?: string;
}

export interface FixedCost extends BaseEntity {
  descricao: string;
  valor: number;
  diaVencimento: number;
  categoriaId: string;
  categoriaRef?: DocumentReference;
  contaDestino?: string;
  cnpjAtrelado?: string;
  observacao?: string;
  recorrencia: FixedCostRecorrencia;
  ativo: boolean;
  dataInicio?: Date | Timestamp;
  dataFim?: Date | Timestamp;
}

export interface Goal extends BaseEntity {
  mesAno: string;
  valor: number;
}

export interface DebtParcela {
  numero: number;
  valor: number;
  dataVencimento: Date | Timestamp;
  dataPagamento?: Date | Timestamp | null;
  status: DebtStatus;
  observacao?: string;
}

export interface Debt extends BaseEntity {
  tipo: DebtType;
  descricao: string;
  credor: string;
  valorTotal: number;
  parcelas: DebtParcela[];
  dataVencimentoFinal: Date | Timestamp;
  visibilidade: Visibilidade;
  cnpjAtrelado?: string;
  observacao?: string;
}

export interface CreateTransactionDTO {
  tipo: TransactionType;
  descricao: string;
  valor: string | number | Decimal;
  data: Date | string;
  status: TransactionStatus;
  categoryId: string;
  contaDestino?: string;
  cnpjAtrelado?: string;
  documento?: string;
  observacao?: string;
  mesCompetencia: string;
  visibilidade: Visibilidade;
  origem: TransactionOrigem;
  asaasId?: string;
  fixedCostId?: string;
}

export interface UpdateTransactionDTO {
  tipo?: TransactionType;
  descricao?: string;
  valor?: string | number | Decimal;
  data?: Date | string;
  status?: TransactionStatus;
  categoryId?: string;
  contaDestino?: string;
  cnpjAtrelado?: string;
  documento?: string;
  observacao?: string;
  mesCompetencia?: string;
  visibilidade?: Visibilidade;
}
