import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateWithdrawal, useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";

const withdrawSchema = z.object({
  amount: z.coerce.number().min(20, "Le montant minimum de retrait est de 20$"),
  method: z.string().min(1, "Veuillez sélectionner une méthode"),
  accountDetails: z.string().min(5, "Détails du compte requis"),
});

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

export default function Withdraw() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createWithdrawal = useCreateWithdrawal();
  const { data: user } = useGetMe();
  const [withdrawalsOpen, setWithdrawalsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/withdrawals/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setWithdrawalsOpen(d.open))
      .catch(() => setWithdrawalsOpen(false));
  }, []);

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      amount: 50,
      method: "usdt_trc20",
      accountDetails: "",
    },
  });

  const onSubmit = (data: WithdrawFormValues) => {
    if (user && data.amount > user.balance) {
      form.setError("amount", { message: "Solde insuffisant" });
      return;
    }

    createWithdrawal.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Demande de retrait enregistrée",
          description: "Votre demande sera traitée dans les plus brefs délais.",
        });
        setLocation("/transactions");
      },
      onError: (err) => {
        toast({
          title: "Erreur",
          description: (err as any).error || "Erreur lors de la demande de retrait.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Retrait</h1>
          <p className="text-muted-foreground text-sm">Récupérez vos gains.</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Gains disponibles</p>
          <p className="font-semibold text-primary">{user ? formatCurrency(user.balance) : "..."}</p>
        </div>
      </header>

      {/* Withdrawals closed banner */}
      {withdrawalsOpen === false && (
        <Card className="border-2 border-red-500/40 bg-red-500/5">
          <CardContent className="p-5 flex items-center gap-4">
            <Lock className="w-8 h-8 text-red-400 shrink-0" />
            <div>
              <p className="font-semibold text-red-400 text-sm">Retraits temporairement fermés</p>
              <p className="text-xs text-muted-foreground mt-1">
                Les retraits sont actuellement désactivés par l'administrateur. Revenez plus tard.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={`border-border/50 ${withdrawalsOpen === false ? "opacity-50 pointer-events-none select-none" : ""}`}>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant à retirer (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" min="20" step="1" {...field} className="text-lg font-medium" disabled={!withdrawalsOpen} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Méthode de réception</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!withdrawalsOpen}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une méthode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="usdt_trc20">USDT (TRC20)</SelectItem>
                        <SelectItem value="btc">Bitcoin (BTC)</SelectItem>
                        <SelectItem value="bank_transfer">Virement Bancaire</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Détails du compte (Adresse crypto, IBAN, Numéro...)</FormLabel>
                    <FormControl>
                      <Input placeholder="Saisissez vos coordonnées de réception" {...field} disabled={!withdrawalsOpen} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 font-semibold"
                disabled={createWithdrawal.isPending || !withdrawalsOpen}
              >
                {createWithdrawal.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {withdrawalsOpen === false ? "Retraits fermés" : "Valider le retrait"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
