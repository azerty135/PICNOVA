import { useState } from "react";
import { useCreateDeposit } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DEPOSIT_AMOUNTS = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

const PAYMENT_METHODS = [
  { value: "usdt_trc20", label: "USDT (TRC20)" },
  { value: "usdt_erc20", label: "USDT (ERC20)" },
  { value: "btc", label: "Bitcoin (BTC)" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Virement Bancaire" },
];

export default function Deposit() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createDeposit = useCreateDeposit();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [method, setMethod] = useState("usdt_trc20");

  const handleSubmit = () => {
    if (!selectedAmount) {
      toast({
        title: "Montant requis",
        description: "Veuillez sélectionner un montant.",
        variant: "destructive",
      });
      return;
    }

    createDeposit.mutate(
      { data: { amount: selectedAmount, method } },
      {
        onSuccess: () => {
          toast({
            title: "Dépôt confirmé",
            description: `$${selectedAmount} ajoutés à votre compte.`,
          });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({
            title: "Erreur",
            description: "Impossible de traiter le dépôt. Réessayez.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Logo area */}
      <div className="flex flex-col items-center pt-8 pb-4 px-4">
        <div className="w-20 h-20 rounded-full border-2 border-primary bg-card flex items-center justify-center mb-3 shadow-lg shadow-primary/10">
          <span className="text-primary font-bold text-xl tracking-widest font-serif">HELP</span>
        </div>
        <h2 className="text-xl font-semibold text-foreground">Effectuer un dépôt</h2>
        <p className="text-sm text-muted-foreground mt-1">Choisissez votre montant</p>
      </div>

      {/* Amount grid */}
      <div className="px-4 mt-2">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {DEPOSIT_AMOUNTS.map((amount) => (
            <button
              key={amount}
              data-testid={`amount-btn-${amount}`}
              onClick={() => setSelectedAmount(amount)}
              className={cn(
                "relative py-4 px-2 rounded-xl border text-sm font-bold transition-all duration-150 select-none",
                selectedAmount === amount
                  ? "bg-primary text-background border-primary shadow-md shadow-primary/30 scale-[1.03]"
                  : "bg-card border-border/60 text-foreground hover:border-primary/50 hover:text-primary"
              )}
            >
              ${amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Selected amount display */}
      <div className="px-4 mt-6">
        <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Montant sélectionné</span>
          <span className="text-2xl font-bold text-primary">
            {selectedAmount ? `$${selectedAmount.toLocaleString()}` : "—"}
          </span>
        </div>
      </div>

      {/* Payment method */}
      <div className="px-4 mt-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
          Méthode de paiement
        </label>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger
            data-testid="select-payment-method"
            className="h-12 bg-card border-border/60 text-foreground"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info note */}
      <div className="px-4 mt-4">
        <p className="text-xs text-muted-foreground bg-card border border-border/30 rounded-lg p-3">
          Les dépôts crypto sont crédités après 3 confirmations réseau. Les virements bancaires prennent 24–48h ouvrées.
        </p>
      </div>

      {/* Submit */}
      <div className="px-4 mt-6 pb-6">
        <Button
          data-testid="button-submit-deposit"
          className="w-full h-14 text-base font-bold bg-primary text-background hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={createDeposit.isPending || !selectedAmount}
        >
          {createDeposit.isPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : null}
          Confirmer le dépôt
        </Button>
      </div>
    </div>
  );
}
