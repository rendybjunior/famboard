import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { Toaster } from "@/components/ui/sonner";

import LoginPage from "@/pages/login";
import JoinFamilyPage from "@/pages/setup/join-family";
import DashboardPage from "@/pages/dashboard/index";
import ApprovalsPage from "@/pages/approvals";
import HistoryPage from "@/pages/history";
import LogReadingPage from "@/pages/log-reading";
import RedeemScreenTimePage from "@/pages/redeem-screen-time";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/setup/join-family/:inviteCode"
              element={<JoinFamilyPage />}
            />

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
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
