/**
 * A simplified implementation that only uses iTunes for preview URLs
 * without any dependencies on Spotify API or Node.js features
 */
import axios from 'axios';

// Define the result interface similar to spotify-preview-finder
export interface PreviewFinderResult {
  success: boolean;
  results: {
    name: string;
    artist?: string;
    previewUrls: string[];
  }[];
  error?: string;
}

/**
 * Search iTunes for preview URLs
 */
export async function findItunesPreviews(query: string, limit = 1): Promise<PreviewFinderResult> {
  try {
    console.log(`Searching iTunes for: "${query}" with limit=${limit}`);
    
    const response = await axios.get(`https://itunes.apple.com/search`, {
      params: {
        term: query,
        media: 'music',
        entity: 'song',
        limit: Math.min(limit, 10)
      }
    });
    
    if (!response.data.results || response.data.results.length === 0) {
      return {
        success: false,
        results: [],
        error: 'No matching tracks found on iTunes'
      };
    }
    
    const results = response.data.results
      .filter((track: any) => track.previewUrl)
      .map((track: any) => ({
        name: track.trackName,
        artist: track.artistName,
        previewUrls: [track.previewUrl]
      }));
      
    console.log(`Found ${results.length} iTunes previews for "${query}"`);
    
    return {
      success: results.length > 0,
      results: results,
      error: results.length === 0 ? 'No preview URLs found on iTunes' : undefined
    };
  } catch (error) {
    console.error('Error searching iTunes:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error searching iTunes'
    };
  }
}

/**
 * Main function that follows the spotify-preview-finder interface
 * This is what will be directly used by other code
 */
export default async function customPreviewFinder(
  query: string, 
  limit = 1, 
  accessToken?: string // Kept for compatibility, but not used
): Promise<PreviewFinderResult> {
  // Only use iTunes
  return await findItunesPreviews(query, limit);
} 