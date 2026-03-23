import React from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  isDestructive = true,
  variant = "danger",
  isLoading = false,
}) => {
  const destructive = variant === "danger" || isDestructive;
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center p-4",
        "bg-black/50 backdrop-blur-sm",
      )}
    >
      <div
        className={cn(
          "w-full max-w-md p-6 relative rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200",
          "bg-white dark:bg-gray-800",
        )}
      >
        <button
          onClick={onCancel}
          disabled={isLoading}
          className={cn(
            "absolute top-4 right-4 p-2 rounded-full transition cursor-pointer disabled:opacity-50",
            "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
          )}
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center mb-6 mt-2">
          <div
            className={cn(
              "p-4 rounded-full mb-4",
              destructive
                ? "bg-red-50 dark:bg-red-900/20 text-red-500"
                : "bg-blue-50 dark:bg-blue-900/20 text-blue-500",
            )}
          >
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center">
            {title}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mt-3">
            {message}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className={cn(
              "flex-1 px-5 py-2.5 rounded-xl font-medium transition cursor-pointer disabled:opacity-50",
              "text-gray-700 bg-gray-100 hover:bg-gray-200",
              "dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
            )}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 px-5 py-2.5 rounded-xl font-medium transition shadow-lg text-white cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2",
              destructive
                ? "bg-red-600 hover:bg-red-700 shadow-red-500/30"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30",
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
