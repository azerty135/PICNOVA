import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { LogOut, User as UserIcon, Shield, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        refreshUser(); // Will redirect to /
      },
      onError: () => {
        toast({
          title: "Erreur",
          description: "Impossible de se déconnecter.",
          variant: "destructive",
        });
      }
    });
  };

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="mb-6 text-center mt-4">
        <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
          <UserIcon className="w-10 h-10" />
        </div>
        <h1 className="text-xl font-bold text-foreground">{user.phone}</h1>
        <p className="text-muted-foreground text-sm mt-1">Membre depuis le {formatDate(user.createdAt)}</p>
      </header>

      <div className="space-y-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm font-medium">Code PIN</span>
              <span className="text-sm text-muted-foreground">****</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Authentification à deux facteurs</span>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Désactivé</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Informations Bancaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Vos méthodes de retrait sont sauvegardées lors de votre première transaction.</p>
            <Button variant="outline" className="w-full text-sm">Gérer les méthodes de paiement</Button>
          </CardContent>
        </Card>

        <Button 
          variant="destructive" 
          className="w-full mt-8 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 h-12"
          onClick={handleLogout}
          disabled={logout.isPending}
        >
          <LogOut className="w-4 h-4 mr-2" /> Se déconnecter
        </Button>
      </div>
    </div>
  );
}
