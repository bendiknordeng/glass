import { ChallengeType } from '@/types/Challenge';
import { GameMode } from '@/types/Team';

// Simple class to simulate the reveal sequence without React components
class RevealSequenceSimulator {
  private isRevealingPlayer = false;
  private isRevealingMultiPlayers = false;
  private isRevealingTeamVsTeam = false;
  private isRevealingChallenge = false;
  private isTransitioning = false;
  private showContentAfterReveal = false;
  private isNewGameStart = false;
  private challengeType: ChallengeType;
  private gameMode: GameMode;
  private revealSequence: string[] = [];
  private mockLocalStorage: Record<string, string> = {};

  constructor(
    challengeType: ChallengeType = ChallengeType.INDIVIDUAL,
    gameMode: GameMode = GameMode.FREE_FOR_ALL,
    isNewGameStart = false
  ) {
    this.challengeType = challengeType;
    this.gameMode = gameMode;
    this.isNewGameStart = isNewGameStart;

    // Initialize localStorage
    if (isNewGameStart) {
      this.mockLocalStorage['isNewGameStart'] = 'true';
    } else {
      delete this.mockLocalStorage['isNewGameStart'];
    }
  }

  public startRevealSequence(): string[] {
    this.revealSequence = [];
    this.reset();

    // For the first challenge after setup, check the localStorage value
    const isNewGameStartFromStorage = this.mockLocalStorage['isNewGameStart'] === 'true';
    
    if (isNewGameStartFromStorage) {
      // Clean up the flag after using it
      delete this.mockLocalStorage['isNewGameStart'];
      this.revealSequence.push('CHALLENGE_REVEAL');
      return this.revealSequence;
    }

    // Determine which reveal to show based on challenge type
    if (this.challengeType === ChallengeType.TEAM && this.gameMode === GameMode.TEAMS) {
      this.revealSequence.push('TEAM_REVEAL');
      this.revealSequence.push('CHALLENGE_REVEAL');
    }
    else if (this.challengeType === ChallengeType.ALL_VS_ALL) {
      this.revealSequence.push('MULTI_PLAYER_REVEAL');
      this.revealSequence.push('CHALLENGE_REVEAL');
    }
    else if (this.challengeType === ChallengeType.ONE_ON_ONE) {
      this.revealSequence.push('MULTI_PLAYER_REVEAL');
      this.revealSequence.push('CHALLENGE_REVEAL');
    } else {
      // For individual challenges
      this.revealSequence.push('PLAYER_REVEAL');
      this.revealSequence.push('CHALLENGE_REVEAL');
    }

    return this.revealSequence;
  }

  public getLocalStorage(): Record<string, string> {
    return { ...this.mockLocalStorage };
  }

  private reset(): void {
    this.isRevealingPlayer = false;
    this.isRevealingMultiPlayers = false;
    this.isRevealingTeamVsTeam = false;
    this.isRevealingChallenge = false;
    this.isTransitioning = false;
    this.showContentAfterReveal = false;
  }
}

describe('Reveal Sequence', () => {
  it('shows player reveal followed by challenge reveal for individual challenges', () => {
    const simulator = new RevealSequenceSimulator(ChallengeType.INDIVIDUAL, GameMode.FREE_FOR_ALL);
    const sequence = simulator.startRevealSequence();
    
    expect(sequence).toEqual(['PLAYER_REVEAL', 'CHALLENGE_REVEAL']);
  });
  
  it('shows team reveal followed by challenge reveal for team challenges in team mode', () => {
    const simulator = new RevealSequenceSimulator(ChallengeType.TEAM, GameMode.TEAMS);
    const sequence = simulator.startRevealSequence();
    
    expect(sequence).toEqual(['TEAM_REVEAL', 'CHALLENGE_REVEAL']);
  });
  
  it('shows multi-player reveal followed by challenge reveal for one-on-one challenges', () => {
    const simulator = new RevealSequenceSimulator(ChallengeType.ONE_ON_ONE, GameMode.FREE_FOR_ALL);
    const sequence = simulator.startRevealSequence();
    
    expect(sequence).toEqual(['MULTI_PLAYER_REVEAL', 'CHALLENGE_REVEAL']);
  });
  
  it('shows multi-player reveal followed by challenge reveal for all-vs-all challenges', () => {
    const simulator = new RevealSequenceSimulator(ChallengeType.ALL_VS_ALL, GameMode.FREE_FOR_ALL);
    const sequence = simulator.startRevealSequence();
    
    expect(sequence).toEqual(['MULTI_PLAYER_REVEAL', 'CHALLENGE_REVEAL']);
  });
  
  it('shows challenge reveal directly for first challenge after game setup', () => {
    const simulator = new RevealSequenceSimulator(ChallengeType.INDIVIDUAL, GameMode.FREE_FOR_ALL, true);
    const sequence = simulator.startRevealSequence();
    
    expect(sequence).toEqual(['CHALLENGE_REVEAL']);
  });

  it('removes the isNewGameStart flag after using it', () => {
    const simulator = new RevealSequenceSimulator(ChallengeType.INDIVIDUAL, GameMode.FREE_FOR_ALL, true);
    
    // Flag should be set initially
    expect(simulator.getLocalStorage()['isNewGameStart']).toBe('true');
    
    // Run the sequence which should consume the flag
    simulator.startRevealSequence();
    
    // Flag should now be removed
    expect(simulator.getLocalStorage()['isNewGameStart']).toBeUndefined();
  });
  
  it('shows player reveal for the second challenge after consuming the isNewGameStart flag', () => {
    const simulator = new RevealSequenceSimulator(ChallengeType.INDIVIDUAL, GameMode.FREE_FOR_ALL, true);
    
    // First reveal sequence consumes the flag
    const firstSequence = simulator.startRevealSequence();
    expect(firstSequence).toEqual(['CHALLENGE_REVEAL']);
    
    // Second reveal sequence should now include player reveal
    const secondSequence = simulator.startRevealSequence();
    expect(secondSequence).toEqual(['PLAYER_REVEAL', 'CHALLENGE_REVEAL']);
  });
  
  it('always shows player/team reveal before challenge reveal when not the first challenge', () => {
    // Test with different challenge types
    const challengeTypes = [ChallengeType.INDIVIDUAL, ChallengeType.TEAM, ChallengeType.ONE_ON_ONE, ChallengeType.ALL_VS_ALL];
    const gameModes = [GameMode.FREE_FOR_ALL, GameMode.TEAMS];
    
    for (const challengeType of challengeTypes) {
      for (const gameMode of gameModes) {
        const simulator = new RevealSequenceSimulator(challengeType, gameMode);
        const sequence = simulator.startRevealSequence();
        
        // Check that challenge reveal is always the last step
        expect(sequence[sequence.length - 1]).toBe('CHALLENGE_REVEAL');
        
        // Check that challenge reveal is not the first step
        expect(sequence[0]).not.toBe('CHALLENGE_REVEAL');
        
        // Check that sequence length is always 2 (player/team reveal then challenge reveal)
        expect(sequence.length).toBe(2);
      }
    }
  });
}); 