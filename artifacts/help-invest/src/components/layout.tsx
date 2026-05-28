import { Link, useLocation } from "wouter";
import { LayoutDashboard, TrendingUp, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/invest", icon: TrendingUp, label: "Invest" },
    { href: "/transactions", icon: History, label: "Transactions" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pb-20 md:pb-0 md:flex-row dark">
      <div className="flex-1 overflow-y-auto w-full max-w-screen-md mx-auto md:max-w-full pb-8">
        {children}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-2 pb-safe md:hidden z-50">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center w-full py-2 space-y-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-64 bg-card border-r border-border min-h-screen fixed left-0 top-0">
        <div className="p-6">
          <h1 className="text-2xl font-serif font-bold text-primary tracking-wider">HELP.</h1>
        </div>
        <div className="flex-1 flex flex-col gap-2 p-4">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-medium",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-card-foreground/5 hover:text-foreground"
              )}>
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
