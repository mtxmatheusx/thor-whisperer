import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Index";
import Leads from "./pages/Leads";
import ThorAI from "./pages/ThorAI";
import Campaigns from "./pages/Campaigns";
import Proposals from "./pages/Proposals";
import ProfilePage from "./pages/ProfilePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import EventsPage from "./pages/EventsPage";
import ClientProfilesPage from "./pages/ClientProfilesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function NotificationListener() {
  useLeadNotifications();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationListener />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/leads" element={<AppLayout><Leads /></AppLayout>} />
            <Route path="/thor" element={<AppLayout><ThorAI /></AppLayout>} />
            <Route path="/campaigns" element={<AppLayout><Campaigns /></AppLayout>} />
            <Route path="/proposals" element={<AppLayout><Proposals /></AppLayout>} />
            <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
            <Route path="/analytics" element={<AppLayout><AnalyticsPage /></AppLayout>} />
            <Route path="/events" element={<AppLayout><EventsPage /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
