import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  Play, Download, Trash2, Image as ImageIcon, Video, Plus, X, 
  ChevronLeft, ChevronRight, Filter, Archive, Loader2, ExternalLink, 
  Edit2, LayoutGrid, LayoutTemplate
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import UploadModal from "../components/UploadModal";
import ConfirmModal from "../components/ConfirmModal";
import EditModal from "../components/EditModal";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const GalleryView = () => {
  const { user, isAuthenticated } = useAuth();
  const { album, year, category } = useParams();
  
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [lightboxLoaded, setLightboxLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // View Toggle
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem("moments_gallery_view");
    if (saved) return saved;
    return typeof window !== 'undefined' && window.innerWidth < 768 ? "grid" : "masonry";
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  
  const [editItem, setEditItem] = useState(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({
    isOpen: false, item: null, isBulk: false
  });

  useEffect(() => {
    fetchMedia();
    setSelectedIds([]);
  }, [album, year, category]);

  useEffect(() => {
    localStorage.setItem("moments_gallery_view", viewMode);
  }, [viewMode]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      console.log("Fetching media for:", { album, year, category });
      const resp = await axios.get(`${API_BASE}/media?album=${album}&year=${year}&category=${category}`);
      console.log("Fetch success:", resp.data.data?.length, "items");
      setMedia(resp.data.data || []);
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === media.length && media.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(media.map((m) => m.id));
    }
  };

  const handleBulkDownloadFiles = async () => {
    if (selectedIds.length === 0) return;
    setIsDownloading(true);
    try {
      const idsToDownload = [...selectedIds];
      for (let i = 0; i < idsToDownload.length; i++) {
        const id = idsToDownload[i];
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = `${API_BASE}/media/${id}/stream?download=1`;
        document.body.appendChild(iframe);
        setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 30000);
        if (i < idsToDownload.length - 1) await new Promise(r => setTimeout(r, 1000));
      }
      setSelectedIds([]);
    } catch (error) {
      console.error("Bulk Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBulkDownloadZip = async () => {
    if (selectedIds.length === 0) return;
    setIsDownloadingZip(true);
    try {
      const resp = await axios.post(`${API_BASE}/media/download-zip`, { ids: selectedIds }, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Gallery_${category}_${year}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSelectedIds([]);
    } catch (error) {
      console.error("Download ZIP failed:", error);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setIsDeletingBulk(true);
      if (confirmDeleteModal.isBulk) {
        await axios.post(`${API_BASE}/media/bulk-delete`, { ids: selectedIds });
        setSelectedIds([]);
      } else {
        await axios.delete(`${API_BASE}/media/${confirmDeleteModal.item.id}`);
        // If lightbox is open and we delete the current item, close or go next
        if (previewIndex !== null && media[previewIndex].id === confirmDeleteModal.item.id) {
           setPreviewIndex(null);
        }
      }
      setConfirmDeleteModal({ isOpen: false, item: null, isBulk: false });
      fetchMedia();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const [loadedImages, setLoadedImages] = useState({});

  const nextItem = () => setPreviewIndex((prev) => (prev + 1) % media.length);
  const prevItem = () => setPreviewIndex((prev) => (prev - 1 + media.length) % media.length);

  const getThumbnailElement = (item) => {
    const isVideo = item.mime_type.startsWith("video/");
    const isLoaded = loadedImages[item.id];

    if (isVideo && (!item.thumbnail_link || item.thumbnail_link.trim() === '')) {
      return (
        <video 
          src={`${API_BASE}/media/${item.id}/stream#t=0.1`} 
          className="w-full h-full object-cover"
          preload="metadata"
          muted
          playsInline
        />
      );
    }
    
    return (
      <div className="relative w-full h-full">
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
             <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}
        <img
          src={item.thumbnail_link ? item.thumbnail_link.replace('=s220', '=s800') : `${API_BASE}/media/${item.id}/stream`}
          alt=""
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          onLoad={() => setLoadedImages(prev => ({ ...prev, [item.id]: true }))}
          onError={(e) => {
            setLoadedImages(prev => ({ ...prev, [item.id]: true }));
            if (!e.target.src.includes('/stream')) {
              e.target.src = `${API_BASE}/media/${item.id}/stream`;
            }
          }}
        />
      </div>
    );
  };

  const renderGridItems = () => {
    return media.map((item, index) => {
      const isVideo = item.mime_type.startsWith("video/");
      const isSelected = selectedIds.includes(item.id);

      return (
        <div
          key={item.id}
          className={cn(
            "group relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all",
            viewMode === 'grid' ? "aspect-square" : "mb-4 break-inside-avoid",
            isSelected ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900 scale-[0.98]" : "hover:shadow-md"
          )}
          style={viewMode === 'masonry' && item.width && item.height ? { aspectRatio: `${item.width} / ${item.height}` } : {}}
          onClick={() => isSelected ? toggleSelect(item.id) : setPreviewIndex(index)}
        >
          {getThumbnailElement(item)}
          
          <div className={cn(
            "absolute inset-0 bg-black/40 transition-opacity",
            "opacity-0 group-hover:opacity-100"
          )} />

          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/30 backdrop-blur-md p-3 rounded-full">
                <Play className="w-6 h-6 text-white fill-white ml-1" />
              </div>
            </div>
          )}

          {/* Standard Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute top-3 left-3 w-5 h-5 rounded border-gray-300 cursor-pointer z-10 transition-opacity focus:ring-0",
              isSelected ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
            )}
            style={{ accentColor: '#4f46e5' }}
          />
          
          {/* Top Right Actions: Delete, Edit, Download */}
          <div className="absolute top-2 right-2 hidden lg:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={`${API_BASE}/media/${item.id}/stream?download=1`}
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 bg-green-500/90 hover:bg-green-600 text-white rounded flex items-center justify-center shadow-sm transition-transform hover:scale-105 cursor-pointer"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
            
            {isAuthenticated && (user?.role === "admin" || user?.role === "editor") && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditItem(item); }}
                  className="w-8 h-8 bg-blue-500/90 hover:bg-blue-600 text-white rounded flex items-center justify-center shadow-sm transition-transform hover:scale-105 cursor-pointer"
                  title="Move / Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteModal({ isOpen: true, item, isBulk: false }); }}
                  className="w-8 h-8 bg-red-500/90 hover:bg-red-600 text-white rounded flex items-center justify-center shadow-sm transition-transform hover:scale-105 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      );
    });
  };

  useEffect(() => {
    setLightboxLoaded(false);
  }, [previewIndex]);

  const currentItem = previewIndex !== null ? media[previewIndex] : null;

  console.log("Gallery Render - Loading:", loading, "Media:", media.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Header Area */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
            <Link to={`/${album}`} className="hover:text-indigo-600 transition-colors uppercase">{album}</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to={`/${album}`} className="hover:text-indigo-600 transition-colors">{year}</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 dark:text-gray-100">{category}</span>
          </div>
          <div className="flex items-center gap-4">
             <h1 className="text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
               {category}
             </h1>
          </div>
        </div>

        {/* Action Panel: View Toggles + Bulk Actions + Selection + Upload */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
             <button onClick={() => setViewMode('grid')} className={cn("px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer", viewMode === 'grid' ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
                <LayoutGrid className="w-4 h-4" /> Grid
             </button>
             <button onClick={() => setViewMode('masonry')} className={cn("px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer", viewMode === 'masonry' ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
                <LayoutTemplate className="w-4 h-4" /> Masonry
             </button>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 hidden sm:block" />

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-right-2">
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                {selectedIds.length} Selected
              </span>
              <div className="w-px h-4 bg-indigo-200 dark:bg-indigo-700 mx-1" />
              
              <button onClick={handleBulkDownloadZip} disabled={isDownloadingZip || isDownloading} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md font-medium text-sm transition-colors cursor-pointer" title="Download ZIP">
                {isDownloadingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                ZIP
              </button>
              
              <button onClick={handleBulkDownloadFiles} disabled={isDownloading || isDownloadingZip} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md font-medium text-sm transition-colors cursor-pointer" title="Download Files sequentially">
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Files
              </button>

              {isAuthenticated && user?.role === "admin" && (
                <button onClick={() => setConfirmDeleteModal({ isOpen: true, item: null, isBulk: true })} disabled={isDeletingBulk} className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-md font-medium text-sm transition-colors cursor-pointer" title="Delete Selected">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              <button onClick={() => setSelectedIds([])} className="ml-1 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <button onClick={selectAll} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800 w-auto cursor-pointer">
            {selectedIds.length === media.length && media.length > 0 ? "Deselect" : "Select All"}
          </button>

          {isAuthenticated && (user?.role === "admin" || user?.role === "editor") && (
            <button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors cursor-pointer">
              <Plus className="w-4 h-4" /> Upload
            </button>
          )}
        </div>
      </div>

      {media.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
           <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
           <h3 className="text-lg font-bold text-gray-900 dark:text-white">Empty Collection</h3>
           <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">No media found in this category.</p>
        </div>
      ) : (
        <div className={cn(
           viewMode === 'grid' 
             ? "grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-6" 
             : "columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 sm:gap-6 space-y-4 sm:space-y-6"
        )}>
          {renderGridItems()}
        </div>
      )}

      {/* Lightbox / Video Player Modal */}
      {currentItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* Top Info Bar */}
          <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex items-center justify-between z-[110] bg-gradient-to-b from-black/90 via-black/40 to-transparent">
             <div className="text-white flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 pl-1">
                <span className="font-semibold text-xs sm:text-base max-w-[140px] md:max-w-md truncate">{currentItem.file_name}</span>
                <span className="text-[10px] sm:text-sm text-gray-400 hidden min-[400px]:inline sm:inline">({new Date(currentItem.created_at).toLocaleDateString()})</span>
             </div>
             
             <div className="flex items-center gap-1.5 sm:gap-4">
                <a href={`${API_BASE}/media/${currentItem.id}/stream?download=1`} className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer" title="Download">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
                </a>

                {isAuthenticated && (user?.role === "admin" || user?.role === "editor") && (
                  <button onClick={() => setEditItem(currentItem)} className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer" title="Move / Edit">
                    <Edit2 className="w-4 h-4" /> <span className="hidden md:inline">Edit</span>
                  </button>
                )}

                {isAuthenticated && (user?.role === "admin" || user?.role === "editor") && (
                  <button onClick={() => setConfirmDeleteModal({ isOpen: true, item: currentItem, isBulk: false })} className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer" title="Delete">
                    <Trash2 className="w-4 h-4" /> <span className="hidden md:inline">Delete</span>
                  </button>
                )}
                
                <div className="w-px h-6 bg-white/20 mx-0.5 sm:mx-1 hidden min-[450px]:block" />
                
                <a href={currentItem.web_view_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center text-gray-300 hover:text-white w-8 h-8 text-sm font-medium transition-colors cursor-pointer" title="Origin URL">
                   <ExternalLink className="w-4 h-4" />
                </a>

                <button onClick={() => setPreviewIndex(null)} className="text-gray-300 hover:text-white w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors cursor-pointer" title="Close">
                  <X className="w-6 h-6" />
                </button>
             </div>
          </div>
          
          <button onClick={prevItem} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors z-[110]">
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button onClick={nextItem} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors z-[110]">
            <ChevronRight className="w-8 h-8" />
          </button>

          <div className="w-full h-full p-4 sm:p-16 flex items-center justify-center relative">
             {!lightboxLoaded && (
               <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-pulse">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                  <span className="text-white/50 text-sm font-medium tracking-widest uppercase">Loading Memory...</span>
               </div>
             )}

             {currentItem.mime_type.startsWith('video/') ? (
               <video 
                 src={`${API_BASE}/media/${currentItem.id}/stream`} 
                 controls 
                 autoPlay 
                 onLoadedData={() => setLightboxLoaded(true)}
                 className={cn(
                   "max-w-full max-h-[85vh] rounded-md shadow-2xl bg-black transition-opacity duration-300",
                   lightboxLoaded ? "opacity-100" : "opacity-0"
                 )} 
               />
             ) : (
               <img 
                 src={`${API_BASE}/media/${currentItem.id}/stream`} 
                 onLoad={() => setLightboxLoaded(true)}
                 className={cn(
                   "max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl transition-opacity duration-300",
                   lightboxLoaded ? "opacity-100" : "opacity-0"
                 )} 
                 alt="" 
               />
             )}
          </div>
        </div>
      )}

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        album={album}
        year={year}
        category={category}
        onSuccess={fetchMedia}
      />

      <EditModal 
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        selectedItem={editItem}
        onSuccess={fetchMedia}
      />

      <ConfirmModal
        isOpen={confirmDeleteModal.isOpen}
        title={confirmDeleteModal.isBulk ? "Delete Selected?" : "Delete Memory?"}
        message={confirmDeleteModal.isBulk 
          ? `Permanently delete these ${selectedIds.length} items from Google Drive?` 
          : "Permanently delete this item from Google Drive?"}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteModal({ isOpen: false, item: null, isBulk: false })}
        isLoading={isDeletingBulk}
        variant="danger"
      />
    </div>
  );
};

export default GalleryView;
