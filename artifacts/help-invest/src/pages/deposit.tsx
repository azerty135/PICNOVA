import { useState } from "react";
import { useCreateDeposit } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";

const DEPOSIT_AMOUNTS = [50, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 5000, 8000, 10000];

function buildUssdCode(amount: number): string {
  return `*123*${amount}#`;
}

export default function Deposit() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createDeposit = useCreateDeposit();

  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectAmount = (amount: number) => {
    setPendingAmount(amount);
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!pendingAmount) return;
    setDialogOpen(false);

    const ussdCode = buildUssdCode(pendingAmount);

    createDeposit.mutate(
      { data: { amount: pendingAmount, method: "mobile_money" } },
      {
        onSuccess: () => {
          toast({
            title: "Dépôt en attente",
            description: `Redirection vers Mobile Money pour valider $${pendingAmount}.`,
          });
          window.location.href = `tel:${ussdCode}`;
          setTimeout(() => setLocation("/dashboard"), 2000);
        },
        onError: () => {
          toast({
            title: "Erreur",
            description: "Impossible d'enregistrer le dépôt. Réessayez.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setPendingAmount(null);
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
              onClick={() => selectAmount(amount)}
              disabled={createDeposit.isPending}
              className={cn(
                "relative py-4 px-2 rounded-xl border text-sm font-bold transition-all duration-150 select-none",
                pendingAmount === amount && dialogOpen
                  ? "bg-primary text-background border-primary shadow-md shadow-primary/30 scale-[1.03]"
                  : "bg-card border-border/60 text-foreground hover:border-primary/50 hover:text-primary"
              )}
            >
              ${amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Money info */}
      <div className="px-4 mt-6">
        <div className="flex items-start gap-3 bg-card border border-primary/20 rounded-xl p-4">
          <PhoneCall className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Après confirmation, vous serez redirigé vers votre service Mobile Money via un code USSD pour valider le paiement.
          </p>
        </div>
      </div>

      {/* Loading state */}
      {createDeposit.isPending && (
        <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Traitement en cours...
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="bg-card border-border/60 max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-center text-lg">
              Confirmer le dépôt
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3 pt-2">
              <span className="block text-3xl font-bold text-primary">
                ${pendingAmount?.toLocaleString()}
              </span>
              <span className="block text-sm text-muted-foreground">
                Vous allez investir{" "}
                <strong className="text-foreground">${pendingAmount}</strong>.
                Vous serez redirigé vers Mobile Money pour finaliser le paiement.
              </span>
              {pendingAmount && (
                <span className="block font-mono text-xs bg-background/60 text-primary border border-primary/20 px-3 py-1.5 rounded-lg">
                  Code USSD : {buildUssdCode(pendingAmount)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              data-testid="button-confirm-deposit"
              onClick={handleConfirm}
              className="w-full bg-primary text-background hover:bg-primary/90 font-bold h-12"
            >
              Confirmer
            </AlertDialogAction>
            <AlertDialogCancel
              data-testid="button-cancel-deposit"
              onClick={handleCancel}
              className="w-full border-border/50 text-muted-foreground hover:text-foreground h-11"
            >
              Annuler
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
