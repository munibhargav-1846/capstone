import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { disconnectSocket, getSocket } from "../services/socket";
import { useTheme } from "./ThemeContext";
const AuthContext = createContext(void 0);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { setTheme } = useTheme();
  const refreshNotificationsCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      const notifs = res.data.notifications || [];
      setUnreadNotifications(notifs.filter((n) => !n.isRead).length);
    } catch {
    }
  }, []);
  const bootstrapSession = useCallback(async () => {
    const token = localStorage.getItem("taskline_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      const currentUser = res.data.user;
      setUser(currentUser);
      if (currentUser.themePreference) {
        setTheme(currentUser.themePreference);
      }
      await api.post("/notifications/check-reminders").catch(() => {
      });
      await refreshNotificationsCount();
      const socket = getSocket();
      socket.on("notification:new", () => {
        setUnreadNotifications((prev) => prev + 1);
      });
    } catch {
      localStorage.removeItem("taskline_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshNotificationsCount, setTheme]);
  useEffect(() => {
    bootstrapSession();
    const handleUnauth = () => {
      setUser(null);
      disconnectSocket();
    };
    window.addEventListener("taskline:unauthorized", handleUnauth);
    return () => {
      window.removeEventListener("taskline:unauthorized", handleUnauth);
    };
  }, [bootstrapSession]);
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("taskline_token", res.data.token);
    const loggedInUser = res.data.user;
    setUser(loggedInUser);
    if (loggedInUser.themePreference) {
      setTheme(loggedInUser.themePreference);
    }
    await api.post("/notifications/check-reminders").catch(() => {
    });
    await refreshNotificationsCount();
    const socket = getSocket();
    socket.on("notification:new", () => {
      setUnreadNotifications((prev) => prev + 1);
    });
  };
  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("taskline_token", res.data.token);
    setUser(res.data.user);
    await refreshNotificationsCount();
    getSocket();
  };
  const logout = () => {
    localStorage.removeItem("taskline_token");
    setUser(null);
    setUnreadNotifications(0);
    disconnectSocket();
  };
  const updateUser = (updated) => {
    setUser(updated);
  };
  return <AuthContext.Provider
    value={{
      user,
      loading,
      unreadNotifications,
      setUnreadNotifications,
      login,
      register,
      logout,
      updateUser,
      refreshNotificationsCount
    }}
  >
      {children}
    </AuthContext.Provider>;
}
function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
export {
  AuthProvider,
  useAuth
};
