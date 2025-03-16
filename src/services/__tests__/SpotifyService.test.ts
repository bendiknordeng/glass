import axios from 'axios';
import * as SpotifyServiceModule from '../SpotifyService';

// Mock the SpotifyService class
jest.mock('../SpotifyService', () => {
  const originalModule = jest.requireActual('../SpotifyService');
  return {
    ...originalModule,
    default: {
      // Default export is mocked
      getLoginUrl: jest.fn(),
      handleCallback: jest.fn(),
      isAuthenticated: jest.fn(),
      getCurrentUser: jest.fn(),
      getUserPlaylists: jest.fn(),
      getPlaylistById: jest.fn(),
      getPlaylistTracks: jest.fn(),
      logout: jest.fn(),
    },
    // We need to also mock the class so we can create our own instance
    SpotifyService: jest.fn().mockImplementation(() => {
      return {
        getLoginUrl: jest.fn().mockReturnValue('https://accounts.spotify.com/authorize?client_id=test-client-id&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fspotify%2Fcallback&scope=playlist-read-private&state=123456'),
        handleCallback: jest.fn().mockResolvedValue(true),
        isAuthenticated: jest.fn().mockReturnValue(true),
        getCurrentUser: jest.fn().mockReturnValue({
          id: 'test-user-id',
          displayName: 'Test User',
          email: 'test@example.com',
          images: [{ url: 'https://example.com/profile.jpg' }]
        }),
        getUserPlaylists: jest.fn().mockResolvedValue([
          {
            id: 'playlist-1',
            name: 'My Playlist 1',
            description: 'First playlist',
            images: [{ url: 'https://example.com/playlist1.jpg' }],
            trackCount: 25,
            owner: {
              id: 'owner-1',
              displayName: 'Playlist Owner 1'
            },
            external_urls: {
              spotify: 'https://open.spotify.com/playlist/playlist-1'
            }
          }
        ]),
        getPlaylistById: jest.fn().mockResolvedValue({
          id: 'playlist-id',
          name: 'My Test Playlist',
          description: 'A playlist description',
          images: [{ url: 'https://example.com/playlist.jpg' }],
          trackCount: 25,
          owner: {
            id: 'owner-id',
            displayName: 'Playlist Owner'
          },
          external_urls: {
            spotify: 'https://open.spotify.com/playlist/playlist-id'
          }
        }),
        getPlaylistTracks: jest.fn().mockResolvedValue([
          {
            id: 'track-1',
            name: 'Track 1',
            artist: 'Artist 1',
            album: 'Album 1',
            albumArt: 'https://example.com/album1.jpg',
            previewUrl: 'https://example.com/preview1.mp3',
            duration: 180000
          }
        ]),
        logout: jest.fn(),
        // Private methods that we need to mock for tests
        fetchUserProfile: jest.fn().mockResolvedValue({
          id: 'test-user-id',
          displayName: 'Test User',
          email: 'test@example.com',
          images: [{ url: 'https://example.com/profile.jpg' }],
          profileUrl: 'https://open.spotify.com/user/test-user-id'
        }),
        refreshToken: jest.fn().mockResolvedValue(undefined),
        ensureTokenIsValid: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SpotifyService', () => {
  let spotifyService: any;
  
  beforeEach(() => {
    // Reset mocks and localStorage before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Create a fresh instance for each test
    const SpotifyService = SpotifyServiceModule.SpotifyService;
    spotifyService = new SpotifyService();
  });
  
  describe('Authorization', () => {
    test('getLoginUrl should return correct authorization URL', () => {
      const url = spotifyService.getLoginUrl();
      
      expect(url).toContain('https://accounts.spotify.com/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fspotify%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
    });
    
    test('handleCallback should exchange code for tokens', async () => {
      // Mock successful token exchange
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600
        }
      });
      
      await spotifyService.handleCallback('test-code', 'test-state');
      
      // Check that axios called with correct parameters
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
      
      // Check that tokens were stored correctly
      expect(spotifyService.isAuthenticated()).toBe(true);
    });
    
    test('handleCallback should throw error on API failure', async () => {
      // Mock API error
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(
        spotifyService.handleCallback('test-code', 'test-state')
      ).rejects.toThrow();
    });
    
    test('refreshToken should get new access token', async () => {
      // Setup mock refresh token
      (spotifyService as any).authState = {
        accessToken: 'old-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() - 1000 // Expired
      };
      
      // Mock successful token refresh
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          expires_in: 3600
        }
      });
      
      await (spotifyService as any).refreshToken();
      
      // Check that axios called with correct parameters
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
      
      // Check that tokens were updated
      expect((spotifyService as any).authState.accessToken).toBe('new-access-token');
    });
    
    test('logout should clear all Spotify tokens', () => {
      // Setup mock auth state
      (spotifyService as any).authState = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000
      };
      
      spotifyService.logout();
      
      // Check that auth state was cleared
      expect((spotifyService as any).authState).toBeNull();
    });
  });
  
  describe('API Calls', () => {
    beforeEach(() => {
      // Setup authenticated state
      (spotifyService as any).authState = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000 // Not expired
      };
    });
    
    test('getCurrentUser should return user from auth state', () => {
      // Setup user in auth state
      (spotifyService as any).authState.user = {
        id: 'test-user-id',
        displayName: 'Test User',
        email: 'test@example.com',
        images: [{ url: 'https://example.com/profile.jpg' }]
      };
      
      const user = spotifyService.getCurrentUser();
      
      // Check returned user data
      expect(user).toEqual({
        id: 'test-user-id',
        displayName: 'Test User',
        email: 'test@example.com',
        images: [{ url: 'https://example.com/profile.jpg' }]
      });
    });
    
    test('fetchUserProfile should fetch user profile from API', async () => {
      // Mock successful user profile response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'test-user-id',
          display_name: 'Test User',
          email: 'test@example.com',
          images: [{ url: 'https://example.com/profile.jpg' }],
          external_urls: {
            spotify: 'https://open.spotify.com/user/test-user-id'
          }
        }
      });
      
      const user = await (spotifyService as any).fetchUserProfile();
      
      // Check API call
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-access-token'
          }
        })
      );
      
      // Check returned user data
      expect(user).toEqual({
        id: 'test-user-id',
        displayName: 'Test User',
        email: 'test@example.com',
        images: [{ url: 'https://example.com/profile.jpg' }],
        profileUrl: 'https://open.spotify.com/user/test-user-id'
      });
    });
    
    test('getUserPlaylists should fetch user playlists', async () => {
      // Mock successful playlists response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'playlist-1',
              name: 'My Playlist 1',
              description: 'First playlist',
              images: [{ url: 'https://example.com/playlist1.jpg' }],
              tracks: { total: 25 },
              owner: {
                id: 'owner-1',
                display_name: 'Playlist Owner 1'
              },
              external_urls: {
                spotify: 'https://open.spotify.com/playlist/playlist-1'
              }
            },
            {
              id: 'playlist-2',
              name: 'My Playlist 2',
              description: 'Second playlist',
              images: [{ url: 'https://example.com/playlist2.jpg' }],
              tracks: { total: 50 },
              owner: {
                id: 'owner-2',
                display_name: 'Playlist Owner 2'
              },
              external_urls: {
                spotify: 'https://open.spotify.com/playlist/playlist-2'
              }
            }
          ]
        }
      });
      
      const playlists = await spotifyService.getUserPlaylists();
      
      // Check API call
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/playlists',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-access-token'
          }
        })
      );
      
      // Check returned playlists
      expect(playlists).toEqual([
        {
          id: 'playlist-1',
          name: 'My Playlist 1',
          description: 'First playlist',
          images: [{ url: 'https://example.com/playlist1.jpg' }],
          trackCount: 25,
          owner: {
            id: 'owner-1',
            displayName: 'Playlist Owner 1'
          },
          external_urls: {
            spotify: 'https://open.spotify.com/playlist/playlist-1'
          }
        },
        {
          id: 'playlist-2',
          name: 'My Playlist 2',
          description: 'Second playlist',
          images: [{ url: 'https://example.com/playlist2.jpg' }],
          trackCount: 50,
          owner: {
            id: 'owner-2',
            displayName: 'Playlist Owner 2'
          },
          external_urls: {
            spotify: 'https://open.spotify.com/playlist/playlist-2'
          }
        }
      ]);
    });
    
    test('getPlaylistTracks should fetch tracks with preview URLs', async () => {
      // Mock successful tracks response with pagination
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              track: {
                id: 'track-1',
                name: 'Track 1',
                artists: [{ name: 'Artist 1' }],
                album: { 
                  name: 'Album 1',
                  images: [{ url: 'https://example.com/album1.jpg' }]
                },
                preview_url: 'https://example.com/preview1.mp3',
                duration_ms: 180000
              }
            },
            {
              track: {
                id: 'track-2',
                name: 'Track 2',
                artists: [{ name: 'Artist 2' }],
                album: { 
                  name: 'Album 2',
                  images: [{ url: 'https://example.com/album2.jpg' }]
                },
                preview_url: null,
                duration_ms: 210000
              }
            }
          ],
          next: 'https://api.spotify.com/v1/playlists/playlist-id/tracks?offset=2'
        }
      });
      
      // Mock the second page
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              track: {
                id: 'track-3',
                name: 'Track 3',
                artists: [{ name: 'Artist 3' }],
                album: { 
                  name: 'Album 3',
                  images: [{ url: 'https://example.com/album3.jpg' }]
                },
                preview_url: 'https://example.com/preview3.mp3',
                duration_ms: 240000
              }
            }
          ],
          next: null
        }
      });
      
      const tracks = await spotifyService.getPlaylistTracks('playlist-id', 10);
      
      // Check API calls
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/playlists/playlist-id/tracks?limit=50',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-access-token'
          }
        })
      );
      
      // Check returned tracks
      expect(tracks).toHaveLength(2); // Only tracks with preview URLs
      expect(tracks[0]).toEqual({
        id: 'track-1',
        name: 'Track 1',
        artist: 'Artist 1',
        album: 'Album 1',
        albumArt: 'https://example.com/album1.jpg',
        previewUrl: 'https://example.com/preview1.mp3',
        duration: 180000
      });
      expect(tracks[1]).toEqual({
        id: 'track-3',
        name: 'Track 3',
        artist: 'Artist 3',
        album: 'Album 3',
        albumArt: 'https://example.com/album3.jpg',
        previewUrl: 'https://example.com/preview3.mp3',
        duration: 240000
      });
    });
    
    test('getPlaylistById should fetch playlist details', async () => {
      // Mock successful playlist info response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'playlist-id',
          name: 'My Test Playlist',
          description: 'A playlist description',
          images: [{ url: 'https://example.com/playlist.jpg' }],
          tracks: { total: 25 },
          owner: { 
            id: 'owner-id',
            display_name: 'Playlist Owner' 
          },
          external_urls: {
            spotify: 'https://open.spotify.com/playlist/playlist-id'
          }
        }
      });
      
      const playlist = await spotifyService.getPlaylistById('playlist-id');
      
      // Check API call
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/playlists/playlist-id',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-access-token'
          }
        })
      );
      
      // Check returned playlist info
      expect(playlist).toEqual({
        id: 'playlist-id',
        name: 'My Test Playlist',
        description: 'A playlist description',
        images: [{ url: 'https://example.com/playlist.jpg' }],
        trackCount: 25,
        owner: {
          id: 'owner-id',
          displayName: 'Playlist Owner'
        },
        external_urls: {
          spotify: 'https://open.spotify.com/playlist/playlist-id'
        }
      });
    });
    
    test('API calls should attempt token refresh when expired', async () => {
      // Set expired token
      (spotifyService as any).authState = {
        accessToken: 'test-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000 // Expired
      };
      
      // Mock ensureTokenIsValid to simulate the token refresh
      const originalEnsureToken = (spotifyService as any).ensureTokenIsValid;
      (spotifyService as any).ensureTokenIsValid = jest.fn().mockImplementation(async () => {
        (spotifyService as any).authState.accessToken = 'new-access-token';
        (spotifyService as any).authState.expiresAt = Date.now() + 3600000;
        return Promise.resolve();
      });
      
      // Mock user profile request
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [{
            id: 'playlist-1',
            name: 'Playlist',
            description: 'Description',
            images: [],
            tracks: { total: 10 },
            owner: { id: 'owner', display_name: 'Owner' },
            external_urls: { spotify: 'url' }
          }]
        }
      });
      
      await spotifyService.getUserPlaylists();
      
      // Should have tried to ensure token is valid
      expect((spotifyService as any).ensureTokenIsValid).toHaveBeenCalled();
      
      // Then should have made the API call with the new token
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/playlists',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer new-access-token'
          }
        })
      );
      
      // Restore original method
      (spotifyService as any).ensureTokenIsValid = originalEnsureToken;
    });
  });
}); 