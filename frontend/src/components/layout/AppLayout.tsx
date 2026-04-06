import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Menu } from "lucide-react";

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // h-screen + overflow-hidden on the root ensures neither the sidebar nor
    // the main area can ever grow taller than the viewport
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Sidebar — always rendered; visibility controlled internally */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column: topbar + scrollable page content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />

        <main className="flex-1 overflow-y-auto p-5">
          {/* Hamburger for mobile — sits inside the scrollable area */}
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
