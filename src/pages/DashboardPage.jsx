import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Star, FolderKanban, Clock, ArrowRight, Calendar } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import CreateBoardModal from "../components/CreateBoardModal";
import { formatRelativeTime, formatShortDate, getDueStatus } from "../utils/backgrounds";
function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [assignedCards, setAssignedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [defaultWsId, setDefaultWsId] = useState(void 0);
  const fetchData = useCallback(async () => {
    try {
      const [wsRes, bRes, cardsRes] = await Promise.all([
        api.get("/workspaces"),
        api.get("/boards"),
        api.get("/auth/assigned-cards")
      ]);
      setWorkspaces(wsRes.data.workspaces || []);
      setBoards((bRes.data.boards || []).filter((b) => !b.isArchived));
      setAssignedCards(cardsRes.data.cards || []);
    } catch {
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  useEffect(() => {
    fetchData();
    const handler = () => fetchData();
    window.addEventListener("taskline:refresh-dashboard", handler);
    return () => window.removeEventListener("taskline:refresh-dashboard", handler);
  }, [fetchData]);
  const handleToggleStar = async (e, boardId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.post(`/boards/${boardId}/star`);
      setBoards((prev) => prev.map((b) => b._id === boardId ? { ...b, isStarredBy: res.data.board.isStarredBy } : b));
      window.dispatchEvent(new Event("taskline:refresh-sidebar"));
    } catch {
      showToast("Failed to update star", "error");
    }
  };
  const starredBoards = boards.filter((b) => user && b.isStarredBy?.includes(user._id));
  const recentBoards = [...boards].sort((a, b) => new Date(b.lastViewedAt).getTime() - new Date(a.lastViewedAt).getTime()).slice(0, 6);
  const upcomingCards = assignedCards.filter((c) => !c.isCompleted).sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }).slice(0, 5);
  const renderBoardCard = (board) => {
    const isStarred = Boolean(user && board.isStarredBy?.includes(user._id));
    const bgStyle = board.background?.type === "image" ? { backgroundImage: `url(${board.background.value})`, backgroundSize: "cover", backgroundPosition: "center" } : board.background?.type === "gradient" ? { background: board.background.value } : { backgroundColor: board.background?.value || "#F1F5F9" };
    const isDarkSurface = board.background?.type === "image" || board.background?.type === "gradient";
    return <Link
      key={board._id}
      to={`/board/${board._id}`}
      className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-blue-500/60 transition-colors flex flex-col"
    >
        <div className="h-24 relative p-3 flex items-start justify-between" style={bgStyle}>
          {isDarkSurface && <div className="absolute inset-0 bg-slate-950/35" />}
          <span
      className={`relative z-10 text-xs font-medium truncate max-w-[80%] ${isDarkSurface ? "text-white/90" : "text-slate-700"}`}
    >
            {board.workspaceName || "Workspace"}
          </span>
          <button
      type="button"
      onClick={(e) => handleToggleStar(e, board._id)}
      aria-label={isStarred ? "Unstar board" : "Star board"}
      className={`relative z-10 p-1.5 rounded-lg transition-colors ${isDarkSurface ? "bg-slate-950/40 text-white hover:bg-slate-950/60" : "bg-white/80 text-slate-600 hover:bg-white"}`}
    >
            <Star className={`w-3.5 h-3.5 ${isStarred ? "text-amber-400 fill-amber-400" : ""}`} />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
              {board.title}
            </h3>
            {board.description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{board.description}</p>}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">{formatRelativeTime(board.lastViewedAt)}</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
          </div>
        </div>
      </Link>;
  };
  return <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-10">
      {
    /* Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {workspaces.length} workspaces · {boards.length} active boards · {upcomingCards.length} open tasks assigned to you
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
    type="button"
    onClick={() => setCreateWsOpen(true)}
    className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
  >
            New Workspace
          </button>
          <button
    type="button"
    onClick={() => {
      setDefaultWsId(workspaces[0]?._id);
      setCreateBoardOpen(true);
    }}
    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
  >
            <Plus className="w-3.5 h-3.5" />
            New Board
          </button>
        </div>
      </div>

      {loading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <div
    key={i}
    className="h-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
  />)}
        </div> : <>
          {
    /* Starred Boards */
  }
          {starredBoards.length > 0 && <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Starred Boards</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {starredBoards.map(renderBoardCard)}
              </div>
            </section>}

          {
    /* Recent Boards & Assigned Tasks Split */
  }
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <section className="xl:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Boards</h2>
                </div>
              </div>

              {recentBoards.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center bg-white dark:bg-slate-900">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No boards yet</p>
                  <p className="mt-1 text-xs text-slate-500">Create your first Kanban board to start organizing tasks.</p>
                  <button
    type="button"
    onClick={() => setCreateBoardOpen(true)}
    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
  >
                    <Plus className="w-3.5 h-3.5" />
                    Create First Board
                  </button>
                </div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {recentBoards.map(renderBoardCard)}
                </div>}
            </section>

            {
    /* Assigned Tasks / Due-Date Reminders */
  }
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Assigned to You</h2>
                </div>
                <Link to="/profile" className="text-xs font-medium text-blue-600 hover:underline">
                  View all
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingCards.length === 0 ? <div className="p-6 text-center text-xs text-slate-500">
                    No open tasks assigned to you right now.
                  </div> : upcomingCards.map((card) => {
    const status = getDueStatus(card.dueDate, card.isCompleted);
    return <Link
      key={card._id}
      to={`/board/${card.boardId}?card=${card._id}`}
      className="block p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
    >
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {card.title}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="truncate">{card.boardTitle}</span>
                          <span aria-hidden="true">·</span>
                          <span>{card.listTitle}</span>
                          {card.dueDate && <>
                              <span aria-hidden="true">·</span>
                              <span
      className={`font-mono ${status === "overdue" ? "text-red-600 font-medium" : status === "soon" ? "text-amber-600 font-medium" : ""}`}
    >
                                {formatShortDate(card.dueDate)}
                              </span>
                            </>}
                        </div>
                      </Link>;
  })}
              </div>
            </section>
          </div>

          {
    /* Workspaces Grid */
  }
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-slate-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Your Workspaces</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {workspaces.map((ws) => <div
    key={ws._id}
    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between"
  >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <Link
    to={`/workspace/${ws._id}`}
    className="text-base font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
  >
                        {ws.name}
                      </Link>
                      <span className="text-xs font-mono text-slate-400 capitalize">{ws.visibility}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {ws.description || "Collaborative workspace for boards and team sprints."}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono tabular-nums">
                      {ws.boardCount ?? 0} boards · {ws.members?.length || 1} members
                    </span>
                    <div className="flex items-center gap-3">
                      <button
    type="button"
    onClick={() => {
      setDefaultWsId(ws._id);
      setCreateBoardOpen(true);
    }}
    className="font-medium text-blue-600 hover:underline"
  >
                        Add board
                      </button>
                      <Link
    to={`/workspace/${ws._id}`}
    className="font-medium text-slate-700 dark:text-slate-200 hover:underline"
  >
                        Open
                      </Link>
                    </div>
                  </div>
                </div>)}
            </div>
          </section>
        </>}

      <CreateWorkspaceModal
    isOpen={createWsOpen}
    onClose={() => setCreateWsOpen(false)}
    onCreated={(ws) => {
      window.dispatchEvent(new Event("taskline:refresh-sidebar"));
      navigate(`/workspace/${ws._id}`);
    }}
  />

      <CreateBoardModal
    isOpen={createBoardOpen}
    onClose={() => setCreateBoardOpen(false)}
    workspaces={workspaces}
    defaultWorkspaceId={defaultWsId}
    onCreated={(board) => {
      window.dispatchEvent(new Event("taskline:refresh-sidebar"));
      navigate(`/board/${board._id}`);
    }}
  />
    </div>;
}
export {
  DashboardPage as default
};
