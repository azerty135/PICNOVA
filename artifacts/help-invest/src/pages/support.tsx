import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { formatDateOnly } from "@/lib/format";

interface Msg {
  id: number;
  content: string;
  fromAdmin: boolean;
  createdAt: string;
}

export default function Support() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const r = await fetch("/api/messages", { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setMessages(data.sort((a: Msg, b: Msg) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text.trim() }),
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages((prev) => [...prev, msg]);
        setText("");
      }
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] bg-background">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border/50 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Support HELP</p>
          <p className="text-xs text-muted-foreground">Envoyez un message à l'administrateur</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center pt-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <MessageCircle className="w-12 h-12 opacity-20" />
            <p className="text-sm text-center">Aucun message.<br />Écrivez à l'administrateur ci-dessous.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.fromAdmin ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.fromAdmin
                  ? "bg-card border border-border/50 text-foreground rounded-tl-sm"
                  : "bg-primary text-background rounded-tr-sm"
              }`}>
                {msg.fromAdmin && (
                  <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wide">Admin</p>
                )}
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.fromAdmin ? "text-muted-foreground" : "text-background/60"}`}>
                  {formatDateOnly(msg.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/50 bg-card shrink-0 flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Écrivez votre message…"
          className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-background border-border/60 text-sm"
          rows={1}
        />
        <Button
          onClick={send}
          disabled={!text.trim() || sending}
          size="icon"
          className="h-11 w-11 bg-primary text-background hover:bg-primary/90 shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
