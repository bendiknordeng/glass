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
 * Find preview URLs for a song using alternative sources
 * @param query The song name and artist to search for
 * @param limit Maximum number of results to return
 * @returns A promise resolving to search results with preview URLs
 */
export async function findPreviewUrls(query: string, limit = 1): Promise<PreviewFinderResult> {
  try {
    console.log(`Fallback preview finder searching for: ${query}`);
    
    // Here we would normally implement a real search against various music APIs
    // This is a simplified implementation
    
    // Try to find a reliable preview URL by using web search
    try {
      // For a real application, you'd want to use a music API that provides preview URLs
      // This is a placeholder that could be replaced with actual API calls
      const searchResult = await axios.get(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=${limit}`
      );
      
      if (searchResult.data && searchResult.data.results && searchResult.data.results.length > 0) {
        const iTunesResults = searchResult.data.results
          .filter((item: any) => item.previewUrl)
          .map((item: any) => ({
            name: item.trackName,
            artist: item.artistName,
            previewUrl: item.previewUrl
          }));
          
        if (iTunesResults.length > 0) {
          console.log(`Found ${iTunesResults.length} preview(s) from iTunes for "${query}"`);
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
    
    console.log(`No reliable preview URLs found for "${query}", using fallback`);
    
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