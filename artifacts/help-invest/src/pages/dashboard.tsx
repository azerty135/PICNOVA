import { useGetDashboardSummary } from "@workspace/api-client-react";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowDownLeft, ArrowUpRight, Plus, Activity, Wallet, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading, isError } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-card w-1/3 rounded"></div>
        <div className="h-32 bg-card rounded-xl"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-card rounded-xl"></div>
          <div className="h-24 bg-card rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return <div className="p-6 text-destructive">Erreur lors du chargement des données.</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-foreground">Aperçu</h1>
        <p className="text-muted-foreground text-sm">Bienvenue sur votre espace privé.</p>
      </header>

      {/* Main Balance Card */}
      <Card className="bg-gradient-to-br from-card to-background border-primary/20 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Wallet className="w-32 h-32" />
        </div>
        <CardContent className="p-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Solde total</p>
          <h2 className="text-4xl font-bold text-white mb-6">{formatCurrency(summary.balance)}</h2>
          
          <div className="flex gap-3">
            <Link href="/deposit" className="flex-1">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="lg">
                <ArrowDownLeft className="mr-2 w-4 h-4" /> Dépôt
              </Button>
            </Link>
            <Link href="/withdraw" className="flex-1">
              <Button variant="outline" className="w-full border-primary/30 hover:bg-primary/10" size="lg">
                <ArrowUpRight className="mr-2 w-4 h-4" /> Retrait
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-medium">Investi</span>
            </div>
            <p className="text-xl font-semibold text-white">{formatCurrency(summary.totalInvested)}</p>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-wider font-medium">Gains</span>
            </div>
            <p className="text-xl font-semibold text-primary">{formatCurrency(summary.totalGains)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mt-8 mb-4">
        <h3 className="font-semibold text-lg">Transactions Récentes</h3>
        <Link href="/transactions" className="text-sm text-primary hover:underline">
          Voir tout
        </Link>
      </div>

      <div className="space-y-3">
        {summary.recentTransactions.length === 0 ? (
          <div className="text-center p-6 bg-card border border-border rounded-xl text-muted-foreground text-sm">
            Aucune transaction récente.
          </div>
        ) : (
          summary.recentTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-card border border-border/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' :
                  tx.type === 'withdrawal' ? 'bg-orange-500/10 text-orange-500' :
                  tx.type === 'gain' ? 'bg-primary/10 text-primary' :
                  'bg-blue-500/10 text-blue-500'
                }`}>
                  {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> :
                   tx.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> :
                   tx.type === 'gain' ? <TrendingUp className="w-5 h-5" /> :
                   <Activity className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-sm capitalize">{tx.type}</p>
                  <p className="text-xs text-muted-foreground">{formatDateOnly(tx.createdAt)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${tx.type === 'withdrawal' || tx.type === 'investment' ? 'text-white' : 'text-green-400'}`}>
                  {tx.type === 'withdrawal' || tx.type === 'investment' ? '-' : '+'}{formatCurrency(tx.amount)}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">{tx.status}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
