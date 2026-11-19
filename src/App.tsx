import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SettingsProvider } from './hooks/useSettings';
import { TradesProvider } from './hooks/useTrades';
import { FiltersProvider } from './hooks/useFilters';
import { ToastProvider } from './hooks/useToast';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import TradesPage from './pages/TradesPage';
import AddEditTradePage from './pages/AddEditTradePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <SettingsProvider>
      <TradesProvider>
        <FiltersProvider>
          <ToastProvider>
            <HashRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="trades" element={<TradesPage />} />
                  <Route path="trades/:id" element={<TradesPage />} />
                  <Route path="ajouter" element={<AddEditTradePage />} />
                  <Route path="modifier/:id" element={<AddEditTradePage />} />
                  <Route path="reglages" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </HashRouter>
          </ToastProvider>
        </FiltersProvider>
      </TradesProvider>
    </SettingsProvider>
  );
}
