
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { useState, useEffect } from "react";

const Layout = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
