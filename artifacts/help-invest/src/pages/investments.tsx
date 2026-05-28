import { useGetInvestments } from "@workspace/api-client-react";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock } from "lucide-react";

export default function Investments() {
  const { data: investments, isLoading, isError } = useGetInvestments();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-card w-1/3 rounded mb-6"></div>
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card rounded-xl"></div>)}
      </div>
    );
  }

  if (isError || !investments) {
    return <div className="p-6 text-destructive">Erreur lors du chargement des investissements.</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-foreground">Mes Investissements</h1>
        <p className="text-muted-foreground text-sm">Suivez la performance de vos actifs.</p>
      </header>

      {investments.length === 0 ? (
        <div className="text-center p-12 bg-card border border-border rounded-xl">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground font-medium">Aucun investissement actif.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {investments.map((inv) => (
            <Card key={inv.id} className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex justify-between items-center p-4 border-b border-border/30 bg-background/30">
                  <div className="flex items-center gap-2">
                    <Badge variant={inv.status === 'active' ? 'default' : 'secondary'} className="uppercase text-[10px] tracking-wider">
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDateOnly(inv.startDate)}
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Capital investi</p>
                    <p className="text-lg font-bold">{formatCurrency(inv.amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rendement / Jour</p>
                    <p className="text-lg font-bold text-primary">+{inv.dailyReturnRate}%</p>
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <div className="bg-primary/5 rounded-lg p-3 flex justify-between items-center border border-primary/10">
                    <span className="text-sm text-primary/80">Gains générés</span>
                    <span className="font-semibold text-primary">{formatCurrency(inv.totalReturn)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
