import React from "react";
import { Link } from "react-router-dom";
import { Ghost, Home, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NotFound = () => {
  const { user } = useAuth();
  const storedAlbum = localStorage.getItem("moments_home_album");
  const homeLink =
    user?.role === "admin" ? "/" : storedAlbum ? `/${storedAlbum}` : "/";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse rounded-full"></div>
          <Ghost className="w-24 h-24 text-indigo-600 relative z-10 animate-bounce transition-all duration-1000" />
        </div>

        <h1 className="text-7xl font-black text-gray-900 dark:text-white tracking-widest mb-4">
          404
        </h1>
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-8 uppercase tracking-widest">
          Memory Not Found
        </h2>

        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-10 text-lg font-medium leading-relaxed">
          The path you're looking for doesn't exist in our photo library. You
          might have typed it incorrectly or the memory has been relocated.
        </p>

        <Link
          to={homeLink}
          className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 font-black uppercase tracking-widest cursor-pointer"
        >
          <Home className="w-5 h-5" />
          <span>Go Back Home</span>
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
