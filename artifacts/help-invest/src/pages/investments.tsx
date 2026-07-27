import { useGetInvestments } from "@workspace/api-client-react";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, CalendarCheck, Timer } from "lucide-react";

function getInvestmentProgress(startDate: string, durationDays: number) {
  const start = new Date(startDate);
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsed = Math.min(durationDays, Math.floor((now.getTime() - start.getTime()) / msPerDay));
  const remaining = Math.max(0, durationDays - elapsed);
  const maturity = new Date(start.getTime() + durationDays * msPerDay);
  return { elapsed, remaining, maturity };
}

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
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-border/30 bg-background/30">
                  <Badge variant={inv.status === 'active' ? 'default' : 'secondary'} className="uppercase text-[10px] tracking-wider">
                    {inv.status === 'active' ? 'ACTIVE' : 'TERMINÉ'}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDateOnly(inv.startDate)}
                  </div>
                </div>

                {/* Capital + Rendement */}
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Capital investi</p>
                    <p className="text-lg font-bold">{formatCurrency(inv.amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rendement / Jour</p>
                    <p className="text-lg font-bold text-primary">+3%</p>
                  </div>
                </div>

                {/* Progress: days elapsed / remaining / maturity */}
                {(() => {
                  const { elapsed, remaining, maturity } = getInvestmentProgress(inv.startDate, inv.durationDays);
                  const pct = Math.min(100, Math.round((elapsed / inv.durationDays) * 100));
                  return (
                    <div className="px-4 pb-3 space-y-2">
                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {elapsed}j écoulés
                        </span>
                        <span>{remaining}j restants</span>
                        <span className="flex items-center gap-1">
                          <CalendarCheck className="w-3 h-3" />
                          Échéance {formatDateOnly(maturity.toISOString())}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Gains */}
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
