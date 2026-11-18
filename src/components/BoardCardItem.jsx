import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, CheckSquare, MessageSquare, Paperclip, Check } from "lucide-react";
import { formatShortDate, getDueStatus } from "../utils/backgrounds";
import Avatar from "./Avatar";
function BoardCardItem({
  card,
  boardLabels,
  boardMembers,
  disabled,
  onClick
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card._id}`,
    data: { type: "card", card },
    disabled
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  const cardLabels = boardLabels.filter((l) => card.labels?.includes(l._id));
  const cardAssignees = boardMembers.filter((m) => card.assignees?.includes(m.userId));
  const dueStatus = getDueStatus(card.dueDate, card.isCompleted);
  const clSummary = card.checklistSummary || { total: 0, completed: 0 };
  const hasMeta = Boolean(card.dueDate) || clSummary.total > 0 || (card.commentsCount || 0) > 0 || (card.attachmentsCount || 0) > 0 || cardAssignees.length > 0;
  return <div
    ref={setNodeRef}
    style={style}
    {...attributes}
    {...listeners}
    onClick={onClick}
    className={`group rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-xs hover:border-blue-500/70 transition-colors cursor-pointer select-none ${isDragging ? "opacity-40 ring-2 ring-blue-600" : ""}`}
  >
      {
    /* Colored Label Bars */
  }
      {cardLabels.length > 0 && <div className="flex flex-wrap gap-1 mb-2">
          {cardLabels.map((lbl) => <span
    key={lbl._id}
    style={{ backgroundColor: lbl.color }}
    className="px-2 py-0.5 rounded text-[10px] font-semibold text-white leading-tight"
  >
              {lbl.name}
            </span>)}
        </div>}

      {
    /* Title */
  }
      <div className="flex items-start gap-2">
        {card.isCompleted && <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5" />
          </span>}
        <p className={`text-sm font-medium leading-snug text-slate-900 dark:text-slate-100 ${card.isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
          {card.title}
        </p>
      </div>

      {
    /* Metadata & Assignees */
  }
      {hasMeta && <div className="mt-2.5 flex items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {card.dueDate && <span
    className={`inline-flex items-center gap-1 ${dueStatus === "completed" ? "text-emerald-600" : dueStatus === "overdue" ? "text-red-600 font-semibold" : dueStatus === "soon" ? "text-amber-600 font-semibold" : ""}`}
  >
                <Calendar className="w-3 h-3" />
                {formatShortDate(card.dueDate)}
              </span>}

            {clSummary.total > 0 && <span
    className={`inline-flex items-center gap-1 ${clSummary.completed === clSummary.total ? "text-emerald-600" : ""}`}
  >
                <CheckSquare className="w-3 h-3" />
                {clSummary.completed}/{clSummary.total}
              </span>}

            {(card.commentsCount || 0) > 0 && <span className="inline-flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {card.commentsCount}
              </span>}

            {(card.attachmentsCount || 0) > 0 && <span className="inline-flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                {card.attachmentsCount}
              </span>}
          </div>

          {cardAssignees.length > 0 && <div className="flex -space-x-1.5 shrink-0">
              {cardAssignees.slice(0, 3).map((m) => <Avatar key={m.userId} name={m.user?.name} src={m.user?.avatar} size="xs" className="ring-2 ring-white dark:ring-slate-900" />)}
              {cardAssignees.length > 3 && <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-mono flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  +{cardAssignees.length - 3}
                </span>}
            </div>}
        </div>}
    </div>;
}
export {
  BoardCardItem as default
};
