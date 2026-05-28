import { Link, useLocation } from "wouter";
import { Home, Users, LayoutGrid, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Accueil" },
    { href: "/equipe", icon: Users, label: "Équipe" },
    { href: "/service", icon: LayoutGrid, label: "Service" },
    { href: "/profile", icon: User, label: "Moi" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pb-20 md:pb-0 md:flex-row dark">
      {/* Top header bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b border-border/50 md:hidden">
        <span className="text-sm font-semibold text-primary">
          Solde: ${(user?.balance ?? 0).toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground font-medium tracking-wide">
          {user?.phone ?? ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-screen-md mx-auto md:max-w-full pt-12 pb-8 md:pt-0">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-2 pb-safe md:hidden z-50">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={cn(
                "flex flex-col items-center justify-center w-full py-2 space-y-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-64 bg-card border-r border-border min-h-screen fixed left-0 top-0">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">H</span>
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-primary tracking-wider">HELP</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Investissement</p>
            </div>
          </div>
          {user && (
            <div className="mt-4 p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Solde</p>
              <p className="text-lg font-bold text-primary">${user.balance.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{user.phone}</p>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-medium",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-card-foreground/5 hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop main content spacer */}
      <div className="hidden md:block w-64 shrink-0" />
    </div>
  );
}
