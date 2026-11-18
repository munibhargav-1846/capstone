import { useState } from "react";
import { Sun, Moon, Lock, Download, Save } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [emailReminders, setEmailReminders] = useState(user?.notificationSettings?.emailReminders ?? true);
  const [boardUpdates, setBoardUpdates] = useState(user?.notificationSettings?.boardUpdates ?? true);
  const [mentions, setMentions] = useState(user?.notificationSettings?.mentions ?? true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const handleThemeSelect = async (next) => {
    setTheme(next);
    try {
      const res = await api.put("/auth/profile", { themePreference: next });
      updateUser(res.data.user);
      showToast(`Switched to ${next} theme`);
    } catch {
    }
  };
  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      const res = await api.put("/auth/profile", {
        notificationSettings: { emailReminders, boardUpdates, mentions }
      });
      updateUser(res.data.user);
      showToast("Notification preferences updated");
    } catch {
      showToast("Failed to save preferences", "error");
    } finally {
      setSavingPrefs(false);
    }
  };
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordError("Please fill out all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordError("");
    setSavingPassword(true);
    try {
      await api.put("/auth/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };
  return <div className="max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Customize workspace appearance, notification triggers, and account security.
        </p>
      </div>

      {
    /* Appearance */
  }
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Appearance</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose between a crisp light canvas or a low-glare dark workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <button
    type="button"
    onClick={() => handleThemeSelect("light")}
    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${theme === "light" ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
  >
            <Sun className="w-4 h-4" />
            <div>
              <div className="text-sm font-medium">Light Theme</div>
              <div className="text-xs text-slate-500">Clean white and subtle grey</div>
            </div>
          </button>

          <button
    type="button"
    onClick={() => handleThemeSelect("dark")}
    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${theme === "dark" ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
  >
            <Moon className="w-4 h-4" />
            <div>
              <div className="text-sm font-medium">Dark Theme</div>
              <div className="text-xs text-slate-500">Deep slate contrast</div>
            </div>
          </button>
        </div>
      </section>

      {
    /* Notification Preferences */
  }
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Notification Preferences</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control which events create in-app reminders and alerts.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Due-date reminders</div>
              <div className="text-xs text-slate-500">Notify 24 hours before assigned cards are due</div>
            </div>
            <input
    type="checkbox"
    checked={emailReminders}
    onChange={(e) => setEmailReminders(e.target.checked)}
    className="w-4 h-4 accent-blue-600"
  />
          </label>

          <label className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Board activity updates</div>
              <div className="text-xs text-slate-500">Receive alerts when invited to workspaces or boards</div>
            </div>
            <input
    type="checkbox"
    checked={boardUpdates}
    onChange={(e) => setBoardUpdates(e.target.checked)}
    className="w-4 h-4 accent-blue-600"
  />
          </label>

          <label className="flex items-center justify-between py-2 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Comments & assignments</div>
              <div className="text-xs text-slate-500">Notify when someone assigns you or comments on your card</div>
            </div>
            <input
    type="checkbox"
    checked={mentions}
    onChange={(e) => setMentions(e.target.checked)}
    className="w-4 h-4 accent-blue-600"
  />
          </label>
        </div>

        <button
    type="button"
    disabled={savingPrefs}
    onClick={handleSavePrefs}
    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
  >
          <Save className="w-3.5 h-3.5" />
          {savingPrefs ? "Saving..." : "Save Preferences"}
        </button>
      </section>

      {
    /* Security / Password */
  }
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          {passwordError && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {passwordError}
            </div>}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <input
    type="password"
    value={currentPassword}
    onChange={(e) => setCurrentPassword(e.target.value)}
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <input
    type="password"
    value={newPassword}
    onChange={(e) => setNewPassword(e.target.value)}
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
    type="password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
          </div>

          <button
    type="submit"
    disabled={savingPassword}
    className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50"
  >
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>

      {
    /* Project Source Export */
  }
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Full-Stack Project Archive</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Download the complete standalone frontend + Express + Mongoose backend archive (`trello-clone-fullstack.zip`).
          </p>
        </div>
        <a
    href="/api/export/zip"
    download="trello-clone-fullstack.zip"
    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0"
  >
          <Download className="w-3.5 h-3.5" />
          Download ZIP
        </a>
      </section>
    </div>;
}
export {
  SettingsPage as default
};
