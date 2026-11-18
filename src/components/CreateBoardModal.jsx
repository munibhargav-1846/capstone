import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import api from "../services/api";
import { BOARD_BACKGROUNDS } from "../utils/backgrounds";
import { useToast } from "../context/ToastContext";
function CreateBoardModal({
  isOpen,
  onClose,
  workspaces,
  defaultWorkspaceId,
  onCreated
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId || "");
  const [background, setBackground] = useState(BOARD_BACKGROUNDS[0]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  useEffect(() => {
    if (defaultWorkspaceId) {
      setWorkspaceId(defaultWorkspaceId);
    } else if (!workspaceId && workspaces.length > 0) {
      setWorkspaceId(workspaces[0]._id);
    }
  }, [defaultWorkspaceId, workspaces, workspaceId]);
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Board title is required.");
      return;
    }
    if (!workspaceId) {
      setError("Please select a workspace first.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/boards", {
        title: title.trim(),
        description: description.trim(),
        workspaceId,
        background
      });
      showToast(`Board "${res.data.board.title}" created`);
      setTitle("");
      setDescription("");
      onCreated(res.data.board);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create board");
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Create Board</h2>
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
              Background
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {BOARD_BACKGROUNDS.map((bg) => {
    const selected = background.label === bg.label;
    const style = bg.type === "image" ? { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" } : bg.type === "gradient" ? { background: bg.value } : { backgroundColor: bg.value };
    return <button
      key={bg.label}
      type="button"
      onClick={() => setBackground(bg)}
      title={bg.label}
      style={style}
      className={`h-12 rounded-lg border relative flex items-center justify-center transition-transform ${selected ? "border-blue-600 ring-2 ring-blue-600/30 scale-[1.02]" : "border-slate-200 dark:border-slate-700 hover:opacity-90"}`}
    >
                    {selected && <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                        <Check className="w-3 h-3" />
                      </span>}
                  </button>;
  })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Board Title
            </label>
            <input
    type="text"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    placeholder="e.g., Q1 Release Sprint"
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
    autoFocus
  />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Workspace
            </label>
            <select
    value={workspaceId}
    onChange={(e) => setWorkspaceId(e.target.value)}
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
  >
              {workspaces.map((ws) => <option key={ws._id} value={ws._id}>
                  {ws.name}
                </option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
    rows={2}
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="Brief overview of goals and deliverables..."
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
  />
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
              {submitting ? "Creating..." : "Create Board"}
            </button>
          </div>
        </form>
      </div>
    </div>;
}
export {
  CreateBoardModal as default
};
