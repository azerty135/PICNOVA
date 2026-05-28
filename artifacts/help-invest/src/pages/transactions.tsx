import { useGetTransactions } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Activity } from "lucide-react";

export default function Transactions() {
  const { data: transactions, isLoading, isError } = useGetTransactions();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-card w-1/3 rounded mb-6"></div>
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-card rounded-xl"></div>)}
      </div>
    );
  }

  if (isError || !transactions) {
    return <div className="p-6 text-destructive">Erreur lors du chargement de l'historique.</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-foreground">Historique</h1>
        <p className="text-muted-foreground text-sm">Toutes vos opérations récentes.</p>
      </header>

      {transactions.length === 0 ? (
        <div className="text-center p-12 bg-card border border-border rounded-xl">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground font-medium">Aucune transaction trouvée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <Card key={tx.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
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
                    <p className="font-medium text-sm capitalize mb-1">{tx.type}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                    {tx.description && <p className="text-xs text-muted-foreground mt-0.5">{tx.description}</p>}
                  </div>
                </div>
                <div className="text-right flex flex-col justify-between h-full">
                  <p className={`font-semibold text-lg ${tx.type === 'withdrawal' || tx.type === 'investment' ? 'text-white' : 'text-green-400'}`}>
                    {tx.type === 'withdrawal' || tx.type === 'investment' ? '-' : '+'}{formatCurrency(tx.amount)}
                  </p>
                  <span className={`text-[10px] uppercase font-bold tracking-wider mt-1 inline-block ${
                    tx.status === 'completed' ? 'text-green-500' : 
                    tx.status === 'pending' ? 'text-primary' : 'text-destructive'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
