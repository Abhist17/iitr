import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import UploadPage from "./pages/UploadPage";
import DashboardPage from "./pages/DashboardPage";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import AIVerifyPage from "./pages/AIVerifyPage";
import AIResultsPage from "./pages/AIResultsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/application/:id" element={<ApplicationDetailPage />} />
          <Route path="/ai-verify" element={<AIVerifyPage />} />
          <Route path="/ai-results" element={<AIResultsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
