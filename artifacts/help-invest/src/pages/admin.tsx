import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useGetAdminStats,
  useGetAdminWithdrawals,
  useGetAdminUsers,
  useGetNotifications,
  useApproveWithdrawal,
  useRejectWithdrawal,
  useSendBroadcast,
  getGetAdminStatsQueryKey,
  getGetAdminWithdrawalsQueryKey,
  getGetNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Wallet, TrendingUp, ArrowUpRight, CheckCircle, XCircle, Send, Bell, BarChart3, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";

function formatCurrency(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"stats" | "withdrawals" | "users" | "broadcast">("stats");

  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: withdrawals, isLoading: wLoading } = useGetAdminWithdrawals();
  const { data: users, isLoading: uLoading } = useGetAdminUsers();
  const { data: notifications } = useGetNotifications();

  const approve = useApproveWithdrawal();
  const reject = useRejectWithdrawal();
  const broadcast = useSendBroadcast();
  const [gainResult, setGainResult] = useState<string | null>(null);
  const [gainsLoading, setGainsLoading] = useState(false);

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Accès refusé</h2>
        <p className="text-muted-foreground text-sm text-center">Vous n'avez pas les droits administrateur.</p>
        <Button variant="outline" onClick={() => setLocation("/dashboard")}>Retour</Button>
      </div>
    );
  }

  const handleApprove = (id: number) => {
    approve.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Retrait approuvé", description: "Le paiement a été validé." });
        queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive", description: "Impossible d'approuver." }),
    });
  };

  const handleReject = (id: number) => {
    reject.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Retrait rejeté", description: "Le montant a été remboursé à l'utilisateur." });
        queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive", description: "Impossible de rejeter." }),
    });
  };

  const handleTriggerGains = async () => {
    setGainsLoading(true);
    setGainResult(null);
    try {
      const res = await fetch("/api/admin/trigger-gains", { method: "POST", credentials: "include" });
      const data = await res.json();
      setGainResult(data.message ?? data.error ?? "Terminé");
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    } catch {
      setGainResult("Erreur réseau");
    } finally {
      setGainsLoading(false);
    }
  };

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    broadcast.mutate({ data: { message: broadcastMsg } }, {
      onSuccess: () => {
        toast({ title: "Message diffusé", description: "Tous les utilisateurs ont été notifiés." });
        setBroadcastMsg("");
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive", description: "Impossible d'envoyer." }),
    });
  };

  const tabs = [
    { key: "stats", label: "Statistiques", icon: BarChart3 },
    { key: "withdrawals", label: "Retraits", icon: ArrowUpRight },
    { key: "users", label: "Utilisateurs", icon: Users },
    { key: "broadcast", label: "Diffusion", icon: Send },
  ] as const;

  const pendingCount = withdrawals?.filter((w) => w.status === "pending").length ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Admin header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-primary font-serif">HELP — Admin</h1>
            <p className="text-xs text-muted-foreground">{user.phone}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setLocation("/dashboard")} className="text-xs text-muted-foreground">
            Quitter
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border/50 bg-card sticky top-[57px] z-30">
        <div className="flex max-w-4xl mx-auto px-2 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              data-testid={`admin-tab-${key}`}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors relative ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === "withdrawals" && pendingCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-destructive text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-4">

        {/* STATS TAB */}
        {activeTab === "stats" && (
          statsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: "Utilisateurs", value: stats.totalUsers.toString(), icon: Users, color: "text-blue-400" },
                  { label: "Total déposé", value: formatCurrency(stats.totalDeposited), icon: Wallet, color: "text-green-400" },
                  { label: "Total retiré", value: formatCurrency(stats.totalWithdrawn), icon: ArrowUpRight, color: "text-orange-400" },
                  { label: "Total investi", value: formatCurrency(stats.totalInvested), icon: TrendingUp, color: "text-primary" },
                  { label: "Retraits en attente", value: stats.pendingWithdrawals.toString(), icon: ArrowUpRight, color: "text-yellow-400" },
                  { label: "Investissements actifs", value: stats.activeInvestments.toString(), icon: BarChart3, color: "text-purple-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label} className="border-border/50">
                    <CardContent className="p-4">
                      <div className={`flex items-center gap-2 mb-2 ${color}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Trigger gains card */}
              <Card className="border-primary/20 bg-gradient-to-br from-card to-background">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground text-sm">Gains journaliers</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Distribue les gains du jour à tous les investisseurs actifs. S'exécute automatiquement à minuit.
                      </p>
                      {gainResult && (
                        <p className="text-xs mt-2 text-primary font-medium border border-primary/20 bg-primary/5 px-3 py-1.5 rounded-lg">
                          {gainResult}
                        </p>
                      )}
                    </div>
                    <Button
                      data-testid="button-trigger-gains"
                      size="sm"
                      className="shrink-0 bg-primary text-background hover:bg-primary/90 font-bold"
                      onClick={handleTriggerGains}
                      disabled={gainsLoading}
                    >
                      {gainsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                      <span className="ml-1.5">Lancer</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent notifications */}
              {notifications && notifications.length > 0 && (
                <Card className="border-border/50 mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" /> Derniers messages diffusés
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {notifications.slice(0, 3).map((n) => (
                      <div key={n.id} className="border-l-2 border-primary/40 pl-3">
                        <p className="text-sm text-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(n.sentAt)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : null
        )}

        {/* WITHDRAWALS TAB */}
        {activeTab === "withdrawals" && (
          wLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {(!withdrawals || withdrawals.length === 0) && (
                <div className="text-center py-12 text-muted-foreground text-sm">Aucune demande de retrait.</div>
              )}
              {withdrawals?.map((w) => (
                <Card key={w.id} className={`border-border/50 ${w.status === "pending" ? "border-l-4 border-l-yellow-500" : w.status === "approved" ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-sm font-bold text-primary">{formatCurrency(w.amount)}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                            w.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                            w.status === "approved" ? "bg-green-500/10 text-green-400" :
                            "bg-red-500/10 text-red-400"
                          }`}>{w.status}</span>
                        </div>
                        <p data-testid={`text-user-phone-${w.id}`} className="text-xs text-muted-foreground mt-1">{w.userPhone}</p>
                        <p className="text-xs text-muted-foreground">{w.method} — {w.accountDetails}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatDate(w.createdAt)}</p>
                      </div>
                      {w.status === "pending" && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            data-testid={`button-approve-${w.id}`}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs gap-1"
                            onClick={() => handleApprove(w.id)}
                            disabled={approve.isPending || reject.isPending}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Valider
                          </Button>
                          <Button
                            data-testid={`button-reject-${w.id}`}
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 px-3 text-xs gap-1"
                            onClick={() => handleReject(w.id)}
                            disabled={approve.isPending || reject.isPending}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Rejeter
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          uLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {(!users || users.length === 0) && (
                <div className="text-center py-12 text-muted-foreground text-sm">Aucun utilisateur.</div>
              )}
              {users?.map((u) => (
                <Card key={u.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p data-testid={`text-user-${u.id}`} className="font-medium text-sm text-foreground">{u.phone}</p>
                          {u.isAdmin && (
                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Admin</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Inscrit le {formatDate(u.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{formatCurrency(u.balance)}</p>
                        <p className="text-[10px] text-muted-foreground">Investi: {formatCurrency(u.totalInvested)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* BROADCAST TAB */}
        {activeTab === "broadcast" && (
          <div className="space-y-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" /> Diffusion globale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  data-testid="input-broadcast-message"
                  placeholder="Écrire le message pour tous les utilisateurs..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  className="min-h-[120px] bg-background border-border/60 text-foreground resize-none"
                />
                <Button
                  data-testid="button-send-broadcast"
                  className="w-full bg-primary text-background hover:bg-primary/90 font-bold"
                  onClick={handleBroadcast}
                  disabled={broadcast.isPending || !broadcastMsg.trim()}
                >
                  {broadcast.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Send className="mr-2 w-4 h-4" />}
                  Envoyer à tous
                </Button>
              </CardContent>
            </Card>

            {/* Message history */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" /> Historique des messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!notifications || notifications.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun message envoyé.</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((n) => (
                      <div key={n.id} className="border-l-2 border-primary/40 pl-3">
                        <p className="text-sm text-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(n.sentAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
