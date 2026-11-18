import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2, Clock } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatRelativeTime } from "../utils/backgrounds";
function NotificationsPage() {
  const { setUnreadNotifications } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      const list = res.data.notifications || [];
      setNotifications(list);
      setUnreadNotifications(list.filter((n) => !n.isRead).length);
    } catch {
      showToast("Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  }, [setUnreadNotifications, showToast]);
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);
  const handleCheckReminders = async () => {
    try {
      const res = await api.post("/notifications/check-reminders");
      if (res.data.createdCount > 0) {
        showToast(`Generated ${res.data.createdCount} due-date reminder(s)`);
        loadNotifications();
      } else {
        showToast("All due-date reminders are up to date", "info");
      }
    } catch {
      showToast("Failed to scan due dates", "error");
    }
  };
  const handleMarkRead = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.put(`/notifications/${notif._id}/read`);
        setNotifications((prev) => prev.map((n) => n._id === notif._id ? { ...n, isRead: true } : n));
        setUnreadNotifications((prev) => Math.max(0, prev - 1));
      } catch {
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };
  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifications(0);
      showToast("All notifications marked as read");
    } catch {
      showToast("Failed to mark all read", "error");
    }
  };
  const handleClearRead = async () => {
    try {
      await api.delete("/notifications/clear-read");
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      showToast("Cleared read notifications");
    } catch {
      showToast("Failed to clear notifications", "error");
    }
  };
  const visible = filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;
  return <div className="max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Invitations, card assignments, comment mentions, and due-date reminders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
    type="button"
    onClick={handleCheckReminders}
    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
  >
            <Clock className="w-3.5 h-3.5" />
            Check Due Reminders
          </button>
          <button
    type="button"
    onClick={handleMarkAllRead}
    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
  >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All Read
          </button>
          <button
    type="button"
    onClick={handleClearRead}
    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
  >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Read
          </button>
        </div>
      </div>

      {
    /* Filter Tabs */
  }
      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <button
    type="button"
    onClick={() => setFilter("all")}
    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === "all" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400"}`}
  >
          All ({notifications.length})
        </button>
        <button
    type="button"
    onClick={() => setFilter("unread")}
    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === "unread" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400"}`}
  >
          Unread ({notifications.filter((n) => !n.isRead).length})
        </button>
      </div>

      {loading ? <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-slate-800" />)}
        </div> : visible.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center bg-white dark:bg-slate-900">
          <Bell className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">You are all caught up</p>
          <p className="mt-1 text-xs text-slate-500">
            {filter === "unread" ? "No unread notifications right now." : "Notifications will appear here when teammates collaborate with you."}
          </p>
        </div> : <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {visible.map((notif) => <button
    key={notif._id}
    type="button"
    onClick={() => handleMarkRead(notif)}
    className={`w-full text-left p-4 flex items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!notif.isRead ? "bg-blue-50/40 dark:bg-blue-950/20" : ""}`}
  >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{notif.title}</span>
                  {!notif.isRead && <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Unread</span>}
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{notif.message}</p>
              </div>
              <span className="text-xs font-mono text-slate-400 shrink-0">
                {formatRelativeTime(notif.createdAt)}
              </span>
            </button>)}
        </div>}
    </div>;
}
export {
  NotificationsPage as default
};
