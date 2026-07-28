import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Download, ArrowDownLeft, ArrowUpRight, TrendingUp, Gift, Loader2, RefreshCw, Share2 } from "lucide-react";
import html2canvas from "html2canvas";

interface StatementData {
  generatedAt: string;
  user: { phone: string; name: string | null; createdAt: string };
  summary: {
    balance: number;
    depositedAmount: number;
    totalInvested: number;
    totalGains: number;
    referralBonus: number;
    totalDeposited: number;
    totalWithdrawn: number;
    totalGainsFromTx: number;
  };
  transactions: { id: number; type: string; amount: number; description: string; status: string; createdAt: string }[];
  investments: { id: number; amount: number; dailyReturnRate: number; totalReturn: number; durationDays: number; status: string; startDate: string | null; endDate: string | null }[];
  withdrawals: { id: number; amount: number; method: string; accountDetails: string; status: string; createdAt: string; processedAt: string | null }[];
}

function fmt(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const TX_LABELS: Record<string, { label: string; color: string; sign: string }> = {
  deposit:    { label: "Dépôt",        color: "text-green-400",  sign: "+" },
  withdrawal: { label: "Retrait",      color: "text-orange-400", sign: "-" },
  gain:       { label: "Gain",         color: "text-yellow-400", sign: "+" },
  investment: { label: "Investissement", color: "text-blue-400", sign: "-" },
  referral:   { label: "Parrainage",   color: "text-purple-400", sign: "+" },
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Complété",
  pending:   "En attente",
  approved:  "Approuvé",
  rejected:  "Rejeté",
  active:    "Actif",
};

export default function Statement() {
  const { user } = useAuth();
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/statement", { credentials: "include" });
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filename = `PICNOVA-releve-${new Date().toISOString().slice(0, 10)}.png`;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0f1e",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      // Blob URL — plus fiable qu'un data URL sur Android
      canvas.toBlob((blob) => {
        if (!blob) { alert("Erreur génération image."); return; }
        const url = URL.createObjectURL(blob);
        setPreviewBlob(blob);
        setPreviewUrl(url);
      }, "image/png");
    } catch {
      alert("Erreur lors de la génération de l'image. Réessayez.");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!previewBlob) return;
    const file = new File([previewBlob], filename, { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Relevé PICNOVA" });
      } else {
        handleSaveFile();
      }
    } catch {
      handleSaveFile();
    }
  };

  const handleSaveFile = () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
  };

  if (!user) return null;

  /* ── Modale prévisualisation image ── */
  if (previewUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Barre du haut */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0a0f1e] border-b border-border/40 shrink-0">
          <span className="text-sm font-semibold text-foreground">Votre relevé</span>
          <button onClick={closePreview} className="px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground text-xs">
            ✕ Fermer
          </button>
        </div>

        {/* Image scrollable */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-3 bg-black">
          <img
            src={previewUrl}
            alt="Relevé PICNOVA"
            className="max-w-full rounded-xl shadow-2xl"
            style={{ touchAction: "pinch-zoom", WebkitTouchCallout: "default" } as React.CSSProperties}
          />
        </div>

        {/* Boutons d'action */}
        <div className="shrink-0 px-4 pb-8 pt-3 bg-[#0a0f1e] border-t border-border/40 space-y-2">
          {/* Bouton principal : Partager (ouvre menu natif Android) */}
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-background font-bold text-base"
          >
            <Share2 className="w-5 h-5" /> Partager / Enregistrer
          </button>
          {/* Bouton secondaire : téléchargement direct */}
          <button
            onClick={handleSaveFile}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border/50 text-muted-foreground text-sm"
          >
            <Download className="w-4 h-4" /> Télécharger le fichier
          </button>
          <p className="text-center text-xs text-muted-foreground pt-1">
            Appuyez sur <strong className="text-foreground">Partager</strong> → choisissez <strong className="text-foreground">Enregistrer dans Photos</strong>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Impossible de charger le relevé.
      </div>
    );
  }

  const { summary, transactions, investments, withdrawals } = data;

  return (
    <div className="p-4 md:p-8 space-y-4 pb-8">
      {/* Actions */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-serif font-bold text-foreground">Relevé de compte</h1>
          <p className="text-xs text-muted-foreground">Généré le {fmtDate(data.generatedAt)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-border/50 bg-card text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background font-semibold text-sm hover:bg-primary/90"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Télécharger
          </button>
        </div>
      </div>

      {/* Printable card */}
      <div ref={cardRef} className="bg-[#0a0f1e] rounded-2xl border border-border/40 overflow-hidden">

        {/* Header */}
        <div className="bg-primary/10 border-b border-primary/20 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-primary font-serif font-bold text-lg tracking-widest uppercase">PICNOVA</h2>
              <p className="text-xs text-muted-foreground">Plateforme d'investissement</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{data.user.name ?? data.user.phone}</p>
              {data.user.name && <p className="text-xs text-muted-foreground">{data.user.phone}</p>}
              <p className="text-xs text-muted-foreground">Membre depuis {fmtDate(data.user.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Summary grid */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Résumé financier</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Solde retirable",     value: summary.balance,         color: "text-green-400",  bg: "bg-green-500/10"  },
              { label: "Capital déposé",       value: summary.depositedAmount, color: "text-blue-400",   bg: "bg-blue-500/10"   },
              { label: "Total déposé",         value: summary.totalDeposited,  color: "text-cyan-400",   bg: "bg-cyan-500/10"   },
              { label: "Total retiré",         value: summary.totalWithdrawn,  color: "text-orange-400", bg: "bg-orange-500/10" },
              { label: "Actuellement investi", value: summary.totalInvested,   color: "text-purple-400", bg: "bg-purple-500/10" },
              { label: "Gains totaux",         value: summary.totalGains,      color: "text-yellow-400", bg: "bg-yellow-500/10" },
              { label: "Bonus parrainage",     value: summary.referralBonus,   color: "text-pink-400",   bg: "bg-pink-500/10"   },
              { label: "Gains générés",        value: summary.totalGainsFromTx, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl ${bg} border border-white/5 px-3 py-2`}>
                <p className={`text-base font-bold ${color}`}>{fmt(value)}</p>
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Investments section */}
        {investments.length > 0 && (
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Investissements ({investments.length})</p>
            <div className="space-y-2">
              {investments.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Plan 30j — {fmt(inv.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.startDate ? fmtDate(inv.startDate) : "—"}
                        {inv.endDate ? ` → ${fmtDate(inv.endDate)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-yellow-400">+{fmt(inv.totalReturn)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${inv.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdrawals section */}
        {withdrawals.length > 0 && (
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Retraits ({withdrawals.length})</p>
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{w.method} — {w.accountDetails}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(w.createdAt)}</p>
                      {w.processedAt && <p className="text-xs text-muted-foreground">Traité : {fmtDate(w.processedAt)}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-orange-400">-{fmt(w.amount)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      w.status === "approved" ? "bg-green-500/20 text-green-400" :
                      w.status === "rejected" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {STATUS_LABELS[w.status] ?? w.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All transactions */}
        <div className="px-5 pt-4 pb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Toutes les transactions ({transactions.length})</p>
          {transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune transaction</p>
          ) : (
            <div className="space-y-0">
              {transactions.map((t) => {
                const meta = TX_LABELS[t.type] ?? { label: t.type, color: "text-foreground", sign: "" };
                return (
                  <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-border/15 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        t.type === "deposit" ? "bg-green-500/15" :
                        t.type === "withdrawal" ? "bg-orange-500/15" :
                        t.type === "gain" ? "bg-yellow-500/15" :
                        t.type === "investment" ? "bg-blue-500/15" : "bg-purple-500/15"
                      }`}>
                        {t.type === "deposit" && <ArrowDownLeft className="w-3 h-3 text-green-400" />}
                        {t.type === "withdrawal" && <ArrowUpRight className="w-3 h-3 text-orange-400" />}
                        {t.type === "gain" && <TrendingUp className="w-3 h-3 text-yellow-400" />}
                        {t.type === "investment" && <TrendingUp className="w-3 h-3 text-blue-400" />}
                        {t.type === "referral" && <Gift className="w-3 h-3 text-purple-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(t.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-xs font-bold ${meta.color}`}>{meta.sign}{fmt(t.amount)}</p>
                      <p className="text-xs text-muted-foreground">{STATUS_LABELS[t.status] ?? t.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/20 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">picnova-4exj.onrender.com</p>
          <p className="text-xs text-muted-foreground">{fmtDate(data.generatedAt)}</p>
        </div>
      </div>
    </div>
  );
}
