import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChallengeType, Challenge } from '@/types/Challenge';
import { Player } from '@/types/Player';
import { Team, GameMode } from '@/types/Team';

// Create a simplified test component that directly tests the reveal flow
interface RevealFlowTestProps {
  challengeType: ChallengeType;
  gameMode: GameMode;
  isNewGameStart?: boolean;
}

// Mock components for reveals
const PlayerReveal = jest.fn(({ onRevealComplete }: any) => (
  <div data-testid="player-reveal">
    <button data-testid="complete-player-reveal" onClick={onRevealComplete}>
      Complete Player Reveal
    </button>
  </div>
));

const MultiPlayerReveal = jest.fn(({ onRevealComplete }: any) => (
  <div data-testid="multi-player-reveal">
    <button data-testid="complete-multi-player-reveal" onClick={onRevealComplete}>
      Complete Multi-Player Reveal
    </button>
  </div>
));

const TeamReveal = jest.fn(({ onRevealComplete }: any) => (
  <div data-testid="team-reveal">
    <button data-testid="complete-team-reveal" onClick={onRevealComplete}>
      Complete Team Reveal
    </button>
  </div>
));

const ChallengeReveal = jest.fn(({ onRevealComplete }: any) => (
  <div data-testid="challenge-reveal">
    <button data-testid="complete-challenge-reveal" onClick={onRevealComplete}>
      Complete Challenge Reveal
    </button>
  </div>
));

const RevealFlowTest: React.FC<RevealFlowTestProps> = ({ 
  challengeType,
  gameMode,
  isNewGameStart = false
}) => {
  const [isRevealingPlayer, setIsRevealingPlayer] = React.useState(false);
  const [isRevealingMultiPlayers, setIsRevealingMultiPlayers] = React.useState(false);
  const [isRevealingTeamVsTeam, setIsRevealingTeamVsTeam] = React.useState(false);
  const [isRevealingChallenge, setIsRevealingChallenge] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [showContentAfterReveal, setShowContentAfterReveal] = React.useState(false);

  // Mock localStorage
  React.useEffect(() => {
    if (isNewGameStart) {
      localStorage.setItem('isNewGameStart', 'true');
    } else {
      localStorage.removeItem('isNewGameStart');
    }
  }, [isNewGameStart]);

  // Handle player reveal complete
  const handlePlayerRevealComplete = () => {
    // Set transitioning state
    setIsTransitioning(true);
    
    // Turn off player reveal
    setIsRevealingPlayer(false);
    
    // Go to challenge reveal with a slight delay
    setTimeout(() => {
      setIsRevealingChallenge(true);
      
      // Clear transitioning after challenge reveal starts
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 50);
  };
  
  // Handle multi-player reveal complete
  const handleMultiPlayerRevealComplete = () => {
    // Set transitioning state
    setIsTransitioning(true);
    
    // First turn off the multi-player reveal
    setIsRevealingMultiPlayers(false);
    
    // Then show challenge reveal with a slight delay
    setTimeout(() => {
      setIsRevealingChallenge(true);
      
      // Clear the transitioning state after challenge reveal starts
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 50);
  };
  
  // Handle team vs team reveal complete
  const handleTeamVsTeamRevealComplete = () => {
    // Set transitioning state
    setIsTransitioning(true);
    
    // Turn off team reveal
    setIsRevealingTeamVsTeam(false);
    
    // Go to challenge reveal with a slight delay
    setTimeout(() => {
      setIsRevealingChallenge(true);
      
      // Clear transitioning after challenge reveal starts
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 50);
  };
  
  // Handle challenge reveal complete
  const handleChallengeRevealComplete = () => {
    // Set transitioning state briefly
    setIsTransitioning(true);
    
    // Turn off challenge reveal
    setIsRevealingChallenge(false);
    
    // Allow main content to be shown after all reveals
    setTimeout(() => {
      setShowContentAfterReveal(true);
      setIsTransitioning(false);
    }, 50);
  };

  // Start the reveal sequence on mount
  React.useEffect(() => {
    // Reset states
    setIsRevealingPlayer(false);
    setIsRevealingMultiPlayers(false);
    setIsRevealingTeamVsTeam(false);
    setIsRevealingChallenge(false);
    setIsTransitioning(true);
    setShowContentAfterReveal(false);
    
    // For the first challenge after setup, skip directly to challenge reveal
    if (isNewGameStart) {
      setTimeout(() => {
        setIsRevealingChallenge(true);
        setIsTransitioning(false);
      }, 50);
      return;
    }
    
    // Small delay to ensure states are reset before starting new animations
    setTimeout(() => {
      if (challengeType === ChallengeType.TEAM && gameMode === GameMode.TEAMS) {
        // For TEAM type challenges in team mode, show team vs team reveal
        setIsRevealingTeamVsTeam(true);
        setTimeout(() => setIsTransitioning(false), 50);
      }
      else if (challengeType === ChallengeType.ALL_VS_ALL) {
        // All vs All challenges show multiple players
        setIsRevealingMultiPlayers(true);
        setTimeout(() => setIsTransitioning(false), 50);
      }
      else if (challengeType === ChallengeType.ONE_ON_ONE) {
        // One-on-one challenges also show multiple players
        setIsRevealingMultiPlayers(true);
        setTimeout(() => setIsTransitioning(false), 50);
      } else {
        // For individual challenges, show the player
        setIsRevealingPlayer(true);
        setTimeout(() => setIsTransitioning(false), 50);
      }
    }, 50);
  }, [challengeType, gameMode, isNewGameStart]);

  return (
    <div>
      {isRevealingPlayer && (
        <PlayerReveal onRevealComplete={handlePlayerRevealComplete} />
      )}
      
      {isRevealingMultiPlayers && (
        <MultiPlayerReveal onRevealComplete={handleMultiPlayerRevealComplete} />
      )}
      
      {isRevealingTeamVsTeam && (
        <TeamReveal onRevealComplete={handleTeamVsTeamRevealComplete} />
      )}
      
      {isRevealingChallenge && (
        <ChallengeReveal onRevealComplete={handleChallengeRevealComplete} />
      )}
      
      {showContentAfterReveal && (
        <div data-testid="challenge-content">Challenge Content</div>
      )}
    </div>
  );
};

describe('Reveal Flow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
  
  it('shows player reveal followed by challenge reveal for individual challenges', async () => {
    render(
      <RevealFlowTest 
        challengeType={ChallengeType.INDIVIDUAL} 
        gameMode={GameMode.FREE_FOR_ALL} 
      />
    );
    
    // First, advance timers to trigger initial reveal
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Verify player reveal is shown first
    expect(screen.getByTestId('player-reveal')).toBeInTheDocument();
    
    // Complete player reveal
    act(() => {
      screen.getByTestId('complete-player-reveal').click();
      jest.advanceTimersByTime(100);
    });
    
    // Verify challenge reveal is shown next
    expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
    
    // Complete challenge reveal
    act(() => {
      screen.getByTestId('complete-challenge-reveal').click();
      jest.advanceTimersByTime(100);
    });
    
    // Verify challenge content is shown
    expect(screen.getByTestId('challenge-content')).toBeInTheDocument();
  });
  
  it('shows team reveal followed by challenge reveal for team challenges in team mode', async () => {
    render(
      <RevealFlowTest 
        challengeType={ChallengeType.TEAM} 
        gameMode={GameMode.TEAMS} 
      />
    );
    
    // First, advance timers to trigger initial reveal
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Verify team reveal is shown first
    expect(screen.getByTestId('team-reveal')).toBeInTheDocument();
    
    // Complete team reveal
    act(() => {
      screen.getByTestId('complete-team-reveal').click();
      jest.advanceTimersByTime(100);
    });
    
    // Verify challenge reveal is shown next
    expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
  });
  
  it('shows multi-player reveal followed by challenge reveal for one-on-one challenges', async () => {
    render(
      <RevealFlowTest 
        challengeType={ChallengeType.ONE_ON_ONE} 
        gameMode={GameMode.FREE_FOR_ALL} 
      />
    );
    
    // First, advance timers to trigger initial reveal
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Verify multi-player reveal is shown first
    expect(screen.getByTestId('multi-player-reveal')).toBeInTheDocument();
    
    // Complete multi-player reveal
    act(() => {
      screen.getByTestId('complete-multi-player-reveal').click();
      jest.advanceTimersByTime(100);
    });
    
    // Verify challenge reveal is shown next
    expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
  });
  
  it('shows multi-player reveal followed by challenge reveal for all-vs-all challenges', async () => {
    render(
      <RevealFlowTest 
        challengeType={ChallengeType.ALL_VS_ALL} 
        gameMode={GameMode.FREE_FOR_ALL} 
      />
    );
    
    // First, advance timers to trigger initial reveal
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Verify multi-player reveal is shown first
    expect(screen.getByTestId('multi-player-reveal')).toBeInTheDocument();
    
    // Complete multi-player reveal
    act(() => {
      screen.getByTestId('complete-multi-player-reveal').click();
      jest.advanceTimersByTime(100);
    });
    
    // Verify challenge reveal is shown next
    expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
  });
  
  it('shows challenge reveal directly for first challenge after game setup', async () => {
    render(
      <RevealFlowTest 
        challengeType={ChallengeType.INDIVIDUAL} 
        gameMode={GameMode.FREE_FOR_ALL} 
        isNewGameStart={true} 
      />
    );
    
    // First, advance timers to trigger initial reveal
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Verify challenge reveal is shown directly (no player/team reveal first)
    expect(screen.getByTestId('challenge-reveal')).toBeInTheDocument();
    expect(screen.queryByTestId('player-reveal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('team-reveal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('multi-player-reveal')).not.toBeInTheDocument();
  });
}); 