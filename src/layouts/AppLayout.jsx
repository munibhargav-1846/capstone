import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  Settings,
  User as UserIcon,
  Search,
  Plus,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  FolderKanban,
  Star,
  ChevronRight
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "../components/Avatar";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import CreateBoardModal from "../components/CreateBoardModal";
function AppLayout() {
  const { user, logout, unreadNotifications, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [starredBoards, setStarredBoards] = useState([]);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const loadSidebarData = async () => {
    try {
      const [wsRes, bRes] = await Promise.all([api.get("/workspaces"), api.get("/boards")]);
      setWorkspaces(wsRes.data.workspaces || []);
      const allBoards = bRes.data.boards || [];
      setStarredBoards(
        allBoards.filter((b) => !b.isArchived && user && b.isStarredBy?.includes(user._id))
      );
    } catch {
    }
  };
  useEffect(() => {
    loadSidebarData();
    const handleRefresh = () => loadSidebarData();
    window.addEventListener("taskline:refresh-sidebar", handleRefresh);
    return () => window.removeEventListener("taskline:refresh-sidebar", handleRefresh);
  }, [user?._id]);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults(null);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res.data);
      } catch {
        setSearchResults(null);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const handleToggleTheme = async () => {
    const next = theme === "light" ? "dark" : "light";
    toggleTheme();
    try {
      const res = await api.put("/auth/profile", { themePreference: next });
      updateUser(res.data.user);
    } catch {
    }
  };
  const navLinkClass = ({ isActive }) => `flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${isActive ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"}`;
  const SidebarContent = <div className="flex flex-col h-full">
      {
    /* Brand */
  }
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <Link
    to="/"
    onClick={() => setMobileMenuOpen(false)}
    className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
  >
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
            TL
          </span>
          Taskline
        </Link>
        <button
    type="button"
    onClick={() => setMobileMenuOpen(false)}
    className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
          <X className="w-4 h-4" />
        </button>
      </div>

      {
    /* Primary Nav */
  }
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <nav className="space-y-1">
          <NavLink to="/" end className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </span>
          </NavLink>
          <NavLink to="/notifications" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
            <span className="flex items-center gap-2.5">
              <Bell className="w-4 h-4" />
              Notifications
            </span>
            {unreadNotifications > 0 && <span className="text-xs font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                {unreadNotifications}
              </span>}
          </NavLink>
          <NavLink to="/profile" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
            <span className="flex items-center gap-2.5">
              <UserIcon className="w-4 h-4" />
              Profile
            </span>
          </NavLink>
          <NavLink to="/settings" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
            <span className="flex items-center gap-2.5">
              <Settings className="w-4 h-4" />
              Settings
            </span>
          </NavLink>
        </nav>

        {
    /* Starred Boards */
  }
        {starredBoards.length > 0 && <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Starred Boards
            </div>
            <div className="space-y-0.5">
              {starredBoards.map((board) => <Link
    key={board._id}
    to={`/board/${board._id}`}
    onClick={() => setMobileMenuOpen(false)}
    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 truncate"
  >
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  <span className="truncate">{board.title}</span>
                </Link>)}
            </div>
          </div>}

        {
    /* Workspaces */
  }
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Workspaces</span>
            <button
    type="button"
    onClick={() => setCreateWsOpen(true)}
    title="Create workspace"
    className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
  >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {workspaces.map((ws) => <NavLink
    key={ws._id}
    to={`/workspace/${ws._id}`}
    onClick={() => setMobileMenuOpen(false)}
    className={navLinkClass}
  >
                <span className="flex items-center gap-2.5 min-w-0">
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  <span className="truncate">{ws.name}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </NavLink>)}
          </div>
        </div>
      </div>

      {
    /* Footer User Strip */
  }
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
    type="button"
    onClick={() => {
      logout();
      navigate("/login");
    }}
    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
  >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>;
  return <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {
    /* Desktop Sidebar */
  }
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="sticky top-0 h-screen">{SidebarContent}</div>
      </aside>

      {
    /* Mobile Sidebar Drawer */
  }
      {mobileMenuOpen && <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-10 h-full">
            {SidebarContent}
          </aside>
        </div>}

      {
    /* Main Column */
  }
      <div className="flex-1 flex flex-col min-w-0">
        {
    /* Top Header */
  }
        <header className="h-14 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-1 max-w-xl min-w-0">
            <button
    type="button"
    onClick={() => setMobileMenuOpen(true)}
    aria-label="Open navigation menu"
    className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
              <Menu className="w-5 h-5" />
            </button>

            {
    /* Global Search */
  }
            <div ref={searchRef} className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
    type="search"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search boards, cards, workspaces..."
    className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900"
  />

              {searchResults && <div className="absolute left-0 right-0 mt-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-h-96 overflow-y-auto z-50 p-2">
                  {searching && <div className="p-3 text-xs text-slate-500">Searching...</div>}
                  {!searching && searchResults.boards.length === 0 && searchResults.cards.length === 0 && searchResults.workspaces.length === 0 && <div className="p-3 text-xs text-slate-500">No results for "{searchQuery}"</div>}

                  {searchResults.boards.length > 0 && <div className="mb-2">
                      <div className="px-2 py-1 text-xs font-semibold text-slate-400">Boards</div>
                      {searchResults.boards.map((b) => <button
    key={b._id}
    type="button"
    onClick={() => {
      setSearchQuery("");
      setSearchResults(null);
      navigate(`/board/${b._id}`);
    }}
    className="w-full text-left px-2.5 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
  >
                          <span className="font-medium truncate">{b.title}</span>
                          <span className="text-xs text-slate-400">Board</span>
                        </button>)}
                    </div>}

                  {searchResults.cards.length > 0 && <div className="mb-2">
                      <div className="px-2 py-1 text-xs font-semibold text-slate-400">Cards</div>
                      {searchResults.cards.map((c) => <button
    key={c._id}
    type="button"
    onClick={() => {
      setSearchQuery("");
      setSearchResults(null);
      navigate(`/board/${c.boardId}?card=${c._id}`);
    }}
    className="w-full text-left px-2.5 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
  >
                          <div className="font-medium truncate">{c.title}</div>
                          <div className="text-xs text-slate-400 truncate">in {c.boardTitle}</div>
                        </button>)}
                    </div>}

                  {searchResults.workspaces.length > 0 && <div>
                      <div className="px-2 py-1 text-xs font-semibold text-slate-400">Workspaces</div>
                      {searchResults.workspaces.map((w) => <button
    key={w._id}
    type="button"
    onClick={() => {
      setSearchQuery("");
      setSearchResults(null);
      navigate(`/workspace/${w._id}`);
    }}
    className="w-full text-left px-2.5 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
  >
                          <span className="font-medium truncate">{w.name}</span>
                          <span className="text-xs text-slate-400">Workspace</span>
                        </button>)}
                    </div>}
                </div>}
            </div>
          </div>

          {
    /* Right Header Actions */
  }
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
    type="button"
    onClick={() => setCreateBoardOpen(true)}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
  >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Board</span>
            </button>

            <button
    type="button"
    onClick={handleToggleTheme}
    aria-label="Toggle light or dark theme"
    className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <Link
    to="/notifications"
    aria-label="Notifications"
    className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600" />}
            </Link>

            <div ref={profileRef} className="relative">
              <button
    type="button"
    onClick={() => setProfileMenuOpen((v) => !v)}
    className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
  >
                <Avatar name={user?.name} src={user?.avatar} size="sm" />
              </button>

              {profileMenuOpen && <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50">
                  <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</div>
                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                  </div>
                  <Link
    to="/profile"
    onClick={() => setProfileMenuOpen(false)}
    className="block px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
  >
                    Profile
                  </Link>
                  <Link
    to="/settings"
    onClick={() => setProfileMenuOpen(false)}
    className="block px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
  >
                    Settings
                  </Link>
                  <button
    type="button"
    onClick={() => {
      logout();
      navigate("/login");
    }}
    className="w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
  >
                    Sign out
                  </button>
                </div>}
            </div>
          </div>
        </header>

        {
    /* Page Viewport */
  }
        <main className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </main>
      </div>

      <CreateWorkspaceModal
    isOpen={createWsOpen}
    onClose={() => setCreateWsOpen(false)}
    onCreated={(ws) => {
      setWorkspaces((prev) => [ws, ...prev]);
      window.dispatchEvent(new Event("taskline:refresh-dashboard"));
      navigate(`/workspace/${ws._id}`);
    }}
  />

      <CreateBoardModal
    isOpen={createBoardOpen}
    onClose={() => setCreateBoardOpen(false)}
    workspaces={workspaces}
    onCreated={(board) => {
      window.dispatchEvent(new Event("taskline:refresh-dashboard"));
      window.dispatchEvent(new Event("taskline:refresh-sidebar"));
      navigate(`/board/${board._id}`);
    }}
  />
    </div>;
}
export {
  AppLayout as default
};
