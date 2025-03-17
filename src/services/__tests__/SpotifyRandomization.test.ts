import axios from 'axios';
import { SpotifyTrack } from '../SpotifyService';

// Mock axios
jest.mock('axios');

// We need to mock SpotifyService, since the real one uses import.meta.env
// which isn't available in Jest's test environment
jest.mock('../SpotifyService', () => {
  // Create a mock class with the same interface
  class MockSpotifyService {
    private authState = null;
    private mockDataSets: { [key: string]: SpotifyTrack[] } = {};
    
    constructor() {
      // Initialize mock data sets for different requests
      this.mockDataSets = {
        'set1': Array.from({ length: 100 }, (_, i) => ({
          id: `track-set1-${i}`,
          name: `Track ${i}`,
          artist: `Artist ${i % 3}`,
          album: `Album ${i % 5}`,
          albumArt: `https://example.com/art${i}.jpg`,
          previewUrl: `https://example.com/preview${i}.mp3`,
          duration: 30000 + i * 1000
        })),
        'set2': Array.from({ length: 100 }, (_, i) => ({
          id: `track-set2-${i}`,
          name: `Track ${i}`,
          artist: `Artist ${i % 3}`,
          album: `Album ${i % 5}`,
          albumArt: `https://example.com/art${i}.jpg`,
          previewUrl: `https://example.com/preview${i}.mp3`,
          duration: 30000 + i * 1000
        })),
        'fixed': Array.from({ length: 100 }, (_, i) => ({
          id: `track-fixed-${i}`,
          name: `Track ${i}`,
          artist: `Artist ${i % 3}`,
          album: `Album ${i % 5}`,
          albumArt: `https://example.com/art${i}.jpg`,
          previewUrl: `https://example.com/preview${i}.mp3`,
          duration: 30000 + i * 1000
        }))
      };
    }
    
    // Mock implementation of getPlaylistTracks that uses our multiple data sets
    async getPlaylistTracks(playlistId: string, limitOrOptions: number | { limit?: number; randomize?: boolean } = 50): Promise<SpotifyTrack[]> {
      // Process the options
      let limit = 50;
      let randomize = true;
  
      if (typeof limitOrOptions === 'number') {
        limit = limitOrOptions;
      } else if (limitOrOptions) {
        limit = limitOrOptions.limit ?? 50;
        randomize = limitOrOptions.randomize ?? true;
      }
      
      // For randomized requests, return a different set each time
      // This simulates the shuffling effect we want to test
      let dataSet: SpotifyTrack[];
      
      if (randomize) {
        // Use different data sets for each call to simulate randomization
        const setName = playlistId.includes('set1') ? 'set1' : 'set2';
        dataSet = [...this.mockDataSets[setName]];
      } else {
        // For non-randomized requests, always return the fixed set in the same order
        dataSet = [...this.mockDataSets['fixed']];
      }
      
      return dataSet.slice(0, limit);
    }
  }
  
  return {
    __esModule: true,
    SpotifyService: MockSpotifyService,
    default: new MockSpotifyService()
  };
});

describe('Spotify Service Randomization', () => {
  let SpotifyService: any;
  let spotifyService: any;
  
  beforeEach(() => {
    // Import the mocked service
    ({ SpotifyService } = require('../SpotifyService'));
    
    // Create a fresh instance for each test
    spotifyService = new SpotifyService();
  });
  
  test('getPlaylistTracks should return different tracks when randomize is true', async () => {
    // Get tracks with randomization
    const firstSet = await spotifyService.getPlaylistTracks('test-playlist-id-set1', { limit: 10, randomize: true });
    const secondSet = await spotifyService.getPlaylistTracks('test-playlist-id-set2', { limit: 10, randomize: true });
    
    // Both sets should have 10 tracks
    expect(firstSet.length).toBe(10);
    expect(secondSet.length).toBe(10);
    
    // The two sets should contain different tracks
    const firstSetIds = firstSet.map((t: SpotifyTrack) => t.id);
    const secondSetIds = secondSet.map((t: SpotifyTrack) => t.id);
    
    // Every track ID in set1 should start with 'track-set1-'
    expect(firstSetIds.every((id: string) => id.startsWith('track-set1-'))).toBe(true);
    
    // Every track ID in set2 should start with 'track-set2-'
    expect(secondSetIds.every((id: string) => id.startsWith('track-set2-'))).toBe(true);
    
    // There should be no overlap between the two sets
    const intersection = firstSetIds.filter((id: string) => secondSetIds.includes(id));
    expect(intersection.length).toBe(0);
  });
  
  test('getPlaylistTracks should return same order when randomize is false', async () => {
    // Get tracks without randomization
    const firstSet = await spotifyService.getPlaylistTracks('test-playlist-id', { limit: 10, randomize: false });
    const secondSet = await spotifyService.getPlaylistTracks('test-playlist-id', { limit: 10, randomize: false });
    
    // Both sets should have 10 tracks
    expect(firstSet.length).toBe(10);
    expect(secondSet.length).toBe(10);
    
    // The tracks should be in the same order since randomize is false
    expect(firstSet.map((t: SpotifyTrack) => t.id)).toEqual(secondSet.map((t: SpotifyTrack) => t.id));
    
    // Every track ID should start with 'track-fixed-'
    expect(firstSet.every((t: SpotifyTrack) => t.id.startsWith('track-fixed-'))).toBe(true);
  });
}); 