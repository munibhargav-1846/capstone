
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import authImage from "../assets/images/auth_showcase_1794989081878.jpg";

function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("Please enter both your email address and password.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      showToast("Signed in successfully");
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to sign in. Check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError("");
    setSubmitting(true);

    try {
      await login("alex@taskline.io", "Taskline123!");
      showToast("Signed in as Alex Rivera");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Demo login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* Form Column */}
      <div className="flex flex-col justify-between p-6 sm:p-12 lg:p-16">

        {/* Logo and Register Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              TL
            </span>
            Taskline
          </Link>

          <Link
            to="/register"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            Create account
          </Link>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-md mx-auto my-12">

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sign in to your workspace
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Access your boards, real-time sprints, and team schedules.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">

            {/* Error Message */}
            {error && (
              <div className="px-3.5 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Work Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? "Signing in..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo Login */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={submitting}
              onClick={handleDemoSignIn}
              className="w-full py-2.5 px-4 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {submitting
                ? "Please wait..."
                : "Continue with Demo Account (alex@taskline.io)"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-400">
          Taskline Collaborative Kanban Platform
        </p>
      </div>

      {/* Showcase Image Column */}
      <div className="hidden lg:block relative min-h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden">

        <img
          src={authImage}
          alt="Minimalist architectural workspace"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Image Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent flex flex-col justify-end p-12 text-white">

          <p className="text-xl font-semibold max-w-md leading-snug">
            Structured boards, clear ownership, and real-time collaboration without the noise.
          </p>

          <p className="mt-2 text-sm text-slate-200">
            Organize engineering roadmaps, design critiques, and sprint deliverables in one place.
          </p>

        </div>
      </div>

    </div>
  );
}

export default LoginPage;
