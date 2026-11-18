import { useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus, X, Archive, Trash2 } from "lucide-react";
import BoardCardItem from "./BoardCardItem";
function BoardListColumn({
  list,
  cards,
  boardLabels,
  boardMembers,
  canEdit,
  onRenameList,
  onArchiveList,
  onDeleteList,
  onAddCard,
  onSelectCard
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `list-${list._id}`,
    data: { type: "list", list },
    disabled: !canEdit
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition
  };
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(list.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [submittingCard, setSubmittingCard] = useState(false);
  const handleSaveTitle = async () => {
    setEditingTitle(false);
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === list.title) {
      setTitleInput(list.title);
      return;
    }
    await onRenameList(list._id, trimmed);
  };
  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (!newCardTitle.trim() || submittingCard) return;
    setSubmittingCard(true);
    try {
      await onAddCard(list._id, newCardTitle.trim());
      setNewCardTitle("");
      setAddingCard(false);
    } finally {
      setSubmittingCard(false);
    }
  };
  return <div
    ref={setNodeRef}
    style={style}
    className={`w-76 shrink-0 flex flex-col max-h-full rounded-xl bg-slate-100/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-sm ${isDragging ? "opacity-50 ring-2 ring-blue-600" : ""}`}
  >
      {
    /* List Header */
  }
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {canEdit && <button
    type="button"
    {...attributes}
    {...listeners}
    aria-label="Drag list"
    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing shrink-0"
  >
              <GripVertical className="w-4 h-4" />
            </button>}

          {editingTitle && canEdit ? <input
    type="text"
    value={titleInput}
    onChange={(e) => setTitleInput(e.target.value)}
    onBlur={handleSaveTitle}
    onKeyDown={(e) => {
      if (e.key === "Enter") handleSaveTitle();
      if (e.key === "Escape") {
        setTitleInput(list.title);
        setEditingTitle(false);
      }
    }}
    className="flex-1 min-w-0 px-2 py-1 text-sm font-semibold rounded border border-blue-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
    autoFocus
  /> : <h3
    onClick={() => {
      if (canEdit) {
        setTitleInput(list.title);
        setEditingTitle(true);
      }
    }}
    className={`text-sm font-semibold text-slate-800 dark:text-slate-100 truncate px-1 ${canEdit ? "cursor-text hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded" : ""}`}
  >
              {list.title}
            </h3>}

          <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">{cards.length}</span>
        </div>

        {canEdit && <div className="relative">
            <button
    type="button"
    onClick={() => setMenuOpen((v) => !v)}
    aria-label="List actions"
    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800"
  >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && <div className="absolute right-0 mt-1 w-44 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1 z-30">
                <button
    type="button"
    onClick={() => {
      setMenuOpen(false);
      setAddingCard(true);
    }}
    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
  >
                  <Plus className="w-3.5 h-3.5" />
                  Add Card
                </button>
                <button
    type="button"
    onClick={() => {
      setMenuOpen(false);
      onArchiveList(list._id);
    }}
    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
  >
                  <Archive className="w-3.5 h-3.5" />
                  Archive List
                </button>
                <button
    type="button"
    onClick={() => {
      setMenuOpen(false);
      onDeleteList(list._id);
    }}
    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
  >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete List
                </button>
              </div>}
          </div>}
      </div>

      {
    /* Cards Container */
  }
      <div className="flex-1 overflow-y-auto px-2.5 pb-2 space-y-2 min-h-[2.5rem] board-scroll">
        <SortableContext items={cards.map((c) => `card-${c._id}`)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => <BoardCardItem
    key={card._id}
    card={card}
    boardLabels={boardLabels}
    boardMembers={boardMembers}
    disabled={!canEdit}
    onClick={() => onSelectCard(card._id)}
  />)}
        </SortableContext>
      </div>

      {
    /* Add Card Footer */
  }
      {canEdit && <div className="p-2.5 pt-1">
          {addingCard ? <form onSubmit={handleCreateCard} className="space-y-2">
              <textarea
    rows={2}
    value={newCardTitle}
    onChange={(e) => setNewCardTitle(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleCreateCard(e);
      }
      if (e.key === "Escape") {
        setAddingCard(false);
        setNewCardTitle("");
      }
    }}
    placeholder="Enter a title for this card..."
    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
    autoFocus
  />
              <div className="flex items-center gap-2">
                <button
    type="submit"
    disabled={submittingCard}
    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
  >
                  Add Card
                </button>
                <button
    type="button"
    onClick={() => {
      setAddingCard(false);
      setNewCardTitle("");
    }}
    aria-label="Cancel adding card"
    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
  >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form> : <button
    type="button"
    onClick={() => setAddingCard(true)}
    className="w-full flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
  >
              <Plus className="w-3.5 h-3.5" />
              Add a card
            </button>}
        </div>}
    </div>;
}
export {
  BoardListColumn as default
};
