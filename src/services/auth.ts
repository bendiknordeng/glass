import { Provider } from "@supabase/supabase-js";
import supabase from "./supabase";

// Make sure this exactly matches what's in Google Cloud Console
const PROVIDER_REDIRECT_URI = import.meta.env.VITE_PROVIDER_REDIRECT_URI;
/**
 * Authentication service for Supabase
 */
export const AuthService = {
  /**
   * Sign in with OAuth provider (Google, Facebook)
   */
  signInWithOAuth: async (provider: Provider) => {
    try {
      console.log(`Starting ${provider} OAuth flow`);

      // For Google, we need specific options
      const options: Record<string, any> = {
        redirectTo: PROVIDER_REDIRECT_URI,
      };

      if (provider === "google") {
        // Let Supabase handle most of the flow, but ensure we get refresh token
        options.queryParams = {
          // This ensures we get a refresh token
          access_type: "offline",
          // This ensures we always get a fresh consent screen
          prompt: "consent",
        };
      }

      console.log(`${provider} OAuth options:`, options);

      // Note: Removing the artificial delay that was causing issues
      // Allow the login to proceed immediately

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      if (error) {
        console.error(`${provider} OAuth error:`, error);
        throw error;
      }

      // Important debugging - log the auth URL that was generated
      if (data?.url) {
        console.log(`Redirecting to ${provider} auth URL:`, data.url);
      }

      return { success: true, data };
    } catch (error) {
      console.error("OAuth sign in error:", error);
      return { success: false, error };
    }
  },

  // Rest of your code remains the same...

  /**
   * Sign in with email and password
   */
  signInWithEmail: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Email sign in error:", error);
      return { success: false, error };
    }
  },

  /**
   * Sign up with email and password
   */
  signUpWithEmail: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, error };
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async (redirectTo = '/') => {
    try {
      console.log("Auth service: Starting sign out process");
      
      // Create a promise race between the Supabase signOut and a timeout
      const signOutPromise = supabase.auth.signOut({ scope: "global" });
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.log("Auth service: Supabase signOut timed out after 1.5s, continuing with cleanup");
          resolve({ error: new Error("Supabase signOut timed out") });
        }, 100);
      });
      
      // Race the promises - either the signOut completes or we timeout
      const { error } = await Promise.race([signOutPromise, timeoutPromise]) as { error?: Error };
      
      if (error) {
        console.error("Auth service: Sign out error or timeout:", error);
        // Continue with cleanup even if there's an error
      }

      localStorage.removeItem('sb-zddvmvyalnfahzswuboq-auth-token');
      
      // Return success for any code waiting on this promise
      return { success: true };
    } catch (error) {
      console.error("Auth service: Sign out error:", error);
      return { success: false, error };
    }
  },

  /**
   * Get the current session
   */
  getSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { success: true, session: data.session };
    } catch (error) {
      console.error("Get session error:", error);
      return { success: false, error };
    }
  },

  /**
   * Get the current user
   */
  getUser: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Get user error:", error);
      return { success: false, error };
    }
  },
};

export default AuthService;
