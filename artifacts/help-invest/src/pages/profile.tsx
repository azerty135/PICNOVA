import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLogout, useUpdateProfile, useGetUserNotifications } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatCurrency } from "@/lib/format";
import {
  LogOut, User as UserIcon, Shield, Settings, Bell, Edit2, Check, X, Loader2,
  TrendingUp, DollarSign, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const logout = useLogout();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications } = useGetUserNotifications();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name ?? "");

  const [editingPin, setEditingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => refreshUser(),
      onError: () => toast({ title: "Erreur", description: "Impossible de se déconnecter.", variant: "destructive" }),
    });
  };

  const saveName = () => {
    updateProfile.mutate({ name: nameValue.trim() || undefined }, {
      onSuccess: () => {
        toast({ title: "Nom mis à jour !" });
        setEditingName(false);
        refreshUser();
        queryClient.invalidateQueries();
      },
      onError: (e: any) => toast({ title: "Erreur", description: e?.message ?? "Impossible de mettre à jour", variant: "destructive" }),
    });
  };

  const savePin = () => {
    if (newPin !== confirmPin) {
      toast({ title: "Erreur", description: "Les deux nouveaux PINs ne correspondent pas", variant: "destructive" });
      return;
    }
    if (!/^\d{4}$/.test(newPin) && !/^\d{8}$/.test(newPin)) {
      toast({ title: "Erreur", description: "Le PIN doit être composé de 4 ou 8 chiffres", variant: "destructive" });
      return;
    }
    updateProfile.mutate({ currentPin, newPin }, {
      onSuccess: () => {
        toast({ title: "PIN modifié avec succès !" });
        setEditingPin(false);
        setCurrentPin(""); setNewPin(""); setConfirmPin("");
      },
      onError: (e: any) => toast({ title: "Erreur", description: e?.message ?? "PIN actuel incorrect", variant: "destructive" }),
    });
  };

  if (!user) return null;

  const unreadCount = notifications?.length ?? 0;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-8">
      {/* Avatar + name */}
      <header className="text-center mt-4">
        <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
          <UserIcon className="w-10 h-10" />
        </div>
        {editingName ? (
          <div className="flex items-center justify-center gap-2 mt-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder="Votre nom"
              className="max-w-[180px] h-8 text-sm text-center bg-card border-primary/30"
              maxLength={50}
              autoFocus
            />
            <button onClick={saveName} disabled={updateProfile.isPending} className="text-primary hover:text-primary/80">
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={() => { setEditingName(false); setNameValue(user.name ?? ""); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{user.name ?? user.phone}</h1>
            <button onClick={() => { setEditingName(true); setNameValue(user.name ?? ""); }} className="text-muted-foreground hover:text-primary transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {user.name && <p className="text-muted-foreground text-sm">{user.phone}</p>}
        <p className="text-muted-foreground text-xs mt-1">Membre depuis le {formatDate(user.createdAt)}</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: DollarSign, label: "Solde", value: formatCurrency(user.balance) },
          { icon: TrendingUp, label: "Investis", value: formatCurrency(user.totalInvested) },
          { icon: Users, label: "Gains", value: formatCurrency(user.totalGains) },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border/30">
            <span className="text-sm font-medium">Code PIN</span>
            <button
              onClick={() => setEditingPin(!editingPin)}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Modifier
            </button>
          </div>
          {editingPin && (
            <div className="space-y-3 pt-1">
              <div>
                <Label className="text-xs text-muted-foreground">PIN actuel</Label>
                <Input
                  type="password"
                  maxLength={8}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••••"
                  className="mt-1 bg-background border-border/50 text-center tracking-widest"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nouveau PIN (4 ou 8 chiffres)</Label>
                <Input
                  type="password"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••••"
                  className="mt-1 bg-background border-border/50 text-center tracking-widest"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Confirmer nouveau PIN</Label>
                <Input
                  type="password"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••••"
                  className="mt-1 bg-background border-border/50 text-center tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-primary text-background hover:bg-primary/90" onClick={savePin} disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingPin(false); setCurrentPin(""); setNewPin(""); setConfirmPin(""); }}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      {notifications && notifications.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notifications
              {unreadCount > 0 && (
                <span className="ml-auto text-xs bg-primary text-background rounded-full px-2 py-0.5">{unreadCount}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="text-sm py-2 border-b border-border/20 last:border-0">
                <p className="text-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(n.createdAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Admin panel link */}
      {user.isAdmin && (
        <Link href="/admin">
          <Button
            data-testid="button-admin-panel"
            variant="outline"
            className="w-full border-primary/30 text-primary hover:bg-primary/10 h-12"
          >
            <Settings className="w-4 h-4 mr-2" /> Panneau d'administration
          </Button>
        </Link>
      )}

      <Button
        variant="destructive"
        className="w-full mt-2 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 h-12"
        onClick={handleLogout}
        disabled={logout.isPending}
      >
        <LogOut className="w-4 h-4 mr-2" /> Se déconnecter
      </Button>
    </div>
  );
}
