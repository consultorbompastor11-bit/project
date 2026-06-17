// CRÍTICO: bloquear uso em produção no frontend
if (import.meta.env.VITE_ASAAS_ENV === 'production') {
  throw new Error('[ASAAS] Produção deve usar Cloud Functions, não o frontend.');
}

const BASE_URL = 'https://sandbox.asaas.com/api/v3';

const getApiKey = () => import.meta.env.VITE_ASAAS_API_KEY || '';

const ASAAS_ERRORS: Record<number, string> = {
  400: 'Não é possível executar esta ação. Verifique se o boleto não foi cancelado.',
  401: 'Configuração sandbox do Asaas inválida. Verifique as configurações do ambiente.',
  404: 'Boleto não encontrado no Asaas. Pode ter sido excluído.',
  422: 'Dados inválidos. Verifique a data e o valor informados.',
  429: 'Limite de requisições do Asaas atingido. Tente novamente em alguns minutos.',
  500: 'Erro interno do Asaas. Tente novamente mais tarde.',
};

export type AsaasStatus = 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

export interface AsaasPayment {
  id: string;
  customer: string;
  status: AsaasStatus;
  value: number;
  netValue: number;
  dueDate: string;
  paymentDate?: string;
  description?: string;
  invoiceUrl?: string;
  billingType: string;
}

export interface AsaasPaymentsResponse {
  data: AsaasPayment[];
  totalCount: number;
}

// Circuit breaker state
let failureCount = 0;
let circuitOpen = false;
let circuitOpenUntil = 0;
const FAILURE_THRESHOLD = 3;
const CIRCUIT_TIMEOUT_MS = 60000;

function checkCircuit(): void {
  if (circuitOpen && Date.now() < circuitOpenUntil) {
    throw new Error('[ASAAS] Circuit breaker aberto. Aguarde 60 segundos.');
  }
  if (circuitOpen && Date.now() >= circuitOpenUntil) {
    circuitOpen = false;
    failureCount = 0;
  }
}

function recordFailure(): void {
  failureCount++;
  if (failureCount >= FAILURE_THRESHOLD) {
    circuitOpen = true;
    circuitOpenUntil = Date.now() + CIRCUIT_TIMEOUT_MS;
    console.error('[ASAAS] Circuit breaker aberto após 3 falhas consecutivas.');
  }
}

function recordSuccess(): void {
  failureCount = 0;
}

async function asaasFetch<T>(path: string, options?: RequestInit): Promise<T> {
  checkCircuit();

  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'access_token': getApiKey(),
    ...options?.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[ASAAS] Erro HTTP:', response.status, errorBody);

      if (ASAAS_ERRORS[response.status]) {
        throw new Error(ASAAS_ERRORS[response.status]);
      }

      recordFailure();
      throw new Error(`[ASAAS] Erro HTTP ${response.status}: ${errorBody}`);
    }

    recordSuccess();
    return response.json();
  } catch (error: unknown) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Sem conexão com o Asaas. Verifique sua internet.');
    }
    throw error;
  }
}

export interface FetchPaymentsParams {
  status?: AsaasStatus;
  dueDate_ge?: string;
  dueDate_le?: string;
  limit?: number;
  offset?: number;
}

export async function fetchPayments(
  params: FetchPaymentsParams
): Promise<AsaasPaymentsResponse> {
  const queryParams = new URLSearchParams();

  if (params.status) queryParams.append('status', params.status);
  if (params.dueDate_ge) queryParams.append('dueDate[ge]', params.dueDate_ge);
  if (params.dueDate_le) queryParams.append('dueDate[le]', params.dueDate_le);
  queryParams.append('limit', String(params.limit ?? 50));
  if (params.offset) queryParams.append('offset', String(params.offset));

  const path = `/payments?${queryParams.toString()}`;
  return asaasFetch<AsaasPaymentsResponse>(path);
}

export async function fetchPaymentById(id: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${id}`);
}

export async function fetchCustomerName(customerId: string): Promise<string> {
  interface CustomerResponse {
    name: string;
  }
  const response = await asaasFetch<CustomerResponse>(`/customers/${customerId}`);
  return response.name;
}

export interface MarkAsReceivedInCashParams {
  asaasId: string;
  paymentDate: string;
  value: number;
}

export async function markAsReceivedInCash(
  params: MarkAsReceivedInCashParams
): Promise<void> {
  const path = `/payments/${params.asaasId}/receiveInCash`;

  await asaasFetch<void>(path, {
    method: 'POST',
    body: JSON.stringify({
      paymentDate: params.paymentDate,
      value: params.value,
    }),
  });
}
