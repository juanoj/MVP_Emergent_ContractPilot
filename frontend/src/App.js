import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthCallback from "@/pages/AuthCallback";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Subscriptions from "@/pages/Subscriptions";
import Renewals from "@/pages/Renewals";
import Contracts from "@/pages/Contracts";
import { Loader2 } from "lucide-react";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Handle OAuth callback synchronously (URL fragment holds session_id)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/subscriptions" element={<Protected><Subscriptions /></Protected>} />
      <Route path="/renewals" element={<Protected><Renewals /></Protected>} />
      <Route path="/contracts" element={<Protected><Contracts /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
