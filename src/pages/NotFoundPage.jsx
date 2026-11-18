import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
function NotFoundPage() {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-5xl font-bold font-mono tabular-nums text-slate-300 dark:text-slate-700">404</div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Page not found</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The board, workspace, or route you requested does not exist or may have been removed.
        </p>
        <div className="pt-2">
          <Link
    to="/"
    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
  >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>;
}
export {
  NotFoundPage as default
};
