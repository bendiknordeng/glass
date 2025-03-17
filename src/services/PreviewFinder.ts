import axios from 'axios';

/**
 * A simplified version of spotify-preview-finder that works with ESM
 * This service is a fallback for when the spotify-preview-finder package fails
 */
export interface PreviewFinderResult {
  success: boolean;
  results: {
    name: string;
    artist?: string;
    previewUrls: string[];
  }[];
  error?: string;
}

// A list of reliable sources for previews
const AUDIO_SOURCES = [
  'https://p.scdn.co/mp3-preview/', // Spotify preview pattern
  'https://audio-ssl.itunes.apple.com/itunes-assets/Music', // Apple Music preview pattern
];

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
 * Find preview URLs for a song using alternative sources
 * @param songName The name of the song to search for
 * @param artistName The artist of the song (optional but recommended for accuracy)
 * @param limit Maximum number of results to return
 * @returns A promise resolving to search results with preview URLs
 */
export async function findPreviewUrls(
  songName: string, 
  artistName?: string, 
  limit = 1
): Promise<PreviewFinderResult> {
  try {
    // Create a search term with both song and artist if available
    const searchTerm = artistName 
      ? `${songName} ${artistName}` 
      : songName;
      
    console.log(`Fallback preview finder searching for: "${songName}" by "${artistName || 'unknown artist'}"`);
    
    // Here we would normally implement a real search against various music APIs
    // This is a simplified implementation
    
    // Try to find a reliable preview URL by using web search
    try {
      // Construct a more specific query that includes both track and artist
      let queryParams: Record<string, string> = {
        term: encodeURIComponent(searchTerm),
        media: 'music',
        limit: Math.min(limit * 3, 25).toString() // Get more results for better matching
      };
      
      // If we have the artist name, add specific filters
      if (artistName) {
        queryParams.attribute = 'artistTerm,songTerm';
      }
      
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
        
      const searchResult = await axios.get(
        `https://itunes.apple.com/search?${queryString}`
      );
      
      if (searchResult.data && searchResult.data.results && searchResult.data.results.length > 0) {
        let iTunesResults = searchResult.data.results
          .filter((item: any) => item.previewUrl)
          .map((item: any) => ({
            name: item.trackName,
            artist: item.artistName,
            previewUrl: item.previewUrl
          }));
          
        // If we have both song name and artist, prioritize matches
        if (artistName) {
          // First try exact matches on both song and artist
          const exactMatches = iTunesResults.filter((result: any) => {
            const songMatches = result.name.toLowerCase() === songName.toLowerCase();
            const artistMatches = artistNamesMatch(result.artist, artistName);
            return songMatches && artistMatches;
          });
          
          if (exactMatches.length > 0) {
            iTunesResults = exactMatches;
            console.log(`Found ${exactMatches.length} exact match(es) for "${songName}" by "${artistName}"`);
          } else {
            // Try to find partial matches with strong artist matching
            const partialMatches = iTunesResults.filter((result: any) => {
              return artistNamesMatch(result.artist, artistName) &&
                    (result.name.toLowerCase().includes(songName.toLowerCase()) || 
                     songName.toLowerCase().includes(result.name.toLowerCase()));
            });
            
            if (partialMatches.length > 0) {
              iTunesResults = partialMatches;
              console.log(`Found ${partialMatches.length} partial match(es) for "${songName}" by "${artistName}"`);
            }
          }
        }
          
        if (iTunesResults.length > 0) {
          console.log(`Found ${iTunesResults.length} preview(s) from iTunes for "${searchTerm}"`);
          return {
            success: true,
            results: iTunesResults.map((result: { name: string; artist: string; previewUrl: string }) => ({
              name: result.name,
              artist: result.artist,
              previewUrls: [result.previewUrl]
            })).slice(0, limit)
          };
        }
      }
    } catch (error) {
      console.warn(`iTunes search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue to fallback
    }
    
    console.log(`No reliable preview URLs found for "${songName}" by "${artistName || 'unknown artist'}", using fallback`);
    
    // If we can't find a reliable preview URL, return an empty result
    return {
      success: false,
      results: [],
      error: 'Could not find reliable preview URLs'
    };
  } catch (error) {
    console.error('Error finding preview URLs:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 