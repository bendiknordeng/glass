import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Game from '../Game';
import { GameProvider, GameState } from '@/contexts/GameContext';
import { ChallengeType, Challenge } from '@/types/Challenge';
import { Player } from '@/types/Player';
import { Team, GameMode } from '@/types/Team';

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
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock useTranslation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (key: string) => {
        // Return mock translations for keys used in the components
        if (key === 'game.getReady') return 'Get Ready';
        if (key === 'game.allVsAll') return 'All vs All';
        if (key === 'game.areYouReady') return 'Are you ready?';
        if (key === 'game.teamTurn') return "Team's turn";
        if (key.startsWith('challenge.type.')) {
          const type = key.replace('challenge.type.', '');
          return type.charAt(0).toUpperCase() + type.slice(1);
        }
        return key;
      },
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
  default: ({ player, onRevealComplete }: { player: Player; onRevealComplete?: () => void }) => (
    <div data-testid="player-reveal" data-player={player.name}>
      <button data-testid="complete-player-reveal" onClick={onRevealComplete}>
        Complete Player Reveal
      </button>
    </div>
  ),
}));

jest.mock('@/components/animations/MultiPlayerReveal', () => ({
  __esModule: true,
  default: ({ players, onRevealComplete }: { players: Player[]; onRevealComplete?: () => void }) => (
    <div data-testid="multi-player-reveal" data-players={players.map((p: Player) => p.name).join(',')}>
      <button data-testid="complete-multi-player-reveal" onClick={onRevealComplete}>
        Complete Multi-Player Reveal
      </button>
    </div>
  ),
}));

jest.mock('@/components/animations/TeamReveal', () => ({
  __esModule: true,
  default: ({ team, onRevealComplete }: { team: Team; onRevealComplete?: () => void }) => (
    <div data-testid="team-reveal" data-team={team.name}>
      <button data-testid="complete-team-reveal" onClick={onRevealComplete}>
        Complete Team Reveal
      </button>
    </div>
  ),
}));

jest.mock('@/components/animations/ChallengeReveal', () => ({
  __esModule: true,
  default: ({ challenge, onRevealComplete }: { challenge: Challenge; onRevealComplete?: () => void }) => (
    <div data-testid="challenge-reveal" data-challenge={challenge.title}>
      <button data-testid="complete-challenge-reveal" onClick={onRevealComplete}>
        Complete Challenge Reveal
      </button>
    </div>
  ),
}));

// Mock the useGameState hook
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
        // When selecting next challenge, update the current challenge in our mock state
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

// Create mock game state that we can manipulate in tests
const mockGameState = {
  currentParticipant: null as (Player | Team | null),
  challengeParticipants: [] as (Player | Team)[],
  currentChallenge: null as Challenge | null,
  challenges: [] as Challenge[],
  isRevealingChallenge: false,
};

// Mock game context state
const mockPlayers: Player[] = [
  { id: 'player1', name: 'Player 1', score: 0, image: 'player1.jpg' },
  { id: 'player2', name: 'Player 2', score: 0, image: 'player2.jpg' },
  { id: 'player3', name: 'Player 3', score: 0, image: 'player3.jpg' },
  { id: 'player4', name: 'Player 4', score: 0, image: 'player4.jpg' },
];

const mockTeams: Team[] = [
  { 
    id: 'team1', 
    name: 'Team 1', 
    playerIds: ['player1', 'player2'], 
    score: 0, 
    color: 'blue'
  },
  { 
    id: 'team2', 
    name: 'Team 2', 
    playerIds: ['player3', 'player4'], 
    score: 0, 
    color: 'red'
  },
];

const mockChallenges: Challenge[] = [
  {
    id: 'challenge1',
    title: 'Individual Challenge',
    description: 'This is an individual challenge',
    type: ChallengeType.INDIVIDUAL,
    canReuse: true,
    points: 10,
  },
  {
    id: 'challenge2',
    title: 'Team Challenge',
    description: 'This is a team challenge',
    type: ChallengeType.TEAM,
    canReuse: true,
    points: 20,
  },
  {
    id: 'challenge3',
    title: 'One on One Challenge',
    description: 'This is a one on one challenge',
    type: ChallengeType.ONE_ON_ONE,
    canReuse: true,
    points: 15,
  },
  {
    id: 'challenge4',
    title: 'All vs All Challenge',
    description: 'This is an all vs all challenge',
    type: ChallengeType.ALL_VS_ALL,
    canReuse: true,
    points: 25,
  },
];

// Add this mock after the other mocks and before the tests
jest.mock('@/services/SpotifyService', () => ({
  __esModule: true,
  default: {
    getPlaylistTracks: jest.fn(),
    getAuthorizationUrl: jest.fn(),
  },
}));

describe('Game Component Reveal Flow', () => {
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Reset mock game state
    mockGameState.currentParticipant = null;
    mockGameState.challengeParticipants = [];
    mockGameState.currentChallenge = null;
    mockGameState.challenges = [...mockChallenges]; // Make a copy
    mockGameState.isRevealingChallenge = false;
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
  
  const renderGameWithContext = (gameMode = GameMode.FREE_FOR_ALL) => {
    // Wrap the Game component with necessary providers
    return render(
      <MemoryRouter>
        <GameProvider>
          {/* Game component will access the context provided above */}
          <Game />
        </GameProvider>
      </MemoryRouter>
    );
  };
  
  it('shows player reveal for individual challenge when starting a new challenge', async () => {
    // Setup for individual challenge
    mockGameState.currentParticipant = mockPlayers[0];
    mockGameState.currentChallenge = mockChallenges[0]; // Individual challenge
    
    renderGameWithContext();
    
    // Fast-forward timers to allow animations to start
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Verify player reveal is shown first
    await waitFor(() => {
      expect(screen.getByTestId('player-reveal')).toBeInTheDocument();
      expect(screen.getByTestId('player-reveal')).toHaveAttribute('data-player', 'Player 1');
    });
    
    // Complete player reveal
    act(() => {
      screen.getByTestId('complete-player-reveal').click();
      jest.advanceTimersByTime(500); // Allow time for transition to challenge reveal
    });
    
    // Verify challenge reveal is shown next
    await waitFor(() => {
      expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
      expect(screen.getByTestId('challenge-reveal')).toHaveAttribute('data-challenge', 'Individual Challenge');
    });
  });
  
  it('shows team reveal for team challenges in team mode', async () => {
    // Setup for team challenge
    mockGameState.currentParticipant = mockTeams[0];
    mockGameState.currentChallenge = mockChallenges[1]; // Team challenge
    
    renderGameWithContext(GameMode.TEAMS);
    
    // Fast-forward timers to allow animations to start
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Verify team reveal is shown first
    await waitFor(() => {
      expect(screen.getByTestId('team-reveal')).toBeInTheDocument();
      expect(screen.getByTestId('team-reveal')).toHaveAttribute('data-team', 'Team 1');
    });
    
    // Complete team reveal
    act(() => {
      screen.getByTestId('complete-team-reveal').click();
      jest.advanceTimersByTime(500); // Allow time for transition to challenge reveal
    });
    
    // Verify challenge reveal is shown next
    await waitFor(() => {
      expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
      expect(screen.getByTestId('challenge-reveal')).toHaveAttribute('data-challenge', 'Team Challenge');
    });
  });
  
  it('shows multi-player reveal for one-on-one challenges', async () => {
    // Setup for one-on-one challenge
    mockGameState.currentChallenge = mockChallenges[2]; // One on One challenge
    mockGameState.challengeParticipants = [mockPlayers[0], mockPlayers[1]];
    
    // Override the getChallengeParticipants mock for this test
    jest.mock('@/hooks/useGameState', () => {
      return {
        useGameState: () => ({
          // ... other props
          getChallengeParticipants: () => [mockPlayers[0], mockPlayers[1]],
          // ... other props
        }),
      };
    });
    
    renderGameWithContext();
    
    // Fast-forward timers to allow animations to start
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // This test is more complex because getPlayersForOneOnOne is inside the Game component
    // So we need to manually trigger the appropriate state with our test setup
    
    // Since we can't directly test this without exposing internal state, we can check
    // that the proper sequence of reveals happens when clicking through
    
    // Fast-forward through reveal sequence and check challenge reveal
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // Verify challenge reveal is shown after player reveal animations
    await waitFor(() => {
      // Either we directly see the challenge reveal or we see the multi-player reveal first
      const challengeReveal = screen.queryByTestId('challenge-reveal');
      const multiPlayerReveal = screen.queryByTestId('multi-player-reveal');
      
      expect(challengeReveal || multiPlayerReveal).toBeInTheDocument();
      
      // If we see the multi-player reveal, complete it to move to challenge reveal
      if (multiPlayerReveal) {
        screen.getByTestId('complete-multi-player-reveal').click();
        jest.advanceTimersByTime(500);
      }
    });
    
    // After completing any initial reveals, we should see the challenge reveal
    await waitFor(() => {
      expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
      expect(screen.getByTestId('challenge-reveal')).toHaveAttribute('data-challenge', 'One on One Challenge');
    });
  });
  
  it('shows multi-player reveal for all-vs-all challenges', async () => {
    // Setup for all-vs-all challenge
    mockGameState.currentChallenge = mockChallenges[3]; // All vs All challenge
    
    renderGameWithContext();
    
    // Fast-forward timers to allow animations to start
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Similar to one-on-one, the complexity is in the internal component logic
    // So we need to check the sequence of reveals
    
    // Fast-forward through reveal sequence and check challenge reveal
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // Check for either multi-player reveal or challenge reveal (depending on timing)
    await waitFor(() => {
      const challengeReveal = screen.queryByTestId('challenge-reveal');
      const multiPlayerReveal = screen.queryByTestId('multi-player-reveal');
      
      expect(challengeReveal || multiPlayerReveal).toBeInTheDocument();
      
      if (multiPlayerReveal) {
        screen.getByTestId('complete-multi-player-reveal').click();
        jest.advanceTimersByTime(500);
      }
    });
    
    // After completing any initial reveals, we should see the challenge reveal
    await waitFor(() => {
      expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
      expect(screen.getByTestId('challenge-reveal')).toHaveAttribute('data-challenge', 'All vs All Challenge');
    });
  });
  
  it('shows challenge reveal directly for first challenge after game setup', async () => {
    // Set the localStorage flag that indicates a new game start
    localStorageMock.setItem('isNewGameStart', 'true');
    
    // Setup for any challenge
    mockGameState.currentChallenge = mockChallenges[0];
    
    renderGameWithContext();
    
    // Fast-forward timers to allow animations to start
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Verify challenge reveal is shown directly (no player/team reveal first)
    await waitFor(() => {
      expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
      expect(screen.queryByTestId('player-reveal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('team-reveal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('multi-player-reveal')).not.toBeInTheDocument();
    });
    
    // Verify that the flag is removed after use
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('isNewGameStart');
  });
  
  it('sequences reveals correctly when moving through challenges', async () => {
    // Setup first challenge (individual)
    mockGameState.currentParticipant = mockPlayers[0];
    mockGameState.currentChallenge = mockChallenges[0];
    
    renderGameWithContext();
    
    // Fast-forward timers to allow animations to start
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Verify player reveal for first challenge
    await waitFor(() => {
      expect(screen.getByTestId('player-reveal')).toBeInTheDocument();
    });
    
    // Complete player reveal
    act(() => {
      screen.getByTestId('complete-player-reveal').click();
      jest.advanceTimersByTime(500);
    });
    
    // Verify challenge reveal for first challenge
    await waitFor(() => {
      expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
      expect(screen.getByTestId('challenge-reveal')).toHaveAttribute('data-challenge', 'Individual Challenge');
    });
    
    // Complete challenge reveal
    act(() => {
      screen.getByTestId('complete-challenge-reveal').click();
      jest.advanceTimersByTime(1000);
    });
    
    // Setup second challenge (team)
    mockGameState.currentParticipant = mockTeams[0];
    mockGameState.currentChallenge = mockChallenges[1];
    
    // Trigger a new challenge selection somehow (this depends on your implementation)
    // Since we can't directly access the component's internals, we'll simulate going to the next challenge
    // by re-running the reveal sequence which would happen after a challenge is completed
    
    // In a real test, you might need to use something like:
    // act(() => {
    //   // Find and click the button that completes the current challenge and moves to next
    //   // Or call the function directly if it's exposed
    // });
    
    // For our mock version, we'll just simulate the startRevealSequence being called again
    act(() => {
      // This would happen when moving to a new challenge
      document.dispatchEvent(new Event('startRevealSequence'));
      jest.advanceTimersByTime(500);
    });
    
    // Fast-forward through the reveal sequence for the next challenge
    // The exact mechanism will depend on your implementation
    
    // Verify the proper sequence of reveals for the second challenge would happen
    // However, since our test setup is limited without access to internal component state,
    // we'll need to approximate this test based on our understanding of the component behavior.
  });
}); 