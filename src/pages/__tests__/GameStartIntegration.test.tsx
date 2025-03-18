import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Game from '../Game';
import { GameProvider } from '@/contexts/GameContext';
import { ChallengeType, Challenge } from '@/types/Challenge';
import { Player } from '@/types/Player';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    dump: () => ({ ...store }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock useTranslation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (key: string) => key,
    };
  },
}));

// Mock useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the components that are used in the Game component for reveals
jest.mock('@/components/animations/PlayerReveal', () => ({
  __esModule: true,
  default: ({ onRevealComplete }: { onRevealComplete?: () => void }) => (
    <div data-testid="player-reveal">
      <button data-testid="complete-player-reveal" onClick={onRevealComplete}>
        Complete Player Reveal
      </button>
    </div>
  ),
}));

jest.mock('@/components/animations/ChallengeReveal', () => ({
  __esModule: true,
  default: ({ onRevealComplete }: { onRevealComplete?: () => void }) => (
    <div data-testid="challenge-reveal">
      <button data-testid="complete-challenge-reveal" onClick={onRevealComplete}>
        Complete Challenge Reveal
      </button>
    </div>
  ),
}));

// Mock the useGameState hook for simplified testing
jest.mock('@/hooks/useGameState', () => {
  return {
    useGameState: () => ({
      gameState: 'playing',
      timeRemaining: 0,
      isRevealingChallenge: false,
      isShowingResults: false,
      getCurrentParticipant: () => mockGameState.currentParticipant,
      getChallengeParticipants: () => mockGameState.challengeParticipants,
      completeChallenge: jest.fn(),
      startGame: jest.fn(),
      selectNextChallenge: jest.fn(() => {
        // When selecting next challenge, update the current challenge
        if (mockGameState.challenges.length > 0) {
          mockGameState.currentChallenge = mockGameState.challenges.shift() || null;
          return true;
        }
        return false;
      }),
      setIsRevealingChallenge: (value: boolean) => {
        mockGameState.isRevealingChallenge = value;
      },
      verifyParticipantsAssigned: jest.fn(),
    }),
  };
});

// Mock SpotifyService to avoid import.meta errors
jest.mock('@/services/SpotifyService', () => ({
  __esModule: true,
  default: {
    getPlaylistTracks: jest.fn(),
    getAuthorizationUrl: jest.fn(),
  },
}));

// Create mock game state that we can manipulate in tests
const mockGameState: {
  currentParticipant: Player | null;
  challengeParticipants: Player[];
  currentChallenge: Challenge | null;
  challenges: Challenge[];
  isRevealingChallenge: boolean;
} = {
  currentParticipant: { id: 'player1', name: 'Player 1', score: 0, image: 'player1.jpg' },
  challengeParticipants: [],
  currentChallenge: { 
    id: 'challenge1', 
    title: 'Test Challenge', 
    type: ChallengeType.INDIVIDUAL, 
    points: 10,
    description: 'Test description',
    canReuse: true
  },
  challenges: [],
  isRevealingChallenge: false,
};

describe('Game Start Integration', () => {
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    localStorageMock.clear();
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
  
  it('skips player reveal and shows challenge reveal directly when isNewGameStart flag is set', async () => {
    // Setup the localStorage flag as if coming from the Setup component
    localStorageMock.setItem('isNewGameStart', 'true');
    
    // Verify the flag is set correctly
    expect(localStorageMock.getItem('isNewGameStart')).toBe('true');
    
    // Render the Game component
    render(
      <MemoryRouter>
        <GameProvider>
          <Game />
        </GameProvider>
      </MemoryRouter>
    );
    
    // Fast-forward timers to allow animations to start
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Verify challenge reveal is shown (no player reveal first)
    await waitFor(() => {
      expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
      expect(screen.queryByTestId('player-reveal')).not.toBeInTheDocument();
    });
    
    // Verify the flag was cleared from localStorage
    expect(localStorageMock.getItem('isNewGameStart')).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('isNewGameStart');
  });
  
  it('shows player reveal for challenges when isNewGameStart flag is not set', async () => {
    // Do NOT set the isNewGameStart flag
    
    // Render the Game component
    render(
      <MemoryRouter>
        <GameProvider>
          <Game />
        </GameProvider>
      </MemoryRouter>
    );
    
    // Fast-forward timers to allow animations to start
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Verify player reveal is shown first
    await waitFor(() => {
      expect(screen.getByTestId('player-reveal')).toBeInTheDocument();
      expect(screen.queryByTestId('challenge-reveal')).not.toBeInTheDocument();
    });
    
    // Complete player reveal
    act(() => {
      screen.getByTestId('complete-player-reveal').click();
      jest.advanceTimersByTime(1000);
    });
    
    // Verify challenge reveal is shown after player reveal
    await waitFor(() => {
      expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
    });
  });
  
  it('correctly handles sequential challenges in a game session', async () => {
    // Setup for first challenge with isNewGameStart flag
    localStorageMock.setItem('isNewGameStart', 'true');
    
    // Add second challenge to be selected next
    mockGameState.challenges = [
      { 
        id: 'challenge2', 
        title: 'Second Challenge', 
        type: ChallengeType.INDIVIDUAL, 
        points: 10,
        description: 'Second challenge description',
        canReuse: true
      }
    ];
    
    // Render the Game component
    render(
      <MemoryRouter>
        <GameProvider>
          <Game />
        </GameProvider>
      </MemoryRouter>
    );
    
    // Fast-forward timers for first challenge
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // First challenge should directly show challenge reveal
    await waitFor(() => {
      expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
      expect(screen.queryByTestId('player-reveal')).not.toBeInTheDocument();
    });
    
    // Verify the flag was cleared
    expect(localStorageMock.getItem('isNewGameStart')).toBeNull();
    
    // Complete the first challenge reveal
    act(() => {
      screen.getByTestId('complete-challenge-reveal').click();
      jest.advanceTimersByTime(1000);
    });
    
    // Force the next challenge to start (would typically happen after completing a challenge)
    act(() => {
      document.dispatchEvent(new Event('startRevealSequence'));
      jest.advanceTimersByTime(1000);
    });
    
    // For the second challenge, player reveal should be shown first
    await waitFor(() => {
      expect(screen.getByTestId('player-reveal')).toBeInTheDocument();
    });
  });
}); 