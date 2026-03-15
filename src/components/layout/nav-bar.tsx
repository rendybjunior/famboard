import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { usePendingCount } from "@/hooks/use-family";
import { MemberAvatar } from "@/components/member-avatar";

function NavItem({
  to,
  emoji,
  label,
  badge,
}: {
  to: string;
  emoji: string;
  label: string;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-semibold transition-all relative ${
          isActive
            ? "text-purple-600 scale-110"
            : "text-muted-foreground hover:text-foreground"
        }`
      }
    >
      <span className="relative text-xl">
        {emoji}
        {badge != null && badge > 0 && (
          <span className="absolute -top-2 -right-3 bg-pink-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-purple-100 z-50 shadow-[0_-2px_10px_rgba(168,85,247,0.08)]">
      <div className="max-w-lg mx-auto flex justify-around py-1">
        <NavItem to="/dashboard" emoji="&#x1F3E0;" label="Home" />
        {isParent && (
          <NavItem
            to="/approvals"
            emoji="&#x2705;"
            label="Approvals"
            badge={pendingCount}
          />
        )}
        <NavItem to="/history" emoji="&#x1F4CB;" label="History" />
        <NavItem to="/analytics" emoji="&#x1F4CA;" label="Stats" />
        {isParent && (
          <NavItem to="/settings" emoji="&#x2699;&#xFE0F;" label="Settings" />
        )}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
        >
          <MemberAvatar
            avatar={membership?.avatar ?? null}
            displayName={membership?.display_name ?? ""}
            size="sm"
          />
          Logout
        </button>
      </div>
    </nav>
  );
}
