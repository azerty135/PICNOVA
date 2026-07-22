import { useState, useEffect } from "react";
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
import { Loader2, PhoneCall, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

const DEPOSIT_AMOUNTS = [50, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 5000, 8000, 10000];
const DAILY_RATE = 0.03;
const PREVIEW_DAYS = 7;

function gains7d(amount: number): string {
  return formatCurrency(amount * DAILY_RATE * PREVIEW_DAYS);
}

interface MomoInfo {
  available: boolean;
  maskedNumber: string | null;
  ussdTemplate: string | null;
}

function buildUssd(template: string | null, amount: number): string {
  if (!template) return `*123*${amount}#`;
  return template.replace("{amount}", String(amount));
}

export default function Deposit() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createDeposit = useCreateDeposit();
  const [momo, setMomo] = useState<MomoInfo>({ available: false, maskedNumber: null, ussdTemplate: null });

  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch("/api/settings/momo", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMomo(d))
      .catch(() => {});
  }, []);

  const selectAmount = (amount: number) => {
    setPendingAmount(amount);
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!pendingAmount) return;
    setDialogOpen(false);

    const ussdCode = buildUssd(momo.ussdTemplate, pendingAmount);

    createDeposit.mutate(
      { data: { amount: pendingAmount, method: "mobile_money" } },
      {
        onSuccess: () => {
          // Open the phone dialer with the USSD code directly
          window.location.href = `tel:${ussdCode}`;
          toast({
            title: "Composez le code USSD",
            description: `Entrez votre PIN Mobile Money pour valider $${pendingAmount}.`,
          });
          setTimeout(() => setLocation("/dashboard"), 3000);
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
    <div className="min-h-screen bg-background flex flex-col pb-8">
      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-4 px-4">
        <div className="w-20 h-20 rounded-full border-2 border-primary bg-card flex items-center justify-center mb-3 shadow-lg shadow-primary/10">
          <span className="text-primary font-bold text-xl tracking-widest font-serif">PICNOVA</span>
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
                "relative py-3 px-2 rounded-xl border text-sm font-bold transition-all duration-150 select-none flex flex-col items-center gap-1",
                pendingAmount === amount && dialogOpen
                  ? "bg-primary text-background border-primary shadow-md shadow-primary/30 scale-[1.03]"
                  : "bg-card border-border/60 text-foreground hover:border-primary/50 hover:text-primary"
              )}
            >
              <span>${amount.toLocaleString()}</span>
              <span className={cn(
                "text-[9px] font-medium",
                pendingAmount === amount && dialogOpen ? "text-background/80" : "text-green-400"
              )}>
                +{gains7d(amount)}/7j
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Money info */}
      <div className="px-4 mt-6">
        <div className="flex items-start gap-3 bg-card border border-primary/20 rounded-xl p-4">
          <PhoneCall className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p>Après confirmation, vous serez redirigé vers votre service Mobile Money.</p>
            {momo.available && momo.maskedNumber && (
              <p className="mt-1 flex items-center gap-1 text-primary font-medium">
                <Phone className="w-3 h-3" /> Numéro destinataire : {momo.maskedNumber}
              </p>
            )}
          </div>
        </div>
      </div>

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
            <AlertDialogDescription asChild>
              <div className="text-center space-y-3 pt-2">
                <span className="block text-3xl font-bold text-primary">
                  ${pendingAmount?.toLocaleString()}
                </span>
                {pendingAmount && (
                  <span className="block text-xs text-green-400 font-medium">
                    Estimation gains : +{gains7d(pendingAmount)} en 7 jours (3%/j)
                  </span>
                )}
                <span className="block text-sm text-muted-foreground">
                  Votre téléphone s'ouvrira sur Mobile Money.{" "}
                  Entrez votre <strong className="text-foreground">mot de passe Mobile Money</strong> pour valider.
                </span>
                {pendingAmount && (
                  <span className="block font-mono text-xs bg-background/60 text-primary border border-primary/20 px-3 py-1.5 rounded-lg">
                    {buildUssd(momo.ussdTemplate, pendingAmount)}
                  </span>
                )}
                {momo.maskedNumber && (
                  <span className="block text-xs text-muted-foreground">
                    Destinataire : <span className="text-primary font-medium">{momo.maskedNumber}</span>
                  </span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              data-testid="button-confirm-deposit"
              onClick={handleConfirm}
              className="w-full bg-primary text-background hover:bg-primary/90 font-bold h-12"
            >
              <Phone className="w-4 h-4 mr-2" /> Ouvrir Mobile Money
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
