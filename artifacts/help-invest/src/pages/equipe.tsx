import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Copy, Gift, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Equipe() {
  const { user } = useAuth();
  const { toast } = useToast();

  const referralLink = user
    ? `${window.location.origin}/register?ref=${user.referralCode}`
    : "";

  const copyCode = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.referralCode).then(() => {
      toast({ title: "Code copié !", description: "Votre code de parrainage a été copié." });
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      toast({ title: "Lien copié !", description: "Votre lien de parrainage a été copié." });
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-foreground">Mon Équipe</h1>
        <p className="text-muted-foreground text-sm">Parrainez vos proches et gagnez des récompenses.</p>
      </header>

      {/* Referral Code Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-background shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Gift className="w-28 h-28" />
        </div>
        <CardContent className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium">
            Votre code de parrainage
          </p>
          <div className="flex items-center gap-3">
            <span
              data-testid="text-referral-code"
              className="text-3xl font-bold text-primary tracking-[0.3em] font-mono"
            >
              {user?.referralCode ?? "——"}
            </span>
            <button
              data-testid="button-copy-code"
              onClick={copyCode}
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <Button
            data-testid="button-copy-link"
            variant="outline"
            size="sm"
            className="mt-4 border-primary/30 text-primary hover:bg-primary/10 w-full"
            onClick={copyLink}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier le lien de parrainage
          </Button>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Comment ça marche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { step: "1", title: "Partagez votre code", desc: "Envoyez votre code ou lien à vos proches." },
            { step: "2", title: "Ils s'inscrivent", desc: "Ils créent un compte avec votre code de parrainage." },
            { step: "3", title: "Gagnez des bonus", desc: "Recevez une commission sur leurs investissements." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">{step}</span>
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Team stats placeholder */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Statistiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-xs text-muted-foreground mt-1">Membres parrainés</p>
            </div>
            <div className="bg-background/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">$0.00</p>
              <p className="text-xs text-muted-foreground mt-1">Gains de parrainage</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
