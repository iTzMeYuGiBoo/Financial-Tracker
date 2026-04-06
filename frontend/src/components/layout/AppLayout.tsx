import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Menu } from "lucide-react";

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-5">
          <button
            className="lg:hidden mb-4 p-2 rounded-xl bg-white border border-gray-200 text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
