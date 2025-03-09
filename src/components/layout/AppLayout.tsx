import React from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/common/Header";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const showHomeButton = location.pathname !== "/";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-700/30 z-50 shadow-sm">
        <div className="px-4 py-4">
          <Header showHomeButton={showHomeButton} />
        </div>
      </header>
      
      {/* Main content with top padding to account for fixed header */}
      <main className="flex-1 mt-20 px-4">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
