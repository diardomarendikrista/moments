import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, UploadCloud, Loader2, File as FileIcon } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const UploadModal = ({ isOpen, onClose, album, year, category, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Editable fields for Album, Year, and Category
  const [inputAlbum, setInputAlbum] = useState(album || "");
  const [inputYear, setInputYear] = useState(year || new Date().getFullYear().toString());
  const [inputCategory, setInputCategory] = useState(category || "");

  useEffect(() => {
    if (isOpen) {
      setInputAlbum(album || "");
      setInputYear(year || new Date().getFullYear().toString());
      setInputCategory(category || "");
      setFiles([]);
      setProgress(0);
      setIsUploading(false);
    }
  }, [isOpen, year, category]);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    if (!(album || inputAlbum) || !inputYear || !inputCategory) {
      alert("Please provide Album Name, Year, and Category");
      return;
    }

    setIsUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("album_name", album || inputAlbum);
    formData.append("year", inputYear);
    formData.append("category", inputCategory);

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      await axios.post(`${API_BASE}/media/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        },
      });

      setFiles([]);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Check console for details.");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {inputCategory ? `Upload to ${inputCategory}` : (album || inputAlbum ? `Upload to ${album || inputAlbum}` : "New Upload")}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {inputCategory && (album || inputAlbum) ? `Album: ${album || inputAlbum}` : "Provide context to organize these files."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition shrink-0 cursor-pointer"
            disabled={isUploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="p-6 overflow-y-auto flex-1">
            
             {(!album || !year || !category) && (
               <div className="mb-6 space-y-4">
                  {!album && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Album Name</label>
                      <input 
                        type="text" 
                        required
                        disabled={isUploading}
                        value={inputAlbum} 
                        onChange={(e) => setInputAlbum(e.target.value)} 
                        placeholder="e.g. Family Trip 2024"
                        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Year</label>
                        <input 
                          type="number" 
                          required
                          disabled={isUploading}
                          value={inputYear} 
                          onChange={(e) => setInputYear(e.target.value)} 
                          className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                        <input 
                          type="text" 
                          required
                          disabled={isUploading}
                          value={inputCategory} 
                          onChange={(e) => setInputCategory(e.target.value)} 
                          placeholder="e.g. Birthday Party"
                          className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                  </div>
               </div>
             )}

             <div className="mb-6 relative">
               <label 
                 htmlFor="file-upload" 
                 className="flex flex-col items-center justify-center w-full px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500"
               >
                 <UploadCloud className="mx-auto h-12 w-12 text-indigo-400 mb-2" />
                 <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                   <span className="relative font-medium text-indigo-600 dark:text-indigo-400">
                     Select files
                     <input
                       id="file-upload"
                       name="file-upload"
                       type="file"
                       multiple
                       className="sr-only"
                       onChange={handleFileSelect}
                       disabled={isUploading}
                       accept="image/*,video/*"
                     />
                   </span>
                 </div>
                 <p className="text-xs text-gray-500 mt-1">
                   PNG, JPG, MP4 up to 100MB
                 </p>
               </label>
             </div>

             {files.length > 0 && (
               <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                    {files.length} Files Selected
                  </h3>
                  <div className="space-y-2">
                    {files.map((f, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                         <div className="flex items-center min-w-0 pr-4">
                            <FileIcon className="w-4 h-4 mr-3 text-gray-400 shrink-0" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                              {f.name}
                            </span>
                            <span className="text-xs text-gray-500 ml-2 shrink-0">
                              {(f.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                         </div>
                         {!isUploading && (
                           <button
                             type="button"
                             onClick={() => removeFile(index)}
                             className="text-gray-400 hover:text-red-500 transition-colors shrink-0 p-1"
                             title="Remove file"
                           >
                             <X className="w-4 h-4" />
                           </button>
                         )}
                      </div>
                    ))}
                  </div>
               </div>
             )}

            {isUploading && (
              <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <div className="flex justify-between text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">
                  <span>Uploading files...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-indigo-200 dark:bg-indigo-900 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={files.length === 0 || isUploading || !(album || inputAlbum) || !inputYear || !inputCategory}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading</> : 'Start Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
