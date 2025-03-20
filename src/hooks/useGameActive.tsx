import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * A hook that determines if there is an active game running
 * @returns {boolean} True if a game is currently active
 */
export function useGameActive(): boolean {
  const location = useLocation();
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if we're on the game page
    const isOnGamePage = location.pathname === '/game';
    
    // Check for active game in local storage
    const hasActiveGame = localStorage.getItem('activeGame') === 'true';
    
    // Check for game state in sessionStorage
    const hasGameState = sessionStorage.getItem('gameState') !== null;
    
    // Also check for ongoing game in localStorage.gameState
    const localGameState = localStorage.getItem('gameState');
    const parsedGameState = localGameState ? JSON.parse(localGameState) : null;
    const hasOngoingGame = parsedGameState && 
                          !parsedGameState.gameFinished && 
                          parsedGameState.players && 
                          parsedGameState.players.length > 0;
    
    setIsGameActive(isOnGamePage || hasActiveGame || hasGameState || hasOngoingGame);
    
    // Create event listener for game state changes
    const handleGameStateChange = () => {
      const activeGame = localStorage.getItem('activeGame') === 'true';
      setIsGameActive(activeGame || location.pathname === '/game');
    };
    
    window.addEventListener('game-state-change', handleGameStateChange);
    
    return () => {
      window.removeEventListener('game-state-change', handleGameStateChange);
    };
  }, [location.pathname]);
  
  return isGameActive;
} 