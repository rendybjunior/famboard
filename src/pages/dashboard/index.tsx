import { useAuth } from "@/contexts/auth-context";
import KidDashboard from "./kid-dashboard";
import ParentDashboard from "./parent-dashboard";

export default function DashboardPage() {
  const { membership } = useAuth();
  return membership?.role === "parent" ? <ParentDashboard /> : <KidDashboard />;
}
