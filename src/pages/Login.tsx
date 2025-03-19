import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  
  const { 
    signInWithGoogle, 
    signInWithFacebook, 
    signInWithEmail, 
    signUpWithEmail,
    isAuthenticated
  } = useAuth();
  
  useEffect(() => {
    // If already authenticated, redirect
    if (isAuthenticated) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, navigate, redirectTo]);
  
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    setErrorMsg(null);
    
    console.log(`Starting ${provider} login flow`);
    
    try {
      let result;
      
      if (provider === 'google') {
        // Add a clear log before starting Google auth
        console.log('Initiating Google OAuth flow...');
        result = await signInWithGoogle();
      } else {
        result = await signInWithFacebook();
      }
      
      console.log(`${provider} auth result:`, result);
      
      if (!result.success) {
        const errorMessage = 
          (result.error as any)?.message || 
          (result.error as any)?.error_description || 
          `${provider} login failed`;
        throw new Error(errorMessage);
      }
      
      // If redirecting, show a friendly message
      if (result.data?.url) {
        setErrorMsg(`Redirecting to ${provider} login page...`);
        console.log(`Redirect URL: ${result.data.url}`);
        
        // Set a timeout to reset loading state if redirect doesn't happen
        // This is a safety measure for cases where the redirect fails silently
        setTimeout(() => {
          setIsLoading(false);
          setErrorMsg('Redirect failed. Please try again.');
        }, 8000);
      } else {
        // If for some reason there's no redirect but login succeeded
        setIsLoading(false);
        navigate(redirectTo);
      }
      
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setErrorMsg((error as Error).message || `Failed to login with ${provider}`);
      setIsLoading(false);
    }
  };
  
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      let result;
      
      if (isSignUp) {
        result = await signUpWithEmail(email, password);
        
        if (result.success) {
          setErrorMsg(null);
          // For sign up, show a success message if verification is required
          if (result.data?.user?.identities?.length === 0) {
            setErrorMsg('Please check your email to verify your account');
          }
        }
      } else {
        result = await signInWithEmail(email, password);
      }
      
      if (!result.success) {
        throw new Error((result.error as { message?: string })?.message || 'Authentication failed');
      }
      
      // Only redirect for sign in (sign up may require email verification)
      if (!isSignUp && result.success) {
        navigate(redirectTo);
      }
    } catch (error) {
      console.error('Email auth error:', error);
      setErrorMsg((error as Error).message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-game-light dark:bg-game-dark">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-game-primary">
            {isSignUp ? 'Create Account' : 'Welcome Back!'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isSignUp 
              ? 'Sign up to save your game progress' 
              : 'Login to continue your music journey'}
          </p>
        </div>
        
        {errorMsg && (
          <div className="p-4 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200 rounded-lg">
            {errorMsg}
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
            className="flex items-center justify-center w-full p-3 space-x-3 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            <span>Continue with Google</span>
          </button>
          
          <button
            onClick={() => handleSocialLogin('facebook')}
            disabled={isLoading}
            className="flex items-center justify-center w-full p-3 space-x-3 text-white bg-[#1877F2] rounded-lg shadow-sm hover:bg-[#166FE5]"
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current">
              <path d="M12.001 2.002c-5.522 0-9.999 4.477-9.999 9.999 0 4.99 3.656 9.126 8.437 9.879v-6.988h-2.54v-2.891h2.54V9.798c0-2.508 1.493-3.891 3.776-3.891 1.094 0 2.24.195 2.24.195v2.459h-1.264c-1.24 0-1.628.772-1.628 1.563v1.875h2.771l-.443 2.891h-2.328v6.988C18.344 21.129 22 16.992 22 12.001c0-5.522-4.477-9.999-9.999-9.999z"/>
            </svg>
            <span>Continue with Facebook</span>
          </button>
        </div>
        
        <div className="flex items-center">
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
          <span className="px-4 text-sm text-gray-500 dark:text-gray-400">Or continue with email</span>
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
        </div>
        
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-game-primary focus:border-game-primary"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-game-primary focus:border-game-primary"
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex justify-center w-full px-4 py-2 text-white border border-transparent rounded-md shadow-sm bg-game-primary hover:bg-opacity-90 focus:outline-none"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" color="light" />
              ) : (
                isSignUp ? 'Sign Up' : 'Sign In'
              )}
            </button>
          </div>
        </form>
        
        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-game-primary hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login; 