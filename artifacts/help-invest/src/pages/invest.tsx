import { useState } from "react";
import { useCreateInvestment } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Loader2, ShieldCheck } from "lucide-react";

const INVESTMENT_AMOUNTS = [
  50, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 5000, 8000, 10000
];

export default function Invest() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createInvestment = useCreateInvestment();

  const handleInvest = () => {
    if (!selectedAmount) return;

    createInvestment.mutate({ data: { amount: selectedAmount } }, {
      onSuccess: () => {
        toast({
          title: "Investissement réussi",
          description: `Votre investissement de ${formatCurrency(selectedAmount)} est actif.`,
        });
        setLocation("/investments");
      },
      onError: (err) => {
        toast({
          title: "Erreur",
          description: err.error || "Fonds insuffisants ou erreur système.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-foreground">Investir</h1>
        <p className="text-muted-foreground text-sm">Sélectionnez un plan fixe pour commencer.</p>
      </header>

      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-medium text-sm uppercase tracking-wide">Fonds Garantis</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
            {INVESTMENT_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                className={`p-4 rounded-xl border transition-all duration-200 text-center font-medium ${
                  selectedAmount === amount 
                    ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(212,175,55,0.15)]" 
                    : "bg-background border-border/50 text-foreground hover:border-primary/50"
                }`}
              >
                {formatCurrency(amount)}
              </button>
            ))}
          </div>

          <div className="bg-background/50 rounded-lg p-4 mb-6 border border-border/30 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rendement journalier</span>
              <span className="font-medium text-primary">~1.2% - 2.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Durée d'engagement</span>
              <span className="font-medium">30 jours</span>
            </div>
          </div>

          <Button 
            className="w-full font-bold text-lg h-14" 
            size="lg"
            disabled={!selectedAmount || createInvestment.isPending}
            onClick={handleInvest}
          >
            {createInvestment.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Confirmer l'investissement
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
