declare module 'spotify-preview-finder' {
  interface Song {
    name: string;
    spotifyUrl: string;
    previewUrls: string[];
  }

  interface SearchResult {
    success: boolean;
    results: Song[];
    error?: string;
  }

  function spotifyPreviewFinder(songName: string, limit?: number): Promise<SearchResult>;
  
  export default spotifyPreviewFinder;
} 