import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingStateProps {
  /**
   * Loading state
   */
  isLoading: boolean;
  
  /**
   * Error message, if any
   */
  error?: string | null;
  
  /**
   * Whether there is any data
   */
  hasData: boolean;
  
  /**
   * Message to show when there is no data
   */
  emptyMessage?: string;
  
  /**
   * Secondary message to show when there is no data
   */
  emptySubMessage?: string;
  
  /**
   * Message to show when the data is loading
   */
  loadingMessage?: string;
  
  /**
   * Custom CSS classes to apply to the container
   */
  className?: string;
}

/**
 * A reusable component to handle loading, empty, and error states
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  error,
  hasData,
  emptyMessage,
  emptySubMessage,
  loadingMessage,
  className = "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8"
}) => {
  const { t } = useTranslation();

  // Show error state
  if (error) {
    return (
      <div className={`${className} text-center py-6`}>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-4">
          <p className="font-medium">{t('common.error')}</p>
          <p className="text-sm">{error}</p>
        </div>
        <button 
          className="mt-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          onClick={() => window.location.reload()}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className={`${className} text-center py-8`}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-game-primary mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{loadingMessage || t('common.loading')}</p>
      </div>
    );
  }

  // Show empty state
  if (!hasData) {
    return (
      <div className={`${className} text-center py-6`}>
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage || t('common.noData')}</p>
        {emptySubMessage && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {emptySubMessage}
          </p>
        )}
      </div>
    );
  }

  // Return null by default (content will be rendered by the parent)
  return null;
};

export default LoadingState; 