import { Link } from "wouter";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, BarChart3, History, Wallet } from "lucide-react";

const services = [
  {
    href: "/deposit",
    icon: ArrowDownLeft,
    label: "Dépôt",
    desc: "Approvisionnez votre compte",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    href: "/withdraw",
    icon: ArrowUpRight,
    label: "Retrait",
    desc: "Retirez vos fonds",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    href: "/invest",
    icon: TrendingUp,
    label: "Investir",
    desc: "Choisissez un plan",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    href: "/investments",
    icon: BarChart3,
    label: "Mes Investissements",
    desc: "Suivre vos placements",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    href: "/transactions",
    icon: History,
    label: "Transactions",
    desc: "Historique complet",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  {
    href: "/profile",
    icon: Wallet,
    label: "Mon Compte",
    desc: "Gérer votre profil",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
];

export default function Service() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-foreground">Services</h1>
        <p className="text-muted-foreground text-sm">Accédez à toutes les fonctionnalités.</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {services.map(({ href, icon: Icon, label, desc, color, bg, border }) => (
          <Link key={href} href={href}>
            <div
              data-testid={`service-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className={`p-5 rounded-2xl border ${border} bg-card hover:bg-card/80 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none`}
            >
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <p className="font-semibold text-sm text-foreground leading-tight">{label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
