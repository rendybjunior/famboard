import { NavLink, useNavigate } from "react-router-dom";
import { Home, Clock, Settings, CheckSquare, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePendingCount } from "@/hooks/use-family";

function NavItem({
  to,
  icon: Icon,
  label,
  badge,
}: {
  to: string;
  icon: typeof Home;
  label: string;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors relative ${
          isActive
            ? "text-primary font-medium"
            : "text-muted-foreground hover:text-foreground"
        }`
      }
    >
      <span className="relative">
        <Icon className="h-5 w-5" />
        {badge != null && badge > 0 && (
          <span className="absolute -top-2 -right-3 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      {label}
    </NavLink>
  );
}

export function NavBar() {
  const { membership, signOut } = useAuth();
  const navigate = useNavigate();
  const isParent = membership?.role === "parent";
  const { data: pendingCount } = usePendingCount(
    isParent ? membership.family_id : undefined
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="max-w-lg mx-auto flex justify-around py-1">
        <NavItem to="/dashboard" icon={Home} label="Home" />
        {isParent && (
          <NavItem
            to="/approvals"
            icon={CheckSquare}
            label="Approvals"
            badge={pendingCount}
          />
        )}
        <NavItem to="/history" icon={Clock} label="History" />
        {isParent && (
          <NavItem to="/settings" icon={Settings} label="Settings" />
        )}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </nav>
  );
}
