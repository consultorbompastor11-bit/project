import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageSkeleton } from './components/ui/PageSkeleton';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FluxoCaixa = lazy(() => import('./pages/FluxoCaixa'));
const CustosFixos = lazy(() => import('./pages/CustosFixos'));
const DRE = lazy(() => import('./pages/DRE'));
const Asaas = lazy(() => import('./pages/Asaas'));
const Metas = lazy(() => import('./pages/Metas'));
const PassivosTributarios = lazy(() => import('./pages/PassivosTributarios'));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="fluxo-caixa" element={<FluxoCaixa />} />
          <Route path="custos-fixos" element={<CustosFixos />} />
          <Route path="dre" element={<DRE />} />
          <Route path="asaas" element={<Asaas />} />
          <Route
            path="metas"
            element={
              <ProtectedRoute requireAdmin>
                <Metas />
              </ProtectedRoute>
            }
          />
          <Route
            path="passivos-tributarios"
            element={
              <ProtectedRoute requireAdmin>
                <PassivosTributarios />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
