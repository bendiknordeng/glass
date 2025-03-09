import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { GameMode } from '@/types/Team';
import Button from '@/components/common/Button';
import TeamCard from '@/components/common/TeamCard';

const TeamCreation: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [numTeams, setNumTeams] = useState(2);
  const [teamsCreated, setTeamsCreated] = useState(false);
  
  // Reset teams when game mode changes
  useEffect(() => {
    if (state.gameMode !== GameMode.TEAMS) {
      setTeamsCreated(false);
    }
  }, [state.gameMode]);
  
  // Create teams
  const handleCreateTeams = () => {
    dispatch({
      type: 'CREATE_TEAMS',
      payload: numTeams
    });
    setTeamsCreated(true);
  };
  
  // Randomize teams
  const handleRandomizeTeams = () => {
    dispatch({
      type: 'RANDOMIZE_TEAMS'
    });
  };
  
  // Disable controls if not enough players
  const notEnoughPlayers = state.players.length < 2;
  
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        {t('setup.teamCreation')}
      </h2>
      
      {state.gameMode === GameMode.TEAMS ? (
        <>
          {/* Team Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Number of Teams Slider */}
              <div>
                <label htmlFor="numTeams" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('setup.numberOfTeams')}
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">2</span>
                  <input
                    type="range"
                    id="numTeams"
                    min={2}
                    max={Math.min(6, Math.floor(state.players.length / 2))}
                    value={numTeams}
                    onChange={(e) => setNumTeams(parseInt(e.target.value))}
                    disabled={notEnoughPlayers || teamsCreated}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {Math.min(6, Math.floor(state.players.length / 2))}
                  </span>
                </div>
                <div className="mt-1 text-center">
                  <span className="text-lg font-bold text-game-primary">
                    {numTeams} {t('setup.teams')}
                  </span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col justify-center gap-3">
                {!teamsCreated ? (
                  <Button
                    variant="primary"
                    onClick={handleCreateTeams}
                    isDisabled={notEnoughPlayers}
                    className="w-full"
                  >
                    {t('setup.createTeams')}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={handleRandomizeTeams}
                    className="w-full"
                  >
                    {t('setup.randomize')}
                  </Button>
                )}
                
                {notEnoughPlayers && (
                  <p className="text-amber-600 dark:text-amber-400 text-sm text-center">
                    {t('setup.needMorePlayers')}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Team Display */}
          <AnimatePresence>
            {teamsCreated && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                  {t('setup.yourTeams')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {state.teams.map((team) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      players={state.players}
                      showScore={false}
                      size="lg"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {t('setup.freeForAllMode')}
          </p>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('setup.switchToTeamMode')}
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamCreation;