    import React, { useEffect, useState } from 'react';
import { testSupabaseConnection } from '@/utils/supabase-test';
import { useAuth } from '@/contexts/AuthContext';

const SupabaseTest: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Capture console logs
  const captureConsole = () => {
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      logs.push(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
      originalLog(...args);
    };

    console.error = (...args) => {
      logs.push('ERROR: ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
      originalError(...args);
    };

    console.warn = (...args) => {
      logs.push('WARNING: ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
      originalWarn(...args);
    };

    return {
      logs,
      restore: () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      }
    };
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    const consoleCapture = captureConsole();
    
    try {
      // Run our test function
      await testSupabaseConnection();
      setTestResults(consoleCapture.logs);
    } catch (error) {
      console.error('Test execution error:', error);
      setTestResults([...consoleCapture.logs, `Test execution error: ${error}`]);
    } finally {
      consoleCapture.restore();
      setIsLoading(false);
    }
  };

  // Display user authentication status
  const renderAuthStatus = () => {
    if (isAuthenticated && user) {
      return (
        <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-md">
          <p className="font-semibold text-green-800">
            ✅ Authenticated as: {user.email || 'No email'}
          </p>
          <p className="text-sm text-green-700">
            User ID: {user.id}
          </p>
        </div>
      );
    } else {
      return (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded-md">
          <p className="font-semibold text-yellow-800">
            ⚠️ Not authenticated
          </p>
          <p className="text-sm text-yellow-700">
            Tests will run with limited permissions.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Tester</h1>
      
      {renderAuthStatus()}
      
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isLoading}
          className={`px-4 py-2 rounded-md ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isLoading ? 'Running Tests...' : 'Run Supabase Tests'}
        </button>
      </div>
      
      {testResults.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Test Results</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-md overflow-auto max-h-[500px] whitespace-pre-wrap">
            {testResults.map((log, i) => (
              <div key={i} className={`${
                log.includes('❌') ? 'text-red-400' :
                log.includes('⚠️') ? 'text-yellow-400' :
                log.includes('✅') ? 'text-green-400' : ''
              }`}>
                {log}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SupabaseTest; 