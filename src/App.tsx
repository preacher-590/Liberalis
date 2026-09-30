import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useApp } from './context/AppContext';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Clients from './pages/Clients';
import Factures from './pages/Factures';
import Parametres from './pages/Parametres';
import MobileMoney from './pages/MobileMoney';
import RestrictedModule from './components/common/RestrictedModule';
const Rapports = lazy(() => import('./pages/Rapports'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminMenus = lazy(() => import('./pages/AdminMenus'));
import { Login, Inscription } from './pages/Auth';

/**
 * ProtectedRoute - Feat 9
 * Garde les routes privées. Redirige vers /login si l'utilisateur n'est pas connecté.
 */
function ProtectedRoute() {
  const { user, loading } = useApp();

  if (loading) return null; // Ou un spinner de chargement global

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/** Loader commun des pages admin (lazy loading) */
function AdminLoader() {
  return (
    <div className="flex items-center justify-center p-12 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Chargement de l'administration...</span>
      </div>
    </div>
  );
}

/**
 * AdminRoute — Garde les routes réservées au super administrateur.
 * Renvoie au dashboard si l'utilisateur connecté n'est pas admin.
 */
function AdminRoute() {
  const { user } = useApp();

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * ModuleGuard — Garde d'accès aux fonctionnalités selon les permissions accordées par le Super Admin.
 * Si le menu est désactivé pour ce professionnel, bloque l'accès et affiche la notice d'information.
 */
function ModuleGuard({
  moduleKey,
  moduleName,
  children,
}: {
  moduleKey: string;
  moduleName: string;
  children: React.ReactNode;
}) {
  const { user } = useApp();

  // Le Super Admin dispose des droits complets
  if (user?.role === 'admin') return <>{children}</>;

  const defaultMenus = ['agenda', 'clients', 'factures', 'mobile_money', 'rapports'];
  const allowedMenus = user?.allowed_menus && user.allowed_menus.length > 0
    ? user.allowed_menus
    : defaultMenus;

  if (!allowedMenus.includes(moduleKey)) {
    return <RestrictedModule moduleName={moduleName} />;
  }

  return <>{children}</>;
}

/**
 * IndexRedirect — Aiguille l'utilisateur vers son tableau de bord approprié selon son rôle.
 * - Super Admin -> /admin
 * - Professionnel -> /dashboard
 */
function IndexRedirect() {
  const { user } = useApp();
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth routes (no layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/inscription" element={<Inscription />} />

        {/* Protected App routes (with dashboard layout) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<IndexRedirect />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Routes modulaires soumises aux permissions du Super Admin */}
            <Route path="agenda" element={
              <ModuleGuard moduleKey="agenda" moduleName="Mon Agenda">
                <Agenda />
              </ModuleGuard>
            } />
            <Route path="clients" element={
              <ModuleGuard moduleKey="clients" moduleName="Mes Clients">
                <Clients />
              </ModuleGuard>
            } />
            <Route path="factures" element={
              <ModuleGuard moduleKey="factures" moduleName="Facturation">
                <Factures />
              </ModuleGuard>
            } />
            <Route path="finance/mobile-money" element={
              <ModuleGuard moduleKey="mobile_money" moduleName="Mobile Money">
                <MobileMoney />
              </ModuleGuard>
            } />
            <Route path="finance/rapports" element={
              <ModuleGuard moduleKey="rapports" moduleName="Rapports PR">
                <Suspense fallback={
                  <div className="flex items-center justify-center p-12 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm min-h-[300px]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Chargement du rapport...</span>
                    </div>
                  </div>
                }>
                  <Rapports />
                </Suspense>
              </ModuleGuard>
            } />

            <Route path="compte/parametres" element={<Parametres />} />

            {/* Espace Super Administrateur */}
            <Route element={<AdminRoute />}>
              <Route path="admin" element={
                <Suspense fallback={<AdminLoader />}>
                  <AdminDashboard />
                </Suspense>
              } />
              <Route path="admin/comptes" element={
                <Suspense fallback={<AdminLoader />}>
                  <Admin />
                </Suspense>
              } />
              <Route path="admin/menus" element={
                <Suspense fallback={<AdminLoader />}>
                  <AdminMenus />
                </Suspense>
              } />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<IndexRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
