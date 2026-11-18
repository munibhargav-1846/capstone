import { useState } from "react";
import { getInitials } from "../utils/backgrounds";
const SIZE_CLASSES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-xs",
  lg: "w-16 h-16 text-lg"
};
const TONES = [
  "bg-blue-600 text-white",
  "bg-slate-700 text-white",
  "bg-teal-700 text-white",
  "bg-indigo-600 text-white",
  "bg-amber-700 text-white"
];
function getTone(name) {
  if (!name) return TONES[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return TONES[sum % TONES.length];
}
function Avatar({ name, src, size = "sm", className = "" }) {
  const [imgError, setImgError] = useState(false);
  if (src && !imgError) {
    return <img
      src={src}
      alt={name || "User avatar"}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className={`${SIZE_CLASSES[size]} rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 ${className}`}
    />;
  }
  return <span
    title={name}
    aria-label={name || "User avatar"}
    className={`${SIZE_CLASSES[size]} ${getTone(name)} rounded-full inline-flex items-center justify-center font-semibold shrink-0 select-none ${className}`}
  >
      {getInitials(name)}
    </span>;
}
export {
  Avatar as default
};
