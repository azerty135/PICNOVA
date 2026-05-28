import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateDeposit } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const depositSchema = z.object({
  amount: z.coerce.number().min(10, "Le montant minimum est de 10$"),
  method: z.string().min(1, "Veuillez sélectionner une méthode"),
});

type DepositFormValues = z.infer<typeof depositSchema>;

export default function Deposit() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createDeposit = useCreateDeposit();

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: 100,
      method: "usdt_trc20",
    },
  });

  const onSubmit = (data: DepositFormValues) => {
    createDeposit.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Demande de dépôt envoyée",
          description: "Votre compte sera crédité après confirmation.",
        });
        setLocation("/dashboard");
      },
      onError: (err) => {
        toast({
          title: "Erreur",
          description: err.error || "Erreur lors de la demande de dépôt.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-foreground">Dépôt</h1>
        <p className="text-muted-foreground text-sm">Approvisionnez votre compte.</p>
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
                    <FormLabel>Montant (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" min="10" step="1" {...field} className="text-lg font-medium" />
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
                    <FormLabel>Méthode de paiement</FormLabel>
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

              <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                <p>Veuillez noter que le traitement des virements bancaires peut prendre jusqu'à 48h ouvrées. Les dépôts crypto sont crédités après 3 confirmations réseau.</p>
              </div>

              <Button type="submit" className="w-full h-12 font-semibold" disabled={createDeposit.isPending}>
                {createDeposit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Soumettre la demande
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
