import { createContext, useContext, useEffect, useState } from "react";
const ThemeContext = createContext(void 0);
function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("taskline_theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("taskline_theme", theme);
  }, [theme]);
  const setTheme = (next) => setThemeState(next);
  const toggleTheme = () => setThemeState((prev) => prev === "light" ? "dark" : "light");
  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>;
}
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
export {
  ThemeProvider,
  useTheme
};
