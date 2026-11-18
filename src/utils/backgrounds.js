const BOARD_BACKGROUNDS = [
  { type: "color", value: "#F1F5F9", label: "Slate Mist" },
  { type: "color", value: "#EEF2FF", label: "Cool Indigo" },
  { type: "color", value: "#ECFDF5", label: "Sage Whisper" },
  { type: "gradient", value: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)", label: "Midnight Cobalt" },
  { type: "gradient", value: "linear-gradient(135deg, #1E293B 0%, #334155 100%)", label: "Graphite Slate" },
  { type: "gradient", value: "linear-gradient(135deg, #064E3B 0%, #0F766E 100%)", label: "Deep Pine" },
  {
    type: "image",
    value: "/src/assets/images/board_bg_alpine_1794989079791.jpg",
    label: "Architectural Studio"
  },
  {
    type: "image",
    value: "/src/assets/images/board_bg_slate_1794989081070.jpg",
    label: "Slate Horizon"
  },
  {
    type: "image",
    value: "/src/assets/images/board_bg_nordic_1794989079829.jpg",
    label: "Nordic Ridge"
  }
];
const LABEL_COLORS = [
  { name: "Cobalt", hex: "#2563EB" },
  { name: "Teal", hex: "#0D9488" },
  { name: "Emerald", hex: "#16A34A" },
  { name: "Amber", hex: "#D97706" },
  { name: "Crimson", hex: "#DC2626" },
  { name: "Slate", hex: "#475569" }
];
function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr).getTime();
  const diffSec = Math.floor((Date.now() - d) / 1e3);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function getDueStatus(dueDate, isCompleted) {
  if (!dueDate) return null;
  if (isCompleted) return "completed";
  const diffHours = (new Date(dueDate).getTime() - Date.now()) / (1e3 * 60 * 60);
  if (diffHours < 0) return "overdue";
  if (diffHours <= 24) return "soon";
  return "normal";
}
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
export {
  BOARD_BACKGROUNDS,
  LABEL_COLORS,
  formatFileSize,
  formatRelativeTime,
  formatShortDate,
  getDueStatus,
  getInitials
};
