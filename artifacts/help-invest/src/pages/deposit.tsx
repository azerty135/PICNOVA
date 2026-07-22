import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, PhoneCall, Copy, Check, ClipboardPaste, Send } from "lucide-react";
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
  fullNumber: string | null;
  ussdTemplate: string | null;
}

function buildUssd(template: string | null, amount: number): string {
  if (!template) return `*123*${amount}#`;
  return template.replace("{amount}", String(amount));
}

type Step = "select" | "send" | "proof";

export default function Deposit() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [momo, setMomo] = useState<MomoInfo>({ available: false, maskedNumber: null, fullNumber: null, ussdTemplate: null });

  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [proofMessage, setProofMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/settings/momo", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMomo(d))
      .catch(() => {});
  }, []);

  const selectAmount = (amount: number) => {
    setPendingAmount(amount);
    setStep("send");
    setProofMessage("");
    setCopied(false);
  };

  const copyNumber = async () => {
    if (!momo.fullNumber) return;
    await navigator.clipboard.writeText(momo.fullNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openMobileMoney = () => {
    if (!pendingAmount) return;
    const ussd = buildUssd(momo.ussdTemplate, pendingAmount);
    window.location.href = `tel:${ussd}`;
  };

  const handleSubmitProof = async () => {
    if (!pendingAmount || !proofMessage.trim() || submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: pendingAmount, method: "mobile_money", proofMessage: proofMessage.trim() }),
      });
      if (r.ok) {
        toast({
          title: "Dépôt envoyé pour validation",
          description: "L'administrateur vérifiera votre preuve et créditera votre compte.",
        });
        setStep("select");
        setPendingAmount(null);
        setProofMessage("");
        setTimeout(() => setLocation("/dashboard"), 1500);
      } else {
        const err = await r.json();
        toast({ title: "Erreur", description: err.error ?? "Impossible d'enregistrer le dépôt.", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => { setStep("select"); setPendingAmount(null); setProofMessage(""); };

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
              onClick={() => selectAmount(amount)}
              className={cn(
                "relative py-3 px-2 rounded-xl border text-sm font-bold transition-all duration-150 select-none flex flex-col items-center gap-1",
                pendingAmount === amount && step !== "select"
                  ? "bg-primary text-background border-primary shadow-md shadow-primary/30 scale-[1.03]"
                  : "bg-card border-border/60 text-foreground hover:border-primary/50 hover:text-primary"
              )}
            >
              <span>${amount.toLocaleString()}</span>
              <span className={cn(
                "text-[9px] font-medium",
                pendingAmount === amount && step !== "select" ? "text-background/80" : "text-green-400"
              )}>
                +{gains7d(amount)}/7j
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 mt-6">
        <div className="flex items-start gap-3 bg-card border border-primary/20 rounded-xl p-4">
          <PhoneCall className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p>Sélectionnez un montant, envoyez via Mobile Money, puis collez le message de confirmation reçu.</p>
            {momo.available && momo.fullNumber && (
              <p className="mt-1 text-primary font-medium">Numéro destinataire : {momo.fullNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Step 2 : SEND ── */}
      <AlertDialog open={step === "send"} onOpenChange={(o) => { if (!o) cancel(); }}>
        <AlertDialogContent className="bg-card border-border/60 max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-center">Envoyer l'argent</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2 text-center">
                <p className="text-3xl font-bold text-primary">${pendingAmount?.toLocaleString()}</p>
                {pendingAmount && (
                  <p className="text-xs text-green-400 font-medium">
                    Estimation gains : +{gains7d(pendingAmount)} en 7 jours (3%/j)
                  </p>
                )}

                {/* Phone number to copy */}
                {momo.fullNumber && (
                  <div className="flex items-center gap-2 bg-background/60 border border-border/50 rounded-xl px-4 py-3">
                    <span className="flex-1 font-mono text-sm text-foreground font-bold text-left">{momo.fullNumber}</span>
                    <button
                      onClick={copyNumber}
                      className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copié !" : "Copier"}
                    </button>
                  </div>
                )}

                {/* USSD */}
                {pendingAmount && (
                  <p className="font-mono text-xs bg-background/60 text-primary border border-primary/20 px-3 py-1.5 rounded-lg">
                    {buildUssd(momo.ussdTemplate, pendingAmount)}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Copiez le numéro, envoyez le montant via Mobile Money, puis revenez ici.
                </p>

                <Button
                  className="w-full bg-primary text-background hover:bg-primary/90 gap-2"
                  onClick={() => { openMobileMoney(); setStep("proof"); }}
                >
                  <PhoneCall className="w-4 h-4" /> Ouvrir Mobile Money
                </Button>
                <button
                  className="text-xs text-muted-foreground underline mt-1"
                  onClick={() => setStep("proof")}
                >
                  J'ai déjà envoyé l'argent →
                </button>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancel} className="text-xs">Annuler</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Step 3 : PROOF ── */}
      <AlertDialog open={step === "proof"} onOpenChange={(o) => { if (!o) cancel(); }}>
        <AlertDialogContent className="bg-card border-border/60 max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-center">Coller la preuve de paiement</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p className="text-center text-3xl font-bold text-primary">${pendingAmount?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground text-center">
                  Collez ci-dessous le message de confirmation reçu par SMS de votre opérateur Mobile Money.
                </p>
                <div className="relative">
                  <Textarea
                    value={proofMessage}
                    onChange={(e) => setProofMessage(e.target.value)}
                    placeholder="Ex: Vous avez envoyé 100$ à 0970549768. Ref: TXN123456..."
                    className="min-h-[100px] text-xs bg-background border-border/60 resize-none pr-10"
                    rows={4}
                  />
                  <button
                    className="absolute top-2 right-2 text-muted-foreground hover:text-primary transition-colors"
                    title="Coller depuis le presse-papier"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setProofMessage(text);
                      } catch {}
                    }}
                  >
                    <ClipboardPaste className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  L'administrateur vérifiera ce message avant de valider votre dépôt.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-primary text-background hover:bg-primary/90 gap-2"
              disabled={!proofMessage.trim() || submitting}
              onClick={handleSubmitProof}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer pour validation
            </Button>
            <button className="text-xs text-muted-foreground underline" onClick={() => setStep("send")}>
              ← Retour
            </button>
            <AlertDialogCancel onClick={cancel} className="text-xs">Annuler</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
