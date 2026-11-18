import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import {
  Star,
  Filter,
  Users,
  History,
  Archive,
  Palette,
  Plus,
  X,
  Trash2,
  RotateCcw,
  UserPlus,
  Check,
  ChevronLeft
} from "lucide-react";
import api from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { BOARD_BACKGROUNDS, formatRelativeTime, getDueStatus } from "../utils/backgrounds";
import BoardListColumn from "../components/BoardListColumn";
import BoardCardItem from "../components/BoardCardItem";
import CardDetailModal from "../components/CardDetailModal";
import Avatar from "../components/Avatar";
function BoardPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [role, setRole] = useState("viewer");
  const [members, setMembers] = useState([]);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [labels, setLabels] = useState([]);
  const [activities, setActivities] = useState([]);
  const [presenceUsers, setPresenceUsers] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [editingDescOpen, setEditingDescOpen] = useState(false);
  const [descInput, setDescInput] = useState("");
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterLabel, setFilterLabel] = useState("");
  const [filterDue, setFilterDue] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [activeDragCard, setActiveDragCard] = useState(null);
  const [activeDragList, setActiveDragList] = useState(null);
  const [dragOriginListId, setDragOriginListId] = useState(null);
  const selectedCardId = searchParams.get("card");
  const canEdit = role === "admin" || role === "member";
  const isAdmin = role === "admin";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const fetchBoard = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/boards/${id}`);
      setBoard(res.data.board);
      setTitleInput(res.data.board.title);
      setDescInput(res.data.board.description || "");
      setWorkspace(res.data.workspace);
      setRole(res.data.role);
      setMembers(res.data.members || []);
      setLists(res.data.lists || []);
      setCards(res.data.cards || []);
      setLabels(res.data.labels || []);
      setActivities(res.data.activities || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to load board", "error");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);
  useEffect(() => {
    setLoading(true);
    fetchBoard();
  }, [fetchBoard]);
  useEffect(() => {
    if (!id || !user) return;
    const socket = getSocket();
    socket.emit("board:join", { boardId: id, user: { _id: user._id, name: user.name } });
    const onPresence = (users) => setPresenceUsers(users);
    const onBoardUpdated = ({ board: next }) => setBoard(next);
    const onBoardRefresh = () => fetchBoard();
    const onListCreated = ({ list }) => {
      setLists((prev) => prev.some((l) => l._id === list._id) ? prev : [...prev, list]);
    };
    const onListUpdated = ({ list }) => {
      setLists((prev) => prev.map((l) => l._id === list._id ? list : l));
    };
    const onListDeleted = ({ listId }) => {
      setLists((prev) => prev.filter((l) => l._id !== listId));
      setCards((prev) => prev.filter((c) => c.listId !== listId));
    };
    const onListsReordered = ({ orderedIds }) => {
      setLists((prev) => {
        const map = new Map(prev.map((l) => [l._id, l]));
        return orderedIds.map((lid, idx) => {
          const item = map.get(lid);
          return item ? { ...item, position: idx } : null;
        }).filter(Boolean);
      });
    };
    const onCardCreated = ({ card }) => {
      setCards((prev) => prev.some((c) => c._id === card._id) ? prev : [...prev, card]);
    };
    const onCardUpdated = ({ card }) => {
      setCards((prev) => prev.map((c) => c._id === card._id ? { ...c, ...card } : c));
    };
    const onCardDeleted = ({ cardId }) => {
      setCards((prev) => prev.filter((c) => c._id !== cardId));
    };
    const onCardsReordered = ({ updates }) => {
      const updateMap = new Map(updates.map((u) => [u._id, u]));
      setCards(
        (prev) => prev.map((c) => {
          const u = updateMap.get(c._id);
          return u ? { ...c, listId: u.listId, position: u.position } : c;
        }).sort((a, b) => a.position - b.position)
      );
    };
    const onActivityCreated = (act) => {
      setActivities((prev) => prev.some((a) => a._id === act._id) ? prev : [act, ...prev]);
    };
    const onBoardDeleted = () => {
      showToast("This board was deleted", "info");
      navigate("/");
    };
    socket.on("board:presence", onPresence);
    socket.on("board:updated", onBoardUpdated);
    socket.on("board:refresh", onBoardRefresh);
    socket.on("list:created", onListCreated);
    socket.on("list:updated", onListUpdated);
    socket.on("list:deleted", onListDeleted);
    socket.on("lists:reordered", onListsReordered);
    socket.on("card:created", onCardCreated);
    socket.on("card:updated", onCardUpdated);
    socket.on("card:deleted", onCardDeleted);
    socket.on("cards:reordered", onCardsReordered);
    socket.on("activity:created", onActivityCreated);
    socket.on("board:deleted", onBoardDeleted);
    return () => {
      socket.emit("board:leave", { boardId: id });
      socket.off("board:presence", onPresence);
      socket.off("board:updated", onBoardUpdated);
      socket.off("board:refresh", onBoardRefresh);
      socket.off("list:created", onListCreated);
      socket.off("list:updated", onListUpdated);
      socket.off("list:deleted", onListDeleted);
      socket.off("lists:reordered", onListsReordered);
      socket.off("card:created", onCardCreated);
      socket.off("card:updated", onCardUpdated);
      socket.off("card:deleted", onCardDeleted);
      socket.off("cards:reordered", onCardsReordered);
      socket.off("activity:created", onActivityCreated);
      socket.off("board:deleted", onBoardDeleted);
    };
  }, [id, user, fetchBoard, navigate, showToast]);
  const activeLists = useMemo(
    () => lists.filter((l) => !l.isArchived).sort((a, b) => a.position - b.position),
    [lists]
  );
  const archivedLists = useMemo(() => lists.filter((l) => l.isArchived), [lists]);
  const archivedCards = useMemo(() => cards.filter((c) => c.isArchived), [cards]);
  const hasActiveFilters = Boolean(filterText.trim()) || Boolean(filterMember) || Boolean(filterLabel) || filterDue !== "all" || filterStatus !== "all";
  const filteredCards = useMemo(() => {
    return cards.filter((c) => !c.isArchived).filter((c) => {
      if (filterText.trim()) {
        const q = filterText.trim().toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !(c.description || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filterMember && !c.assignees.includes(filterMember)) return false;
      if (filterLabel && !c.labels.includes(filterLabel)) return false;
      if (filterStatus === "completed" && !c.isCompleted) return false;
      if (filterStatus === "open" && c.isCompleted) return false;
      if (filterDue !== "all") {
        const status = getDueStatus(c.dueDate, c.isCompleted);
        if (filterDue === "overdue" && status !== "overdue") return false;
        if (filterDue === "soon" && status !== "soon") return false;
        if (filterDue === "none" && c.dueDate) return false;
      }
      return true;
    }).sort((a, b) => a.position - b.position);
  }, [cards, filterText, filterMember, filterLabel, filterStatus, filterDue]);
  const handleDragStart = (event) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith("list-")) {
      const listId = activeId.replace("list-", "");
      const listObj = activeLists.find((l) => l._id === listId) || null;
      setActiveDragList(listObj);
    } else if (activeId.startsWith("card-")) {
      const cardId = activeId.replace("card-", "");
      const cardObj = cards.find((c) => c._id === cardId) || null;
      setActiveDragCard(cardObj);
      setDragOriginListId(cardObj?.listId || null);
    }
  };
  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("card-")) return;
    const draggedCardId = activeId.replace("card-", "");
    const draggedCard = cards.find((c) => c._id === draggedCardId);
    if (!draggedCard) return;
    let targetListId = "";
    if (overId.startsWith("list-")) {
      targetListId = overId.replace("list-", "");
    } else if (overId.startsWith("card-")) {
      const overCardId = overId.replace("card-", "");
      const overCard = cards.find((c) => c._id === overCardId);
      if (overCard) targetListId = overCard.listId;
    }
    if (!targetListId || draggedCard.listId === targetListId) return;
    setCards((prev) => {
      const targetCards = prev.filter((c) => !c.isArchived && c.listId === targetListId && c._id !== draggedCardId).sort((a, b) => a.position - b.position);
      let insertIndex = targetCards.length;
      if (overId.startsWith("card-")) {
        const overCardId = overId.replace("card-", "");
        const idx = targetCards.findIndex((c) => c._id === overCardId);
        if (idx !== -1) insertIndex = idx;
      }
      const updatedDragged = { ...draggedCard, listId: targetListId };
      targetCards.splice(insertIndex, 0, updatedDragged);
      const newPositions = /* @__PURE__ */ new Map();
      targetCards.forEach((c, i) => newPositions.set(c._id, { listId: targetListId, position: i }));
      return prev.map((c) => {
        const pos = newPositions.get(c._id);
        return pos ? { ...c, listId: pos.listId, position: pos.position } : c;
      });
    });
  };
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    const originListId = dragOriginListId;
    setActiveDragCard(null);
    setActiveDragList(null);
    setDragOriginListId(null);
    if (!over || !board || !canEdit) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId.startsWith("list-") && overId.startsWith("list-")) {
      const aId = activeId.replace("list-", "");
      const oId = overId.replace("list-", "");
      if (aId === oId) return;
      const oldIndex = activeLists.findIndex((l) => l._id === aId);
      const newIndex = activeLists.findIndex((l) => l._id === oId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(activeLists, oldIndex, newIndex).map((l, idx) => ({
        ...l,
        position: idx
      }));
      setLists((prev) => [...prev.filter((l) => l.isArchived), ...reordered]);
      try {
        await api.put("/lists/reorder", {
          boardId: board._id,
          orderedIds: reordered.map((l) => l._id)
        });
      } catch {
        showToast("Failed to save list order", "error");
        fetchBoard();
      }
      return;
    }
    if (activeId.startsWith("card-")) {
      const draggedCardId = activeId.replace("card-", "");
      const draggedCard = cards.find((c) => c._id === draggedCardId);
      if (!draggedCard) return;
      const destListId = draggedCard.listId;
      const destCards = cards.filter((c) => !c.isArchived && c.listId === destListId).sort((a, b) => a.position - b.position);
      let finalDestCards = destCards;
      if (overId.startsWith("card-")) {
        const overCardId = overId.replace("card-", "");
        const oldIdx = destCards.findIndex((c) => c._id === draggedCardId);
        const newIdx = destCards.findIndex((c) => c._id === overCardId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          finalDestCards = arrayMove(destCards, oldIdx, newIdx);
        }
      }
      const updates = [];
      finalDestCards.forEach((c, idx) => {
        updates.push({ _id: c._id, listId: destListId, position: idx });
      });
      if (originListId && originListId !== destListId) {
        const sourceCards = cards.filter((c) => !c.isArchived && c.listId === originListId && c._id !== draggedCardId).sort((a, b) => a.position - b.position);
        sourceCards.forEach((c, idx) => {
          updates.push({ _id: c._id, listId: originListId, position: idx });
        });
      }
      const updateMap = new Map(updates.map((u) => [u._id, u]));
      setCards(
        (prev) => prev.map((c) => {
          const u = updateMap.get(c._id);
          return u ? { ...c, listId: u.listId, position: u.position } : c;
        })
      );
      try {
        await api.put("/cards/reorder", {
          boardId: board._id,
          updates,
          movedCardId: draggedCardId,
          fromListId: originListId,
          toListId: destListId
        });
      } catch {
        showToast("Failed to save card position", "error");
        fetchBoard();
      }
    }
  };
  const handleSaveTitle = async () => {
    setEditingTitle(false);
    if (!board || !titleInput.trim() || titleInput.trim() === board.title) {
      setTitleInput(board?.title || "");
      return;
    }
    try {
      const res = await api.put(`/boards/${board._id}`, { title: titleInput.trim() });
      setBoard(res.data.board);
      window.dispatchEvent(new Event("taskline:refresh-sidebar"));
    } catch {
      showToast("Failed to rename board", "error");
    }
  };
  const handleSaveDescription = async (e) => {
    e.preventDefault();
    if (!board) return;
    try {
      const res = await api.put(`/boards/${board._id}`, { description: descInput });
      setBoard(res.data.board);
      setEditingDescOpen(false);
      showToast("Board description updated");
    } catch {
      showToast("Failed to update description", "error");
    }
  };
  const handleChangeBackground = async (bg) => {
    if (!board) return;
    try {
      const res = await api.put(`/boards/${board._id}`, { background: bg });
      setBoard(res.data.board);
      setShowBgPicker(false);
      showToast("Background updated");
    } catch {
      showToast("Failed to change background", "error");
    }
  };
  const handleToggleStar = async () => {
    if (!board) return;
    try {
      const res = await api.post(`/boards/${board._id}/star`);
      setBoard(res.data.board);
      window.dispatchEvent(new Event("taskline:refresh-sidebar"));
    } catch {
      showToast("Failed to update star", "error");
    }
  };
  const handleArchiveBoard = async () => {
    if (!board) return;
    try {
      await api.put(`/boards/${board._id}`, { isArchived: !board.isArchived });
      showToast(board.isArchived ? "Board restored" : "Board archived");
      navigate(`/workspace/${board.workspaceId}`);
    } catch {
      showToast("Failed to update board archive state", "error");
    }
  };
  const handleDeleteBoard = async () => {
    if (!board) return;
    try {
      await api.delete(`/boards/${board._id}`);
      showToast("Board deleted");
      window.dispatchEvent(new Event("taskline:refresh-sidebar"));
      navigate(`/workspace/${board.workspaceId}`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete board", "error");
    }
  };
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!board || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post(`/boards/${board._id}/members`, {
        email: inviteEmail.trim(),
        memberRole: inviteRole
      });
      setInviteEmail("");
      showToast("Member invited to board");
      fetchBoard();
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to invite member", "error");
    } finally {
      setInviting(false);
    }
  };
  const handleUpdateMemberRole = async (userId, memberRole) => {
    if (!board) return;
    try {
      await api.put(`/boards/${board._id}/members/${userId}`, { memberRole });
      showToast("Member permission updated");
      fetchBoard();
    } catch {
      showToast("Failed to update permission", "error");
    }
  };
  const handleRemoveMember = async (userId) => {
    if (!board) return;
    try {
      await api.delete(`/boards/${board._id}/members/${userId}`);
      showToast("Member removed");
      fetchBoard();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to remove member", "error");
    }
  };
  const handleAddList = async (e) => {
    e.preventDefault();
    if (!board || !newListTitle.trim()) return;
    try {
      const res = await api.post("/lists", { title: newListTitle.trim(), boardId: board._id });
      setLists((prev) => prev.some((l) => l._id === res.data.list._id) ? prev : [...prev, res.data.list]);
      setNewListTitle("");
      setAddingList(false);
    } catch {
      showToast("Failed to create list", "error");
    }
  };
  const handleRenameList = async (listId, title) => {
    try {
      const res = await api.put(`/lists/${listId}`, { title });
      setLists((prev) => prev.map((l) => l._id === listId ? res.data.list : l));
    } catch {
      showToast("Failed to rename list", "error");
    }
  };
  const handleArchiveList = async (listId) => {
    try {
      const res = await api.put(`/lists/${listId}`, { isArchived: true });
      setLists((prev) => prev.map((l) => l._id === listId ? res.data.list : l));
      showToast("List archived");
    } catch {
      showToast("Failed to archive list", "error");
    }
  };
  const handleRestoreList = async (listId) => {
    try {
      const res = await api.put(`/lists/${listId}`, { isArchived: false });
      setLists((prev) => prev.map((l) => l._id === listId ? res.data.list : l));
      showToast("List restored");
    } catch {
      showToast("Failed to restore list", "error");
    }
  };
  const handleDeleteList = async (listId) => {
    try {
      await api.delete(`/lists/${listId}`);
      setLists((prev) => prev.filter((l) => l._id !== listId));
      setCards((prev) => prev.filter((c) => c.listId !== listId));
      showToast("List deleted");
    } catch {
      showToast("Failed to delete list", "error");
    }
  };
  const handleAddCard = async (listId, title) => {
    if (!board) return;
    try {
      const res = await api.post("/cards", { title, listId, boardId: board._id });
      setCards((prev) => prev.some((c) => c._id === res.data.card._id) ? prev : [...prev, res.data.card]);
    } catch {
      showToast("Failed to add card", "error");
    }
  };
  const handleRestoreCard = async (cardId) => {
    try {
      const res = await api.put(`/cards/${cardId}`, { isArchived: false });
      setCards((prev) => prev.map((c) => c._id === cardId ? { ...c, ...res.data.card } : c));
      showToast("Card restored");
    } catch {
      showToast("Failed to restore card", "error");
    }
  };
  if (loading || !board) {
    return <div className="flex-1 p-6 space-y-4 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="flex gap-4">
          <div className="w-72 h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="w-72 h-72 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="w-72 h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>;
  }
  const isStarred = Boolean(user && board.isStarredBy?.includes(user._id));
  const isImageOrGradient = board.background?.type === "image" || board.background?.type === "gradient";
  const boardBgStyle = board.background?.type === "image" ? { backgroundImage: `url(${board.background.value})`, backgroundSize: "cover", backgroundPosition: "center" } : board.background?.type === "gradient" ? { background: board.background.value } : { backgroundColor: board.background?.value || "#F1F5F9" };
  const selectedCard = selectedCardId ? cards.find((c) => c._id === selectedCardId) : null;
  const selectedCardList = selectedCard ? lists.find((l) => l._id === selectedCard.listId) : null;
  return <div className="flex-1 flex flex-col relative min-h-0 overflow-hidden" style={boardBgStyle}>
      {
    /* Scrim for image/gradient legibility */
  }
      {isImageOrGradient && <div className="absolute inset-0 bg-slate-950/25 pointer-events-none" />}

      {
    /* Board Sub-Header Toolbar */
  }
      <div
    className={`relative z-20 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b backdrop-blur-md ${isImageOrGradient ? "bg-slate-950/45 border-white/15 text-white" : "bg-white/85 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"}`}
  >
        {
    /* Left: Breadcrumb, Title, Star, Description */
  }
        <div className="flex items-center gap-3 min-w-0">
          {workspace && <Link
    to={`/workspace/${workspace._id}`}
    className={`hidden sm:inline-flex items-center gap-1 text-xs font-medium hover:underline whitespace-nowrap ${isImageOrGradient ? "text-slate-200" : "text-slate-500 dark:text-slate-400"}`}
  >
              <ChevronLeft className="w-3.5 h-3.5" />
              {workspace.name}
            </Link>}

          {editingTitle && canEdit ? <input
    type="text"
    value={titleInput}
    onChange={(e) => setTitleInput(e.target.value)}
    onBlur={handleSaveTitle}
    onKeyDown={(e) => {
      if (e.key === "Enter") handleSaveTitle();
      if (e.key === "Escape") {
        setTitleInput(board.title);
        setEditingTitle(false);
      }
    }}
    className="px-2 py-1 text-base font-bold rounded border border-blue-500 bg-white text-slate-900 focus:outline-none"
    autoFocus
  /> : <h1
    onClick={() => canEdit && setEditingTitle(true)}
    className={`text-base font-bold truncate max-w-xs sm:max-w-md ${canEdit ? "cursor-text hover:opacity-80" : ""}`}
  >
              {board.title}
            </h1>}

          <button
    type="button"
    onClick={handleToggleStar}
    aria-label={isStarred ? "Unstar board" : "Star board"}
    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
  >
            <Star className={`w-4 h-4 ${isStarred ? "text-amber-400 fill-amber-400" : ""}`} />
          </button>

          {canEdit && <button
    type="button"
    onClick={() => setEditingDescOpen(true)}
    className={`hidden md:inline-block text-xs px-2.5 py-1 rounded-md border whitespace-nowrap ${isImageOrGradient ? "border-white/25 hover:bg-white/10 text-slate-100" : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
  >
              {board.description ? "Edit Info" : "Add Info"}
            </button>}
        </div>

        {
    /* Right: Active Presence, Filters, Background, Members, Activity, Archive */
  }
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {presenceUsers.length > 0 && <div className="hidden sm:flex items-center -space-x-1.5 mr-1" title="Currently viewing board">
              {presenceUsers.slice(0, 4).map((pu) => <Avatar key={pu._id} name={pu.name} size="xs" className="ring-2 ring-white/80 dark:ring-slate-900" />)}
            </div>}

          <button
    type="button"
    onClick={() => setShowFilters((v) => !v)}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap ${hasActiveFilters ? "bg-blue-600 border-blue-600 text-white" : isImageOrGradient ? "border-white/25 hover:bg-white/10 text-white" : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
  >
            <Filter className="w-3.5 h-3.5" />
            Filter{hasActiveFilters ? " (Active)" : ""}
          </button>

          {canEdit && <div className="relative">
              <button
    type="button"
    onClick={() => setShowBgPicker((v) => !v)}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap ${isImageOrGradient ? "border-white/25 hover:bg-white/10 text-white" : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
  >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Backdrop</span>
              </button>

              {showBgPicker && <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-40 text-slate-900 dark:text-slate-100">
                  <div className="text-xs font-semibold mb-2">Board Backdrop</div>
                  <div className="grid grid-cols-3 gap-2">
                    {BOARD_BACKGROUNDS.map((bg) => {
    const style = bg.type === "image" ? { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" } : bg.type === "gradient" ? { background: bg.value } : { backgroundColor: bg.value };
    return <button
      key={bg.label}
      type="button"
      onClick={() => handleChangeBackground(bg)}
      title={bg.label}
      style={style}
      className="h-12 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:opacity-90"
    >
                          {board.background?.label === bg.label && <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>}
                        </button>;
  })}
                  </div>
                </div>}
            </div>}

          <button
    type="button"
    onClick={() => setShowMembersModal(true)}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap ${isImageOrGradient ? "border-white/25 hover:bg-white/10 text-white" : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
  >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Members ({members.length})</span>
          </button>

          <button
    type="button"
    onClick={() => {
      setShowActivity((v) => !v);
      setShowArchived(false);
    }}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap ${isImageOrGradient ? "border-white/25 hover:bg-white/10 text-white" : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
  >
            <History className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Activity</span>
          </button>

          <button
    type="button"
    onClick={() => {
      setShowArchived((v) => !v);
      setShowActivity(false);
    }}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap ${isImageOrGradient ? "border-white/25 hover:bg-white/10 text-white" : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
  >
            <Archive className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Archive</span>
          </button>
        </div>
      </div>

      {
    /* Filter Bar */
  }
      {showFilters && <div className="relative z-20 px-4 sm:px-6 py-3 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <input
    type="search"
    value={filterText}
    onChange={(e) => setFilterText(e.target.value)}
    placeholder="Filter cards by keyword..."
    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 w-52"
  />

          <select
    value={filterMember}
    onChange={(e) => setFilterMember(e.target.value)}
    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
  >
            <option value="">All Members</option>
            {members.map((m) => <option key={m.userId} value={m.userId}>
                {m.user?.name}
              </option>)}
          </select>

          <select
    value={filterLabel}
    onChange={(e) => setFilterLabel(e.target.value)}
    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
  >
            <option value="">All Labels</option>
            {labels.map((l) => <option key={l._id} value={l._id}>
                {l.name}
              </option>)}
          </select>

          <select
    value={filterDue}
    onChange={(e) => setFilterDue(e.target.value)}
    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
  >
            <option value="all">Any Due Date</option>
            <option value="overdue">Overdue</option>
            <option value="soon">Due within 24h</option>
            <option value="none">No Due Date</option>
          </select>

          <select
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
  >
            <option value="all">All Statuses</option>
            <option value="open">Open Only</option>
            <option value="completed">Completed Only</option>
          </select>

          {hasActiveFilters && <button
    type="button"
    onClick={() => {
      setFilterText("");
      setFilterMember("");
      setFilterLabel("");
      setFilterDue("all");
      setFilterStatus("all");
    }}
    className="text-xs font-medium text-blue-600 hover:underline"
  >
              Clear filters
            </button>}
        </div>}

      {
    /* Kanban Canvas + Slide-Over Drawers */
  }
      <div className="relative z-10 flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6 board-scroll">
          <DndContext
    sensors={sensors}
    collisionDetection={closestCorners}
    onDragStart={handleDragStart}
    onDragOver={handleDragOver}
    onDragEnd={handleDragEnd}
  >
            <div className="flex items-start gap-4 h-full">
              <SortableContext
    items={activeLists.map((l) => `list-${l._id}`)}
    strategy={horizontalListSortingStrategy}
  >
                {activeLists.map((list) => {
    const listCards = filteredCards.filter((c) => c.listId === list._id);
    return <BoardListColumn
      key={list._id}
      list={list}
      cards={listCards}
      boardLabels={labels}
      boardMembers={members}
      canEdit={canEdit}
      onRenameList={handleRenameList}
      onArchiveList={handleArchiveList}
      onDeleteList={handleDeleteList}
      onAddCard={handleAddCard}
      onSelectCard={(cardId) => setSearchParams({ card: cardId })}
    />;
  })}
              </SortableContext>

              {
    /* Add New List */
  }
              {canEdit && <div className="w-72 shrink-0">
                  {addingList ? <form
    onSubmit={handleAddList}
    className="p-3 rounded-xl bg-slate-100/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm"
  >
                      <input
    type="text"
    value={newListTitle}
    onChange={(e) => setNewListTitle(e.target.value)}
    placeholder="Enter list title..."
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
    autoFocus
  />
                      <div className="flex items-center gap-2">
                        <button
    type="submit"
    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
  >
                          Add List
                        </button>
                        <button
    type="button"
    onClick={() => {
      setAddingList(false);
      setNewListTitle("");
    }}
    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
  >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </form> : <button
    type="button"
    onClick={() => setAddingList(true)}
    className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border transition-colors ${isImageOrGradient ? "bg-slate-950/40 hover:bg-slate-950/55 border-white/20 text-white backdrop-blur-sm" : "bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"}`}
  >
                      <Plus className="w-4 h-4" />
                      Add another list
                    </button>}
                </div>}
            </div>

            <DragOverlay>
              {activeDragCard ? <div className="w-72 rotate-1 opacity-95 shadow-xl">
                  <BoardCardItem
    card={activeDragCard}
    boardLabels={labels}
    boardMembers={members}
    onClick={() => {
    }}
  />
                </div> : activeDragList ? <div className="w-76 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-2 border-blue-600 shadow-2xl opacity-90">
                  <div className="text-sm font-semibold">{activeDragList.title}</div>
                </div> : null}
            </DragOverlay>
          </DndContext>
        </div>

        {
    /* Activity Drawer */
  }
        {showActivity && <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Board Activity</h2>
              <button
    type="button"
    onClick={() => setShowActivity(false)}
    className="p-1 rounded text-slate-400 hover:text-slate-600"
  >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activities.length === 0 ? <p className="text-xs text-slate-500">No activity recorded yet.</p> : activities.map((act) => <div key={act._id} className="flex items-start gap-2.5 text-xs">
                    <Avatar name={act.user?.name} src={act.user?.avatar} size="xs" className="mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-slate-700 dark:text-slate-300 leading-snug">
                        <span className="font-semibold text-slate-900 dark:text-white">{act.user?.name || "User"}</span>{" "}
                        {act.action}
                      </p>
                      <span className="text-[11px] font-mono text-slate-400">
                        {formatRelativeTime(act.createdAt)}
                      </span>
                    </div>
                  </div>)}
            </div>
          </aside>}

        {
    /* Archive & Board Management Drawer */
  }
        {showArchived && <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Archive & Board Controls</h2>
              <button
    type="button"
    onClick={() => setShowArchived(false)}
    className="p-1 rounded text-slate-400 hover:text-slate-600"
  >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">
                  Archived Lists ({archivedLists.length})
                </h3>
                {archivedLists.length === 0 ? <p className="text-xs text-slate-400">No archived lists.</p> : <div className="space-y-2">
                    {archivedLists.map((l) => <div
    key={l._id}
    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
  >
                        <span className="font-medium truncate">{l.title}</span>
                        {canEdit && <button
    type="button"
    onClick={() => handleRestoreList(l._id)}
    className="inline-flex items-center gap-1 text-blue-600 hover:underline shrink-0"
  >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>}
                      </div>)}
                  </div>}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">
                  Archived Cards ({archivedCards.length})
                </h3>
                {archivedCards.length === 0 ? <p className="text-xs text-slate-400">No archived cards.</p> : <div className="space-y-2">
                    {archivedCards.map((c) => <div
    key={c._id}
    className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
  >
                        <span className="font-medium truncate">{c.title}</span>
                        {canEdit && <button
    type="button"
    onClick={() => handleRestoreCard(c._id)}
    className="inline-flex items-center gap-1 text-blue-600 hover:underline shrink-0"
  >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>}
                      </div>)}
                  </div>}
              </div>

              {isAdmin && <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <button
    type="button"
    onClick={handleArchiveBoard}
    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
  >
                    <Archive className="w-3.5 h-3.5" />
                    {board.isArchived ? "Restore Board" : "Archive Board"}
                  </button>
                  <button
    type="button"
    onClick={handleDeleteBoard}
    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Board Permanently
                  </button>
                </div>}
            </div>
          </aside>}
      </div>

      {
    /* Card Detail Modal */
  }
      {selectedCard && <CardDetailModal
    cardId={selectedCard._id}
    listTitle={selectedCardList?.title || "List"}
    boardMembers={members}
    boardLabels={labels}
    userRole={role}
    onClose={() => {
      searchParams.delete("card");
      setSearchParams(searchParams);
    }}
    onBoardChanged={fetchBoard}
  />}

      {
    /* Board Description Modal */
  }
      {editingDescOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
    onSubmit={handleSaveDescription}
    className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl"
  >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Board Information</h2>
              <button type="button" onClick={() => setEditingDescOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
    rows={4}
    value={descInput}
    onChange={(e) => setDescInput(e.target.value)}
    placeholder="Describe the board goals, sprint cadence, or guidelines..."
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setEditingDescOpen(false)}
    className="px-3 py-1.5 text-xs rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
                Cancel
              </button>
              <button
    type="submit"
    className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
  >
                Save Description
              </button>
            </div>
          </form>
        </div>}

      {
    /* Board Members & Permissions Modal */
  }
      {showMembersModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Board Members & Permissions</h2>
              <button type="button" onClick={() => setShowMembersModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isAdmin && <form onSubmit={handleInviteMember} className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex gap-2">
                  <input
    type="email"
    value={inviteEmail}
    onChange={(e) => setInviteEmail(e.target.value)}
    placeholder="Invite user by email..."
    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  />
                  <select
    value={inviteRole}
    onChange={(e) => setInviteRole(e.target.value)}
    className="px-2 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button
    type="submit"
    disabled={inviting}
    className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
  >
                  <UserPlus className="w-3.5 h-3.5" />
                  {inviting ? "Sending Invite..." : "Invite to Board"}
                </button>
              </form>}

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {members.map((m) => {
    const isBoardOwner = String(m.userId) === String(board.ownerId);
    return <div key={m.userId} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={m.user?.name} src={m.user?.avatar} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{m.user?.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{m.user?.email}</div>
                      </div>
                    </div>

                    {isAdmin && !isBoardOwner ? <div className="flex items-center gap-1.5 shrink-0">
                        <select
      value={m.role}
      onChange={(e) => handleUpdateMemberRole(m.userId, e.target.value)}
      className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 capitalize"
    >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        {m.source === "board" && <button
      type="button"
      onClick={() => handleRemoveMember(m.userId)}
      className="p-1 text-slate-400 hover:text-red-600"
    >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>}
                      </div> : <span className="text-[11px] text-slate-500 capitalize">
                        {isBoardOwner ? "Owner" : m.role}
                      </span>}
                  </div>;
  })}
            </div>
          </div>
        </div>}
    </div>;
}
export {
  BoardPage as default
};
