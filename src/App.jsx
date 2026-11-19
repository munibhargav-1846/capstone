import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import WorkspacePage from "./pages/WorkspacePage";
import BoardPage from "./pages/BoardPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-500">
        Loading workspace...
      </div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
function App() {
  return <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter basename="/capstone">
            <Routes>
              <Route
    path="/login"
    element={<PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>}
  />
              <Route
    path="/register"
    element={<PublicOnlyRoute>
                    <RegisterPage />
                  </PublicOnlyRoute>}
  />

              <Route
    element={<ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>}
  >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/workspace/:id" element={<WorkspacePage />} />
                <Route path="/board/:id" element={<BoardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>;
}
export {
  App as default
};
