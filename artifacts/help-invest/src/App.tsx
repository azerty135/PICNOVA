import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/lib/auth";

import Layout from "@/components/layout";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Invest from "@/pages/invest";
import Investments from "@/pages/investments";
import Deposit from "@/pages/deposit";
import Withdraw from "@/pages/withdraw";
import Transactions from "@/pages/transactions";
import Profile from "@/pages/profile";
import Equipe from "@/pages/equipe";
import Service from "@/pages/service";
import Admin from "@/pages/admin";

const Support = lazy(() => import("./pages/support"));

const queryClient = new QueryClient();

function UpdateBanner() {
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setReg((e as CustomEvent).detail);
    window.addEventListener('sw-update-available', handler);
    return () => window.removeEventListener('sw-update-available', handler);
  }, []);

  if (!reg) return null;

  const handleUpdate = () => {
    reg.waiting?.postMessage('SKIP_WAITING');
    window.location.reload();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-background px-4 py-3 flex items-center justify-between shadow-lg">
      <span className="text-sm font-medium">🚀 Nouvelle version disponible</span>
      <button
        onClick={handleUpdate}
        className="text-xs font-bold bg-background text-primary px-3 py-1 rounded-full hover:bg-background/90"
      >
        Mettre à jour
      </button>
    </div>
  );
}

function ProtectedRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/invest" component={Invest} />
        <Route path="/investments" component={Investments} />
        <Route path="/deposit" component={Deposit} />
        <Route path="/withdraw" component={Withdraw} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/profile" component={Profile} />
        <Route path="/equipe" component={Equipe} />
        <Route path="/service" component={Service} />
        <Route path="/support" component={() => <Suspense fallback={null}><Support /></Suspense>} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={ProtectedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <UpdateBanner />
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
