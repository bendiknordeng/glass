import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import Button from '@/components/common/Button';
import PlayerCard from '@/components/common/PlayerCard';
import { fileToDataUrl } from '@/utils/helpers';
import { getAvatarByName } from '@/utils/avatarUtils';

const PlayerRegistration: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [playerImage, setPlayerImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Dropzone setup for image upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setPlayerImage(file);
        
        // Create preview
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
      }
    },
  });
  
  // Add a new player
  const handleAddPlayer = async () => {
    if (playerName.trim() === '') {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Convert image to data URL if provided
      let imageDataUrl = '';
      if (playerImage) {
        imageDataUrl = await fileToDataUrl(playerImage);
      } else {
        // If no image uploaded, use the avatar based on player name
        imageDataUrl = getAvatarByName(playerName.trim()).url;
      }
      
      // Dispatch action to add player
      dispatch({
        type: 'ADD_PLAYER',
        payload: {
          name: playerName.trim(),
          image: imageDataUrl
        }
      });
      
      // Reset form
      setPlayerName('');
      setPlayerImage(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Error adding player:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Remove a player
  const handleRemovePlayer = (playerId: string) => {
    dispatch({
      type: 'REMOVE_PLAYER',
      payload: playerId
    });
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        {t('setup.playerRegistration')}
      </h2>
      
      {/* Player Input Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player Name Input */}
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('setup.playerName')}
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
              placeholder="Enter player name"
            />
          </div>
          
          {/* Player Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('setup.uploadImage')} ({t('common.optional')})
            </label>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-game-primary bg-game-primary bg-opacity-10' : 'border-gray-300 dark:border-gray-600'}
                hover:border-game-primary hover:bg-game-primary hover:bg-opacity-5 dark:hover:bg-opacity-10
              `}
            >
              <input {...getInputProps()} />
              
              {previewUrl ? (
                <div className="flex flex-col items-center">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="h-24 w-24 object-cover rounded-full mb-2"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('setup.clickToChange')}
                  </span>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  {t('setup.dragDropImage')}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Add Player Button */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="primary"
            size="lg"
            isDisabled={playerName.trim() === ''}
            isLoading={isProcessing}
            onClick={handleAddPlayer}
            className="w-full md:w-auto"
          >
            {t('setup.addPlayer')}
          </Button>
        </div>
      </div>
      
      {/* Player List */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
          {t('setup.addedPlayers')} ({state.players.length})
        </h3>
        
        {state.players.length > 0 ? (
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
          >
            <AnimatePresence>
              {state.players.map((player) => (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <PlayerCard player={player} />
                  <button
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors focus:outline-none"
                    onClick={() => handleRemovePlayer(player.id)}
                  >
                    &times;
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg">
            <p>{t('setup.noPlayersYet')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerRegistration;