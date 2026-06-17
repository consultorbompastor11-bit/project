import { useState, Suspense } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { PageSkeleton } from './ui/PageSkeleton';
import {
  LayoutDashboard,
  Wallet,
  Repeat,
  BarChart3,
  RefreshCw,
  Target,
  AlertTriangle,
  Settings,
  LogOut,
  Lock,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const menuItems: { to: string; icon: typeof LayoutDashboard; label: string; adminOnly?: boolean; disabled?: boolean }[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/fluxo-caixa', icon: Wallet, label: 'Fluxo de Caixa' },
  { to: '/custos-fixos', icon: Repeat, label: 'Custos Fixos' },
  { to: '/dre', icon: BarChart3, label: 'DRE' },
  { to: '/asaas', icon: RefreshCw, label: 'Asaas' },
  { to: '/metas', icon: Target, label: 'Metas', adminOnly: true },
  { to: '/passivos-tributarios', icon: AlertTriangle, label: 'Passivos', adminOnly: true },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', disabled: true },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/fluxo-caixa': 'Fluxo de Caixa',
  '/custos-fixos': 'Custos Fixos',
  '/dre': 'DRE',
  '/asaas': 'Asaas',
  '/metas': 'Metas',
  '/passivos-tributarios': 'Passivos Tributários',
};

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pageTitle = pageTitles[location.pathname] || 'DDL OS';
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = async () => {
    await logout();
  };

  const visibleMenuItems = menuItems.filter(
    item => !item.adminOnly || isAdmin
  );

  const initials = user?.displayName
    ? user.displayName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  const notifCount = 0;

  return (
    <div className="flex min-h-screen w-full bg-[#f4f6f9]">
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-60 shrink-0 flex-col overflow-y-auto bg-[#1e2a3b] text-white transform transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 pt-6 pb-5">
          <div className="text-lg font-bold tracking-tight text-white flex items-center justify-between">
            DDL OS
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-0.5 text-[11px] text-[#94a3b8]">módulo financeiro interno</div>
        </div>

        <div className="mx-3 mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#3b82f6] text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{user?.displayName || user?.email}</div>
            <span className="mt-0.5 inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300 ring-1 ring-inset ring-blue-400/30">
              {user?.role === 'ADMIN' ? 'Admin' : 'Operacional'}
            </span>
          </div>
        </div>

        <div className="px-3 flex-1 flex flex-col">
          <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
            Menu
          </div>
          <nav className="flex flex-col gap-1">
            {visibleMenuItems.map(item => {
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              const baseClasses = "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    className={`${baseClasses} cursor-not-allowed text-[#64748b] opacity-60`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`${baseClasses} ${
                    isActive
                      ? "border-l-4 border-white bg-[#2563eb] pl-2 text-white"
                      : "text-[#94a3b8] hover:bg-[#334155] hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.adminOnly && (
                    <Lock size={14} className="shrink-0 text-[#64748b]" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto px-3 pb-5">
          <div className="my-3 h-px bg-white/10" />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#94a3b8] transition-colors hover:bg-[#334155] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-60">
        <header className="sticky top-0 z-30 border-b border-[#e2e8f0] bg-white shadow-sm">
          {/* Desktop */}
          <div className="hidden h-16 items-center justify-between px-6 lg:flex">
            <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
            <div className="flex items-center gap-[24px]">
              <div className="relative">
                <Bell className="h-5 w-5 text-[#64748b]" />
                {notifCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#dc2626] text-[10px] font-semibold text-white">
                    {notifCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-right">
                  <span className="text-[14px] font-medium text-[#1e293b] leading-tight">{user?.displayName || user?.email}</span>
                  <span className="text-[11px] font-normal text-[#64748b]">{user?.role === 'ADMIN' ? 'Administrador' : 'Operacional'}</span>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#3b82f6] text-sm font-semibold text-white">
                  {initials}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile */}
          <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-center text-sm font-bold tracking-tight text-slate-900">DDL OS</div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="h-5 w-5 text-[#64748b]" />
                {notifCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#dc2626] text-[10px] font-semibold text-white">
                    {notifCount}
                  </span>
                )}
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#3b82f6] text-xs font-semibold text-white">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
