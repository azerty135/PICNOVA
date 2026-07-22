import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import {
  useGetAdminStats,
  useGetAdminWithdrawals,
  useGetAdminUsers,
  useGetAdminNotifications,
  useApproveWithdrawal,
  useRejectWithdrawal,
  useSendBroadcast,
  usePromoteUser,
  useDemoteUser,
  useBanUser,
  useUnbanUser,
  getGetAdminStatsQueryKey,
  getGetAdminWithdrawalsQueryKey,
  getGetAdminNotificationsQueryKey,
  getGetAdminUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Loader2, Users, Wallet, TrendingUp, ArrowUpRight, CheckCircle, XCircle,
  Send, Bell, BarChart3, ShieldAlert, ShieldCheck, Shield, Ban, UserCheck,
  LockOpen, Lock, Phone, Settings, MessageCircle, ArrowLeft, Eye, EyeOff,
  GitBranch, Key, Copy, Trash2, Check, Search, ClipboardPaste,
} from "lucide-react";
import { useLocation } from "wouter";

interface ConvoSummary { userId: number; phone: string; lastMessage: string; unreadCount: number; }
interface ChatMsg { id: number; content: string; fromAdmin: boolean; createdAt: string; }

function formatCurrency(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"stats" | "withdrawals" | "deposits" | "users" | "broadcast" | "settings" | "messages">("stats");
  const [gainResult, setGainResult] = useState<string | null>(null);
  const [gainsLoading, setGainsLoading] = useState(false);
  const [withdrawalsOpen, setWithdrawalsOpen] = useState<boolean | null>(null);
  const [withdrawalToggleLoading, setWithdrawalToggleLoading] = useState(false);
  const [momoNumber, setMomoNumber] = useState("");
  const [momoSaved, setMomoSaved] = useState("");
  const [momoLoading, setMomoLoading] = useState(false);
  // Messages state
  const [convos, setConvos] = useState<ConvoSummary[]>([]);
  const [convosLoading, setConvosLoading] = useState(false);
  const [selectedConvo, setSelectedConvo] = useState<ConvoSummary | null>(null);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [chatCopiedId, setChatCopiedId] = useState<number | null>(null);
  const [chatActionId, setChatActionId] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  // Users extra state
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [showPins, setShowPins] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  // Deposits state
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [depositActionId, setDepositActionId] = useState<number | null>(null);
  const [expandedProofId, setExpandedProofId] = useState<number | null>(null);

  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: withdrawals, isLoading: wLoading } = useGetAdminWithdrawals();
  const { data: users, isLoading: uLoading } = useGetAdminUsers();
  const { data: notifications } = useGetAdminNotifications();

  // Fetch withdrawal status on mount
  useEffect(() => {
    fetch("/api/admin/withdrawals/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setWithdrawalsOpen(d.open))
      .catch(() => setWithdrawalsOpen(false));
    fetch("/api/admin/settings/momo", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setMomoNumber(d.momoNumber ?? ""); setMomoSaved(d.momoNumber ?? ""); })
      .catch(() => {});
  }, []);

  // Load conversations when messages tab becomes active
  useEffect(() => {
    if (activeTab !== "messages") return;
    if (selectedConvo) return;
    loadConvos();
  }, [activeTab]);

  // Load deposits when deposits tab becomes active
  useEffect(() => {
    if (activeTab !== "deposits") return;
    loadDeposits();
  }, [activeTab]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  const loadConvos = async () => {
    setConvosLoading(true);
    try {
      const r = await fetch("/api/admin/messages", { credentials: "include" });
      if (r.ok) setConvos(await r.json());
    } finally { setConvosLoading(false); }
  };

  const openConvo = async (c: ConvoSummary) => {
    setSelectedConvo(c);
    setChatLoading(true);
    try {
      const r = await fetch(`/api/admin/messages/${c.userId}`, { credentials: "include" });
      if (r.ok) setChatMsgs(await r.json());
    } finally { setChatLoading(false); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || replySending || !selectedConvo) return;
    setReplySending(true);
    try {
      const r = await fetch(`/api/admin/messages/${selectedConvo.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: replyText.trim() }),
      });
      if (r.ok) {
        const msg = await r.json();
        setChatMsgs((prev) => [...prev, msg]);
        setReplyText("");
      }
    } finally { setReplySending(false); }
  };

  const copyChatMsg = async (m: ChatMsg) => {
    await navigator.clipboard.writeText(m.content);
    setChatCopiedId(m.id);
    setTimeout(() => setChatCopiedId(null), 1500);
    setChatActionId(null);
  };

  const deleteChatMsg = async (m: ChatMsg) => {
    const endpoint = m.fromAdmin
      ? `/api/admin/messages/msg/${m.id}`
      : `/api/messages/${m.id}`;
    const r = await fetch(endpoint, { method: "DELETE", credentials: "include" });
    if (r.ok) setChatMsgs((prev) => prev.filter((x) => x.id !== m.id));
    setChatActionId(null);
  };

  const handleSaveMomo = async () => {
    if (!momoNumber.trim() || momoNumber.trim().length < 6) {
      toast({ title: "Numéro invalide", description: "Minimum 6 chiffres.", variant: "destructive" });
      return;
    }
    setMomoLoading(true);
    try {
      const res = await fetch("/api/admin/settings/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ momoNumber: momoNumber.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setMomoSaved(momoNumber.trim());
      toast({ title: "Numéro enregistré ✅", description: data.message });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setMomoLoading(false);
    }
  };

  const approve = useApproveWithdrawal();
  const reject = useRejectWithdrawal();
  const broadcast = useSendBroadcast();
  const promote = usePromoteUser();
  const demote = useDemoteUser();
  const ban = useBanUser();
  const unban = useUnbanUser();

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

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
  const invalidateStats = () => queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });

  const handleApprove = (id: number) => {
    approve.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Retrait approuvé", description: "Le paiement a été validé." });
        queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey() });
        invalidateStats();
      },
      onError: () => toast({ title: "Erreur", variant: "destructive", description: "Impossible d'approuver." }),
    });
  };

  const handleReject = (id: number) => {
    reject.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Retrait rejeté", description: "Le montant a été remboursé." });
        queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey() });
        invalidateStats();
      },
      onError: () => toast({ title: "Erreur", variant: "destructive", description: "Impossible de rejeter." }),
    });
  };

  const handlePromote = (id: number) => {
    promote.mutate({ id }, {
      onSuccess: (data) => {
        toast({ title: "Promu !", description: data.message });
        invalidateUsers();
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  const handleDemote = (id: number) => {
    demote.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Droits retirés" });
        invalidateUsers();
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  const handleBan = (id: number) => {
    ban.mutate({ id }, {
      onSuccess: (data) => {
        toast({ title: "Compte suspendu", description: data.message });
        invalidateUsers();
        invalidateStats();
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  const handleUnban = (id: number) => {
    unban.mutate({ id }, {
      onSuccess: (data) => {
        toast({ title: "Compte réactivé", description: data.message });
        invalidateUsers();
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  const handleTriggerGains = async () => {
    setGainsLoading(true);
    setGainResult(null);
    try {
      const res = await fetch("/api/admin/trigger-gains", { method: "POST", credentials: "include" });
      const data = await res.json();
      setGainResult(data.message ?? data.error ?? "Terminé");
      if (res.ok) invalidateStats();
    } catch {
      setGainResult("Erreur réseau");
    } finally {
      setGainsLoading(false);
    }
  };

  const handleWithdrawalToggle = async (open: boolean) => {
    setWithdrawalToggleLoading(true);
    try {
      const action = open ? "open" : "close";
      const res = await fetch(`/api/admin/withdrawals/${action}`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setWithdrawalsOpen(open);
        toast({ title: open ? "Retraits ouverts ✅" : "Retraits fermés 🔒", description: data.message });
      } else {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setWithdrawalToggleLoading(false);
    }
  };

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    broadcast.mutate({ data: { message: broadcastMsg } }, {
      onSuccess: () => {
        toast({ title: "Message diffusé", description: "Tous les utilisateurs ont été notifiés." });
        setBroadcastMsg("");
        queryClient.invalidateQueries({ queryKey: getGetAdminNotificationsQueryKey() });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive", description: "Impossible d'envoyer." }),
    });
  };

  const tabs = [
    { key: "stats", label: "Stats", icon: BarChart3 },
    { key: "withdrawals", label: "Retraits", icon: ArrowUpRight },
    { key: "deposits", label: "Dépôts", icon: Wallet },
    { key: "users", label: "Comptes", icon: Users },
    { key: "messages", label: "Messages", icon: MessageCircle },
    { key: "broadcast", label: "Diffusion", icon: Send },
    { key: "settings", label: "Param.", icon: Settings },
  ] as const;

  const pendingCount = withdrawals?.filter((w) => w.status === "pending").length ?? 0;
  const pendingDepositsCount = deposits.filter((d) => d.status === "pending").length;

  const loadDeposits = async () => {
    setDepositsLoading(true);
    try {
      const r = await fetch("/api/admin/deposits", { credentials: "include" });
      if (r.ok) setDeposits(await r.json());
    } finally { setDepositsLoading(false); }
  };

  const approveDeposit = async (id: number) => {
    setDepositActionId(id);
    try {
      const r = await fetch(`/api/admin/deposits/${id}/approve`, { method: "POST", credentials: "include" });
      const data = await r.json();
      if (r.ok) {
        toast({ title: "Dépôt approuvé", description: "Le solde de l'utilisateur a été crédité." });
        setDeposits((prev) => prev.map((d) => d.id === id ? { ...d, status: "approved" } : d));
      } else {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } finally { setDepositActionId(null); }
  };

  const rejectDeposit = async (id: number) => {
    setDepositActionId(id);
    try {
      const r = await fetch(`/api/admin/deposits/${id}/reject`, { method: "POST", credentials: "include" });
      const data = await r.json();
      if (r.ok) {
        toast({ title: "Dépôt rejeté" });
        setDeposits((prev) => prev.map((d) => d.id === id ? { ...d, status: "rejected" } : d));
      } else {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } finally { setDepositActionId(null); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Admin header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-primary font-serif">PICNOVA — Admin</h1>
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
              {key === "deposits" && pendingDepositsCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {pendingDepositsCount}
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

              {/* Trigger gains */}
              <Card className="border-primary/20 bg-gradient-to-br from-card to-background">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground text-sm">Gains journaliers</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Distribue les gains du jour (3%/j) à tous les investisseurs actifs. S'exécute automatiquement à minuit.
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

              {/* Recent broadcasts */}
              {notifications && notifications.length > 0 && (
                <Card className="border-border/50">
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
          <div className="space-y-4">
            {/* Withdrawal toggle */}
            <Card className={`border-2 ${withdrawalsOpen ? "border-green-500/40" : "border-red-500/40"}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {withdrawalsOpen
                      ? <LockOpen className="w-5 h-5 text-green-400" />
                      : <Lock className="w-5 h-5 text-red-400" />
                    }
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        Retraits&nbsp;
                        <span className={withdrawalsOpen ? "text-green-400" : "text-red-400"}>
                          {withdrawalsOpen === null ? "..." : withdrawalsOpen ? "OUVERTS" : "FERMÉS"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {withdrawalsOpen
                          ? "Les utilisateurs peuvent demander un retrait."
                          : "Aucun utilisateur ne peut retirer pour l'instant."}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs gap-1"
                      onClick={() => handleWithdrawalToggle(true)}
                      disabled={withdrawalToggleLoading || withdrawalsOpen === true}
                    >
                      <LockOpen className="w-3.5 h-3.5" /> Ouvrir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-8 px-3 text-xs gap-1"
                      onClick={() => handleWithdrawalToggle(false)}
                      disabled={withdrawalToggleLoading || withdrawalsOpen === false}
                    >
                      <Lock className="w-3.5 h-3.5" /> Fermer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawal requests */}
            {wLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
            <div className="space-y-3">
              {(!withdrawals || withdrawals.length === 0) && (
                <div className="text-center py-12 text-muted-foreground text-sm">Aucune demande de retrait.</div>
              )}
              {withdrawals?.map((w) => (
                <Card key={w.id} className={`border-border/50 ${
                  w.status === "pending" ? "border-l-4 border-l-yellow-500" :
                  w.status === "approved" ? "border-l-4 border-l-green-500" :
                  "border-l-4 border-l-red-500"
                }`}>
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
            )}
          </div>
        )}

        {/* DEPOSITS TAB */}
        {activeTab === "deposits" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {deposits.length} demande{deposits.length !== 1 ? "s" : ""}
                {pendingDepositsCount > 0 && <span className="ml-2 text-orange-400 font-semibold">· {pendingDepositsCount} en attente</span>}
              </p>
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1 border-border/60" onClick={loadDeposits} disabled={depositsLoading}>
                {depositsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Actualiser"}
              </Button>
            </div>
            {depositsLoading && deposits.length === 0 ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : deposits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Aucune demande de dépôt.</div>
            ) : deposits.map((dep: any) => (
              <Card key={dep.id} className={`border-border/50 border-l-4 ${
                dep.status === "approved" ? "border-l-green-500" :
                dep.status === "rejected" ? "border-l-red-500" : "border-l-orange-400"
              }`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-primary text-base">{formatCurrency(dep.amount)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                          dep.status === "approved" ? "bg-green-500/10 text-green-400" :
                          dep.status === "rejected" ? "bg-red-500/10 text-red-400" :
                          "bg-orange-500/10 text-orange-400"
                        }`}>
                          {dep.status === "approved" ? "Approuvé" : dep.status === "rejected" ? "Rejeté" : "En attente"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{dep.userPhone} · {formatDate(dep.createdAt)}</p>
                    </div>
                    {dep.status === "pending" && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                          onClick={() => approveDeposit(dep.id)}
                          disabled={depositActionId === dep.id}
                        >
                          {depositActionId === dep.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1"
                          onClick={() => rejectDeposit(dep.id)}
                          disabled={depositActionId === dep.id}
                        >
                          <XCircle className="w-3 h-3" /> Rejeter
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Proof message */}
                  <div className="space-y-1">
                    <button
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setExpandedProofId(expandedProofId === dep.id ? null : dep.id)}
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      {expandedProofId === dep.id ? "Masquer" : "Voir"} le message de preuve
                    </button>
                    {expandedProofId === dep.id && (
                      <div className="bg-background/60 border border-border/40 rounded-lg p-3 text-xs text-foreground font-mono whitespace-pre-wrap break-all">
                        {dep.proofMessage || "—"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          uLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {/* Search + PIN toggle */}
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Rechercher par numéro…"
                    className="pl-8 h-8 text-xs bg-background border-border/60"
                  />
                </div>
                <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs gap-1 border-border/60 shrink-0" onClick={() => setShowPins((v) => !v)}>
                  {showPins ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPins ? "Masquer PINs" : "Voir PINs"}
                </Button>
              </div>
              {(() => {
                const filtered = (users ?? []).filter((u) =>
                  !userSearch.trim() || u.phone.includes(userSearch.trim())
                );
                return (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {filtered.length} utilisateur{filtered.length !== 1 ? "s" : ""}
                      {userSearch.trim() ? ` trouvé${filtered.length !== 1 ? "s" : ""}` : ""}
                    </p>
                    {filtered.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground text-sm">Aucun utilisateur trouvé.</div>
                    )}
                    {filtered.map((u) => {
                const expanded = expandedUserId === u.id;
                const uAny = u as any;
                return (
                  <Card key={u.id} className={`border-border/50 ${u.isBanned ? "opacity-60 border-l-4 border-l-red-500" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedUserId(expanded ? null : u.id)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p data-testid={`text-user-${u.id}`} className="font-medium text-sm text-foreground">
                              {u.name ?? u.phone}
                            </p>
                            {u.isAdmin && (
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex items-center gap-0.5">
                                <ShieldCheck className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                            {u.isBanned && (
                              <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                Suspendu
                              </span>
                            )}
                          </div>
                          {u.name && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                          <p className="text-xs text-muted-foreground">
                            Inscrit {formatDate(u.createdAt)} · {u.referralCount} filleul{u.referralCount !== 1 ? "s" : ""}
                          </p>
                          <div className="flex gap-3 mt-1 flex-wrap">
                            <span className="text-xs font-semibold text-primary">{formatCurrency(u.balance)}</span>
                            <span className="text-xs text-muted-foreground">Capital: {formatCurrency(uAny.depositedAmount ?? 0)}</span>
                            <span className="text-xs text-muted-foreground">Gains: {formatCurrency(u.totalGains)}</span>
                            <span className="text-xs text-orange-400">Retiré: {formatCurrency(uAny.totalWithdrawn ?? 0)}</span>
                          </div>
                          {expanded && (
                            <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                              {showPins && (
                                <div className="flex items-center gap-2">
                                  <Key className="w-3 h-3 text-primary shrink-0" />
                                  <span className="text-xs text-muted-foreground">PIN :</span>
                                  <span className="text-xs font-mono font-bold text-yellow-400">{uAny.pin ?? "—"}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <GitBranch className="w-3 h-3 text-primary shrink-0" />
                                <span className="text-xs text-muted-foreground">Parrainé par :</span>
                                <span className="text-xs font-mono text-foreground">{uAny.referredByPhone ?? "—"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">Code parrain :</span>
                                <span className="text-xs font-mono text-primary">{uAny.referralCode}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1">
                                <span className="text-muted-foreground">Total investi :</span>
                                <span className="font-mono">{formatCurrency(u.totalInvested)}</span>
                                <span className="text-muted-foreground">Bonus parrain :</span>
                                <span className="font-mono text-green-400">{formatCurrency(uAny.referralBonus ?? 0)}</span>
                              </div>
                              <Button
                                size="sm" variant="ghost"
                                className="h-6 px-2 text-xs text-cyan-400 gap-1 mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConvo({ userId: u.id, phone: u.phone, lastMessage: "", unreadCount: 0 });
                                  setActiveTab("messages");
                                }}
                              >
                                <MessageCircle className="w-3 h-3" /> Voir messagerie
                              </Button>
                            </div>
                          )}
                        </div>

                        {u.id !== user.id && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            {u.isBanned ? (
                              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10 gap-1" onClick={() => handleUnban(u.id)} disabled={unban.isPending}>
                                <UserCheck className="w-3 h-3" /> Réactiver
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1" onClick={() => handleBan(u.id)} disabled={ban.isPending}>
                                <Ban className="w-3 h-3" /> Suspendre
                              </Button>
                            )}
                            {u.isAdmin ? (
                              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-muted text-muted-foreground hover:bg-muted/20 gap-1" onClick={() => handleDemote(u.id)} disabled={demote.isPending}>
                                <Shield className="w-3 h-3" /> Retirer admin
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1" onClick={() => handlePromote(u.id)} disabled={promote.isPending}>
                                <ShieldCheck className="w-3 h-3" /> Promouvoir
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
                  </>
                );
              })()}
            </div>
          )
        )}

        {/* MESSAGES TAB */}
        {activeTab === "messages" && (
          selectedConvo ? (
            <div className="flex flex-col h-[calc(100dvh-130px)]">
              {/* Chat header */}
              <div className="flex items-center gap-3 pb-3 border-b border-border/50 mb-3 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setSelectedConvo(null); loadConvos(); }}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <p className="font-semibold text-sm text-foreground">{selectedConvo.phone}</p>
                  <p className="text-xs text-muted-foreground">Conversation support</p>
                </div>
              </div>
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pb-3">
                {chatLoading ? (
                  <div className="flex justify-center pt-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : chatMsgs.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Aucun message.</p>
                ) : chatMsgs.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.fromAdmin ? "items-end" : "items-start"} gap-0.5`}>
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-4 py-2.5 text-sm cursor-pointer ${
                        m.fromAdmin
                          ? "bg-primary text-background rounded-tr-sm"
                          : "bg-card border border-border/50 text-foreground rounded-tl-sm"
                      } ${chatActionId === m.id ? "opacity-80" : ""} transition-opacity`}
                      onClick={() => setChatActionId(chatActionId === m.id ? null : m.id)}
                    >
                      {!m.fromAdmin && <p className="text-[10px] font-bold text-primary mb-1 uppercase">User</p>}
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${m.fromAdmin ? "text-background/60" : "text-muted-foreground"}`}>
                        {new Date(m.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {chatActionId === m.id && (
                        <div className={`absolute z-50 flex gap-1 p-1.5 bg-background border border-border rounded-xl shadow-xl ${m.fromAdmin ? "right-0 -bottom-12" : "left-0 -bottom-12"}`}
                          onClick={(e) => e.stopPropagation()}>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-card text-foreground transition-colors" onClick={() => copyChatMsg(m)}>
                            {chatCopiedId === m.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            Copier
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-destructive/10 text-destructive transition-colors" onClick={() => deleteChatMsg(m)}>
                            <Trash2 className="w-3.5 h-3.5" /> Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>
              {/* Reply input */}
              <div className="shrink-0 flex gap-2 items-end pt-3 border-t border-border/50">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Répondre à l'utilisateur…"
                  className="flex-1 min-h-[44px] max-h-[100px] resize-none bg-background border-border/60 text-sm"
                  rows={1}
                />
                <Button onClick={sendReply} disabled={!replyText.trim() || replySending} size="icon" className="h-11 w-11 bg-primary text-background hover:bg-primary/90 shrink-0">
                  {replySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{convos.length} conversation{convos.length !== 1 ? "s" : ""}</p>
              {convosLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : convos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Aucun message reçu.</p>
                </div>
              ) : convos.map((c) => (
                <Card key={c.userId} className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openConvo(c)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <MessageCircle className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{c.phone}</p>
                          <p className="text-xs text-muted-foreground">{new Date(c.lastMessage).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-primary text-background text-[10px] rounded-full flex items-center justify-center font-bold shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" /> Numéro Mobile Money (destinataire des dépôts)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Ce numéro recevra les paiements Mobile Money des utilisateurs. Il sera masqué dans l'app (seuls les 2 premiers et 2 derniers chiffres apparaissent).
                </p>
                {momoSaved && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2 text-sm">
                    <span className="text-muted-foreground">Numéro actuel : </span>
                    <span className="font-mono font-bold text-green-400">{momoSaved}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: 0838345527"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    maxLength={15}
                    className="bg-background border-border/60 font-mono"
                  />
                  <Button
                    onClick={handleSaveMomo}
                    disabled={momoLoading || !momoNumber.trim()}
                    className="bg-primary text-background hover:bg-primary/90 font-bold shrink-0"
                  >
                    {momoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Code USSD généré : <span className="font-mono text-primary">*144*2*{momoNumber || "VOTRE_NUMERO"}*&#123;montant&#125;#</span>
                </p>
              </CardContent>
            </Card>
          </div>
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
