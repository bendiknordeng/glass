import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Player } from '@/types/supabase';
import { fileToDataUrl } from '@/utils/helpers';
import { getAvatarByName } from '@/utils/avatarUtils';
import Button from '@/components/common/Button';
import { useTranslation } from 'react-i18next';

interface PlayerEditFormProps {
  player: Player;
  onSave: (updatedPlayer: Player) => void;
  onCancel: () => void;
  isInGame?: boolean;
}

const PlayerEditForm: React.FC<PlayerEditFormProps> = ({ 
  player, 
  onSave, 
  onCancel,
  isInGame = false
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(player.name);
  const [image, setImage] = useState<string | null>(player.image);
  const [previewUrl, setPreviewUrl] = useState<string>(player.image || '');
  const [playerImage, setPlayerImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isInGame) {
      setError(t('error.cannotEditInGame'));
      return;
    }
    
    if (!name.trim()) {
      setError(t('error.nameRequired'));
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      let finalImage = image;
      
      // If new image was uploaded, convert to data URL
      if (playerImage) {
        finalImage = await fileToDataUrl(playerImage);
      } 
      // If name changed but no new image, use avatar based on name
      else if (!playerImage && !image && name !== player.name) {
        finalImage = getAvatarByName(name).url;
      }
      
      const updatedPlayer = {
        ...player,
        name: name.trim(),
        image: finalImage
      };
      
      onSave(updatedPlayer);
    } catch (error) {
      console.error('Error processing image:', error);
      setError(t('error.imageProcessing'));
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Dropzone for image upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
    },
    maxFiles: 1,
    disabled: isInGame,
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
  
  // Reset preview when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Player Name */}
      <div>
        <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('player.name')}
        </label>
        <input
          type="text"
          id="playerName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isInGame}
          className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder={t('player.namePlaceholder')}
        />
      </div>
      
      {/* Player Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('player.image')}
        </label>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors flex items-center justify-center h-40
            ${isDragActive ? 'border-game-primary bg-game-primary bg-opacity-10' : 'border-gray-300 dark:border-gray-600'}
            ${isInGame ? 'opacity-60 cursor-not-allowed' : 'hover:border-game-primary hover:bg-game-primary hover:bg-opacity-5 dark:hover:bg-opacity-10'}
          `}
        >
          <input {...getInputProps()} />
          
          {previewUrl ? (
            <div className="flex flex-col items-center">
              <img 
                src={previewUrl} 
                alt={t('player.preview')}
                className="h-24 w-24 object-cover rounded-full mb-2"
              />
              {!isInGame && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('player.clickToChange')}
                </span>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              {isInGame ? t('player.cannotChangeInGame') : t('player.dragDropImage')}
            </p>
          )}
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-2">
        <Button
          variant="secondary"
          type="button"
          onClick={onCancel}
          size="md"
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          type="submit"
          isDisabled={isInGame || isProcessing || !name.trim()}
          isLoading={isProcessing}
          size="md"
        >
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
};

export default PlayerEditForm; 