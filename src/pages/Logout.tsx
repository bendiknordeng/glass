import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const Logout: React.FC = () => {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(true);
  
  // Handle logout on component mount with a timeout safety
  useEffect(() => {
    // Set a safety timeout to redirect even if signOut gets stuck
    const safetyTimeout = setTimeout(() => {
      console.log("Logout safety timeout triggered - forcing redirect");
      window.location.replace('/');
    }, 2000); // 2 seconds timeout (reduced from 3)
    
    // Perform the logout
    const performLogout = async () => {
      try {
        // Just call the centralized signOut method which handles everything
        await signOut('/');
      } catch (error) {
        console.error("Logout page error:", error);
        // Force redirect on error
        window.location.replace('/');
      } finally {
        setIsLoggingOut(false);
        clearTimeout(safetyTimeout);
      }
    };
    
    performLogout();
    
    // Clean up the safety timeout if component unmounts
    return () => clearTimeout(safetyTimeout);
  }, [signOut]);

  // Simple loading state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-game-primary mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Signing out...</p>
    </div>
  );
};

export default Logout; 