
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react";

import api from "../services/api";
import { disconnectSocket, getSocket } from "../services/socket";
import { useTheme } from "./ThemeContext";

const AuthContext = createContext(undefined);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const { setTheme } = useTheme();

  // Refresh unread notification count
  const refreshNotificationsCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      const notifications = res.data.notifications || [];

      setUnreadNotifications(
        notifications.filter((notification) => !notification.isRead).length
      );
    } catch (error) {
      console.error(
        "Unable to refresh notifications:",
        error.message
      );
    }
  }, []);

  // Handle new notification events
  const handleNewNotification = useCallback(() => {
    setUnreadNotifications((previous) => previous + 1);
  }, []);

  // Connect notification socket safely
  const connectNotifications = useCallback(() => {
    try {
      const socket = getSocket();

      socket.off("notification:new", handleNewNotification);
      socket.on("notification:new", handleNewNotification);
    } catch (error) {
      console.error(
        "Socket connection initialization failed:",
        error
      );
    }
  }, [handleNewNotification]);

  // Restore the user's existing session
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

      // Check reminders without interrupting authentication
      try {
        await api.post("/notifications/check-reminders");
      } catch (error) {
        console.error("Reminder check failed:", error.message);
      }

      await refreshNotificationsCount();

      connectNotifications();

    } catch (error) {
      console.error("Session restoration failed:", error);

      // Clear the token only if authentication is rejected
      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        localStorage.removeItem("taskline_token");
      }

      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [
    refreshNotificationsCount,
    setTheme,
    connectNotifications
  ]);

  // Initialize authentication
  useEffect(() => {
    bootstrapSession();

    const handleUnauthorized = () => {
      setUser(null);
      setUnreadNotifications(0);
      disconnectSocket();
    };

    window.addEventListener(
      "taskline:unauthorized",
      handleUnauthorized
    );

    return () => {
      window.removeEventListener(
        "taskline:unauthorized",
        handleUnauthorized
      );
    };
  }, [bootstrapSession]);

  // Login user
  const login = async (email, password) => {
    const res = await api.post("/auth/login", {
      email,
      password
    });

    localStorage.setItem("taskline_token", res.data.token);

    const loggedInUser = res.data.user;

    setUser(loggedInUser);

    if (loggedInUser.themePreference) {
      setTheme(loggedInUser.themePreference);
    }

    // Optional reminder service
    try {
      await api.post("/notifications/check-reminders");
    } catch (error) {
      console.error("Reminder check failed:", error.message);
    }

    await refreshNotificationsCount();

    connectNotifications();
  };

  // Register new user
  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", {
      name,
      email,
      password
    });

    localStorage.setItem("taskline_token", res.data.token);

    setUser(res.data.user);

    if (res.data.user.themePreference) {
      setTheme(res.data.user.themePreference);
    }

    await refreshNotificationsCount();

    connectNotifications();
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem("taskline_token");

    setUser(null);
    setUnreadNotifications(0);

    disconnectSocket();
  };

  // Update user details
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
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
    </AuthContext.Provider>
  );
}

// Custom authentication hook
function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export {
  AuthProvider,
  useAuth
};
