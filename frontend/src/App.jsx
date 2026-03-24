import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import AlbumView from "./pages/AlbumView";
import GalleryView from "./pages/GalleryView";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  // Redirect non-admins to home where they will be further redirected to their album
  return user?.role === "admin" ? children : <Navigate to="/" />;
};

const HomeRedirect = () => {
  const { user } = useAuth();
  const storedAlbum = localStorage.getItem("moments_home_album");

  if (user?.role === "admin") {
    return <Home />;
  }

  if (storedAlbum) {
    return (
      <Navigate
        to={`/${storedAlbum}`}
        replace
      />
    );
  }

  // Fallback if no album stored: just show dummy or first album if we had the list.
  // For now, let's just let it be or redirect to a known default if applicable.
  // But usually, they arrive via a shared link which stores the album.
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
        Welcome to Moments
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Please use a direct album link to view photos.
      </p>
    </div>
  );
};

function AppContent() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("moments_theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("moments_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("moments_theme", "light");
    }
  }, [darkMode]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 font-sans">
        <Navbar
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(!darkMode)}
        />
        <Routes>
          <Route
            path="/login"
            element={<Login />}
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <HomeRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/:album"
            element={<AlbumView />}
          />
          <Route
            path="/:album/:year/:category"
            element={<GalleryView />}
          />
          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
