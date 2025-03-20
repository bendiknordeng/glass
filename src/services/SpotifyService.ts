import axios from 'axios';
import { findPreviewUrls } from './PreviewFinder';
// Import our custom preview finder instead of the npm package
import customPreviewFinder from './CustomPreviewFinder';
import DataService from '@/services/data';
import { supabase } from '@/services/supabase';

/**
 * Spotify API URLs
 */
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

/**
 * Required scopes for our application
 * - playlist-read-private: To access user's private playlists
 * - playlist-read-collaborative: To access user's collaborative playlists
 * - user-read-email: To get user's email
 * - user-read-private: To get user's Spotify profile info
 */
const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-email',
  'user-read-private',
];

/**
 * Spotify authentication state
 */
export interface SpotifyAuthState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Timestamp when token expires
  user?: SpotifyUser;
}

/**
 * Spotify user profile
 */
export interface SpotifyUser {
  id: string;
  displayName: string;
  email: string;
  images: { url: string }[];
  profileUrl?: string;
  country?: string;
}

/**
 * Spotify playlist
 */
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  trackCount: number;
  owner: {
    id: string;
    displayName: string;
  };
  external_urls: {
    spotify: string;
  };
}

/**
 * Spotify track
 */
export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  previewUrl: string | null;
  duration: number;
}

/**
 * Options for playlist track retrieval
 */
export interface GetPlaylistTracksOptions {
  randomize?: boolean; // Whether to randomize the track order
  limit?: number;      // Maximum number of tracks to return
}

/**
 * Spotify auth config
 */
interface SpotifyConfig {
  clientId: string;
  redirectUri: string;
}

/**
 * Service for handling Spotify API interactions
 */
export class SpotifyService {
  private config: SpotifyConfig;
  private authState: SpotifyAuthState | null = null;
  private localStorageKey = 'spotifyAuthState';
  private stateStorageKey = 'spotify_auth_state';

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID || '',
      redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/auth/spotify/callback`,
    };
    
    // First load from localStorage synchronously
    const loadedFromLocal = this.loadLocalAuthState();
    
    // Then try loading from Supabase asynchronously if needed
    if (!loadedFromLocal) {
      this.tryLoadFromSupabase().catch(err => {
        console.error('Failed to load auth from Supabase:', err);
      });
    } else {
      console.log('Already loaded auth from localStorage, no need to check Supabase');
    }
  }

  /**
   * Check if Spotify API credentials are configured
   */
  hasCredentials(): boolean {
    return Boolean(this.config.clientId && import.meta.env.VITE_SPOTIFY_CLIENT_SECRET);
  }

  /**
   * Check if the user is authenticated with Spotify
   * @param tryRefresh Whether to try refreshing the token if it's expired but has a refresh token
   */
  isAuthenticated(tryRefresh = false): boolean {
    if (!this.authState) return false;
    
    const isValid = this.authState.expiresAt > Date.now();
    
    if (!isValid && tryRefresh && this.authState.refreshToken) {
      // Schedule a token refresh but don't wait for it
      console.log('Token expired but refresh token available, scheduling refresh');
      this.refreshToken().catch(err => {
        console.error('Failed to refresh token:', err);
      });
      // Return true to indicate we're "authenticated" since we have a refresh token
      return true;
    }
    
    return isValid;
  }

  /**
   * Get login URL for Spotify OAuth
   */
  getLoginUrl(returnPath?: string): string {
    if (!this.hasCredentials()) {
      console.error('Spotify credentials not configured');
      return '#spotify-credentials-missing';
    }

    // Store the current path to redirect back to after login
    if (returnPath) {
      localStorage.setItem('spotify_return_path', returnPath);
    } else {
      // If no path is provided, use the current path
      const currentPath = window.location.pathname;
      localStorage.setItem('spotify_return_path', currentPath !== '/auth/spotify/callback' ? currentPath : '/setup');
    }

    // Generate a random state for CSRF protection
    const state = this.generateRandomString(16);
    
    // Store state in localStorage instead of sessionStorage to ensure it persists across redirects
    localStorage.setItem(this.stateStorageKey, state);
    console.log('Stored Spotify auth state:', state);

    // Create the authorization URL with required parameters
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      state: state,
      scope: SPOTIFY_SCOPES.join(' '),
    });

    return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange the authorization code for access and refresh tokens
   */
  async handleCallback(code: string, state: string): Promise<boolean> {
    // Verify state to prevent CSRF attacks
    const storedState = localStorage.getItem(this.stateStorageKey);
    
    console.log('Verifying Spotify auth state...');
    console.log('- Received state:', state);
    console.log('- Stored state:', storedState);
    
    let stateMismatch = false;
    
    if (state !== storedState) {
      console.error('SpotifyService handleCallback: State mismatch!');
      console.error('- Received state:', state);
      console.error('- Stored state:', storedState);
      
      // Mark that we had a state mismatch, but continue anyway for debugging
      stateMismatch = true;
      console.warn('SpotifyService: Continuing despite state mismatch for debugging');
    }
    
    // Clear the state from localStorage
    localStorage.removeItem(this.stateStorageKey);

    // At this point, authorization code from Spotify should be single-use and short-lived
    // Save it to detect and prevent reuse in case of page reload
    const savedCode = localStorage.getItem('spotify_code');
    if (savedCode === code) {
      console.error('SpotifyService: Attempting to reuse an authorization code. This will fail.');
      console.error('- Currently processing code is the same as previously used code');
      
      // If we already have valid tokens in memory, return success
      if (this.authState && this.authState.expiresAt > Date.now()) {
        console.log('SpotifyService: Using existing valid tokens instead of exchanging code again');
        return true;
      }
      
      // If we have a refreshToken, try to use it instead
      if (this.authState?.refreshToken) {
        try {
          console.log('SpotifyService: Trying to refresh token instead of exchanging code again');
          await this.refreshToken();
          return true;
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          // Continue with code exchange as a last resort
        }
      }
    }
    
    // Save the current code
    localStorage.setItem('spotify_code', code);

    try {
      console.log('Exchanging code for tokens...');
      console.log('- Code length:', code.length);
      console.log('- Redirect URI:', this.config.redirectUri);
      
      const response = await axios.post(
        SPOTIFY_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
          client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      console.log('Token exchange successful');
      
      // Calculate when the token will expire
      const expiresAt = Date.now() + response.data.expires_in * 1000;

      // Store the tokens
      this.authState = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt,
      };

      // Fetch user profile
      await this.fetchUserProfile();
      
      // Clear the saved code since we successfully exchanged it
      localStorage.removeItem('spotify_code');
      
      // Save auth state to localStorage
      this.saveAuthState();
      
      // Note: We're letting the SpotifyCallback component handle saving to Supabase
      // to avoid duplicate save operations and better handle the success/failure paths.
      
      return true;
    } catch (error: any) { // Type error as any for AxiosError properties
      console.error('Error exchanging code for tokens:', error);
      
      // Log detailed error information if it's an Axios error
      if (error.response) {
        console.error('- Status:', error.response.status);
        console.error('- Data:', error.response.data);
        console.error('- Headers:', error.response.headers);
        
        // If we got an invalid_grant error and we had a state mismatch,
        // the code might have been reused or expired
        if (
          error.response.data?.error === 'invalid_grant' && 
          (stateMismatch || error.response.data?.error_description === 'Invalid authorization code')
        ) {
          console.log('Detected invalid_grant error, redirecting to login again');
          
          // Clear any previously saved code
          localStorage.removeItem('spotify_code');
          
          // If we have an existing valid token, just return success
          if (this.authState && this.authState.expiresAt > Date.now()) {
            console.log('Using existing valid tokens');
            return true;
          }
          
          return false;
        }
      } else if (error.request) {
        console.error('- No response received:', error.request);
      } else {
        console.error('- Error message:', error.message);
      }
      
      return false;
    }
  }

  /**
   * Fetch the user's Spotify profile
   */
  async fetchUserProfile(): Promise<SpotifyUser | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      await this.ensureTokenIsValid();
      
      const response = await axios.get(`${SPOTIFY_API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${this.authState?.accessToken}`,
        },
      });

      const user: SpotifyUser = {
        id: response.data.id,
        displayName: response.data.display_name,
        email: response.data.email,
        images: response.data.images,
        profileUrl: response.data.external_urls?.spotify,
        country: response.data.country,
      };

      if (this.authState) {
        this.authState.user = user;
      }

      return user;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Get current user info
   */
  getCurrentUser(): SpotifyUser | undefined {
    return this.authState?.user;
  }

  /**
   * Fetch user's playlists
   */
  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    if (!this.isAuthenticated()) {
      return [];
    }

    try {
      await this.ensureTokenIsValid();
      
      const response = await axios.get(`${SPOTIFY_API_BASE_URL}/me/playlists`, {
        headers: {
          Authorization: `Bearer ${this.authState?.accessToken}`,
        },
      });

      // Map the response to our interface
      return response.data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        images: item.images,
        trackCount: item.tracks.total,
        owner: {
          id: item.owner.id,
          displayName: item.owner.display_name,
        },
        external_urls: item.external_urls,
      }));
    } catch (error) {
      console.error('Error fetching user playlists:', error);
      return [];
    }
  }

  /**
   * Fetch a playlist by ID
   */
  async getPlaylistById(playlistId: string): Promise<SpotifyPlaylist | null> {
    if (!this.isAuthenticated() && !this.config.clientId) {
      return null;
    }

    try {
      await this.ensureTokenIsValid();
      
      const response = await axios.get(`${SPOTIFY_API_BASE_URL}/playlists/${playlistId}`, {
        headers: {
          Authorization: `Bearer ${this.authState?.accessToken}`,
        },
      });

      // Map the response to our interface
      return {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        images: response.data.images,
        trackCount: response.data.tracks.total,
        owner: {
          id: response.data.owner.id,
          displayName: response.data.owner.display_name,
        },
        external_urls: response.data.external_urls,
      };
    } catch (error) {
      console.error('Error fetching playlist:', error);
      return null;
    }
  }

  /**
   * Get playlist tracks
   */
  async getPlaylistTracks(playlistId: string, limitOrOptions: number | GetPlaylistTracksOptions = 50): Promise<SpotifyTrack[]> {
    if (!this.isAuthenticated() && !this.config.clientId) {
      return [];
    }

    // Process the options
    let limit = 50;
    let randomize = true; // Default to randomizing

    if (typeof limitOrOptions === 'number') {
      limit = limitOrOptions;
    } else if (limitOrOptions) {
      limit = limitOrOptions.limit ?? 50;
      randomize = limitOrOptions.randomize ?? true;
    }

    try {
      await this.ensureTokenIsValid();
      
      // Calculate how many tracks to request from the API
      // We need to request more tracks than the limit since some won't have preview URLs
      const apiLimit = Math.min(100, Math.max(limit * 2, 20)); // At least 20, at most 100
      
      // Get tracks from playlist (without market parameter)
      const response = await axios.get(`${SPOTIFY_API_BASE_URL}/playlists/${playlistId}/tracks`, {
        params: {
          limit: apiLimit,
          fields: 'items(track(id,name,preview_url,duration_ms,album(name,images),artists(name)))',
        },
        headers: {
          Authorization: `Bearer ${this.authState?.accessToken}`,
        },
      });

      // Map the response to our interface
      const tracks = response.data.items
        .filter((item: any) => item.track) // Filter out null tracks
        .map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists.map((artist: any) => artist.name).join(', '),
          album: item.track.album.name,
          albumArt: item.track.album.images[0]?.url || '',
          previewUrl: item.track.preview_url,
          duration: item.track.duration_ms,
        }));
      
      // Filter tracks that have preview URLs immediately
      const tracksWithPreviews = tracks.filter((track: SpotifyTrack) => track.previewUrl);
      
      // If we have enough tracks with previews, randomize and return exactly what we need
      if (tracksWithPreviews.length >= limit) {
        // Apply Fisher-Yates shuffle if randomization is requested
        if (randomize) {
          this.shuffleArray(tracksWithPreviews);
        }
        
        // Return exactly the number of tracks requested
        return tracksWithPreviews.slice(0, limit);
      }
      
      // Randomize all tracks if requested
      const tracksToProcess = [...tracks];
      if (randomize) {
        this.shuffleArray(tracksToProcess);
      }
      
      // Select a subset of tracks to process
      // We prioritize tracks without previews but limit the total to avoid excessive API calls
      const tracksWithoutPreviews = tracksToProcess
        .filter((track: SpotifyTrack) => !track.previewUrl)
        .slice(0, limit - tracksWithPreviews.length);
      
      if (tracksWithoutPreviews.length > 0) {
        
        // Process each track without a preview URL in parallel, but limit the number of parallel requests
        const previewSearchPromises = tracksWithoutPreviews.map(async (track: SpotifyTrack) => {
          try {
            // Extract the primary artist from comma-separated list if needed
            const primaryArtist = track.artist.split(',')[0].trim();
            
            // Validate inputs before searching
            if (!track.name || !primaryArtist) {
              console.warn(`Skipping preview search for track with missing name or artist: "${track.name || 'Unknown'}" by "${primaryArtist || 'Unknown'}"`);
              return { id: track.id, success: false };
            }
            
            // Sanitize inputs to avoid API errors
            const sanitizeTerm = (term: string): string => {
              return term.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
            };
            
            const sanitizedName = sanitizeTerm(track.name);
            const sanitizedArtist = sanitizeTerm(primaryArtist);
            
            // Skip if sanitized terms are too short
            if (sanitizedName.length < 2 || sanitizedArtist.length < 2) {
              console.warn(`Skipping preview search for track with short name/artist after sanitization: "${sanitizedName}" by "${sanitizedArtist}"`);
              return { id: track.id, success: false };
            }
            
            // Create a clean search term that won't cause API errors
            const searchTerm = `${sanitizedName} - ${sanitizedArtist}`;
            
            // Pass song name and artist as separate parameters for more accurate matching
            const result = await customPreviewFinder(searchTerm, 1);
            
            if (result.success && result.results.length > 0 && result.results[0].previewUrls.length > 0) {
              // Verify that the artist matches before accepting the result
              const matchedTrack = result.results[0];
              const artistMatches = this.artistsMatch(primaryArtist, matchedTrack.artist || '');
              
              if (artistMatches) {
                return {
                  id: track.id,
                  previewUrl: matchedTrack.previewUrls[0],
                  success: true,
                };
              } else {
                console.warn(`Skipping preview for "${track.name}" by "${primaryArtist}"`);
                return { id: track.id, success: false };
              }
            } else {
              console.warn(`Skipping preview for "${track.name}" by "${primaryArtist}"`);
              return { id: track.id, success: false };
            }
          } catch (error) {
            console.error('Error searching for alternative preview:', error);
            return { id: track.id, success: false };
          }
        });
        
        // Wait for all preview search promises to complete
        const results = await Promise.all(previewSearchPromises);
        
        // Find the successful results with preview URLs
        const successfulResults = results.filter((result: any) => result.success);
        
        // If we have successful results, combine them with original tracks that have previews
        if (successfulResults.length > 0) {
          // Create a map of successful results by ID
          const previewMap = new Map();
          successfulResults.forEach(result => {
            if (result.previewUrl) {
              previewMap.set(result.id, result.previewUrl);
            }
          });
          
          // Create complete track objects by updating the original tracks with found preview URLs
          const tracksWithFoundPreviews = tracksWithoutPreviews
            .filter(track => previewMap.has(track.id))
            .map(track => ({
              ...track,
              previewUrl: previewMap.get(track.id)
            }));
          
          // Combine tracks that already had previews with those we found previews for
          const allTracksWithPreviews = [...tracksWithPreviews, ...tracksWithFoundPreviews];
          
          // Apply Fisher-Yates shuffle if randomization is requested
          if (randomize) {
            this.shuffleArray(allTracksWithPreviews);
          }
          
          // Return exactly the number of tracks requested
          return allTracksWithPreviews.slice(0, limit);
        }
        
        // If we don't have any tracks with previews, return an empty array
        console.warn('No tracks with previews found.');
        return [];
      }
      
      // If we don't have any tracks with previews, return an empty array
      console.warn('No tracks with previews found.');
      return [];
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      return [];
    }
  }

  /**
   * Ensure the access token is valid, refreshing if necessary
   */
  private async ensureTokenIsValid(): Promise<void> {
    if (!this.authState) {
      throw new Error('Not authenticated');
    }

    // If token is about to expire (within 5 minutes), refresh it
    if (this.authState.expiresAt < Date.now() + 5 * 60 * 1000) {
      await this.refreshToken();
    }
  }

  /**
   * Save auth state to localStorage
   */
  private saveAuthState(): void {
    if (this.authState) {
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.authState));
    }
  }

  /**
   * Load auth state from localStorage or Supabase
   */
  private async tryLoadFromSupabase(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id) {
        console.log('Trying to load Spotify auth from Supabase for user:', user.id);
        const { success, data } = await DataService.getSpotifyAuth(user.id);
        if (success && data) {
          console.log('Successfully loaded Spotify auth from Supabase');
          this.authState = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_at,
          };
          
          // Save to localStorage for future quick access
          this.saveAuthState();
        } else {
          console.log('No Spotify auth found in Supabase');
        }
      }
    } catch (error) {
      console.error('Error loading auth from Supabase:', error);
      // No auth state could be loaded, it will remain null
    }
  }

  /**
   * Load auth state from localStorage
   * @returns boolean - true if successfully loaded valid auth
   */
  private loadLocalAuthState(): boolean {
    const storedState = localStorage.getItem(this.localStorageKey);
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState);
        
        // Verify tokens are still valid before using them
        if (parsedState && parsedState.expiresAt && parsedState.expiresAt > Date.now()) {
          this.authState = parsedState;
          console.log('Loaded valid Spotify auth from localStorage');
          return true;
        } else if (parsedState && parsedState.refreshToken) {
          // We have refresh token but tokens are expired
          console.log('Found expired Spotify auth with refresh token in localStorage');
          this.authState = parsedState;
          // Will be refreshed on next API call
          return true;
        } else {
          console.log('Found expired Spotify auth without refresh token in localStorage');
          localStorage.removeItem(this.localStorageKey);
          return false;
        }
      } catch (e) {
        console.error('Error parsing Spotify auth from localStorage:', e);
        localStorage.removeItem(this.localStorageKey);
        return false;
      }
    }
    return false;
  }

  /**
   * Generate a random string
   */
  private generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    return result;
  }

  /**
   * Check if two artists match
   */
  private artistsMatch(artist1: string, artist2: string): boolean {
    const normalizedArtist1 = artist1.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedArtist2 = artist2.toLowerCase().replace(/\s+/g, ' ').trim();
    return normalizedArtist1 === normalizedArtist2;
  }

  /**
   * Shuffle an array
   */
  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authState = null;
    localStorage.removeItem(this.localStorageKey);
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshToken(): Promise<void> {
    if (!this.authState?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        SPOTIFY_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.authState.refreshToken,
          client_id: this.config.clientId,
          client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Calculate when the token will expire
      const expiresAt = Date.now() + response.data.expires_in * 1000;

      // Update the auth state
      this.authState = {
        ...this.authState,
        accessToken: response.data.access_token,
        expiresAt,
        refreshToken: response.data.refresh_token || this.authState.refreshToken,
      };

      // Save to localStorage
      this.saveAuthState();
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Login to Spotify - redirect to Spotify login page
   * @param returnPath Optional path to return to after login
   * @param force Whether to force login even if already authenticated
   * @returns true if redirecting, false if failed
   */
  login(returnPath?: string, force = false): boolean {
    if (!this.hasCredentials()) {
      console.error('Spotify credentials not configured');
      return false;
    }
    
    try {
      // If already authenticated with valid tokens and not forcing re-login, just return true
      if (!force && this.isAuthenticated(true)) {
        console.log('Already authenticated with Spotify, no need to log in again');
        return true;
      }
      
      // Get the login URL
      const loginUrl = this.getLoginUrl(returnPath);
      
      // Redirect to Spotify login
      window.location.href = loginUrl;
      return true;
    } catch (error) {
      console.error('Error during Spotify login redirect:', error);
      return false;
    }
  }
}

// Create a default instance with the client ID from environment variables or configuration
const spotifyService = new SpotifyService();
export default spotifyService;