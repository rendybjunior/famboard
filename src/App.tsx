import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { Toaster } from "@/components/ui/sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard/index";
import ApprovalsPage from "@/pages/approvals";
import HistoryPage from "@/pages/history";
import LogReadingPage from "@/pages/log-reading";
import RedeemScreenTimePage from "@/pages/redeem-screen-time";
import SettingsPage from "@/pages/settings";
import AnalyticsPage from "@/pages/analytics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days — keep cache for offline
    },
    mutations: {
      networkMode: "online",
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "famboard-query-cache",
});

function SWRegistration() {
  useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for updates every hour
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });
  return null;
}

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
    >
      <BrowserRouter>
        <AuthProvider>
          <SWRegistration />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Auth required */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/log-reading" element={<LogReadingPage />} />
                <Route
                  path="/redeem-screen-time"
                  element={<RedeemScreenTimePage />}
                />
                <Route path="/approvals" element={<ApprovalsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}
