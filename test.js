import spotifyPreviewFinder from 'spotify-preview-finder';

// Set environment variables programmatically
process.env.SPOTIFY_CLIENT_ID = 'c2ff6210cf9643008421db28d961e2ac';
process.env.SPOTIFY_CLIENT_SECRET = '3cd10ca3a5bc4d7c945b5ff190e038df';

async function searchSongs() {
  try {
    // Search for multiple songs
    const songs = [
      await spotifyPreviewFinder('Bohemian Rhapsody', 1),
      await spotifyPreviewFinder('Hotel California', 1),
      await spotifyPreviewFinder('Imagine', 1)
    ];

    songs.forEach(result => {
      if (result.success && result.results.length > 0) {
        const song = result.results[0];
        console.log(`\nFound: ${song.name}`);
        console.log(`Preview URL: ${song.previewUrls[0]}`);
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

searchSongs();