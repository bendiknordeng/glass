import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useGameState } from '@/hooks/useGameState';
import { formatTime, getParticipantById } from '@/utils/helpers';
import Button from '@/components/common/Button';
import ScoreBoard from '@/components/game/ScoreBoard';
import ChallengeDisplay from '@/components/game/ChallengeDisplay';
import ChallengeReveal from '@/components/animations/ChallengeReveal';
import TeamReveal from '@/components/animations/TeamReveal';
import PlayerReveal from '@/components/animations/PlayerReveal';
import MultiPlayerReveal from '@/components/animations/MultiPlayerReveal';
import { ChallengeType } from '@/types/Challenge';
import { Player } from '@/types/Player';
import { Team, GameMode } from '@/types/Team';
import LoadingState from '@/components/common/LoadingState';

const Game: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, loadChallenges } = useGame();
  const {
    gameState,
    timeRemaining,
    isRevealingChallenge,
    isShowingResults,
    getCurrentParticipant,
    getChallengeParticipants,
    completeChallenge,
    startGame,
    selectNextChallenge,
    setIsRevealingChallenge,
    verifyParticipantsAssigned
  } = useGameState();
  
  // Add state for skip confirmation dialog
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  // Add state for the skip button confirmation
  const [isSkipConfirming, setIsSkipConfirming] = useState(false);
  // Ref for the timer that resets the confirmation state
  const skipConfirmTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug logging for current challenge changes
  useEffect(() => {
    if (state.currentChallenge) {
      console.log('Game component - currentChallenge updated:', {
        id: state.currentChallenge.id,
        title: state.currentChallenge.title,
        type: state.currentChallenge.type,
        isPrebuilt: state.currentChallenge.isPrebuilt,
        prebuiltType: state.currentChallenge.prebuiltType,
        hasPrebuiltSettings: !!state.currentChallenge.prebuiltSettings
      });
    }
  }, [state.currentChallenge]);
  
  // States for reveal flow
  const [isRevealingPlayer, setIsRevealingPlayer] = useState(false);
  const [isRevealingMultiPlayers, setIsRevealingMultiPlayers] = useState(false);
  const [isRevealingTeamVsTeam, setIsRevealingTeamVsTeam] = useState(false);
  
  // For hiding content until proper reveal
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedPlayersForReveal, setSelectedPlayersForReveal] = useState<Player[]>([]);
  const [showContentAfterReveal, setShowContentAfterReveal] = useState(false);
  
  // Add a state to track isNewGameStart (in addition to the ref)
  const [isFirstChallengeInNewGame, setIsFirstChallengeInNewGame] = useState<boolean>(() => {
    // Initialize from localStorage on component mount
    return localStorage.getItem('isNewGameStart') === 'true';
  });
  
  // Add refs to prevent update loops
  const animationInProgressRef = useRef(false);
  const gameInitializedRef = useRef(false);
  const participantRetryCount = useRef(0);
  const isNewGameStartRef = useRef<boolean>(false);
  
  // Track if we've already loaded challenges
  const hasAttemptedChallengeLoad = useRef(false);
  
  useEffect(() => {
    // Check localStorage only once on mount
    const isNewGame = localStorage.getItem('isNewGameStart') === 'true';
    
    // Set the ref and state
    isNewGameStartRef.current = isNewGame;
    setIsFirstChallengeInNewGame(isNewGame);

    // Load challenges on mount if needed - but only once
    if (!hasAttemptedChallengeLoad.current) {
      hasAttemptedChallengeLoad.current = true;
      
      // Only load if we have no challenges at all (standard or custom)
      if (state.challenges.length === 0 && 
          state.customChallenges.length === 0 && 
          !state.isLoadingChallenges) {
        console.log('Game component: Initial challenge load triggered');
        loadChallenges();
      }
    }
    
    // Reset the flag when unmounting
    return () => {
      hasAttemptedChallengeLoad.current = false;
    };
  }, []); // Empty dependency array ensures this runs only once on mount
  
  // Redirect to home if no game started
  useEffect(() => {
    if (!state.players.length) {
      navigate('/');
      return;
    }
    
    // Redirect to results if game finished
    if (state.gameFinished) {
      navigate('/results');
      return;
    }
  }, [state.players.length, state.gameFinished, navigate]);
  
  // Handle game initialization in a separate effect
  useEffect(() => {
    // Only run game initialization if not already done and prerequisites are met
    if (gameInitializedRef.current) {
      return;
    }
    
    // Check if we have the minimum required state to initialize
    if (!state.players.length || state.gameFinished) {
      return;
    }
    
    console.log('Initializing game - setting gameInitializedRef to true');
    gameInitializedRef.current = true;
    
    // Check if this is a direct continuation from setup
    const isNewGameStart = localStorage.getItem('isNewGameStart') === 'true';
    
    // Save to both ref and state for redundancy
    isNewGameStartRef.current = isNewGameStart;
    setIsFirstChallengeInNewGame(isNewGameStart);
    
    // For new game starts coming from setup, handle specially
    if (isNewGameStart) {
      // For fresh games coming directly from setup, just select the next challenge normally
      // The startRevealSequence function will handle the special first challenge logic
      selectNextChallenge();
      
      // Add a small delay to ensure the challenge is selected before starting the reveal
      setTimeout(() => {
        startRevealSequence();
      }, 100);
    }
    // For continued games, just select the next challenge with normal reveal flow
    else if (state.results.length > 0) {
      selectNextChallenge();
    } else {
      // For new games not coming from setup, start with full animation flow
      startGame();
    }
  }, [state.players.length, state.gameFinished, state.results.length]); // Minimal dependencies
  
  // Get current participant
  const currentParticipant = getCurrentParticipant();
  
  // Ensure we have valid participants assigned when needed
  useEffect(() => {
    // Since we no longer use isSelectingPlayer, we only need to verify participants
    // when we have a challenge but no valid participant
    if (!currentParticipant && state.currentChallenge) {
      
      // Increment retry counter
      participantRetryCount.current += 1;
      
      if (participantRetryCount.current <= 3) {
        // Try to verify and assign participants
        const success = verifyParticipantsAssigned();
        
        if (success) {
          // The next render will have the right participant
        } else if (participantRetryCount.current >= 3) {
          setIsRevealingChallenge(true);
        }
      } else {
        // Too many retries, just show the challenge
        setIsRevealingChallenge(true);
      }
    } else if (currentParticipant) {
      // Reset counter when we have a participant
      participantRetryCount.current = 0;
    }
  }, [currentParticipant, state.currentChallenge, verifyParticipantsAssigned, setIsRevealingChallenge]);
  
  // Get selected players for one-on-one challenges
  const getPlayersForOneOnOne = (): Player[] => {
    if (!state.currentChallengeParticipants || 
        state.currentChallengeParticipants.length === 0 || 
        state.currentChallenge?.type !== ChallengeType.ONE_ON_ONE) {
      return [];
    }
    
    // Array to hold our final selected players
    let selectedPlayers: Player[] = [];
    
    // Get the current challenge ID to track player selections per challenge
    const currentChallengeId = state.currentChallenge?.id || '';
    
    if (state.gameMode === GameMode.TEAMS) {
      // For team mode, we need to select one player from each team
      const teamIds = state.currentChallengeParticipants;
      
      // Create maps to track:
      // 1. Overall player selection counts for one-on-one challenges
      const playerSelectionCounts: Record<string, number> = {};
      
      // 2. Player selection counts specifically for this challenge ID
      // This helps with reused challenges
      const playerSelectionsPerChallenge: Record<string, Record<string, number>> = {};
      
      // 3. Track how recently each player was selected (lower = more recent)
      const playerRecency: Record<string, number> = {};
      
      // Initialize all players with a count of 0 and max recency (least recently used)
      const maxRecency = state.results.length + 1; // Set initial recency to beyond any existing result
      state.players.forEach(player => {
        playerSelectionCounts[player.id] = 0;
        playerRecency[player.id] = maxRecency;
        
        // Initialize player counts for this challenge if needed
        if (!playerSelectionsPerChallenge[currentChallengeId]) {
          playerSelectionsPerChallenge[currentChallengeId] = {};
        }
        playerSelectionsPerChallenge[currentChallengeId][player.id] = 0;
      });
      
      // Analyze past results to count how many times each player has been selected
      // Also track when they were last selected (recency)
      state.results.forEach((result, resultIndex) => {
        const challenge = state.challenges.find(c => c.id === result.challengeId);
        if (challenge?.type === ChallengeType.ONE_ON_ONE && result.participantIds) {
          // For overall counts, tally all one-on-one participation
          state.players.forEach(player => {
            if (result.participantIds.includes(player.id) || player.id === result.winnerId) {
              // Count participation
              playerSelectionCounts[player.id] = (playerSelectionCounts[player.id] || 0) + 1;
              
              // Track recency (smaller index = more recent selection)
              const recencyValue = state.results.length - resultIndex;
              // Only update if this is more recent than existing value
              if (recencyValue < playerRecency[player.id]) {
                playerRecency[player.id] = recencyValue;
              }
              
              // Also track per challenge ID counts
              if (result.challengeId === currentChallengeId) {
                if (!playerSelectionsPerChallenge[currentChallengeId]) {
                  playerSelectionsPerChallenge[currentChallengeId] = {};
                }
                playerSelectionsPerChallenge[currentChallengeId][player.id] = 
                  (playerSelectionsPerChallenge[currentChallengeId][player.id] || 0) + 1;
              }
            }
          });
        }
      });
      
      // Keep track of player pairs that have already faced each other
      const playerPairHistory: Set<string> = new Set();
      
      // Specifically track pairs for this exact challenge ID
      const playerPairHistoryForChallenge: Set<string> = new Set();
      
      // Track frequency of pairs (how many times they've faced each other)
      const pairFrequency: Record<string, number> = {};
      
      // Fill these from the results
      state.results.forEach(result => {
        const challenge = state.challenges.find(c => c.id === result.challengeId);
        if (challenge?.type === ChallengeType.ONE_ON_ONE && result.participantIds && result.participantIds.length >= 2) {
          // Get the players who participated in this one-on-one
          const participantPlayers: Player[] = [];
          
          result.participantIds.forEach(id => {
            // Check if this is a team ID
            const team = state.teams.find(t => t.id === id);
            if (team) {
              // If a team was involved, we need to find which player from that team played
              team.playerIds.forEach(playerId => {
                if (result.winnerId === playerId || result.participantIds.includes(playerId)) {
                  const player = state.players.find(p => p.id === playerId);
                  if (player) participantPlayers.push(player);
                }
              });
            } else {
              // This might be a direct player ID
              const player = state.players.find(p => p.id === id);
              if (player) participantPlayers.push(player);
            }
          });
          
          // If we found players, create a unique pair ID and save it
          if (participantPlayers.length >= 2) {
            // Sort player IDs to ensure consistent pair representation regardless of order
            const pairIds = participantPlayers.map(p => p.id).sort();
            const pairKey = pairIds.join('_vs_');
            
            // Add to general history
            playerPairHistory.add(pairKey);
            
            // Track frequency
            pairFrequency[pairKey] = (pairFrequency[pairKey] || 0) + 1;
            
            // Also track specifically for this challenge ID
            if (result.challengeId === currentChallengeId) {
              playerPairHistoryForChallenge.add(pairKey);
            }
          }
        }
      });
      
      // Now we'll select players from each team
      const selectedPlayerIds: Set<string> = new Set();
      
      // Process each team to select a player
      for (const teamId of teamIds) {
        const team = state.teams.find(t => t.id === teamId);
        if (!team || team.playerIds.length === 0) continue;
        
        // If there's only one player in the team, we must use them
        if (team.playerIds.length === 1) {
          const player = state.players.find(p => p.id === team.playerIds[0]);
          if (player && !selectedPlayerIds.has(player.id)) {
            selectedPlayers.push(player);
            selectedPlayerIds.add(player.id);
          }
          continue;
        }
        
        // Get all eligible players from this team
        const eligiblePlayers = team.playerIds
          .map(id => state.players.find(p => p.id === id))
          .filter((p): p is Player => p !== undefined && !selectedPlayerIds.has(p.id));
        
        if (eligiblePlayers.length === 0) continue;
        
        // If we already have some selected players, try to avoid previously matched pairs
        let bestCandidates = eligiblePlayers;
        
        if (selectedPlayers.length > 0) {
          // Get candidates who have faced the current selections the least number of times
          const candidatesWithPairCounts = eligiblePlayers.map(candidate => {
            let totalPairCount = 0;
            selectedPlayers.forEach(selectedPlayer => {
              const pairKey = [candidate.id, selectedPlayer.id].sort().join('_vs_');
              totalPairCount += pairFrequency[pairKey] || 0;
            });
            return { player: candidate, pairCount: totalPairCount };
          });
          
          // Find the minimum pair count
          const minPairCount = Math.min(...candidatesWithPairCounts.map(c => c.pairCount));
          
          // Filter to only include candidates with the minimum pair count
          const leastFrequentPairs = candidatesWithPairCounts
            .filter(c => c.pairCount === minPairCount)
            .map(c => c.player);
          
          if (leastFrequentPairs.length > 0) {
            bestCandidates = leastFrequentPairs;
          }
        }
        
        // Calculate a weighted score for each candidate based on:
        // 1. Selection count (lower is better)
        // 2. Recency (higher is better - we want players who haven't been selected recently)
        // 3. Challenge-specific count (lower is better for reusable challenges)
        const scoredCandidates = bestCandidates.map(player => {
          // Base weight from selection count (inverse, so less used = higher score)
          const countScore = 1 / (playerSelectionCounts[player.id] + 1);
          
          // Recency score (higher = longer since last used)
          const recencyScore = playerRecency[player.id] / maxRecency;
          
          // Challenge-specific score (if applicable)
          const challengeSpecificScore = state.currentChallenge?.canReuse 
            ? 1 / (playerSelectionsPerChallenge[currentChallengeId]?.[player.id] + 1)
            : 1;
          
          // Calculate total score (higher is better)
          // Recency is weighted heaviest to avoid the same player being picked repeatedly
          const totalScore = (countScore * 1) + (recencyScore * 2) + (challengeSpecificScore * 1);
          
          return { player, score: totalScore };
        });
        
        // Sort by total score (highest first)
        scoredCandidates.sort((a, b) => b.score - a.score);
        
        // Use exponential weighting to favor higher scores while still allowing some randomness
        // This creates a probability distribution heavily favoring players who haven't been selected recently
        const totalWeight = scoredCandidates.reduce((sum, candidate, index) => {
          // Exponential decay based on position (lower index = higher weight)
          const weight = Math.exp(-0.5 * index);
          return sum + weight;
        }, 0);
        
        // Generate a random value between 0 and totalWeight
        let randomValue = Math.random() * totalWeight;
        let selectedPlayer: Player | null = null;
        
        // Select based on weighted probability
        for (let i = 0; i < scoredCandidates.length; i++) {
          const weight = Math.exp(-0.5 * i);
          randomValue -= weight;
          
          if (randomValue <= 0) {
            selectedPlayer = scoredCandidates[i].player;
            break;
          }
        }
        
        // Fallback to the highest scored player if something went wrong with the weighting
        if (!selectedPlayer && scoredCandidates.length > 0) {
          selectedPlayer = scoredCandidates[0].player;
        }
        
        if (selectedPlayer) {
          selectedPlayers.push(selectedPlayer);
          selectedPlayerIds.add(selectedPlayer.id);
        }
      }
    } else {
      // For individual mode, select players directly from the participants
      // We'll still try to ensure diversity in matchups
      
      // Create maps to track selection counts and recency
      const playerSelectionCounts: Record<string, number> = {};
      const playerSelectionsPerChallenge: Record<string, Record<string, number>> = {};
      const playerRecency: Record<string, number> = {};
      
      // Initialize all players with a count of 0 and max recency
      const maxRecency = state.results.length + 1; 
      state.players.forEach(player => {
        playerSelectionCounts[player.id] = 0;
        playerRecency[player.id] = maxRecency;
        
        // Initialize player counts for this challenge if needed
        if (!playerSelectionsPerChallenge[currentChallengeId]) {
          playerSelectionsPerChallenge[currentChallengeId] = {};
        }
        playerSelectionsPerChallenge[currentChallengeId][player.id] = 0;
      });
      
      // Count how many times each player has participated and track recency
      state.results.forEach((result, resultIndex) => {
        const challenge = state.challenges.find(c => c.id === result.challengeId);
        if (challenge?.type === ChallengeType.ONE_ON_ONE && result.participantIds) {
          result.participantIds.forEach(id => {
            if (playerSelectionCounts[id] !== undefined) {
              // Track overall count
              playerSelectionCounts[id]++;
              
              // Track recency
              const recencyValue = state.results.length - resultIndex;
              if (recencyValue < playerRecency[id]) {
                playerRecency[id] = recencyValue;
              }
              
              // Track per-challenge count
              if (result.challengeId === currentChallengeId) {
                if (!playerSelectionsPerChallenge[currentChallengeId]) {
                  playerSelectionsPerChallenge[currentChallengeId] = {};
                }
                playerSelectionsPerChallenge[currentChallengeId][id] = 
                  (playerSelectionsPerChallenge[currentChallengeId][id] || 0) + 1;
              }
            }
          });
        }
      });
      
      // Get the direct participant IDs
      const playerIds = state.currentChallengeParticipants;
      
      // Convert to player objects
      const availablePlayers = playerIds
        .map(id => state.players.find(p => p.id === id))
        .filter((p): p is Player => p !== undefined);
      
      if (availablePlayers.length > 0) {
        // Calculate a weighted score for each player
        const scoredPlayers = availablePlayers.map(player => {
          // Base score from overall selection count (inverse)
          const countScore = 1 / (playerSelectionCounts[player.id] + 1);
          
          // Recency score (higher = longer since last used)
          const recencyScore = playerRecency[player.id] / maxRecency;
          
          // Challenge-specific score
          const challengeSpecificScore = state.currentChallenge?.canReuse 
            ? 1 / (playerSelectionsPerChallenge[currentChallengeId]?.[player.id] + 1)
            : 1;
          
          // Calculate total score (higher is better)
          const totalScore = (countScore * 1) + (recencyScore * 2) + (challengeSpecificScore * 1);
          
          return { player, score: totalScore };
        });
        
        // Sort by score (highest first)
        scoredPlayers.sort((a, b) => b.score - a.score);
        
        // Select using a weighted probability distribution
        // Higher scores get exponentially higher probability of selection
        const weightedSelection: Player[] = [];
        
        // First, ensure the top scoring players are always included
        const numToIncludeDirectly = Math.min(2, scoredPlayers.length);
        for (let i = 0; i < numToIncludeDirectly; i++) {
          weightedSelection.push(scoredPlayers[i].player);
        }
        
        // For any remaining selections, use weighted probability
        if (scoredPlayers.length > numToIncludeDirectly) {
          const remainingPlayers = scoredPlayers.slice(numToIncludeDirectly);
          
          // Calculate total weight
          const totalWeight = remainingPlayers.reduce((sum, scored, index) => {
            const weight = Math.exp(-0.5 * index);
            return sum + weight;
          }, 0);
          
          // Select remaining players
          const numToSelect = Math.min(2 - weightedSelection.length, remainingPlayers.length);
          
          for (let i = 0; i < numToSelect; i++) {
            let randomValue = Math.random() * totalWeight;
            let selectedIndex = -1;
            
            for (let j = 0; j < remainingPlayers.length; j++) {
              const weight = Math.exp(-0.5 * j);
              randomValue -= weight;
              
              if (randomValue <= 0) {
                selectedIndex = j;
                break;
              }
            }
            
            if (selectedIndex >= 0) {
              weightedSelection.push(remainingPlayers[selectedIndex].player);
              remainingPlayers.splice(selectedIndex, 1);
            } else if (remainingPlayers.length > 0) {
              weightedSelection.push(remainingPlayers[0].player);
              remainingPlayers.splice(0, 1);
            }
          }
        }
        
        selectedPlayers = weightedSelection;
      }
    }
    
    return selectedPlayers;
  };
  
  // Get selected player for individual reveals
  const getSelectedPlayerForReveal = (): Player | null => {
    if (!currentParticipant) return null;
    
    if (state.gameMode === GameMode.TEAMS) {
      // For team mode, find the team's selected player
      const team = currentParticipant as Team;
      if (!team.playerIds.length) return null;
      
      // Deterministically select a player from the team
      const playerIndex = state.currentRound % team.playerIds.length;
      const selectedPlayerId = team.playerIds[playerIndex];
      return state.players.find(p => p.id === selectedPlayerId) || null;
    } else {
      // For individual mode, the participant is the player
      return currentParticipant as Player;
    }
  };
  
  // Get team names for player displays
  const getTeamNamesForPlayers = (): Record<string, string> => {
    const teamNames: Record<string, string> = {};
    
    if (state.gameMode === GameMode.TEAMS) {
      state.teams.forEach(team => {
        team.playerIds.forEach(playerId => {
          teamNames[playerId] = team.name;
        });
      });
    }
    
    return teamNames;
  };
  
  // Get team name for a specific player
  const getTeamNameForPlayer = (playerId: string): string | undefined => {
    if (state.gameMode !== GameMode.TEAMS) return undefined;
    
    const team = state.teams.find(t => t.playerIds.includes(playerId));
    return team?.name;
  };

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
      }, 300);
    }, 300);
  };
  
  // Handle multi-player reveal complete
  const handleMultiPlayerRevealComplete = () => {
    // Set transitioning state to prevent showing main game area prematurely
    setIsTransitioning(true);
    
    // First turn off the multi-player reveal
    setIsRevealingMultiPlayers(false);
    
    // Then show challenge reveal with a slight delay to ensure smooth transition
    setTimeout(() => {
      setIsRevealingChallenge(true);
      
      // Clear the transitioning state after challenge reveal starts
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }, 300);
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
      }, 300);
    }, 300);
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
      
      // Reset animation in progress flag for next challenge
      animationInProgressRef.current = false;
    }, 300);
  };
  
  // Start the reveal sequence based on challenge type
  const startRevealSequence = () => {
    // Prevent multiple reveal sequences from starting
    if (animationInProgressRef.current) {
      return;
    }
    
    // Check if this is the first challenge in a new game
    // Use state, ref, and localStorage to ensure we don't miss the flag
    const isNewGameStart = Boolean(
      isFirstChallengeInNewGame || 
      isNewGameStartRef.current || 
      localStorage.getItem('isNewGameStart') === 'true'
    );
    
    
    // Set animation in progress flag
    animationInProgressRef.current = true;
    
    // Reset all animation states to ensure a clean start
    setIsRevealingPlayer(false);
    setIsRevealingMultiPlayers(false);
    setIsRevealingTeamVsTeam(false);
    setIsRevealingChallenge(false);
    setIsTransitioning(true);
    setShowContentAfterReveal(false);
    
    // For the first challenge after setup, skip directly to challenge reveal
    if (isNewGameStart) {
      
      // Reset our ref and state
      isNewGameStartRef.current = false;
      setIsFirstChallengeInNewGame(false);
      
      // And clear localStorage (even if it wasn't set, this is harmless)
      localStorage.removeItem('isNewGameStart');
      
      // Go directly to challenge reveal after a short delay
      setTimeout(() => {
        setIsRevealingChallenge(true);
        setIsTransitioning(false);
      }, 300);
      return; // Exit early since we're skipping to challenge reveal
    }
    
    // Small delay to ensure states are reset before starting new animations
    setTimeout(() => {
      // Handle based on challenge type and game mode
      const challengeType = state.currentChallenge?.type;
      
      // Force participant verification
      verifyParticipantsAssigned();
      
      if (challengeType === ChallengeType.TEAM && state.gameMode === GameMode.TEAMS) {
        // For TEAM type challenges in team mode, show team vs team reveal
        setIsRevealingTeamVsTeam(true);
        
        // Clear transitioning state once the animation starts
        setTimeout(() => setIsTransitioning(false), 300);
      }
      // Handle All vs All challenges
      else if (challengeType === ChallengeType.ALL_VS_ALL) {
        // Get all players for All vs All challenges
        let players: Player[] = [];
        
        if (state.gameMode === GameMode.TEAMS) {
          // In team mode, get players from all teams
          players = state.players.filter(player => {
            // Check if the player belongs to any team
            return state.teams.some(team => team.playerIds.includes(player.id));
          });
        } else {
          // In free-for-all mode, include all players
          players = state.players;
        }
        
        if (players.length > 0) {
          setSelectedPlayersForReveal(players);
          setIsRevealingMultiPlayers(true);
          
          // Clear transitioning state once the animation starts
          setTimeout(() => setIsTransitioning(false), 300);
        } else {
          // No players found, skip to challenge
          console.error("No players found for All vs All reveal, skipping to challenge");
          setIsRevealingChallenge(true);
          setTimeout(() => setIsTransitioning(false), 300);
        }
      }
      // Select players for one-on-one challenges
      else if (challengeType === ChallengeType.ONE_ON_ONE) {
        const players = getPlayersForOneOnOne();
        setSelectedPlayersForReveal(players);
        
        if (players.length >= 2) {
          // For head-to-head challenges, show both players
          setIsRevealingMultiPlayers(true);
          
          // Clear transitioning state once the animation starts
          setTimeout(() => setIsTransitioning(false), 300);
        } else {
          // Not enough players, skip to challenge
          console.error("Not enough players for one-on-one challenge, skipping to challenge");
          setIsRevealingChallenge(true);
          setTimeout(() => setIsTransitioning(false), 300);
        }
      } else {
        // For individual challenges, show the player
        const player = getSelectedPlayerForReveal();
        
        if (player) {
          setSelectedPlayersForReveal([player]);
          setIsRevealingPlayer(true);
          
          // Clear transitioning state once the animation starts
          setTimeout(() => setIsTransitioning(false), 300);
        } else {
          // No player found, skip to challenge
          console.error("No player found for reveal, skipping to challenge");
          setIsRevealingChallenge(true);
          setTimeout(() => setIsTransitioning(false), 300);
        }
      }
    }, 100);
  };
  
  // Add event listener for the custom reveal event
  useEffect(() => {
    // Create a standardized event handler that ensures we don't miss reveals
    const handleStartReveal = () => {
      // Add a small delay to ensure state is ready
      setTimeout(() => {
        startRevealSequence();
      }, 50);
    };

    // Listen for both hyphenated and non-hyphenated event names for robustness
    window.addEventListener('start-reveal-sequence', handleStartReveal);
    window.addEventListener('startRevealSequence', handleStartReveal);
    
    // Add direct call for first challenge in case the event isn't firing
    if (state.currentChallenge && !animationInProgressRef.current && 
        !isRevealingPlayer && !isRevealingChallenge && !showContentAfterReveal) {
      setTimeout(() => {
        startRevealSequence();
      }, 150);
    }
    
    // Add listener for resetting animation states
    const handleResetAnimations = () => {
      setIsRevealingPlayer(false);
      setIsRevealingMultiPlayers(false);
      setIsRevealingTeamVsTeam(false);
      setIsRevealingChallenge(false);
      setShowContentAfterReveal(false);
      animationInProgressRef.current = false;
    };
    
    window.addEventListener('reset-game-animations', handleResetAnimations);
    
    return () => {
      window.removeEventListener('start-reveal-sequence', handleStartReveal);
      window.removeEventListener('startRevealSequence', handleStartReveal);
      window.removeEventListener('reset-game-animations', handleResetAnimations);
    };
  }, [state.currentChallenge, isRevealingPlayer, isRevealingChallenge, showContentAfterReveal]);
  
  // Determine if we should show the main game content or loading
  const showGameContent = state.currentChallenge && 
                         !isRevealingChallenge && 
                         !isRevealingPlayer && 
                         !isRevealingMultiPlayers &&
                         !isRevealingTeamVsTeam &&
                         !isTransitioning &&
                         showContentAfterReveal;
  
  // Handler for skipping the current challenge
  const handleSkipChallenge = () => {
    // Reset animation states
    setIsRevealingPlayer(false);
    setIsRevealingMultiPlayers(false);
    setIsRevealingTeamVsTeam(false);
    setIsRevealingChallenge(false);
    setShowContentAfterReveal(false);
    animationInProgressRef.current = false;
    
    // Select next challenge
    selectNextChallenge();
    
    // Start reveal sequence for new challenge after a slight delay
    setTimeout(() => {
      startRevealSequence();
    }, 100);
  };

  // Handler for the skip button first click
  const handleSkipClick = () => {
    if (isSkipConfirming) {
      // Second click - actually skip
      handleSkipChallenge();
      // Reset the confirmation state
      setIsSkipConfirming(false);
      // Clear any existing timer
      if (skipConfirmTimerRef.current) {
        clearTimeout(skipConfirmTimerRef.current);
        skipConfirmTimerRef.current = null;
      }
    } else {
      // First click - enter confirmation mode
      setIsSkipConfirming(true);
      
      // Set a timer to automatically reset after 3 seconds
      skipConfirmTimerRef.current = setTimeout(() => {
        setIsSkipConfirming(false);
        skipConfirmTimerRef.current = null;
      }, 3000);
    }
  };
  
  // Clear the timer on component unmount
  useEffect(() => {
    return () => {
      if (skipConfirmTimerRef.current) {
        clearTimeout(skipConfirmTimerRef.current);
      }
    };
  }, []);

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        {/* Header section removed from here */}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left sidebar (scoreboard) */}
          <div className="lg:col-span-1">
            {/* Game header info moved into the scoreboard section */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                {t('app.name')}
              </h1>
              <div className="flex flex-col gap-1">
                <p className="text-gray-600 dark:text-gray-400">
                  {t('game.round', { round: state.currentRound })}
                </p>
                
                {/* Game Progress Status */}
                {state.gameDuration.type === 'time' ? (
                  <p className="text-game-primary font-medium">
                    {timeRemaining !== null && formatTime(timeRemaining)}
                  </p>
                ) : (
                  <p className="text-game-primary font-medium">
                    {t('game.challengeProgress', {
                      current: state.results.length + 1,
                      total: state.gameDuration.value
                    })}
                  </p>
                )}
              </div>
            </div>
            
            <ScoreBoard
              players={state.players}
              teams={state.teams}
              gameMode={state.gameMode}
            />
          </div>
          
          {/* Main game area - Only show once all reveals are complete */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Challenge loading state */}
              {state.isLoadingChallenges && state.challenges.length === 0 ? (
                <motion.div
                  key="challenge-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg shadow-md p-6 md:mt-20 lg:mt-24"
                >
                  <LoadingState
                    isLoading={state.isLoadingChallenges}
                    hasData={state.challenges.length > 0}
                    error={state.challengeLoadError}
                    loadingMessage={t('game.loadingChallenges')}
                    emptyMessage={t('game.noChallengesFound')}
                    emptySubMessage={t('game.tryAddingChallenges')}
                  />
                </motion.div>
              ) : showGameContent && state.currentChallenge ? (
                <motion.div
                  key="challenge-display"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChallengeDisplay
                    challenge={state.currentChallenge}
                    participants={state.currentChallengeParticipants}
                    players={state.players}
                    teams={state.teams}
                    gameMode={state.gameMode}
                    onComplete={completeChallenge}
                    selectedParticipantPlayers={selectedPlayersForReveal}
                  />
                </motion.div>
              ) : (!showContentAfterReveal && state.currentChallenge) ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-64 rounded-lg shadow-md"
                >
                  <div className="animate-spin mb-4">
                    <svg className="w-12 h-12 text-game-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('game.loadingChallenge')}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Skip Challenge Button */}
        {state.currentChallenge && (
          <div className="fixed bottom-6 right-6 z-10">
            <motion.div
              animate={{
                width: isSkipConfirming ? 'auto' : 'auto',
                transition: { duration: 0.3 }
              }}
            >
              <Button
                onClick={handleSkipClick}
                variant="secondary"
                size="sm"
                className={`
                  relative overflow-hidden transition-all duration-300
                  ${isSkipConfirming 
                    ? 'bg-game-secondary hover:bg-game-secondary/80 text-white px-6' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 px-5'}
                  rounded-full py-3 shadow-md flex items-center justify-center min-w-[140px]
                `}
              >
                {isSkipConfirming && (
                  <motion.div 
                    className="absolute inset-0 rounded-full bg-white opacity-30 z-0"
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ opacity: [0, 0.2, 0], scale: [0.9, 1.1, 1.5] }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity,
                      repeatType: "loop" 
                    }}
                  />
                )}
                <div className="relative w-full h-6 flex items-center justify-center z-10">
                  <motion.div
                    initial={false}
                    animate={{ 
                      x: isSkipConfirming ? -80 : 0,
                      opacity: isSkipConfirming ? 0 : 1
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute whitespace-nowrap"
                  >
                    {t('game.skipChallenge')}
                  </motion.div>
                  <motion.div
                    initial={{ x: 80, opacity: 0 }}
                    animate={{ 
                      x: isSkipConfirming ? 0 : 80,
                      opacity: isSkipConfirming ? 1 : 0,
                      scale: isSkipConfirming ? [1, 1.08, 1] : 1
                    }}
                    transition={{ 
                      duration: 0.3, 
                      ease: "easeInOut",
                      scale: {
                        duration: 0.6,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }
                    }}
                    className="absolute whitespace-nowrap font-medium"
                  >
                    {t('common.skip')}
                  </motion.div>
                </div>
              </Button>
            </motion.div>
          </div>
        )}
      </div>
      
      {/* Animations */}
      <AnimatePresence>
        {/* Team vs Team reveal (for team mode) */}
        {isRevealingTeamVsTeam && currentParticipant && 'playerIds' in currentParticipant && (
          <TeamReveal
            team={currentParticipant as Team}
            allTeams={state.teams}
            players={state.players}
            isTeamVsTeam={true}
            onRevealComplete={handleTeamVsTeamRevealComplete}
          />
        )}
        
        {/* Individual player reveal */}
        {isRevealingPlayer && selectedPlayersForReveal.length > 0 && (
          <PlayerReveal
            player={selectedPlayersForReveal[0]}
            teamName={state.gameMode === GameMode.TEAMS 
              ? getTeamNameForPlayer(selectedPlayersForReveal[0].id) 
              : undefined}
            isTeamMode={false} /* Disable Team X's turn text */
            onRevealComplete={handlePlayerRevealComplete}
          />
        )}
        
        {/* Multi-player reveal for one-on-one challenges */}
        {isRevealingMultiPlayers && selectedPlayersForReveal.length >= 2 && (
          <MultiPlayerReveal
            players={selectedPlayersForReveal}
            teamMode={state.gameMode === GameMode.TEAMS}
            teamNames={getTeamNamesForPlayers()}
            onRevealComplete={handleMultiPlayerRevealComplete}
            animationConfig={{
              // Set custom title based on challenge type
              customText: state.currentChallenge?.type === ChallengeType.ALL_VS_ALL 
                ? t('game.getReady') 
                : undefined,
              // Use different title for challenge types
              customTitle: state.currentChallenge?.type === ChallengeType.ALL_VS_ALL
                ? t('game.challengeTypes.allVsAll')
                : undefined,
              // Use different title text for different challenge types
              showTitle: true,
              // For all-vs-all with many players, we might need to adjust the layout
              showVsText: state.currentChallenge?.type !== ChallengeType.ALL_VS_ALL || selectedPlayersForReveal.length <= 3
            }}
          />
        )}
        
        {/* Challenge reveal */}
        {isRevealingChallenge && state.currentChallenge && (
          <ChallengeReveal
            challenge={state.currentChallenge}
            onRevealComplete={handleChallengeRevealComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Game;