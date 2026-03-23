import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Loader2, Trash2, Edit3, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const FolderActionModal = ({ isOpen, onClose, mode, type, data, onSuccess }) => {
  const [newName, setNewName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen && data) {
      setNewName(type === 'album' ? data.albumName : data.category);
      setConfirmDelete(false);
      setIsProcessing(false);
    }
  }, [isOpen, type, data]);

  if (!isOpen) return null;

  const handleRename = async (e) => {
    e.preventDefault();
    if (!newName || newName.trim() === "") return;
    setIsProcessing(true);
    try {
      await axios.put(`${API_BASE}/folders/rename`, {
        renameType: type,
        oldName: type === 'album' ? data.albumName : data.category,
        newName: newName,
        albumName: data.albumName,
        year: data.year,
        category: data.category
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Rename failed:", err);
      alert("Failed to rename folder.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsProcessing(true);
    try {
      // Axios DELETE doesn't always handle body gracefully, using data property
      await axios.delete(`${API_BASE}/folders/delete`, {
        data: {
          deleteType: type,
          albumName: data.albumName,
          year: data.year,
          category: data.category
        }
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete folder.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {mode === 'rename' ? <Edit3 className="w-5 h-5 text-blue-500" /> : <Trash2 className="w-5 h-5 text-red-500" />}
            {mode === 'rename' ? `Rename ${type}` : `Delete ${type}`}
          </h2>
          <button onClick={onClose} disabled={isProcessing} className="text-gray-400 hover:text-gray-600 transition cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'rename' ? (
            <form onSubmit={handleRename} className="space-y-4">
               <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">New Name</label>
                  <input 
                    type="text"
                    required
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    placeholder={`Enter new ${type} name...`}
                  />
               </div>
               <div className="flex justify-end gap-3 mt-8">
                  <button type="button" onClick={onClose} disabled={isProcessing} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isProcessing || !newName} className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                  </button>
               </div>
            </form>
          ) : (
            <div className="space-y-4">
               <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50 flex gap-4">
                  <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                  <div>
                    <p className="text-red-700 dark:text-red-400 font-bold mb-1">DANGER: Permanent Action</p>
                    <p className="text-sm text-red-600 dark:text-red-400/80">
                      Deleting this {type} will permanently delete all contents (sub-folders and media) from **Google Drive** and the database. This cannot be undone.
                    </p>
                  </div>
               </div>

               <p className="text-gray-600 dark:text-gray-400 text-sm font-medium px-1">
                 Are you sure you want to delete <span className="text-gray-900 dark:text-white font-bold">"{type === 'album' ? data?.albumName : data?.category}"</span>?
               </p>

               <div className="flex flex-col gap-3 mt-8">
                  <button 
                    onClick={handleDelete} 
                    disabled={isProcessing}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                      confirmDelete 
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 animate-pulse" 
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    )}
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : (confirmDelete ? "CONFIRM PERMANENT DELETE" : "Yes, Delete It")}
                  </button>
                  <button onClick={onClose} disabled={isProcessing} className="w-full py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer">
                    Keep It / Cancel
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderActionModal;
