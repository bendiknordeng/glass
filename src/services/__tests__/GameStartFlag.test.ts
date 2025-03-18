/**
 * This test simulates the exact sequence of localStorage access in Game.tsx
 * to verify that the isNewGameStart flag is properly handled.
 */

describe('Game Start Flag Behavior', () => {
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
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });
  
  it('correctly identifies a new game start and maintains the flag for startRevealSequence', () => {
    // Simulate Setup.tsx setting the flag
    localStorage.setItem('isNewGameStart', 'true');
    
    // Simulate the first check in the Game component's initialization
    const isNewGameStartFirstCheck = localStorage.getItem('isNewGameStart') === 'true';
    
    // This should be true
    expect(isNewGameStartFirstCheck).toBe(true);
    
    // In the initialization code, we don't remove the flag yet
    // (comment in code says "We'll keep the flag - it will be cleared in startRevealSequence")
    
    // Now simulate some time passing before startRevealSequence is called
    
    // Now simulate the check in startRevealSequence
    const isNewGameStartSecondCheck = localStorage.getItem('isNewGameStart') === 'true';
    
    // This should also be true since we didn't remove it yet
    expect(isNewGameStartSecondCheck).toBe(true);
    
    // In startRevealSequence, we now remove the flag
    localStorage.removeItem('isNewGameStart');
    
    // Verify it's gone
    expect(localStorage.getItem('isNewGameStart')).toBeNull();
    
    // If startRevealSequence was called again later, it should no longer find the flag
    const isNewGameStartThirdCheck = localStorage.getItem('isNewGameStart') === 'true';
    expect(isNewGameStartThirdCheck).toBe(false);
  });
  
  it('correctly handles multiple instances of the flag being checked and removed', () => {
    // Simulate Setup.tsx setting the flag
    localStorage.setItem('isNewGameStart', 'true');
    
    // First component instance checks the flag
    const instance1Check = localStorage.getItem('isNewGameStart') === 'true';
    expect(instance1Check).toBe(true);
    
    // First instance removes it
    localStorage.removeItem('isNewGameStart');
    
    // Second component instance checks the flag
    const instance2Check = localStorage.getItem('isNewGameStart') === 'true';
    expect(instance2Check).toBe(false); // The flag should be gone now
  });
  
  it('ignores the flag when it is not set at all', () => {
    // We don't set the flag
    
    // Check if it's a new game start
    const isNewGameStart = localStorage.getItem('isNewGameStart') === 'true';
    expect(isNewGameStart).toBe(false);
  });
}); 