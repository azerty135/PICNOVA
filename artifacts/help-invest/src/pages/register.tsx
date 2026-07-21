import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const registerSchema = z.object({
  phone: z.string().min(5, "Numéro de téléphone invalide"),
  pin: z.string().regex(/^\d{4}$|^\d{8}$/, "Le code PIN doit contenir 4 ou 8 chiffres"),
  confirmPin: z.string().regex(/^\d{4}$|^\d{8}$/, "Le code PIN doit contenir 4 ou 8 chiffres"),
  referralCode: z.string().optional(),
}).refine((data) => data.pin === data.confirmPin, {
  message: "Les codes PIN ne correspondent pas",
  path: ["confirmPin"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const refCode = new URLSearchParams(window.location.search).get("ref") ?? "";

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: "",
      pin: "",
      confirmPin: "",
      referralCode: refCode,
    },
  });

  const registerMutation = useRegister();

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate({
      data: {
        phone: data.phone,
        pin: data.pin,
        ...(data.referralCode?.trim() ? { referralCode: data.referralCode.trim().toUpperCase() } : {}),
      }
    }, {
      onSuccess: () => {
        refreshUser();
      },
      onError: (err) => {
        toast({
          title: "Erreur d'inscription",
          description: (err as any)?.error || "Une erreur est survenue lors de l'inscription.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-background dark">
      <div className="w-full max-w-md mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-serif font-bold text-primary tracking-widest uppercase">HELP</h1>
          <p className="mt-3 text-muted-foreground text-sm uppercase tracking-widest">Créer un compte</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="+225 07 12 34 56 78" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code PIN (4 ou 8 chiffres)</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" maxLength={8} inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le code PIN</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" maxLength={8} inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Code de parrainage
                      <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="EX: AB12CD"
                        className="uppercase tracking-widest"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full font-semibold bg-primary text-background hover:bg-primary/90" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                S'inscrire
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/" className="text-primary hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
