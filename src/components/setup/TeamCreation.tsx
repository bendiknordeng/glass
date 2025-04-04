import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  DragEndEvent,
  DragStartEvent,
  UniqueIdentifier,
  useDroppable,
  DragOverEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useGame } from '@/contexts/GameContext';
import { GameMode } from '@/types/Team';
import Button from '@/components/common/Button';
import PlayerCard from '@/components/common/PlayerCard';
import { Player } from '@/types/Player';
import { ArrowPathRoundedSquareIcon } from '@heroicons/react/24/outline';

interface SortablePlayerProps {
  player: Player;
  id: UniqueIdentifier;
  onPlayerClick: () => void;
}

interface DroppableAreaProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isOver?: boolean;
}

const DroppableArea: React.FC<DroppableAreaProps> = ({ id, children, className = '', isOver }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef} 
      className={`${className} transition-colors duration-200 ${isOver ? 'bg-game-primary bg-opacity-10 dark:bg-opacity-20 ring-2 ring-game-primary' : ''}`}
    >
      {children}
    </div>
  );
};

const SortablePlayer: React.FC<SortablePlayerProps> = ({ player, id, onPlayerClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={(e) => {
        // Only trigger click if it's not a drag action
        if (!isDragging) {
          e.stopPropagation();
          onPlayerClick();
        }
      }}
    >
      <PlayerCard player={player} size="sm" />
    </div>
  );
};

export interface TeamCreationRef {
  isReady: () => boolean;
}

const TeamCreation = forwardRef<TeamCreationRef, {}>((props, ref) => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [numTeams, setNumTeams] = useState(2);
  const [teamsCreated, setTeamsCreated] = useState(false);
  const [teamNames, setTeamNames] = useState<string[]>(new Array(2).fill(''));
  const [unassignedPlayers, setUnassignedPlayers] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [editingTeamNames, setEditingTeamNames] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // Start dragging after moving 5px to differentiate from clicks
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Start dragging after 200ms touch to differentiate from taps
        tolerance: 5,
      },
    })
  );

  const MIN_PLAYERS = 2;
  
  // Reset teams when game mode changes
  useEffect(() => {
    if (state.gameMode !== GameMode.TEAMS) {
      // When switching away from TEAMS mode
      setTeamsCreated(false);
      // Reset team names to empty strings
      setTeamNames(new Array(numTeams).fill(''));
    } else {
      // When switching to TEAMS mode
      // If we have teams in the state, consider them created
      if (state.teams.length > 0) {
        setTeamsCreated(true);
        const savedTeamNames = state.teams.map(team => team.name || '');
        setTeamNames(savedTeamNames);
      } else {
        setTeamsCreated(false);
        setTeamNames(new Array(numTeams).fill(''));
      }
    }
  }, [state.gameMode, state.teams, numTeams]);

  // Update team names when number of teams changes
  useEffect(() => {
    setTeamNames(prevNames => {
      const newNames = [...prevNames];
      // Ensure we have empty strings for all team slots
      while (newNames.length < numTeams) {
        newNames.push('');
      }
      // Trim excess names if reducing team count
      // Make sure there are no undefined values in the array
      const finalNames = newNames.slice(0, numTeams).map(name => name || '');
      return finalNames;
    });
  }, [numTeams]);

  // Initialize unassigned players when teams are created
  useEffect(() => {
    if (teamsCreated) {
      const assignedPlayers = state.teams.flatMap(team => team.playerIds);
      setUnassignedPlayers(state.players.map(p => p.id).filter(id => !assignedPlayers.includes(id)));
    }
  }, [teamsCreated, state.teams, state.players]);
  
  // Create or update teams
  const handleCreateOrUpdateTeams = (): void => {
    // Create default team names for any empty inputs
    const finalTeamNames = teamNames.map((name, index) => 
      name.trim() === '' ? `Team ${index + 1}` : name
    );

    dispatch({
      type: 'CREATE_TEAMS',
      payload: { numTeams, teamNames: finalTeamNames }
    });
    
    // Important: This sets the local teamsCreated flag to true
    // When navigating back and forth, this flag might get reset
    // but the teams still exist in the global state
    setTeamsCreated(true);
    setEditingTeamNames(false);
    
    // Update the teamNames state with the final names for display
    setTeamNames(finalTeamNames);
  };
  
  // Randomize teams
  const handleRandomizeTeams = (): void => {
    dispatch({
      type: 'RANDOMIZE_TEAMS'
    });
  };
  
  // Handle game mode change
  const handleGameModeChange = (mode: GameMode): void => {
    // The SET_GAME_MODE action in the reducer already handles clearing teams when switching to FREE_FOR_ALL
    dispatch({
      type: 'SET_GAME_MODE',
      payload: mode
    });
    
    // Reset teams created flag when switching modes
    setTeamsCreated(false);
  };

  // Handle team name change
  const handleTeamNameChange = (index: number, name: string): void => {
    setTeamNames(prevNames => {
      const newNames = [...prevNames];
      // Make sure we fill any gaps with empty strings
      for (let i = 0; i <= index; i++) {
        if (newNames[i] === undefined) {
          newNames[i] = '';
        }
      }
      newNames[index] = name;
      return newNames;
    });
    if (teamsCreated) {
      setEditingTeamNames(true);
    }
  };

  const handlePlayerClick = (playerId: string, currentLocation: string) => {
    if (state.teams.length === 0) return;

    // If in unassigned, move to first team
    if (currentLocation === 'unassigned') {
      setUnassignedPlayers(prev => prev.filter(id => id !== playerId));
      dispatch({
        type: 'ADD_PLAYER_TO_TEAM',
        payload: {
          teamId: state.teams[0].id,
          playerId
        }
      });
      return;
    }

    // Find current team index
    const currentTeamIndex = state.teams.findIndex(t => t.id === currentLocation);
    if (currentTeamIndex === -1) return;

    // Remove from current team
    dispatch({
      type: 'REMOVE_PLAYER_FROM_TEAM',
      payload: {
        teamId: currentLocation,
        playerId
      }
    });

    // Move to next team (cycle back to first team if at the end)
    const nextTeamIndex = (currentTeamIndex + 1) % state.teams.length;
    dispatch({
      type: 'ADD_PLAYER_TO_TEAM',
      payload: {
        teamId: state.teams[nextTeamIndex].id,
        playerId
      }
    });
  };

  const handleMoveAllToUnassigned = () => {
    const allPlayers = state.teams.flatMap(team => {
      // Remove all players from team
      team.playerIds.forEach(playerId => {
        dispatch({
          type: 'REMOVE_PLAYER_FROM_TEAM',
          payload: {
            teamId: team.id,
            playerId
          }
        });
      });
      return team.playerIds;
    });
    
    // Add all players to unassigned
    setUnassignedPlayers(prev => [...prev, ...allPlayers]);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.over) {
      setDragOverId(String(event.over.id));
    } else {
      setDragOverId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverId(null);

    if (!over) return;

    const playerId = String(active.id);
    const sourceId = active.data.current?.sortable.containerId || 'unassigned';
    const destinationId = String(over.id);

    if (sourceId === destinationId) return;

    // Remove from source
    if (sourceId === 'unassigned') {
      setUnassignedPlayers(prev => prev.filter(id => id !== playerId));
    } else {
      dispatch({
        type: 'REMOVE_PLAYER_FROM_TEAM',
        payload: {
          teamId: sourceId,
          playerId
        }
      });
    }

    // Add to destination
    if (destinationId === 'unassigned') {
      setUnassignedPlayers(prev => [...prev, playerId]);
    } else {
      dispatch({
        type: 'ADD_PLAYER_TO_TEAM',
        payload: {
          teamId: destinationId,
          playerId
        }
      });
    }
  };
  
  // Disable controls if not enough players
  const notEnoughPlayers = state.players.length < MIN_PLAYERS;

  const renderDragOverlay = () => {
    if (!activeId) return null;
    
    const player = state.players.find(p => p.id === activeId);
    if (!player) return null;

    return (
      <DragOverlay>
        <PlayerCard player={player} size="sm" />
      </DragOverlay>
    );
  };
  
  // Update state when teams change
  useEffect(() => {
    dispatch({
      type: "SAVE_TEAMS_STATE",
      payload: state.teams
    });
    
    // Also save to localStorage for persistence across refreshes
    try {
      localStorage.setItem('setupTeams', JSON.stringify(state.teams));
    } catch (error) {
      console.error('Error saving teams to localStorage:', error);
    }
  }, [state.teams, dispatch]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    isReady: () => {
      // Always ready in FREE_FOR_ALL mode
      if (state.gameMode === GameMode.FREE_FOR_ALL) {
        return true;
      }
      
      // In TEAMS mode, check both our local teamsCreated state and the actual teams data
      // Teams are ready if we have created teams and there are actual teams in the state
      // This handles edge cases when switching between modes
      return teamsCreated && state.teams.length > 0;
    },
  }));

  // Additional initialization effect to handle initial state
  useEffect(() => {
    // Initialize team creation state based on game mode and teams
    if (state.gameMode === GameMode.TEAMS && state.teams.length > 0) {
      setTeamsCreated(true);
      setNumTeams(state.teams.length);
      const names = state.teams.map(team => team.name || '');
      setTeamNames(names);
    }
  // Run on mount AND when remounting after navigation 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameMode, state.teams.length]);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        {t('setup.teamSetup')}
      </h2>
      
      {/* Game Mode Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300">
          {t('setup.gameMode')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            className={`
              flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all
              ${state.gameMode === GameMode.FREE_FOR_ALL ? 
                'border-game-primary bg-game-primary bg-opacity-10' : 
                'border-gray-200 dark:border-gray-700 hover:border-game-primary hover:bg-game-primary hover:bg-opacity-5'
              }
            `}
            onClick={() => handleGameModeChange(GameMode.FREE_FOR_ALL)}
          >
            <span className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
              {t('setup.freeForAll')}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('setup.allPlayersIndividual')}
            </span>
          </button>
          
          <button
            className={`
              flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all
              ${state.gameMode === GameMode.TEAMS ? 
                'border-game-primary bg-game-primary bg-opacity-10' : 
                'border-gray-200 dark:border-gray-700 hover:border-game-primary hover:bg-game-primary hover:bg-opacity-5'
              }
            `}
            onClick={() => handleGameModeChange(GameMode.TEAMS)}
          >
            <span className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
              {t('setup.teams')}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('setup.playInTeams')}
            </span>
          </button>
        </div>
      </div>
      
      {state.gameMode === GameMode.TEAMS ? (
        <>
          {/* Team Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Number of Teams Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('setup.numberOfTeams')}
                </label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="secondary"
                    onClick={() => setNumTeams(prev => Math.max(2, prev - 1))}
                    isDisabled={notEnoughPlayers || numTeams <= 2}
                    className="w-10 h-10 p-0 flex items-center justify-center"
                  >
                    -
                  </Button>
                  <span className="text-2xl font-bold text-game-primary min-w-[3rem] text-center">
                    {numTeams}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setNumTeams(prev => Math.min(Math.min(6, Math.floor(state.players.length / 2)), prev + 1))}
                    isDisabled={notEnoughPlayers || numTeams >= Math.min(6, Math.floor(state.players.length / 2))}
                    className="w-10 h-10 p-0 flex items-center justify-center"
                  >
                    +
                  </Button>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('setup.teams')}
                  </span>
                </div>
              </div>
              
              {/* Team Names */}
              <div className="space-y-3">
                {Array.from({ length: numTeams }).map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={teamNames[index] || ''}
                      onChange={(e) => handleTeamNameChange(index, e.target.value)}
                      placeholder={`Team ${index + 1}`}
                      className="w-full px-3 py-2 border rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-game-primary"
                    />
                  </div>
                ))}
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col justify-center gap-3 md:col-span-2">
                <Button
                  variant="primary"
                  onClick={handleCreateOrUpdateTeams}
                  isDisabled={notEnoughPlayers}
                  className="w-full"
                >
                  {teamsCreated ? t('setup.saveTeams') : t('setup.createTeams', { count: numTeams })}
                </Button>
                
                {notEnoughPlayers && (
                  <p className="text-amber-600 dark:text-amber-400 text-sm text-center">
                    {t('setup.needMorePlayers')}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Team Display with Drag and Drop */}
          <AnimatePresence>
            {teamsCreated && (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                      {t('setup.yourTeams')}
                    </h3>
                    <Button
                      variant="secondary"
                      onClick={handleRandomizeTeams}
                      className="flex items-center gap-2"
                    >
                      <ArrowPathRoundedSquareIcon className="w-5 h-5 mr-2" />
                      {t('setup.randomize')}
                    </Button>
                  </div>

                  {/* Unassigned Players Pool */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        {t('setup.unassignedPlayers')}
                      </h4>
                      <Button
                        variant="secondary"
                        onClick={handleMoveAllToUnassigned}
                        size="sm"
                      >
                        {t('setup.moveAllHere')}
                      </Button>
                    </div>
                    <DroppableArea
                      id="unassigned"
                      isOver={dragOverId === 'unassigned'}
                      className="flex flex-wrap gap-3 min-h-[100px] p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                    >
                      <SortableContext
                        items={unassignedPlayers}
                        strategy={horizontalListSortingStrategy}
                      >
                        {unassignedPlayers.map((playerId) => {
                          const player = state.players.find(p => p.id === playerId);
                          if (!player) return null;
                          return (
                            <SortablePlayer
                              key={playerId}
                              id={playerId}
                              player={player}
                              onPlayerClick={() => handlePlayerClick(playerId, 'unassigned')}
                            />
                          );
                        })}
                      </SortableContext>
                    </DroppableArea>
                  </div>
                  
                  {/* Teams Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {state.teams.map((team) => (
                      <div
                        key={team.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
                      >
                        <h4 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
                          {team.name}
                        </h4>
                        <DroppableArea
                          id={team.id}
                          isOver={dragOverId === team.id}
                          className="flex flex-wrap gap-3 min-h-[100px] p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                        >
                          <SortableContext
                            items={team.playerIds}
                            strategy={horizontalListSortingStrategy}
                          >
                            {team.playerIds.map((playerId) => {
                              const player = state.players.find(p => p.id === playerId);
                              if (!player) return null;
                              return (
                                <SortablePlayer
                                  key={playerId}
                                  id={playerId}
                                  player={player}
                                  onPlayerClick={() => handlePlayerClick(playerId, team.id)}
                                />
                              );
                            })}
                          </SortableContext>
                        </DroppableArea>
                      </div>
                    ))}
                  </div>
                </motion.div>
                {renderDragOverlay()}
              </DndContext>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 dark:text-gray-200 text-xl">
            {t('setup.freeForAll')} {t('common.selected')}
          </p>
          <p className="mt-2 text-gray-800 dark:text-gray-500">
            {t('setup.allPlayersIndividual')}
          </p>
        </div>
      )}
    </div>
  );
});

export default TeamCreation;