import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChallengeType, Challenge } from '@/types/Challenge';
import { useGame } from '@/contexts/GameContext';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';

interface CustomChallengeFormProps {
  isOpen: boolean;
  onClose: () => void;
  editChallenge?: Challenge; // Challenge to edit, if in edit mode
}

const CustomChallengeForm: React.FC<CustomChallengeFormProps> = ({
  isOpen,
  onClose,
  editChallenge
}) => {
  const { t } = useTranslation();
  const { dispatch } = useGame();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChallengeType>(ChallengeType.INDIVIDUAL);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [points, setPoints] = useState(1);
  const [canReuse, setCanReuse] = useState(true);
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load challenge data when editing
  useEffect(() => {
    if (editChallenge) {
      setTitle(editChallenge.title);
      setDescription(editChallenge.description);
      setType(editChallenge.type);
      setDifficulty(editChallenge.difficulty);
      setPoints(editChallenge.points);
      setCanReuse(editChallenge.canReuse);
      setCategory(editChallenge.category || '');
    }
  }, [editChallenge]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (editChallenge) {
        // Update existing challenge
        dispatch({
          type: 'UPDATE_CUSTOM_CHALLENGE',
          payload: {
            id: editChallenge.id,
            title,
            description,
            type,
            difficulty,
            points,
            canReuse,
            category: category.trim() || undefined
          }
        });
      } else {
        // Add new challenge
        dispatch({
          type: 'ADD_CUSTOM_CHALLENGE',
          payload: {
            title,
            description,
            type,
            difficulty,
            points,
            canReuse,
            category: category.trim() || undefined
          }
        });
      }
      
      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving custom challenge:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset form values
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType(ChallengeType.INDIVIDUAL);
    setDifficulty(1);
    setPoints(1);
    setCanReuse(true);
    setCategory('');
  };
  
  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editChallenge ? t('challenges.editChallenge') : t('challenges.customChallenge')}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Challenge Title */}
          <div>
            <label htmlFor="challenge-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('challenges.challengeTitle')} *
            </label>
            <input
              id="challenge-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
              placeholder={t('challenges.titlePlaceholder')}
              required
            />
          </div>
          
          {/* Challenge Description */}
          <div>
            <label htmlFor="challenge-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('challenges.challengeDescription')} *
            </label>
            <textarea
              id="challenge-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
              placeholder={t('challenges.descriptionPlaceholder')}
              rows={3}
              required
            />
          </div>
          
          {/* Challenge Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('challenges.challengeType')} *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType(ChallengeType.INDIVIDUAL)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${type === ChallengeType.INDIVIDUAL 
                    ? 'bg-pastel-blue text-gray-800 border-2 border-pastel-blue' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-pastel-blue/20'}
                `}
              >
                {t('game.challengeTypes.individual')}
              </button>
              
              <button
                type="button"
                onClick={() => setType(ChallengeType.ONE_ON_ONE)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${type === ChallengeType.ONE_ON_ONE 
                    ? 'bg-pastel-orange text-gray-800 border-2 border-pastel-orange' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-pastel-orange/20'}
                `}
              >
                {t('game.challengeTypes.oneOnOne')}
              </button>
              
              <button
                type="button"
                onClick={() => setType(ChallengeType.TEAM)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${type === ChallengeType.TEAM 
                    ? 'bg-pastel-green text-gray-800 border-2 border-pastel-green' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-pastel-green/20'}
                `}
              >
                {t('game.challengeTypes.team')}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('challenges.difficulty')} *
              </label>
              <div className="flex gap-3">
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level as 1 | 2 | 3)}
                    className={`
                      flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${difficulty === level 
                        ? 'bg-game-primary text-white' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}
                    `}
                  >
                    {Array(level).fill('⭐').join('')}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Points */}
            <div>
              <label htmlFor="challenge-points" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.points')} *
              </label>
              <select
                id="challenge-points"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) as 1 | 2 | 3)}
                className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
              >
                <option value={1}>1 {t('common.point')}</option>
                <option value={2}>2 {t('common.points')}</option>
                <option value={3}>3 {t('common.points')}</option>
              </select>
            </div>
          </div>
          
          {/* Can Reuse */}
          <div className="flex items-center">
            <input
              id="can-reuse"
              type="checkbox"
              checked={canReuse}
              onChange={(e) => setCanReuse(e.target.checked)}
              className="w-4 h-4 text-game-primary border-gray-300 rounded focus:ring-game-primary"
            />
            <label htmlFor="can-reuse" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('challenges.canReuse')}
            </label>
          </div>
          
          {/* Category (optional) */}
          <div>
            <label htmlFor="challenge-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('challenges.category')}
            </label>
            <input
              id="challenge-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
              placeholder={t('challenges.categoryPlaceholder')}
            />
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            disabled={!title || !description}
          >
            {t('challenges.addChallenge')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomChallengeForm;