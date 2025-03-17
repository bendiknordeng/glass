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
 * Normalize artist names for comparison by removing special characters,
 * extra spaces, and making lowercase
 */
function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
    .trim();
}

/**
 * Compare two artist names to see if they match, handling common variations
 */
function artistNamesMatch(artist1: string, artist2: string): boolean {
  if (!artist1 || !artist2) return false;
  
  const normalized1 = normalizeArtistName(artist1);
  const normalized2 = normalizeArtistName(artist2);
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Check if one contains the other (for partial matches like "Madonna" vs "Madonna feat. Justin")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
  
  // Handle "The" prefix variations (e.g., "The Beatles" vs "Beatles")
  if (normalized1.startsWith('the ') && normalized1.substring(4) === normalized2) return true;
  if (normalized2.startsWith('the ') && normalized2.substring(4) === normalized1) return true;
  
  // Handle featuring artists
  const featVariations = ['feat', 'featuring', 'ft', 'with'];
  
  for (const feat of featVariations) {
    // Check if artist1 has featuring
    if (normalized1.includes(feat)) {
      const mainArtist = normalized1.split(new RegExp(`\\s${feat}\\s|\\s${feat}\\.\\s`))[0].trim();
      if (mainArtist === normalized2) return true;
    }
    
    // Check if artist2 has featuring
    if (normalized2.includes(feat)) {
      const mainArtist = normalized2.split(new RegExp(`\\s${feat}\\s|\\s${feat}\\.\\s`))[0].trim();
      if (mainArtist === normalized1) return true;
    }
  }
  
  return false;
}

/**
 * Search iTunes for preview URLs
 * @param songQuery The search query for iTunes
 * @param limit Maximum number of results to return
 */
export async function findItunesPreviews(
  songQuery: string, 
  limit = 1
): Promise<PreviewFinderResult> {
  try {
    // Basic validation to avoid API errors
    if (!songQuery || songQuery.trim() === '') {
      return {
        success: false,
        results: [],
        error: 'Empty search query for iTunes'
      };
    }
    
    // Simple sanitizing - just trim whitespace
    const query = songQuery.trim();
    
    // Skip the API call if search term is too short (avoid Bad Request errors)
    if (query.length < 3) {
      return {
        success: false,
        results: [],
        error: 'Search term too short for iTunes API'
      };
    }
    
    console.log(`Searching iTunes for: "${query}" with limit=${limit}`);
    
    // Use the simple axios approach that worked before
    const response = await axios.get(`https://itunes.apple.com/search`, {
      params: {
        term: query,
        media: 'music',
        entity: 'song',
        limit: Math.min(limit, 10)
      },
      timeout: 8000 // Keep our timeout
    });
    
    if (!response.data.results || response.data.results.length === 0) {
      return {
        success: false,
        results: [],
        error: 'No matching tracks found on iTunes'
      };
    }
    
    // Map the results directly
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
      results: results.slice(0, limit),
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
 * @param songQuery The song title or combined song and artist query
 * @param limit Maximum number of results to return
 * @param accessToken Kept for compatibility, but not used
 */
export default async function customPreviewFinder(
  songQuery: string, 
  limit = 1, 
  accessToken?: string // Kept for compatibility, but not used
): Promise<PreviewFinderResult> {
  // Only use iTunes with the query as is
  return await findItunesPreviews(songQuery, limit);
} 