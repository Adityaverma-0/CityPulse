import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { AccessibilityProvider } from "@/lib/accessibility-context";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import OfficerDashboard from "@/pages/OfficerDashboard";
import CitizenPortal from "@/pages/CitizenPortal";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/officer" component={OfficerDashboard} />
      <Route path="/citizen" component={CitizenPortal} />
      <Route path="/portal" component={CitizenPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <AccessibilityProvider>
          <AuthProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster richColors position="top-right" />
              <AccessibilityWidget />
            </TooltipProvider>
          </AuthProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
