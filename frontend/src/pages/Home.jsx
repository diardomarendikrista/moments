import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  FolderOpen,
  Image as ImageIcon,
  Plus,
  Loader2,
  Settings,
  Grid,
  ChevronRight,
  Edit2,
  Trash2,
  Database,
  Download,
  Upload
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import FolderActionModal from "../components/FolderActionModal";
import UploadModal from "../components/UploadModal";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const Home = () => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [folderAction, setFolderAction] = useState({
    isOpen: false,
    mode: 'rename',
    type: 'album',
    data: null
  });

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/albums`);
      setAlbums(res.data.data || []);
    } catch (error) {
      console.error("Fetch albums error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      const response = await axios({
        url: `${API_BASE}/admin/db/export`,
        method: 'GET',
        responseType: 'blob', // Important for file downloads
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `moments_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Failed to backup database.');
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("WARNING: Importing data will merge with existing records. Proceed?")) {
      e.target.value = "";
      return;
    }

    setIsRestoring(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_BASE}/admin/db/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Database restored successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Restore failed:", error);
      alert("Failed to restore database: " + (error.response?.data?.message || error.message));
    } finally {
      setIsRestoring(false);
      e.target.value = "";
    }
  };

  const openAction = (e, mode, albumName) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderAction({
      isOpen: true,
      mode,
      type: 'album',
      data: { albumName }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="mt-2 text-lg text-gray-500 dark:text-gray-400 font-medium">
            Manage your media library and album collections.
          </p>
        </div>

        {isAuthenticated && (user?.role === "admin" || user?.role === "editor") && (
          <div className="flex items-center gap-3">
             {user?.role === "admin" && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 cursor-default">
                    <Settings className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-wider">Admin Mode</span>
                </div>
             )}
             
             {user?.role === "admin" && (
              <div className="flex gap-2">
                <button
                  onClick={handleBackup}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 rounded-2xl border border-green-100 dark:border-green-900/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer font-bold"
                >
                  <Download className="w-5 h-5" />
                  <span>Backup</span>
                </button>
                
                <label className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-900/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer font-bold">
                  {isRestoring ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span>Restore</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleRestore}
                    disabled={isRestoring}
                  />
                </label>
              </div>
            )}

             <button 
               onClick={() => setIsUploadOpen(true)}
               className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 cursor-pointer font-bold"
             >
                <Plus className="w-5 h-5" />
                <span>Upload New</span>
             </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {albums.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-gray-50 dark:bg-gray-900/50 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
             <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-gray-900 dark:text-white">No albums found</h3>
             <p className="text-gray-500 dark:text-gray-400">Start by uploading media to a new album.</p>
          </div>
        ) : (
          albums.map((albumName) => (
            <div key={albumName} className="group relative">
               <Link
                to={`/${albumName}`}
                className="block bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-2xl hover:-translate-y-2 overflow-hidden"
               >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/20 transition-colors" />
                  
                  <div className="relative">
                    <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                      <ImageIcon className="text-white w-8 h-8" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight break-all">
                      {albumName}
                    </h3>
                    
                    <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-bold mt-12 gap-2 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                      <span>Explore Album</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
               </Link>

               {/* Action Overlay */}
               {isAuthenticated && (user?.role === "admin" || user?.role === "editor") && (
                 <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={(e) => openAction(e, 'rename', albumName)}
                      className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg text-blue-500 hover:text-blue-600 border border-gray-200 dark:border-gray-700 transition shadow-sm cursor-pointer"
                      title="Rename Album"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    
                    {user?.role === "admin" && (
                      <button 
                        onClick={(e) => openAction(e, 'delete', albumName)}
                        className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg text-red-500 hover:text-red-600 border border-gray-200 dark:border-gray-700 transition shadow-sm cursor-pointer"
                        title="Delete Album"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                 </div>
               )}
            </div>
          ))
        )}
      </div>

      <FolderActionModal 
        isOpen={folderAction.isOpen}
        onClose={() => setFolderAction(prev => ({ ...prev, isOpen: false }))}
        mode={folderAction.mode}
        type={folderAction.type}
        data={folderAction.data}
        onSuccess={fetchAlbums}
      />

      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchAlbums}
      />
    </div>
  );
};

export default Home;
