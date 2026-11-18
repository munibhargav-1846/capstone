import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Calendar,
  Tag,
  Users,
  Trash2,
  Archive,
  RotateCcw,
  Plus,
  Download,
  Check,
  Clock,
  FileText
} from "lucide-react";
import api from "../services/api";
import { LABEL_COLORS, formatFileSize, formatRelativeTime, formatShortDate, getDueStatus } from "../utils/backgrounds";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
function CardDetailModal({
  cardId,
  listTitle,
  boardMembers,
  boardLabels,
  userRole,
  onClose,
  onBoardChanged
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canEdit = userRole === "admin" || userRole === "member";
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [titleInput, setTitleInput] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [descInput, setDescInput] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [showMembersMenu, setShowMembersMenu] = useState(false);
  const [showLabelsMenu, setShowLabelsMenu] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].hex);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState({});
  const [commentText, setCommentText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef(null);
  const fetchCardDetails = useCallback(async () => {
    try {
      const res = await api.get(`/cards/${cardId}`);
      setCard(res.data.card);
      setTitleInput(res.data.card.title);
      setDescInput(res.data.card.description || "");
      setChecklists(res.data.checklists || []);
      setComments(res.data.comments || []);
      setAttachments(res.data.attachments || []);
      setActivities(res.data.activities || []);
    } catch {
      showToast("Failed to load card details", "error");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [cardId, onClose, showToast]);
  useEffect(() => {
    fetchCardDetails();
  }, [fetchCardDetails]);
  const updateCard = async (payload) => {
    if (!card || !canEdit) return;
    try {
      const res = await api.put(`/cards/${card._id}`, payload);
      setCard(res.data.card);
      onBoardChanged();
    } catch (err) {
      showToast(err.response?.data?.message || "Update failed", "error");
    }
  };
  const handleSaveTitle = async () => {
    setEditingTitle(false);
    if (!card || !titleInput.trim() || titleInput.trim() === card.title) {
      setTitleInput(card?.title || "");
      return;
    }
    await updateCard({ title: titleInput.trim() });
  };
  const handleSaveDesc = async () => {
    setEditingDesc(false);
    if (!card) return;
    await updateCard({ description: descInput });
    showToast("Description saved");
  };
  const toggleAssignee = async (userId) => {
    if (!card || !canEdit) return;
    const exists = card.assignees.includes(userId);
    const next = exists ? card.assignees.filter((id) => id !== userId) : [...card.assignees, userId];
    await updateCard({ assignees: next });
  };
  const toggleLabel = async (labelId) => {
    if (!card || !canEdit) return;
    const exists = card.labels.includes(labelId);
    const next = exists ? card.labels.filter((id) => id !== labelId) : [...card.labels, labelId];
    await updateCard({ labels: next });
  };
  const handleCreateLabel = async (e) => {
    e.preventDefault();
    if (!card || !newLabelName.trim()) return;
    try {
      const res = await api.post("/labels", {
        boardId: card.boardId,
        name: newLabelName.trim(),
        color: newLabelColor
      });
      setNewLabelName("");
      await updateCard({ labels: [...card.labels, res.data.label._id] });
      onBoardChanged();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create label", "error");
    }
  };
  const handleCreateChecklist = async (e) => {
    e.preventDefault();
    if (!card || !newChecklistTitle.trim()) return;
    try {
      const res = await api.post("/checklists", {
        cardId: card._id,
        boardId: card.boardId,
        title: newChecklistTitle.trim()
      });
      setChecklists((prev) => [...prev, res.data.checklist]);
      setNewChecklistTitle("");
      setAddingChecklist(false);
      onBoardChanged();
    } catch {
      showToast("Failed to add checklist", "error");
    }
  };
  const handleDeleteChecklist = async (checklistId) => {
    try {
      await api.delete(`/checklists/${checklistId}`);
      setChecklists((prev) => prev.filter((c) => c._id !== checklistId));
      onBoardChanged();
    } catch {
      showToast("Failed to remove checklist", "error");
    }
  };
  const handleAddChecklistItem = async (e, checklistId) => {
    e.preventDefault();
    const text = newItemTexts[checklistId]?.trim();
    if (!text) return;
    try {
      const res = await api.post(`/checklists/${checklistId}/items`, { text });
      setChecklists((prev) => prev.map((c) => c._id === checklistId ? res.data.checklist : c));
      setNewItemTexts((prev) => ({ ...prev, [checklistId]: "" }));
      onBoardChanged();
    } catch {
      showToast("Failed to add item", "error");
    }
  };
  const handleToggleChecklistItem = async (checklistId, itemId, current) => {
    if (!canEdit) return;
    try {
      const res = await api.put(`/checklists/${checklistId}/items/${itemId}`, { isCompleted: !current });
      setChecklists((prev) => prev.map((c) => c._id === checklistId ? res.data.checklist : c));
      onBoardChanged();
    } catch {
      showToast("Failed to update item", "error");
    }
  };
  const handleDeleteChecklistItem = async (checklistId, itemId) => {
    try {
      const res = await api.delete(`/checklists/${checklistId}/items/${itemId}`);
      setChecklists((prev) => prev.map((c) => c._id === checklistId ? res.data.checklist : c));
      onBoardChanged();
    } catch {
      showToast("Failed to delete item", "error");
    }
  };
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!card || !commentText.trim()) return;
    try {
      const res = await api.post("/comments", {
        cardId: card._id,
        boardId: card.boardId,
        text: commentText.trim()
      });
      setComments((prev) => [res.data.comment, ...prev]);
      setCommentText("");
      onBoardChanged();
    } catch {
      showToast("Failed to post comment", "error");
    }
  };
  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      onBoardChanged();
    } catch {
      showToast("Failed to delete comment", "error");
    }
  };
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !card) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/attachments/${card._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAttachments((prev) => [res.data.attachment, ...prev]);
      showToast(`Attached "${file.name}"`);
      onBoardChanged();
    } catch (err) {
      showToast(err.response?.data?.message || "File upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const handleDeleteAttachment = async (attId) => {
    try {
      await api.delete(`/attachments/${attId}`);
      setAttachments((prev) => prev.filter((a) => a._id !== attId));
      onBoardChanged();
    } catch {
      showToast("Failed to remove attachment", "error");
    }
  };
  const handleArchiveToggle = async () => {
    if (!card) return;
    await updateCard({ isArchived: !card.isArchived });
    showToast(card.isArchived ? "Card restored to list" : "Card archived");
    if (!card.isArchived) onClose();
  };
  const handleDeleteCard = async () => {
    if (!card) return;
    try {
      await api.delete(`/cards/${card._id}`);
      showToast("Card deleted");
      onBoardChanged();
      onClose();
    } catch {
      showToast("Failed to delete card", "error");
    }
  };
  const dueStatus = getDueStatus(card?.dueDate, card?.isCompleted);
  const assignedMembers = boardMembers.filter((m) => card?.assignees.includes(m.userId));
  const activeLabels = boardLabels.filter((l) => card?.labels.includes(l._id));
  return <div
    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 backdrop-blur-[2px] p-4 sm:p-8"
    onClick={onClose}
  >
      <div
    className="w-full max-w-3xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto overflow-hidden"
    onClick={(e) => e.stopPropagation()}
  >
        {loading || !card ? <div className="p-8 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
            <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div> : <>
            {
    /* Header */
  }
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  <span>In list</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{listTitle}</span>
                  {card.isArchived && <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-600 dark:text-amber-400 font-medium">Archived</span>
                    </>}
                </div>

                {editingTitle && canEdit ? <input
    type="text"
    value={titleInput}
    onChange={(e) => setTitleInput(e.target.value)}
    onBlur={handleSaveTitle}
    onKeyDown={(e) => {
      if (e.key === "Enter") handleSaveTitle();
      if (e.key === "Escape") {
        setTitleInput(card.title);
        setEditingTitle(false);
      }
    }}
    className="w-full text-lg font-semibold px-2 py-1 -ml-2 rounded-md border border-blue-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
    autoFocus
  /> : <h2
    onClick={() => canEdit && setEditingTitle(true)}
    className={`text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug ${canEdit ? "cursor-text hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded px-1 -mx-1" : ""}`}
  >
                    {card.title}
                  </h2>}
              </div>

              <button
    type="button"
    onClick={onClose}
    aria-label="Close card modal"
    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
  >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
              {
    /* Main Column */
  }
              <div className="lg:col-span-2 p-6 space-y-6">
                {
    /* Summary metadata row (Assignees, Labels, Due Date) */
  }
                {(assignedMembers.length > 0 || activeLabels.length > 0 || card.dueDate) && <div className="flex flex-wrap gap-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    {assignedMembers.length > 0 && <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Assignees</div>
                        <div className="flex items-center gap-1.5">
                          {assignedMembers.map((m) => <Avatar key={m.userId} name={m.user?.name} src={m.user?.avatar} size="sm" />)}
                        </div>
                      </div>}

                    {activeLabels.length > 0 && <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Labels</div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeLabels.map((lbl) => <span
    key={lbl._id}
    style={{ backgroundColor: lbl.color }}
    className="px-2.5 py-0.5 rounded-md text-xs font-medium text-white"
  >
                              {lbl.name}
                            </span>)}
                        </div>
                      </div>}

                    {card.dueDate && <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Due Date</div>
                        <button
    type="button"
    disabled={!canEdit}
    onClick={() => updateCard({ isCompleted: !card.isCompleted })}
    className="inline-flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
  >
                          <span
    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${card.isCompleted ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-400 dark:border-slate-500"}`}
  >
                            {card.isCompleted && <Check className="w-2.5 h-2.5" />}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">{formatShortDate(card.dueDate)}</span>
                          {dueStatus === "completed" && <span className="text-emerald-600 font-sans font-medium">Complete</span>}
                          {dueStatus === "overdue" && <span className="text-red-600 font-sans font-medium">Overdue</span>}
                          {dueStatus === "soon" && <span className="text-amber-600 font-sans font-medium">Due soon</span>}
                        </button>
                      </div>}
                  </div>}

                {
    /* Description */
  }
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Description
                    </h3>
                    {canEdit && !editingDesc && <button
    type="button"
    onClick={() => setEditingDesc(true)}
    className="text-xs font-medium text-blue-600 hover:text-blue-700"
  >
                        Edit
                      </button>}
                  </div>
                  {editingDesc && canEdit ? <div className="space-y-2">
                      <textarea
    rows={4}
    value={descInput}
    onChange={(e) => setDescInput(e.target.value)}
    placeholder="Add detailed specifications, acceptance criteria, or links..."
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
    autoFocus
  />
                      <div className="flex items-center gap-2">
                        <button
    type="button"
    onClick={handleSaveDesc}
    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
  >
                          Save
                        </button>
                        <button
    type="button"
    onClick={() => {
      setDescInput(card.description || "");
      setEditingDesc(false);
    }}
    className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
                          Cancel
                        </button>
                      </div>
                    </div> : <div
    onClick={() => canEdit && setEditingDesc(true)}
    className={`text-sm leading-relaxed rounded-lg p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 ${card.description ? "text-slate-700 dark:text-slate-300 whitespace-pre-wrap" : "text-slate-400 italic"} ${canEdit ? "cursor-pointer hover:border-slate-300 dark:hover:border-slate-700" : ""}`}
  >
                      {card.description || "Add a more detailed description..."}
                    </div>}
                </div>

                {
    /* Checklists */
  }
                {checklists.map((cl) => {
    const total = cl.items.length;
    const done = cl.items.filter((i) => i.isCompleted).length;
    const pct = total === 0 ? 0 : Math.round(done / total * 100);
    return <div key={cl._id} className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-slate-400" />
                          {cl.title}
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono tabular-nums text-slate-500">
                            {done}/{total} ({pct}%)
                          </span>
                          {canEdit && <button
      type="button"
      onClick={() => handleDeleteChecklist(cl._id)}
      className="text-xs text-slate-400 hover:text-red-600"
    >
                              Delete
                            </button>}
                        </div>
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
      className="h-full bg-blue-600 transition-all duration-200"
      style={{ width: `${pct}%` }}
    />
                      </div>

                      <div className="space-y-1.5">
                        {cl.items.map((item) => <div
      key={item._id}
      className="flex items-center justify-between gap-2 group py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
                            <button
      type="button"
      disabled={!canEdit}
      onClick={() => handleToggleChecklistItem(cl._id, item._id, item.isCompleted)}
      className="flex items-center gap-2.5 flex-1 text-left"
    >
                              <span
      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${item.isCompleted ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 dark:border-slate-600"}`}
    >
                                {item.isCompleted && <Check className="w-3 h-3" />}
                              </span>
                              <span
      className={`text-sm ${item.isCompleted ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"}`}
    >
                                {item.text}
                              </span>
                            </button>
                            {canEdit && <button
      type="button"
      onClick={() => handleDeleteChecklistItem(cl._id, item._id)}
      aria-label="Remove item"
      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600"
    >
                                <X className="w-3.5 h-3.5" />
                              </button>}
                          </div>)}
                      </div>

                      {canEdit && <form onSubmit={(e) => handleAddChecklistItem(e, cl._id)} className="flex gap-2 pt-1">
                          <input
      type="text"
      value={newItemTexts[cl._id] || ""}
      onChange={(e) => setNewItemTexts((prev) => ({ ...prev, [cl._id]: e.target.value }))}
      placeholder="Add checklist item..."
      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
    />
                          <button
      type="submit"
      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
    >
                            Add
                          </button>
                        </form>}
                    </div>;
  })}

                {
    /* Attachments */
  }
                {attachments.length > 0 && <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      Attachments ({attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {attachments.map((att) => {
    const isImage = att.mimeType.startsWith("image/");
    return <div
      key={att._id}
      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
    >
                            <div className="flex items-center gap-3 min-w-0">
                              {isImage ? <img
      src={att.url}
      alt={att.originalName}
      className="w-12 h-10 object-cover rounded border border-slate-200 dark:border-slate-700 shrink-0"
    /> : <div className="w-12 h-10 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-mono text-slate-600 dark:text-slate-300 shrink-0">
                                  FILE
                                </div>}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {att.originalName}
                                </p>
                                <p className="text-xs text-slate-500 font-mono tabular-nums">
                                  {formatFileSize(att.size)} · {formatRelativeTime(att.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <a
      href={att.url}
      download={att.originalName}
      className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
      title="Download attachment"
    >
                                <Download className="w-4 h-4" />
                              </a>
                              {canEdit && <button
      type="button"
      onClick={() => handleDeleteAttachment(att._id)}
      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
      title="Delete attachment"
    >
                                  <Trash2 className="w-4 h-4" />
                                </button>}
                            </div>
                          </div>;
  })}
                    </div>
                  </div>}

                {
    /* Comments */
  }
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    Comments & Activity
                  </h3>

                  {canEdit && <form onSubmit={handleAddComment} className="flex gap-2.5 items-start">
                      <Avatar name={user?.name} src={user?.avatar} size="sm" className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <textarea
    rows={2}
    value={commentText}
    onChange={(e) => setCommentText(e.target.value)}
    placeholder="Write a comment or update..."
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
  />
                        {commentText.trim() && <button
    type="submit"
    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
  >
                            Post Comment
                          </button>}
                      </div>
                    </form>}

                  <div className="space-y-3 pt-1">
                    {comments.map((cm) => <div key={cm._id} className="flex gap-2.5 items-start">
                        <Avatar name={cm.author?.name} src={cm.author?.avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {cm.author?.name || "Member"}
                              </span>
                              <span className="text-slate-400 font-mono">
                                {formatRelativeTime(cm.createdAt)}
                              </span>
                            </div>
                            {(cm.authorId === user?._id || userRole === "admin") && <button
    type="button"
    onClick={() => handleDeleteComment(cm._id)}
    className="text-xs text-slate-400 hover:text-red-600"
  >
                                Delete
                              </button>}
                          </div>
                          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 whitespace-pre-wrap">
                            {cm.text}
                          </p>
                        </div>
                      </div>)}

                    {activities.slice(0, 6).map((act) => <div key={act._id} className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 pl-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          <strong className="font-medium text-slate-700 dark:text-slate-300">
                            {act.user?.name || "User"}
                          </strong>{" "}
                          {act.action}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{formatRelativeTime(act.createdAt)}</span>
                      </div>)}
                  </div>
                </div>
              </div>

              {
    /* Right Sidebar Actions */
  }
              <div className="p-5 bg-slate-50/70 dark:bg-slate-950/40 space-y-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Card Controls</div>

                {
    /* Members */
  }
                <div className="relative">
                  <button
    type="button"
    disabled={!canEdit}
    onClick={() => {
      setShowMembersMenu((v) => !v);
      setShowLabelsMenu(false);
    }}
    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    Members
                  </button>

                  {showMembersMenu && <div className="mt-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg space-y-1">
                      {boardMembers.map((m) => {
    const isAssigned = card.assignees.includes(m.userId);
    return <button
      key={m.userId}
      type="button"
      onClick={() => toggleAssignee(m.userId)}
      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
    >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={m.user?.name} src={m.user?.avatar} size="xs" />
                              <span className="truncate text-slate-800 dark:text-slate-200">{m.user?.name}</span>
                            </div>
                            {isAssigned && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          </button>;
  })}
                    </div>}
                </div>

                {
    /* Labels */
  }
                <div className="relative">
                  <button
    type="button"
    disabled={!canEdit}
    onClick={() => {
      setShowLabelsMenu((v) => !v);
      setShowMembersMenu(false);
    }}
    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
  >
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    Labels
                  </button>

                  {showLabelsMenu && <div className="mt-1.5 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg space-y-2.5">
                      <div className="space-y-1">
                        {boardLabels.map((lbl) => {
    const selected = card.labels.includes(lbl._id);
    return <button
      key={lbl._id}
      type="button"
      onClick={() => toggleLabel(lbl._id)}
      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs text-white font-medium"
      style={{ backgroundColor: lbl.color }}
    >
                              <span>{lbl.name}</span>
                              {selected && <Check className="w-3.5 h-3.5" />}
                            </button>;
  })}
                      </div>

                      <form onSubmit={handleCreateLabel} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <input
    type="text"
    value={newLabelName}
    onChange={(e) => setNewLabelName(e.target.value)}
    placeholder="New label name..."
    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
  />
                        <div className="flex items-center gap-1.5">
                          {LABEL_COLORS.map((c) => <button
    key={c.hex}
    type="button"
    onClick={() => setNewLabelColor(c.hex)}
    style={{ backgroundColor: c.hex }}
    className={`w-5 h-5 rounded ${newLabelColor === c.hex ? "ring-2 ring-offset-1 ring-slate-900 dark:ring-white" : ""}`}
  />)}
                        </div>
                        <button
    type="submit"
    className="w-full py-1.5 text-xs font-medium rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
  >
                          Create Label
                        </button>
                      </form>
                    </div>}
                </div>

                {
    /* Due Date */
  }
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Due Date
                  </label>
                  <div className="flex gap-1.5">
                    <input
    type="date"
    disabled={!canEdit}
    value={card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""}
    onChange={(e) => updateCard({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono"
  />
                    {card.dueDate && canEdit && <button
    type="button"
    onClick={() => updateCard({ dueDate: null })}
    className="px-2 text-xs text-slate-400 hover:text-red-600"
    title="Clear due date"
  >
                        <X className="w-3.5 h-3.5" />
                      </button>}
                  </div>
                </div>

                {
    /* Add Checklist */
  }
                <div>
                  {addingChecklist ? <form onSubmit={handleCreateChecklist} className="space-y-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <input
    type="text"
    value={newChecklistTitle}
    onChange={(e) => setNewChecklistTitle(e.target.value)}
    placeholder="Checklist title..."
    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
    autoFocus
  />
                      <div className="flex gap-1.5">
                        <button
    type="submit"
    className="flex-1 py-1.5 text-xs font-medium rounded bg-blue-600 text-white"
  >
                          Add
                        </button>
                        <button
    type="button"
    onClick={() => setAddingChecklist(false)}
    className="px-2.5 py-1.5 text-xs rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
                          Cancel
                        </button>
                      </div>
                    </form> : <button
    type="button"
    disabled={!canEdit}
    onClick={() => setAddingChecklist(true)}
    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
  >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      Add Checklist
                    </button>}
                </div>

                {
    /* Attachment Upload */
  }
                <div>
                  <input
    ref={fileInputRef}
    type="file"
    onChange={handleFileUpload}
    className="hidden"
  />
                  <button
    type="button"
    disabled={!canEdit || uploading}
    onClick={() => fileInputRef.current?.click()}
    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    {uploading ? "Uploading..." : "Attach File"}
                  </button>
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                {
    /* Archive / Delete */
  }
                {canEdit && <div className="space-y-2">
                    <button
    type="button"
    onClick={handleArchiveToggle}
    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
  >
                      {card.isArchived ? <>
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          Restore to List
                        </> : <>
                          <Archive className="w-3.5 h-3.5 text-slate-500" />
                          Archive Card
                        </>}
                    </button>

                    {!confirmDelete ? <button
    type="button"
    onClick={() => setConfirmDelete(true)}
    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
  >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Card
                      </button> : <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 space-y-2">
                        <p className="text-xs text-red-700 dark:text-red-300">Permanently delete this card?</p>
                        <div className="flex gap-2">
                          <button
    type="button"
    onClick={handleDeleteCard}
    className="flex-1 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700"
  >
                            Confirm
                          </button>
                          <button
    type="button"
    onClick={() => setConfirmDelete(false)}
    className="px-2.5 py-1 text-xs rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
  >
                            Cancel
                          </button>
                        </div>
                      </div>}
                  </div>}
              </div>
            </div>
          </>}
      </div>
    </div>;
}
export {
  CardDetailModal as default
};
