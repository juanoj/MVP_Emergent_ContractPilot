import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, ListChecks, CalendarClock, FileText, LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, testid: "nav-overview" },
  { to: "/subscriptions", label: "Subscriptions", icon: ListChecks, testid: "nav-subscriptions" },
  { to: "/renewals", label: "Renewals", icon: CalendarClock, testid: "nav-renewals" },
  { to: "/contracts", label: "Contracts", icon: FileText, testid: "nav-contracts" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-black/10 bg-white flex flex-col" data-testid="app-sidebar">
        <div className="px-6 py-6 border-b border-black/10">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2" data-testid="brand-logo">
            <div className="h-8 w-8 bg-black text-white rounded-md flex items-center justify-center">
              <Zap className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-none tracking-tight">ContractPilot</div>
              <div className="label-eyebrow text-neutral-500 mt-1">Subscription IQ</div>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map(({ to, label, icon: Icon, testid }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                data-testid={testid}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors border ${
                  active
                    ? "bg-black text-white border-black"
                    : "text-neutral-700 border-transparent hover:bg-neutral-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-black/10">
          <div className="flex items-center gap-3 mb-3">
            {user?.picture && (
              <img src={user.picture} alt="" className="h-8 w-8 rounded-full border border-black/10" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" data-testid="user-name">{user?.name}</div>
              <div className="text-xs text-neutral-500 truncate">{user?.email}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full rounded-md" onClick={logout} data-testid="logout-btn">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
