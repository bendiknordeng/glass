import axios from 'axios';
import { findPreviewUrls } from './PreviewFinder';
// Import our custom preview finder instead of the npm package
import customPreviewFinder from './CustomPreviewFinder';

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
 * Spotify authentication state - stored in localStorage
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

  constructor() {
    // Retrieve the configuration from environment variables or use defaults
    this.config = {
      clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID || '',
      redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/auth/spotify/callback`,
    };
    
    // Load auth state from localStorage if available
    this.loadAuthState();
  }

  /**
   * Check if Spotify API credentials are configured
   */
  hasCredentials(): boolean {
    return Boolean(this.config.clientId && import.meta.env.VITE_SPOTIFY_CLIENT_SECRET);
  }

  /**
   * Check if the user is authenticated with Spotify
   */
  isAuthenticated(): boolean {
    if (!this.authState) return false;
    
    // Check if token is expired
    return this.authState.expiresAt > Date.now();
  }

  /**
   * Get login URL for Spotify OAuth
   */
  getLoginUrl(): string {
    if (!this.hasCredentials()) {
      console.error('Spotify credentials not configured');
      // Return a dummy URL if credentials are missing
      return '#spotify-credentials-missing';
    }

    // Generate a random state for CSRF protection
    const state = this.generateRandomString(16);
    localStorage.setItem('spotify_auth_state', state);

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
    const storedState = localStorage.getItem('spotify_auth_state');
    if (state !== storedState) {
      throw new Error('State mismatch');
    }
    
    // Clear the state from localStorage
    localStorage.removeItem('spotify_auth_state');

    try {
      // Exchange the code for tokens
      // Note: In a real application, this request should be made from your backend
      // for security reasons (to keep the client_secret secure)
      const response = await axios.post(
        SPOTIFY_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
          // client_secret should be kept on the server side
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

      // Store the tokens
      this.authState = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt,
      };

      // Fetch user profile
      await this.fetchUserProfile();
      
      // Save auth state to localStorage
      this.saveAuthState();
      
      return true;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
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
        this.saveAuthState();
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
      
      // If we don't have enough tracks with previews, look for alternative previews
      console.log(`Only found ${tracksWithPreviews.length} tracks with previews, need ${limit}. Trying to find alternatives...`);
      
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
        console.log(`Finding alternative preview URLs for ${tracksWithoutPreviews.length} tracks...`);
        
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
            console.log(`Searching for alternative preview: "${searchTerm}"`);
            
            // Pass song name and artist as separate parameters for more accurate matching
            const result = await customPreviewFinder(searchTerm, 1);
            
            if (result.success && result.results.length > 0 && result.results[0].previewUrls.length > 0) {
              // Verify that the artist matches before accepting the result
              const matchedTrack = result.results[0];
              const artistMatches = this.artistsMatch(primaryArtist, matchedTrack.artist || '');
              
              if (artistMatches) {
                console.log(`✓ Found matching preview for "${track.name}" by "${primaryArtist}"`);
                return {
                  id: track.id,
                  previewUrl: matchedTrack.previewUrls[0],
                  success: true,
                };
              } else {
                console.warn(`✗ Found preview for "${track.name}" but artist "${matchedTrack.artist}" doesn't match "${primaryArtist}"`);
                return { id: track.id, success: false };
              }
            } else if (result.error) {
              console.warn(`No preview found for "${track.name}": ${result.error}`);
            } else {
              console.warn(`No preview found for "${track.name}" by "${primaryArtist}"`);
            }
            return { id: track.id, success: false };
          } catch (error) {
            console.error(`Error finding preview for "${track.name}":`, error);
            return { id: track.id, success: false };
          }
        });
        
        // Wrap the Promise.all in a try/catch to handle any failures
        try {
          // Wait for all searches to complete, but don't fail if some reject
          const previewResults = await Promise.allSettled(previewSearchPromises);
          
          // Apply the found preview URLs to the tracks
          let foundCount = 0;
          previewResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value.success && result.value.previewUrl) {
              // Find the track in our selected tracks array
              const trackIndex = tracksWithoutPreviews.findIndex(t => t.id === result.value.id);
              if (trackIndex !== -1) {
                // Update with the found preview URL
                tracksWithoutPreviews[trackIndex].previewUrl = result.value.previewUrl;
                foundCount++;
              }
            }
          });
          
          console.log(`Found alternative previews for ${foundCount}/${tracksWithoutPreviews.length} tracks`);
        } catch (error) {
          console.error('Error processing alternative preview searches:', error);
          // Continue with what we have even if the alternative preview search failed
        }
      }
      
      // Return only tracks with preview URLs, limited to exactly what was requested
      const finalTracks = [...tracksWithPreviews, 
        ...tracksWithoutPreviews.filter((track: SpotifyTrack) => track.previewUrl)]
        .slice(0, limit);
      
      console.log(`Returning ${finalTracks.length} tracks with preview URLs`);
      return finalTracks;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      return [];
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
   * Refresh the access token using the refresh token
   */
  private async refreshToken(): Promise<void> {
    if (!this.authState?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      // This should be done on the server side in a real application
      const response = await axios.post(
        SPOTIFY_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.authState.refreshToken,
          client_id: this.config.clientId,
          // client_secret should be kept on the server side
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
        // If a new refresh token is provided, use it
        refreshToken: response.data.refresh_token || this.authState.refreshToken,
      };

      this.saveAuthState();
    } catch (error) {
      console.error('Error refreshing token:', error);
      // If refresh fails, force re-authentication
      this.logout();
      throw new Error('Failed to refresh token');
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
   * Load auth state from localStorage
   */
  private loadAuthState(): void {
    const storedState = localStorage.getItem(this.localStorageKey);
    if (storedState) {
      try {
        this.authState = JSON.parse(storedState);
      } catch (e) {
        console.error('Error parsing stored auth state:', e);
        this.authState = null;
      }
    }
  }

  /**
   * Generate a random string for state parameter
   */
  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    
    return text;
  }

  /**
   * Helper method to check if two artist names match
   * This handles common variations in artist names
   */
  private artistsMatch(spotifyArtist: string, foundArtist: string): boolean {
    if (!spotifyArtist || !foundArtist) return false;
    
    // Normalize both strings: lowercase and remove special chars
    const normalize = (str: string) => str.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
      .trim();
      
    const normalizedSpotify = normalize(spotifyArtist);
    const normalizedFound = normalize(foundArtist);
    
    // Exact match
    if (normalizedSpotify === normalizedFound) return true;
    
    // Check if one contains the other
    if (normalizedSpotify.includes(normalizedFound) || normalizedFound.includes(normalizedSpotify)) return true;
    
    // Check for artist name variations (e.g., "The Beatles" vs "Beatles")
    if (normalizedSpotify.startsWith('the ')) {
      const withoutThe = normalizedSpotify.substring(4);
      if (withoutThe === normalizedFound) return true;
    }
    
    if (normalizedFound.startsWith('the ')) {
      const withoutThe = normalizedFound.substring(4);
      if (withoutThe === normalizedSpotify) return true;
    }
    
    return false;
  }

  /**
   * Fisher-Yates shuffle algorithm
   * This provides a more random distribution than the simple sort method
   */
  private shuffleArray<T>(array: T[]): void {
    // Fisher-Yates (Knuth) shuffle algorithm
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

// Create a default instance with the client ID from environment variables or configuration
const spotifyService = new SpotifyService();
export default spotifyService; 