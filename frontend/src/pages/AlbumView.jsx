import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Calendar,
  FolderOpen,
  Loader2,
  LayoutGrid,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  FolderPlus,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import UploadModal from "../components/UploadModal";
import FolderActionModal from "../components/FolderActionModal";
import AddFolderModal from "../components/AddFolderModal";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const AlbumView = () => {
  const { album } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [folderAction, setFolderAction] = useState({
    isOpen: false,
    mode: "rename",
    type: "category",
    data: null,
  });

  useEffect(() => {
    fetchAlbumContent();
  }, [album]);

  const fetchAlbumContent = async () => {
    try {
      setLoading(true);
      const resp = await axios.get(`${API_BASE}/albums/${album}/categories`);
      setData(resp.data.data || []);
    } catch (err) {
      console.error("Failed to fetch album content:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAction = (e, mode, type, itemData) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFolderAction({
      isOpen: true,
      mode,
      type,
      data: itemData,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Group by year
  const years = [...new Set(data.map((item) => item.year))].sort(
    (a, b) => b - a,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Header Area */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            {album}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && (user?.role === "admin" || user?.role === "editor") && (
            <div className="flex gap-3">
              <button
                onClick={() => setIsAddFolderOpen(true)}
                className="px-6 py-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Folder</span>
              </button>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Upload Photos</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-12">
        {years.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Empty Album
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              No categories found for this album yet.
            </p>
          </div>
        ) : (
          years.map((year) => (
            <div
              key={year}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {year}
                </h2>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 ml-4" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data
                  .filter((item) => item.year === year)
                  .map((item) => (
                    <div
                      key={item.category}
                      className="group relative"
                    >
                      <Link
                        to={`/${album}/${year}/${item.category}`}
                        className="block bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md h-full flex flex-col justify-between cursor-pointer"
                      >
                        <div>
                          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm">
                            <FolderOpen className="text-white w-5 h-5" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight line-clamp-2 break-all">
                            {item.category}
                          </h3>
                        </div>

                        <div className="mt-6 flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                          <span>View Moments</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>

                      {/* Action Overlay */}
                      {isAuthenticated &&
                        (user?.role === "admin" || user?.role === "editor") && (
                          <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              onClick={(e) =>
                                openAction(e, "rename", "category", {
                                  albumName: album,
                                  year: year,
                                  category: item.category,
                                })
                              }
                              className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg text-blue-500 hover:text-blue-600 border border-gray-200 dark:border-gray-700 transition shadow-sm cursor-pointer"
                              title="Rename Category"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {user?.role === "admin" && (
                              <button
                                onClick={(e) =>
                                  openAction(e, "delete", "category", {
                                    albumName: album,
                                    year: year,
                                    category: item.category,
                                  })
                                }
                                className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg text-red-500 hover:text-red-600 border border-gray-200 dark:border-gray-700 transition shadow-sm cursor-pointer"
                                title="Delete Category"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        album={album}
        onSuccess={fetchAlbumContent}
      />

      <FolderActionModal
        isOpen={folderAction.isOpen}
        onClose={() => setFolderAction((prev) => ({ ...prev, isOpen: false }))}
        mode={folderAction.mode}
        type={folderAction.type}
        data={folderAction.data}
        onSuccess={() => {
          if (folderAction.type === "album" && folderAction.mode === "delete") {
            navigate("/");
          } else {
            fetchAlbumContent();
          }
        }}
      />
      <AddFolderModal
        isOpen={isAddFolderOpen}
        onClose={() => setIsAddFolderOpen(false)}
        albumName={album}
        onSuccess={fetchAlbumContent}
      />
    </div>
  );
};

export default AlbumView;
