import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/common/Header";
import { XMarkIcon, Bars3Icon } from "@heroicons/react/24/outline";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const showHomeButton = location.pathname !== "/";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 dark:bg-black dark:bg-opacity-80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-950/50 border-r border-gray-100 dark:border-gray-800 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:h-screen md:w-64 md:flex-shrink-0`}
      >
        <div className="px-4 py-4 h-full flex flex-col">
          <div className="flex justify-end md:hidden">
            <button 
              onClick={toggleSidebar} 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1">
            <Header showHomeButton={showHomeButton} isSidebar={true} />
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-950/30 border-b border-gray-100 dark:border-gray-800">
          <button 
            onClick={toggleSidebar} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Main content */}
        <main className="flex-1 px-4 py-6 md:px-6 bg-white dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
