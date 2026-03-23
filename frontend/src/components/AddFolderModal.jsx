import React, { useState } from "react";
import axios from "axios";
import { X, Loader2, FolderPlus } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const AddFolderModal = ({ isOpen, onClose, albumName, onSuccess }) => {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [category, setCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!year || !category) return;

    setIsSaving(true);
    try {
      await axios.post(`${API_BASE}/folders/add`, {
        albumName,
        year,
        category,
      });
      onSuccess();
      setCategory(""); // Reset only category
      onClose();
    } catch (err) {
      console.error("Failed to add folder:", err);
      alert("Failed to add folder. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden m-4">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FolderPlus className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Add New Folder</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
           <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Year</label>
            <input 
              type="number"
              required
              min="1900"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              placeholder="e.g. 2024"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Category Name</label>
            <input 
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              placeholder="e.g. Holiday, Event, Wedding"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !category}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFolderModal;
