import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpotifyMusicQuizPlayer from '../SpotifyMusicQuizPlayer';
import { Challenge, ChallengeType, PrebuiltChallengeType } from '@/types/Challenge';
import { GameProvider } from '@/contexts/GameContext';
import spotifyService from '@/services/SpotifyService';

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
      players: [{ id: 'player1', name: 'Player 1' }],
      currentRound: 1,
      totalRounds: 5,
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
    getPlaylistTracks: jest.fn().mockResolvedValue([
      {
        id: 'track-1',
        name: 'Test Song 1',
        artist: 'Test Artist 1',
        album: 'Test Album 1',
        albumArt: 'https://example.com/album1.jpg',
        previewUrl: 'https://example.com/preview1.mp3',
        duration: 180000
      },
      {
        id: 'track-2',
        name: 'Test Song 2',
        artist: 'Test Artist 2',
        album: 'Test Album 2',
        albumArt: 'https://example.com/album2.jpg',
        previewUrl: 'https://example.com/preview2.mp3',
        duration: 210000
      }
    ])
  }
}));

// Mock audio element
window.HTMLMediaElement.prototype.load = jest.fn();
window.HTMLMediaElement.prototype.play = jest.fn();
window.HTMLMediaElement.prototype.pause = jest.fn();

// Mock dispatch function
const mockDispatch = jest.fn();

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
        expect.any(Number)
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

    // Play button should be visible
    const playButton = screen.getByText('Play');
    expect(playButton).toBeInTheDocument();

    // Click play
    fireEvent.click(playButton);

    // HTMLMediaElement.play should have been called
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();

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
}); 