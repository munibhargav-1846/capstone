import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Save, Calendar, CheckCircle2 } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Avatar from "../components/Avatar";
import { formatShortDate, getDueStatus } from "../utils/backgrounds";
function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [assignedCards, setAssignedCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  useEffect(() => {
    if (user) {
      setName(user.name);
      setJobTitle(user.jobTitle || "");
      setBio(user.bio || "");
      setAvatar(user.avatar || "");
    }
  }, [user]);
  useEffect(() => {
    api.get("/auth/assigned-cards").then((res) => setAssignedCards(res.data.cards || [])).catch(() => {
    }).finally(() => setLoadingCards(false));
  }, []);
  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Name cannot be empty", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await api.put("/auth/profile", {
        name: name.trim(),
        jobTitle: jobTitle.trim(),
        bio: bio.trim(),
        avatar: avatar.trim()
      });
      updateUser(res.data.user);
      showToast("Profile saved");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };
  return <div className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage how collaborators see your identity across workspaces and boards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {
    /* Profile Form */
  }
        <form
    onSubmit={handleSave}
    className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
  >
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <Avatar name={name || user?.name} src={avatar} size="lg" />
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-white">{name || user?.name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Job Title / Role
              </label>
              <input
    type="text"
    value={jobTitle}
    onChange={(e) => setJobTitle(e.target.value)}
    placeholder="e.g., Product Engineer"
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Avatar Image URL (optional)
            </label>
            <input
    type="url"
    value={avatar}
    onChange={(e) => setAvatar(e.target.value)}
    placeholder="Leave blank to use monogram initials"
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Bio
            </label>
            <textarea
    rows={3}
    value={bio}
    onChange={(e) => setBio(e.target.value)}
    placeholder="A brief note about your focus areas..."
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 resize-none"
  />
          </div>

          <div className="pt-2">
            <button
    type="submit"
    disabled={saving}
    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
  >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>

        {
    /* Assigned Cards */
  }
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              My Assigned Cards ({assignedCards.length})
            </h2>
          </div>

          {loadingCards ? <div className="space-y-2 animate-pulse">
              <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            </div> : assignedCards.length === 0 ? <p className="text-xs text-slate-500 py-4">No cards assigned to you yet.</p> : <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {assignedCards.map((c) => {
    const status = getDueStatus(c.dueDate, c.isCompleted);
    return <Link
      key={c._id}
      to={`/board/${c.boardId}?card=${c._id}`}
      className="block py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-lg"
    >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                        {c.title}
                      </span>
                      {c.isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="truncate">{c.boardTitle}</span>
                      <span aria-hidden="true">·</span>
                      <span>{c.listTitle}</span>
                      {c.dueDate && <>
                          <span aria-hidden="true">·</span>
                          <span
      className={`font-mono ${status === "overdue" ? "text-red-600" : status === "soon" ? "text-amber-600" : ""}`}
    >
                            {formatShortDate(c.dueDate)}
                          </span>
                        </>}
                    </div>
                  </Link>;
  })}
            </div>}
        </div>
      </div>
    </div>;
}
export {
  ProfilePage as default
};
