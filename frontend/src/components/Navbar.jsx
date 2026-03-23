import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sun, Moon, LogOut, Camera } from "lucide-react";

const Navbar = ({ darkMode, toggleDarkMode }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  // If inside an album, non-admin clicking logo goes to the first album part. Admins always go to root.
  let logoLink = "/";
  if (user?.role !== 'admin') {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0 && pathParts[0] !== 'login') {
      logoLink = `/${pathParts[0]}`;
    }
  }

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
               <Camera className="w-5 h-5" />
            </div>
            <Link to={logoLink} className="text-xl font-bold text-gray-900 dark:text-white tracking-tight cursor-pointer">
              Moments
            </Link>
          </div>
          <div className="flex items-center gap-4">
            
            {isAuthenticated && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user.name || user.username} <span className="text-xs text-gray-400 uppercase ml-1">({user.role})</span>
              </span>
            )}

            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {isAuthenticated ? (
              <button
                onClick={logout}
                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <Link
                to={`/login?from=${encodeURIComponent(location.pathname)}`}
                className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition cursor-pointer"
              >
                Sign In
              </Link>
            )}
            
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
