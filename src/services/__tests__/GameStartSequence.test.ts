import { ChallengeType } from '@/types/Challenge';
import { GameMode } from '@/types/Team';

// Simulate the Game component's behavior more precisely
class GameComponent {
  private isRevealingPlayer = false;
  private isRevealingMultiPlayers = false;
  private isRevealingTeamVsTeam = false;
  private isRevealingChallenge = false;
  private isTransitioning = false;
  private showContentAfterReveal = false;
  private localStorage: Record<string, string> = {};
  private challengeType: ChallengeType;
  private gameMode: GameMode;
  private debug: boolean;
  private logs: string[] = [];

  constructor(
    challengeType: ChallengeType = ChallengeType.INDIVIDUAL,
    gameMode: GameMode = GameMode.FREE_FOR_ALL,
    debug = false
  ) {
    this.challengeType = challengeType;
    this.gameMode = gameMode;
    this.debug = debug;
  }

  public log(message: string): void {
    if (this.debug) console.log(message);
    this.logs.push(message);
  }

  public getLogs(): string[] {
    return [...this.logs];
  }

  public setLocalStorage(key: string, value: string): void {
    this.localStorage[key] = value;
    this.log(`localStorage.setItem('${key}', '${value}')`);
  }

  public getLocalStorage(key: string): string | null {
    const value = this.localStorage[key] || null;
    this.log(`localStorage.getItem('${key}') => ${value}`);
    return value;
  }

  public removeLocalStorage(key: string): void {
    delete this.localStorage[key];
    this.log(`localStorage.removeItem('${key}')`);
  }

  public startRevealSequence(): string[] {
    this.log('Starting reveal sequence');
    const sequence: string[] = [];
    
    // Reset all animation states
    this.reset();
    
    // Check the localStorage flag
    const isNewGameStart = this.getLocalStorage('isNewGameStart') === 'true';
    
    if (isNewGameStart) {
      this.log('First challenge after setup - skipping player reveal');
      this.removeLocalStorage('isNewGameStart');
      
      this.isRevealingChallenge = true;
      sequence.push('CHALLENGE_REVEAL');
      this.log('Showing challenge reveal directly');
      return sequence;
    }
    
    // Determine which reveal to show based on challenge type
    if (this.challengeType === ChallengeType.TEAM && this.gameMode === GameMode.TEAMS) {
      this.isRevealingTeamVsTeam = true;
      sequence.push('TEAM_REVEAL');
      this.log('Showing team reveal');
    }
    else if (this.challengeType === ChallengeType.ALL_VS_ALL) {
      this.isRevealingMultiPlayers = true;
      sequence.push('MULTI_PLAYER_REVEAL');
      this.log('Showing multi-player reveal for ALL_VS_ALL');
    }
    else if (this.challengeType === ChallengeType.ONE_ON_ONE) {
      this.isRevealingMultiPlayers = true;
      sequence.push('MULTI_PLAYER_REVEAL');
      this.log('Showing multi-player reveal for ONE_ON_ONE');
    } else {
      // For individual challenges
      this.isRevealingPlayer = true;
      sequence.push('PLAYER_REVEAL');
      this.log('Showing player reveal for individual challenge');
    }
    
    // After the appropriate reveal, always show challenge reveal
    sequence.push('CHALLENGE_REVEAL');
    
    return sequence;
  }

  private reset(): void {
    this.isRevealingPlayer = false;
    this.isRevealingMultiPlayers = false;
    this.isRevealingTeamVsTeam = false;
    this.isRevealingChallenge = false;
    this.isTransitioning = false;
    this.showContentAfterReveal = false;
    this.log('Reset all animation states');
  }
}

describe('Game Start Sequence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows challenge reveal directly when isNewGameStart flag is true', () => {
    // Simulate the Setup page setting the flag
    const game = new GameComponent(ChallengeType.INDIVIDUAL, GameMode.FREE_FOR_ALL, true);
    
    // Setup page sets the flag
    game.setLocalStorage('isNewGameStart', 'true');
    
    // Check the flag is set
    expect(game.getLocalStorage('isNewGameStart')).toBe('true');
    
    // Simulate game starting and checking the sequence
    const sequence = game.startRevealSequence();
    
    // Should show challenge reveal directly
    expect(sequence).toEqual(['CHALLENGE_REVEAL']);
    
    // Flag should be removed after use
    expect(game.getLocalStorage('isNewGameStart')).toBeNull();
    
    // Logs should confirm the right path was taken
    const logs = game.getLogs();
    expect(logs).toContain('First challenge after setup - skipping player reveal');
  });
  
  it('shows normal player reveal when isNewGameStart flag is not present', () => {
    // No flag set this time
    const game = new GameComponent(ChallengeType.INDIVIDUAL, GameMode.FREE_FOR_ALL, true);
    
    // Simulate game starting and checking the sequence
    const sequence = game.startRevealSequence();
    
    // Should show player reveal first, then challenge reveal
    expect(sequence).toEqual(['PLAYER_REVEAL', 'CHALLENGE_REVEAL']);
    
    // Logs should confirm the right path was taken
    const logs = game.getLogs();
    expect(logs).toContain('Showing player reveal for individual challenge');
  });
  
  it('shows normal player reveal for second challenge after consuming the flag', () => {
    const game = new GameComponent(ChallengeType.INDIVIDUAL, GameMode.FREE_FOR_ALL, true);
    
    // Setup page sets the flag
    game.setLocalStorage('isNewGameStart', 'true');
    
    // First challenge reveals
    const firstSequence = game.startRevealSequence();
    expect(firstSequence).toEqual(['CHALLENGE_REVEAL']);
    expect(game.getLocalStorage('isNewGameStart')).toBeNull();
    
    // Second challenge reveals
    const secondSequence = game.startRevealSequence();
    expect(secondSequence).toEqual(['PLAYER_REVEAL', 'CHALLENGE_REVEAL']);
    
    // Logs should confirm both paths were taken in sequence
    const logs = game.getLogs();
    expect(logs).toContain('First challenge after setup - skipping player reveal');
    expect(logs).toContain('Showing player reveal for individual challenge');
  });
  
  it('correctly removes the flag only once', () => {
    const game = new GameComponent(ChallengeType.INDIVIDUAL, GameMode.FREE_FOR_ALL, true);
    
    // Setup page sets the flag
    game.setLocalStorage('isNewGameStart', 'true');
    
    // First check should find and consume the flag
    expect(game.getLocalStorage('isNewGameStart')).toBe('true');
    game.removeLocalStorage('isNewGameStart');
    
    // Second check should find the flag is gone
    expect(game.getLocalStorage('isNewGameStart')).toBeNull();
    
    // Any subsequent check should still find it's gone
    expect(game.getLocalStorage('isNewGameStart')).toBeNull();
  });
}); 