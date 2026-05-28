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

const queryClient = new QueryClient();

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
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
