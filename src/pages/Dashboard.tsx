import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  Target,
  TrendingDown,
  TrendingUp,
  Percent,
  Wallet,
  Repeat,
  RefreshCw
} from 'lucide-react';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { KpiCard } from '../components/ui/KpiCard';
import { AppError } from '../components/ui/AppError';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { Decimal } from '../lib/decimal';
import { startOfMonth, endOfMonth, getCurrentMonthYear, getCurrentMonthYearDisplay } from '../lib/date';

interface DashboardData {
  faturamentoMes: number;
  metaMes: number;
  percentualAtingido: number;
  despesasMes: number;
  resultadoMes: number;
  custoFixoPrevisto: number;
}

async function fetchDashboardData(tenantId: string): Promise<DashboardData> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const currentMonth = getCurrentMonthYear();

  // 1. Faturamento do Mês (ENTRADA, REALIZADO)
  const transactionsRef = collection(db, 'tenants', tenantId, 'transactions');
  const faturamentoQuery = query(
    transactionsRef,
    where('tipo', '==', 'ENTRADA'),
    where('status', '==', 'REALIZADO'),
    where('data', '>=', monthStart),
    where('data', '<=', monthEnd)
  );
  const faturamentoSnap = await getDocs(faturamentoQuery);
  const faturamentoMes = faturamentoSnap.docs.reduce(
    (sum, doc) => sum.plus(new Decimal(doc.data().valor || 0)),
    new Decimal(0)
  ).toNumber();

  // 2. Meta do Mês
  const goalsRef = collection(db, 'tenants', tenantId, 'goals');
  const goalQuery = query(goalsRef, where('mesAno', '==', currentMonth));
  const goalSnap = await getDocs(goalQuery);
  const metaMes = goalSnap.docs.length > 0
    ? goalSnap.docs[0].data().valorMetaReceita || 0
    : 0;

  // 3. Despesas do Mês (SAIDA, REALIZADO)
  const despesasQuery = query(
    transactionsRef,
    where('tipo', '==', 'SAIDA'),
    where('status', '==', 'REALIZADO'),
    where('data', '>=', monthStart),
    where('data', '<=', monthEnd)
  );
  const despesasSnap = await getDocs(despesasQuery);
  const despesasMes = despesasSnap.docs.reduce(
    (sum, doc) => sum.plus(new Decimal(doc.data().valor || 0)),
    new Decimal(0)
  ).toNumber();

  // 4. Custo Fixo Previsto
  const fixedCostsRef = collection(db, 'tenants', tenantId, 'fixedCosts');
  const fixedCostsQuery = query(
    fixedCostsRef,
    where('isActive', '==', true),
    where('isDeleted', '==', false)
  );
  const fixedCostsSnap = await getDocs(fixedCostsQuery);
  const custoFixoPrevisto = fixedCostsSnap.docs.reduce(
    (sum, doc) => sum.plus(new Decimal(doc.data().valorPadrao || 0)),
    new Decimal(0)
  ).toNumber();

  // 5. Resultado do Mês
  const resultadoMes = new Decimal(faturamentoMes).minus(new Decimal(despesasMes)).toNumber();

  // 6. % Atingido
  const percentualAtingido = metaMes > 0
    ? new Decimal(faturamentoMes).dividedBy(new Decimal(metaMes)).times(100).toNumber()
    : 0;

  return {
    faturamentoMes,
    metaMes,
    percentualAtingido,
    despesasMes,
    resultadoMes,
    custoFixoPrevisto,
  };
}

function currentMonthYearDisplay() {
  return getCurrentMonthYearDisplay();
}

function progressColor(p: number) {
  if (p < 70) return "#dc2626";
  if (p < 90) return "#d97706";
  return "#16a34a";
}

function Dashboard() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-kpis', tenantId],
    queryFn: () => fetchDashboardData(tenantId!),
    enabled: !!tenantId,
  });

  const { data: overdueCount = 0 } = useQuery({
    queryKey: ['asaas-overdue'],
    queryFn: async () => 0,
  });

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <AppError
        message="Erro ao carregar dados do dashboard"
        retry={() => refetch()}
      />
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const percentAchieved = dashboardData?.percentualAtingido || 0;

  return (
    <div className="animate-fadeIn space-y-6">
      <p className="text-[13px] text-[#64748b] mt-[2px] capitalize">{currentMonthYearDisplay()}</p>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardData && (
          <>
            <KpiCard label="Faturamento do Mês" value={formatCurrency(dashboardData.faturamentoMes)} icon={TrendingUp} variant="positive" />
            <KpiCard label="Meta do Mês" value={formatCurrency(dashboardData.metaMes)} icon={Target} />

            {/* Atingido — inline percent + bar */}
            <div className="rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[#64748b]">
                <Percent className="h-4 w-4" />
                <span className="text-sm font-medium">Atingido</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: progressColor(percentAchieved) }}
                >
                  {percentAchieved.toFixed(0)}%
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(percentAchieved, 100)}%`,
                      backgroundColor: progressColor(percentAchieved),
                    }}
                  />
                </div>
              </div>
            </div>

            <KpiCard label="Despesas do mês" value={formatCurrency(dashboardData.despesasMes)} icon={TrendingDown} variant="negative" />
            <KpiCard label="Resultado do Mês" value={formatCurrency(dashboardData.resultadoMes)} icon={Wallet} variant={dashboardData.resultadoMes >= 0 ? "positive" : "negative"} />
            <KpiCard label="Custo Fixo Previsto" value={formatCurrency(dashboardData.custoFixoPrevisto)} icon={Repeat} />
          </>
        )}
      </div>

      {/* Asaas overdue */}
      {overdueCount > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[#64748b]">
              <RefreshCw className="h-4 w-4" />
              <span className="text-sm font-medium">Cobranças Asaas Vencidas</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#dc2626]">{overdueCount}</span>
              <span className="text-xs text-[#64748b]">cobranças</span>
            </div>
            <div className="mt-3 text-xs text-[#64748b]">
              Total em atraso. Considere ações de cobrança ou renegociação.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
