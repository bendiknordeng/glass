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
 * @param songName The name of the song to search for
 * @param artistName The artist of the song (optional but recommended for accuracy)
 * @param limit Maximum number of results to return
 */
export async function findItunesPreviews(
  songName: string, 
  artistName?: string, 
  limit = 1
): Promise<PreviewFinderResult> {
  try {
    // Create a search term with both song and artist if available
    const searchTerm = artistName 
      ? `${songName} ${artistName}` 
      : songName;
    
    console.log(`Searching iTunes for: "${songName}" by "${artistName || 'unknown artist'}" with limit=${limit}`);
    
    // Construct query parameters
    const queryParams: Record<string, string> = {
      term: searchTerm,
      media: 'music',
      entity: 'song',
      limit: Math.min(limit * 3, 25).toString() // Get more results for better matching
    };
    
    // If we have the artist name, add specific filters
    if (artistName) {
      queryParams.attribute = 'artistTerm,songTerm';
    }
    
    const response = await axios.get(`https://itunes.apple.com/search`, {
      params: queryParams
    });
    
    if (!response.data.results || response.data.results.length === 0) {
      return {
        success: false,
        results: [],
        error: 'No matching tracks found on iTunes'
      };
    }
    
    let results = response.data.results
      .filter((track: any) => track.previewUrl)
      .map((track: any) => ({
        name: track.trackName,
        artist: track.artistName,
        previewUrl: track.previewUrl
      }));
     
    // If we have both song name and artist, prioritize matches
    if (artistName) {
      // First try exact matches on both song and artist
      const exactMatches = results.filter((result: any) => {
        const songMatches = result.name.toLowerCase() === songName.toLowerCase();
        const artistMatches = artistNamesMatch(result.artist, artistName);
        return songMatches && artistMatches;
      });
      
      if (exactMatches.length > 0) {
        results = exactMatches;
        console.log(`Found ${exactMatches.length} exact match(es) for "${songName}" by "${artistName}"`);
      } else {
        // Try to find partial matches with strong artist matching
        const partialMatches = results.filter((result: any) => {
          return artistNamesMatch(result.artist, artistName) &&
                 (result.name.toLowerCase().includes(songName.toLowerCase()) || 
                  songName.toLowerCase().includes(result.name.toLowerCase()));
        });
        
        if (partialMatches.length > 0) {
          results = partialMatches;
          console.log(`Found ${partialMatches.length} partial match(es) for "${songName}" by "${artistName}"`);
        }
      }
    }
      
    console.log(`Found ${results.length} iTunes previews for "${searchTerm}"`);
    
    return {
      success: results.length > 0,
      results: results.map((result: { name: string; artist: string; previewUrl: string }) => ({
        name: result.name,
        artist: result.artist,
        previewUrls: [result.previewUrl]
      })).slice(0, limit),
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
  // Parse the query to extract song name and artist if possible
  // A common format in music queries is "Song Name - Artist Name"
  const querySeparators = [' - ', ' by ', '—', '–', '-', ' (by) '];
  let songName = songQuery;
  let artistName: string | undefined = undefined;
  
  // Try to extract artist name from query using common separators
  for (const separator of querySeparators) {
    if (songQuery.includes(separator)) {
      const parts = songQuery.split(separator);
      if (parts.length >= 2) {
        songName = parts[0].trim();
        artistName = parts[1].trim();
        break;
      }
    }
  }
  
  console.log(`Parsed query "${songQuery}" into song: "${songName}", artist: "${artistName || 'unknown'}"`);
  
  // Only use iTunes with the separated song name and artist
  return await findItunesPreviews(songName, artistName, limit);
} 