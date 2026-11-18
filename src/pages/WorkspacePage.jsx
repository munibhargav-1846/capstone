import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Users,
  Settings,
  Trash2,
  UserPlus,
  Star,
  Archive,
  FolderKanban
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Avatar from "../components/Avatar";
import CreateBoardModal from "../components/CreateBoardModal";
function WorkspacePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [allWorkspaces, setAllWorkspaces] = useState([]);
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVisibility, setEditVisibility] = useState("team");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [confirmDeleteWs, setConfirmDeleteWs] = useState(false);
  const fetchWorkspace = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [wsRes, allWsRes] = await Promise.all([api.get(`/workspaces/${id}`), api.get("/workspaces")]);
      const ws = wsRes.data.workspace;
      setWorkspace(ws);
      setBoards(wsRes.data.boards || []);
      setRole(wsRes.data.role);
      setAllWorkspaces(allWsRes.data.workspaces || []);
      setEditName(ws.name);
      setEditDesc(ws.description || "");
      setEditVisibility(ws.visibility);
    } catch (err) {
      showToast(err.response?.data?.message || "Workspace not accessible", "error");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);
  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);
  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    if (!workspace || !editName.trim()) return;
    try {
      const res = await api.put(`/workspaces/${workspace._id}`, {
        name: editName.trim(),
        description: editDesc.trim(),
        visibility: editVisibility
      });
      setWorkspace((prev) => prev ? { ...prev, ...res.data.workspace } : null);
      setEditing(false);
      showToast("Workspace updated");
      window.dispatchEvent(new Event("taskline:refresh-sidebar"));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update workspace", "error");
    }
  };
  const handleDeleteWorkspace = async () => {
    if (!workspace) return;
    try {
      await api.delete(`/workspaces/${workspace._id}`);
      showToast("Workspace deleted");
      window.dispatchEvent(new Event("taskline:refresh-sidebar"));
      navigate("/");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete workspace", "error");
    }
  };
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!workspace || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post(`/workspaces/${workspace._id}/members`, {
        email: inviteEmail.trim(),
        memberRole: inviteRole
      });
      setInviteEmail("");
      showToast("Member added to workspace");
      fetchWorkspace();
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to invite member", "error");
    } finally {
      setInviting(false);
    }
  };
  const handleChangeMemberRole = async (userId, nextRole) => {
    if (!workspace) return;
    try {
      await api.put(`/workspaces/${workspace._id}/members/${userId}`, { memberRole: nextRole });
      showToast("Role updated");
      fetchWorkspace();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update role", "error");
    }
  };
  const handleRemoveMember = async (userId) => {
    if (!workspace) return;
    try {
      await api.delete(`/workspaces/${workspace._id}/members/${userId}`);
      showToast("Member removed");
      fetchWorkspace();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to remove member", "error");
    }
  };
  const handleRestoreBoard = async (boardId) => {
    try {
      await api.put(`/boards/${boardId}`, { isArchived: false });
      showToast("Board restored");
      fetchWorkspace();
    } catch {
      showToast("Failed to restore board", "error");
    }
  };
  if (loading || !workspace) {
    return <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>;
  }
  const isAdmin = role === "admin";
  const canCreateBoard = role === "admin" || role === "member";
  const visibleBoards = boards.filter((b) => showArchived ? b.isArchived : !b.isArchived);
  return <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
      {
    /* Workspace Header */
  }
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        {editing && isAdmin ? <form onSubmit={handleSaveWorkspace} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Workspace Name
              </label>
              <input
    type="text"
    value={editName}
    onChange={(e) => setEditName(e.target.value)}
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
    rows={2}
    value={editDesc}
    onChange={(e) => setEditDesc(e.target.value)}
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
            </div>
            <div className="flex items-center gap-3">
              <select
    value={editVisibility}
    onChange={(e) => setEditVisibility(e.target.value)}
    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  >
                <option value="team">Team Workspace</option>
                <option value="private">Private Workspace</option>
              </select>
              <button
    type="submit"
    className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
  >
                Save Changes
              </button>
              <button
    type="button"
    onClick={() => setEditing(false)}
    className="px-3 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
                Cancel
              </button>
            </div>
          </form> : <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{workspace.name}</h1>
                  <span className="text-xs text-slate-500 capitalize">
                    {workspace.visibility} · Your role: {role}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                  {workspace.description || "No workspace description provided."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canCreateBoard && <button
    type="button"
    onClick={() => setCreateBoardOpen(true)}
    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
  >
                  <Plus className="w-3.5 h-3.5" />
                  Create Board
                </button>}
              {isAdmin && <button
    type="button"
    onClick={() => setEditing(true)}
    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
  >
                  <Settings className="w-3.5 h-3.5" />
                  Edit
                </button>}
            </div>
          </div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {
    /* Boards Section */
  }
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {showArchived ? "Archived Boards" : "Workspace Boards"}
            </h2>
            <button
    type="button"
    onClick={() => setShowArchived((v) => !v)}
    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
  >
              <Archive className="w-3.5 h-3.5" />
              {showArchived ? "View Active Boards" : "View Archived"}
            </button>
          </div>

          {visibleBoards.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center bg-white dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {showArchived ? "No archived boards" : "No boards in this workspace yet"}
              </p>
              {!showArchived && canCreateBoard && <button
    type="button"
    onClick={() => setCreateBoardOpen(true)}
    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
  >
                  <Plus className="w-3.5 h-3.5" />
                  Create Board
                </button>}
            </div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleBoards.map((board) => {
    const isStarred = Boolean(user && board.isStarredBy?.includes(user._id));
    const bgStyle = board.background?.type === "image" ? {
      backgroundImage: `url(${board.background.value})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    } : board.background?.type === "gradient" ? { background: board.background.value } : { backgroundColor: board.background?.value || "#F1F5F9" };
    return <div
      key={board._id}
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col"
    >
                    <Link to={`/board/${board._id}`} className="h-24 relative block" style={bgStyle}>
                      {(board.background?.type === "image" || board.background?.type === "gradient") && <div className="absolute inset-0 bg-slate-950/30" />}
                    </Link>
                    <div className="p-4 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link
      to={`/board/${board._id}`}
      className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 truncate block"
    >
                          {board.title}
                        </Link>
                        {board.description && <p className="text-xs text-slate-500 truncate mt-0.5">{board.description}</p>}
                      </div>
                      {showArchived ? <button
      type="button"
      onClick={() => handleRestoreBoard(board._id)}
      className="px-2.5 py-1 text-xs font-medium rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
    >
                          Restore
                        </button> : isStarred && <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />}
                    </div>
                  </div>;
  })}
            </div>}
        </div>

        {
    /* Members & Permissions Panel */
  }
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Workspace Members ({workspace.members?.length || 0})
              </h2>
            </div>

            {isAdmin && <form onSubmit={handleInviteMember} className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Invite by email
                </label>
                <div className="flex gap-2">
                  <input
    type="email"
    value={inviteEmail}
    onChange={(e) => setInviteEmail(e.target.value)}
    placeholder="maya@taskline.io"
    className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
                  <select
    value={inviteRole}
    onChange={(e) => setInviteRole(e.target.value)}
    className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button
    type="submit"
    disabled={inviting}
    className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50"
  >
                  <UserPlus className="w-3.5 h-3.5" />
                  {inviting ? "Inviting..." : "Invite Member"}
                </button>
              </form>}

            <div className="space-y-3">
              {workspace.members?.map((m) => {
    const isOwner = String(m.userId) === String(workspace.ownerId);
    return <div key={m.userId} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={m.user?.name} src={m.user?.avatar} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {m.user?.name || "Member"}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{m.user?.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAdmin && !isOwner ? <>
                          <select
      value={m.role}
      onChange={(e) => handleChangeMemberRole(m.userId, e.target.value)}
      className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 capitalize"
    >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
      type="button"
      onClick={() => handleRemoveMember(m.userId)}
      aria-label="Remove member"
      className="p-1 text-slate-400 hover:text-red-600"
    >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </> : <span className="text-[11px] text-slate-500 capitalize">
                          {isOwner ? "Owner" : m.role}
                        </span>}
                    </div>
                  </div>;
  })}
            </div>
          </div>

          {isAdmin && <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deleting this workspace permanently removes all its boards, lists, and cards.
              </p>
              {!confirmDeleteWs ? <button
    type="button"
    onClick={() => setConfirmDeleteWs(true)}
    className="px-3.5 py-2 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
  >
                  Delete Workspace
                </button> : <div className="flex items-center gap-2">
                  <button
    type="button"
    onClick={handleDeleteWorkspace}
    className="px-3.5 py-2 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700"
  >
                    Confirm Delete
                  </button>
                  <button
    type="button"
    onClick={() => setConfirmDeleteWs(false)}
    className="px-3 py-2 text-xs rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
                    Cancel
                  </button>
                </div>}
            </div>}
        </div>
      </div>

      <CreateBoardModal
    isOpen={createBoardOpen}
    onClose={() => setCreateBoardOpen(false)}
    workspaces={allWorkspaces}
    defaultWorkspaceId={workspace._id}
    onCreated={(board) => {
      window.dispatchEvent(new Event("taskline:refresh-sidebar"));
      navigate(`/board/${board._id}`);
    }}
  />
    </div>;
}
export {
  WorkspacePage as default
};
