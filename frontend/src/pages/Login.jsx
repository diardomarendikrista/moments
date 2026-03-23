import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, User, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectFrom = searchParams.get("from");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(username, password);
    if (result.success) {
      navigate(redirectFrom || "/");
    } else {
      setError(result.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "min-h-[80vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8",
        "bg-gray-50 dark:bg-gray-950 transition-colors",
      )}
    >
      <div className={cn("max-w-md w-full mx-auto space-y-8")}>
        <div className="text-center">
          <div
            className={cn(
              "w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-xl",
              "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800",
            )}
          >
            <Lock className={cn("w-10 h-10 text-blue-600")} />
          </div>
          <h2
            className={cn(
              "text-3xl font-extrabold tracking-tight sm:text-4xl",
              "text-gray-900 dark:text-white",
            )}
          >
            Moments Gallery
          </h2>
          <p className={cn("mt-3 text-lg", "text-gray-500 dark:text-gray-400")}>
            Sign in to access your library
          </p>
        </div>

        <div
          className={cn(
            "bg-white dark:bg-gray-900 py-10 px-8 rounded-3xl shadow-2xl border",
            "border-gray-100 dark:border-gray-800",
          )}
        >
          <form
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            {error && (
              <div
                className={cn(
                  "p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2",
                  "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30",
                )}
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label
                className={cn(
                  "block text-sm font-semibold ml-1",
                  "text-gray-700 dark:text-gray-300",
                )}
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cn(
                    "block w-full pl-11 pr-4 py-3 border rounded-2xl outline-none transition-all shadow-sm",
                    "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white",
                    "focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:border-transparent",
                  )}
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                className={cn(
                  "block text-sm font-semibold ml-1",
                  "text-gray-700 dark:text-gray-300",
                )}
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "block w-full pl-11 pr-4 py-3 border rounded-2xl outline-none transition-all shadow-sm",
                    "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white",
                    "focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:border-transparent",
                  )}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-lg font-bold text-white transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100",
                "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-6 w-6 mr-3" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p
          className={cn(
            "text-center text-sm",
            "text-gray-500 dark:text-gray-600",
          )}
        >
          Secured by Moments RBAC System
        </p>
      </div>
    </div>
  );
};

export default Login;
