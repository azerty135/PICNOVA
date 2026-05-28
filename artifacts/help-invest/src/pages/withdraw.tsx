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
import { Loader2 } from "lucide-react";

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
          description: err.error || "Erreur lors de la demande de retrait.",
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
          <p className="text-muted-foreground text-sm">Récupérez vos fonds.</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Solde dispo.</p>
          <p className="font-semibold text-primary">{user ? formatCurrency(user.balance) : "..."}</p>
        </div>
      </header>

      <Card className="border-border/50">
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
                      <Input type="number" min="20" step="1" {...field} className="text-lg font-medium" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Input placeholder="Saisissez vos coordonnées de réception" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-12 font-semibold" disabled={createWithdrawal.isPending}>
                {createWithdrawal.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Valider le retrait
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
