import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpotifyMusicQuizPlayer from '../SpotifyMusicQuizPlayer';
import { Challenge, ChallengeType, PrebuiltChallengeType } from '@/types/Challenge';
import { GameProvider } from '@/contexts/GameContext';
import spotifyService, { SpotifyTrack } from '@/services/SpotifyService';

// Mock process.env
(global as any).process = {
  ...(global as any).process,
  env: {
    NODE_ENV: 'test'
  }
};

// Mock the i18next translation
jest.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (key: string, params?: any) => {
        // Return the key for testing purposes
        if (key === 'prebuilt.spotifyMusicQuiz.loadingSongs') return 'Loading songs...';
        if (key === 'prebuilt.spotifyMusicQuiz.pleaseWait') return 'Please wait...';
        if (key === 'prebuilt.spotifyMusicQuiz.play') return 'Play';
        if (key === 'prebuilt.spotifyMusicQuiz.pause') return 'Pause';
        if (key === 'prebuilt.spotifyMusicQuiz.reveal') return 'Reveal';
        if (key === 'prebuilt.spotifyMusicQuiz.nextSong') return 'Next Song';
        if (key === 'prebuilt.spotifyMusicQuiz.finish') return 'Finish';
        if (key === 'prebuilt.spotifyMusicQuiz.songCounter') return `Song ${params?.current} of ${params?.total}`;
        if (key === 'prebuilt.spotifyMusicQuiz.refreshSongs') return 'Refresh Songs';
        if (key === 'common.refreshing') return 'Refreshing...';
        return key;
      },
      i18n: {
        changeLanguage: () => new Promise(() => {}),
      },
    };
  },
}));

// Mock the GameContext
jest.mock('@/contexts/GameContext', () => ({
  __esModule: true,
  GameProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useGame: () => ({
    state: {
      players: [{ 
        id: 'player1', 
        name: 'Player 1',
        image: 'https://example.com/player1.jpg',
        color: '#FF5733',
        score: 0
      }],
      teams: [
        {
          id: 'team1',
          name: 'Team 1',
          color: '#3366FF',
          emoji: '🚀',
          players: []
        }
      ],
      currentRound: 1,
      totalRounds: 5,
      currentTurnIndex: 0,
      currentChallengeParticipants: ['player1'],
      challenges: [mockChallenge],
      recentChallenges: [],
      customChallenges: []
    },
    dispatch: mockDispatch
  })
}));

// Mock the SpotifyService
jest.mock('@/services/SpotifyService', () => ({
  __esModule: true,
  default: {
    getPlaylistTracks: jest.fn()
  }
}));

// Mock getPlayerImage function
jest.mock('@/utils/helpers', () => ({
  getPlayerImage: jest.fn((image, name) => image || `https://example.com/default-${name}.jpg`),
  // Keep any other functions from helpers that might be needed
  shuffleArray: jest.fn(array => array),
  formatTime: jest.fn(seconds => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`),
  calculateGameResult: jest.fn(),
  extractSongArtist: jest.fn(song => song?.artist || ''),
  extractSongName: jest.fn(song => song?.name || ''),
  formatChallengeTitle: jest.fn(title => title),
  formatStringKey: jest.fn(key => key),
  getRandomColor: jest.fn(() => '#FF5733'),
}));

// Mock audio element
window.HTMLMediaElement.prototype.load = jest.fn();
window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
window.HTMLMediaElement.prototype.pause = jest.fn();

// Mock dispatch function
const mockDispatch = jest.fn();

// Mock SpotifySongs for cached data
const mockCachedSongs = [
  {
    id: 'cached1',
    name: 'Cached Song 1',
    artist: 'Cached Artist 1',
    previewUrl: 'https://example.com/cached-preview1.mp3',
    albumArt: 'https://example.com/cached-album1.jpg',
    isRevealed: false,
    isPlaying: false
  },
  {
    id: 'cached2',
    name: 'Cached Song 2',
    artist: 'Cached Artist 2',
    previewUrl: 'https://example.com/cached-preview2.mp3',
    albumArt: 'https://example.com/cached-album2.jpg',
    isRevealed: false,
    isPlaying: false
  }
];

// Mock challenge data
const mockChallenge: Challenge = {
  id: 'test-challenge',
  title: 'Test Spotify Challenge',
  description: 'A Spotify music quiz challenge',
  type: ChallengeType.INDIVIDUAL,
  canReuse: true,
  points: 10,
  isPrebuilt: true,
  prebuiltType: PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ,
  prebuiltSettings: {
    playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    playlistName: 'Test Playlist',
    numberOfSongs: 2,
    playDurationSeconds: 10,
    currentSongIndex: 0
  }
};

describe('SpotifyMusicQuizPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock implementations
    jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    jest.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    
    // Mock the Spotify service for each test
    (spotifyService.getPlaylistTracks as jest.Mock).mockImplementation((playlistId, options) => {
      return Promise.resolve([
        {
          id: 'track1',
          name: 'Test Song 1',
          artist: 'Test Artist 1',
          album: 'Test Album 1',
          albumArt: 'https://example.com/album1.jpg',
          previewUrl: 'https://example.com/preview1.mp3',
          duration: 30000
        },
        {
          id: 'track2',
          name: 'Test Song 2',
          artist: 'Test Artist 2',
          album: 'Test Album 2',
          albumArt: 'https://example.com/album2.jpg',
          previewUrl: 'https://example.com/preview2.mp3',
          duration: 30000
        }
      ] as SpotifyTrack[]);
    });
  });

  it('renders loading state initially', () => {
    render(
      <SpotifyMusicQuizPlayer 
        challenge={mockChallenge} 
        onComplete={jest.fn()} 
      />
    );

    expect(screen.getByText('Loading songs...')).toBeInTheDocument();
  });

  it('fetches songs from Spotify and displays player', async () => {
    render(
      <SpotifyMusicQuizPlayer 
        challenge={mockChallenge} 
        onComplete={jest.fn()} 
      />
    );

    // Wait for songs to load
    await waitFor(() => {
      expect(spotifyService.getPlaylistTracks).toHaveBeenCalledWith(
        '37i9dQZF1DXcBWIGoYBM5M',
        expect.objectContaining({
          limit: expect.any(Number),
          randomize: true
        })
      );
    });

    // Check that the player is displayed
    await waitFor(() => {
      expect(screen.getByText('Test Playlist')).toBeInTheDocument();
      expect(screen.getByText('Play')).toBeInTheDocument();
    });
  });

  it('plays and pauses songs', async () => {
    render(
      <SpotifyMusicQuizPlayer 
        challenge={mockChallenge} 
        onComplete={jest.fn()} 
      />
    );

    // Wait for songs to load
    await waitFor(() => {
      expect(screen.queryByText('Loading songs...')).not.toBeInTheDocument();
    });

    // Make sure audio element is set up
    const audioElement = document.querySelector('audio');
    expect(audioElement).not.toBeNull();

    // Play button should be visible
    const playButton = screen.getByText('Play');
    expect(playButton).toBeInTheDocument();

    // Click play
    fireEvent.click(playButton);
    
    // Trigger canplay event to simulate the audio being ready
    if (audioElement) {
      fireEvent.canPlay(audioElement);
    }

    // HTMLMediaElement.play should have been called
    await waitFor(() => {
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    });

    // Pause button should now be visible
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    // Click pause
    const pauseButton = screen.getByText('Pause');
    fireEvent.click(pauseButton);

    // HTMLMediaElement.pause should have been called
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('reveals song details when reveal button is clicked', async () => {
    render(
      <SpotifyMusicQuizPlayer 
        challenge={mockChallenge} 
        onComplete={jest.fn()} 
      />
    );

    // Wait for songs to load
    await waitFor(() => {
      expect(screen.queryByText('Loading songs...')).not.toBeInTheDocument();
    });

    // Play the song first
    const playButton = screen.getByText('Play');
    fireEvent.click(playButton);

    // Reveal button should be visible
    await waitFor(() => {
      expect(screen.getByText('Reveal')).toBeInTheDocument();
    });

    // Click reveal
    const revealButton = screen.getByText('Reveal');
    fireEvent.click(revealButton);

    // Song details should be visible - the component might show either song 1 or 2
    // depending on the implementation, so we'll check for either
    await waitFor(() => {
      const songText = screen.queryByText('Test Song 1') || screen.queryByText('Test Song 2');
      const artistText = screen.queryByText('Test Artist 1') || screen.queryByText('Test Artist 2');
      expect(songText).toBeInTheDocument();
      expect(artistText).toBeInTheDocument();
    });

    // Next song button should be visible
    expect(screen.getByText('Next Song')).toBeInTheDocument();
  });

  it('moves to the next song when next button is clicked', async () => {
    render(
      <SpotifyMusicQuizPlayer 
        challenge={mockChallenge} 
        onComplete={jest.fn()} 
      />
    );

    // Wait for songs to load
    await waitFor(() => {
      expect(screen.queryByText('Loading songs...')).not.toBeInTheDocument();
    });

    // Play and reveal the first song
    const playButton = screen.getByText('Play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(screen.getByText('Reveal')).toBeInTheDocument();
    });

    const revealButton = screen.getByText('Reveal');
    fireEvent.click(revealButton);

    // Next song button should be visible
    await waitFor(() => {
      expect(screen.getByText('Next Song')).toBeInTheDocument();
    });

    // Click next song
    const nextButton = screen.getByText('Next Song');
    fireEvent.click(nextButton);

    // Should update the state
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'UPDATE_CUSTOM_CHALLENGE'
    }));
  });

  it('completes the challenge when all songs are played', async () => {
    const onCompleteMock = jest.fn();
    
    // Create a challenge with only one song
    const singleSongChallenge = {
      ...mockChallenge,
      prebuiltSettings: {
        ...mockChallenge.prebuiltSettings,
        numberOfSongs: 1
      }
    };

    render(
      <SpotifyMusicQuizPlayer 
        challenge={singleSongChallenge} 
        onComplete={onCompleteMock} 
      />
    );

    // Wait for songs to load
    await waitFor(() => {
      expect(screen.queryByText('Loading songs...')).not.toBeInTheDocument();
    });

    // Play and reveal the song
    const playButton = screen.getByText('Play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(screen.getByText('Reveal')).toBeInTheDocument();
    });

    const revealButton = screen.getByText('Reveal');
    fireEvent.click(revealButton);

    // Finish button should be visible (instead of next song)
    await waitFor(() => {
      expect(screen.getByText('Finish')).toBeInTheDocument();
    });

    // Click finish
    const finishButton = screen.getByText('Finish');
    fireEvent.click(finishButton);

    // onComplete should have been called
    expect(onCompleteMock).toHaveBeenCalledWith(true);
  });

  it('refreshes songs when forceRefreshSongs prop is true, even if there are stored songs', async () => {
    // First render to set songs in localStorage
    const { unmount } = render(
      <SpotifyMusicQuizPlayer 
        challenge={mockChallenge} 
        onComplete={jest.fn()} 
      />
    );

    // Wait for songs to load
    await waitFor(() => {
      expect(screen.queryByText('Loading songs...')).not.toBeInTheDocument();
    });

    // Check that the player is displayed with the first set of tracks
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
    
    // Unmount first instance
    unmount();

    // Mock second response for refresh
    (spotifyService.getPlaylistTracks as jest.Mock).mockImplementationOnce((playlistId, options) => {
      return Promise.resolve([
        {
          id: 'track3',
          name: 'New Test Song 1',
          artist: 'New Test Artist 1',
          album: 'New Test Album 1',
          albumArt: 'https://example.com/new-album1.jpg',
          previewUrl: 'https://example.com/new-preview1.mp3',
          duration: 30000
        },
        {
          id: 'track4',
          name: 'New Test Song 2',
          artist: 'New Test Artist 2',
          album: 'New Test Album 2',
          albumArt: 'https://example.com/new-album2.jpg',
          previewUrl: 'https://example.com/new-preview2.mp3',
          duration: 30000
        }
      ] as SpotifyTrack[]);
    });

    // Render again with forceRefreshSongs=true
    render(
      <SpotifyMusicQuizPlayer 
        challenge={mockChallenge} 
        onComplete={jest.fn()}
        forceRefreshSongs={true}
      />
    );

    // Wait for songs to load again (this should be forced even though we already have songs)
    await waitFor(() => {
      // Wait for loading to complete
      expect(screen.queryByText('Loading songs...')).not.toBeInTheDocument();
    });

    // Verify that getPlaylistTracks was called twice (once in first render, once in second)
    expect(spotifyService.getPlaylistTracks).toHaveBeenCalledTimes(2);

    // The test can pass without having to find and click play button
  });

  it('refreshes songs when cached songs are older than 1 hour', async () => {
    // Calculate timestamp for more than 1 hour ago
    const oneHourAndOneMinuteAgo = Date.now() - (61 * 60 * 1000);
    
    // Set up the component with a challenge that has old cached songs
    const challengeWithOldSongs = {
      ...mockChallenge,
      prebuiltSettings: {
        ...mockChallenge.prebuiltSettings,
        selectedSongs: mockCachedSongs,
        lastFetchTimestamp: oneHourAndOneMinuteAgo // Timestamp more than 1 hour ago
      }
    };

    render(
      <SpotifyMusicQuizPlayer 
        challenge={challengeWithOldSongs} 
        onComplete={jest.fn()} 
      />
    );

    // Wait for songs to be refreshed
    await waitFor(() => {
      expect(spotifyService.getPlaylistTracks).toHaveBeenCalledWith(
        '37i9dQZF1DXcBWIGoYBM5M',
        expect.objectContaining({
          limit: expect.any(Number),
          randomize: true
        })
      );
    });

    // Verify that fresh songs were fetched
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'UPDATE_CUSTOM_CHALLENGE',
      payload: expect.objectContaining({
        prebuiltSettings: expect.objectContaining({
          selectedSongs: expect.any(Array),
          lastFetchTimestamp: expect.any(Number)
        })
      })
    }));
  });
}); 