import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Loader2, Edit3, Folder, Calendar, Tag } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const EditModal = ({ isOpen, onClose, selectedItem, onSuccess }) => {
  const { user } = useAuth();
  const [albumName, setAlbumName] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [allAlbums, setAllAlbums] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMetadata();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedItem) {
      setAlbumName(selectedItem.album_name || "");
      setYear(selectedItem.year || "");
      setCategory(selectedItem.category || "");
    }
  }, [selectedItem]);

  const fetchMetadata = async () => {
    try {
      setLoadingMetadata(true);
      const resp = await axios.get(`${API_BASE}/albums/all`);
      setAllAlbums(resp.data.data || []);
    } catch (err) {
      console.error("Failed to fetch albums/categories:", err);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const currentAlbumData = allAlbums.find(a => a.name === albumName);
  const availableCategories = currentAlbumData?.categories || [];

  // Sort available categories (Year DESC, Category ASC)
  const sortedCategories = [...availableCategories].sort((a, b) => b.year - a.year || a.category.localeCompare(b.category));

  if (!isOpen || !selectedItem) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.put(`${API_BASE}/media/${selectedItem.id}`, {
        album_name: albumName,
        year: year,
        category: category,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Move failed:", err);
      alert("Failed to move item.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-500" />
              Edit Media Metadata
            </h2>
            <p className="text-sm text-gray-500 mt-1">Move this item to a different folder context.</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Admin Only: Album Selection */}
          {user?.role === "admin" && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Folder className="w-4 h-4 text-indigo-500" />
                Album Name
              </label>
              <select
                value={albumName}
                onChange={(e) => {
                  setAlbumName(e.target.value);
                  setYear(""); // Reset year/category when album changes
                  setCategory("");
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              >
                <option value="" disabled>Select Album...</option>
                {allAlbums.map(a => (
                  <option key={a.name} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* All Users: Year & Category Combined Dropdown */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Tag className="w-4 h-4 text-indigo-500" />
              Category (Year - Name)
            </label>
            <select
              value={category ? `${year}|${category}` : ""}
              onChange={(e) => {
                const [y, c] = e.target.value.split("|");
                setYear(y);
                setCategory(c);
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
              disabled={!albumName}
            >
              <option value="" disabled>
                {albumName ? "Select Category..." : "Please select an album first"}
              </option>
              {sortedCategories.map((item, idx) => (
                <option key={idx} value={`${item.year}|${item.category}`}>
                  {item.year} - {item.category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !albumName || !category}
              className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;
