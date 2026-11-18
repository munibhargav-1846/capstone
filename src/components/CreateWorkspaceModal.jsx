import { useState } from "react";
import { X } from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
function CreateWorkspaceModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("team");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Workspace name is required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/workspaces", { name: name.trim(), description: description.trim(), visibility });
      showToast(`Workspace "${res.data.workspace.name}" created`);
      setName("");
      setDescription("");
      onCreated(res.data.workspace);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Create Workspace</h2>
          <button
    type="button"
    onClick={onClose}
    aria-label="Close modal"
    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Workspace Name
            </label>
            <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="e.g., Core Engineering"
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
    autoFocus
  />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
    rows={3}
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="What teams or initiatives live here?"
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
  />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
    type="button"
    onClick={() => setVisibility("team")}
    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${visibility === "team" ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
  >
                Team Workspace
              </button>
              <button
    type="button"
    onClick={() => setVisibility("private")}
    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${visibility === "private" ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
  >
                Private
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
    type="button"
    onClick={onClose}
    className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
              Cancel
            </button>
            <button
    type="submit"
    disabled={submitting}
    className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
  >
              {submitting ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>;
}
export {
  CreateWorkspaceModal as default
};
