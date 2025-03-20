import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChallengeType, Challenge, Punishment } from '@/types/Challenge';
import { useGame } from '@/contexts/GameContext';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Switch from '@/components/common/Switch';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import { challengesService } from '@/services/supabase';
import { useValidatedAuth } from '@/utils/auth-helpers'; // Use validated auth
import { DBChallenge } from '@/types/supabase';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

// Maximum number of recent custom challenges to store
const MAX_RECENT_CHALLENGES = 10;
const RECENT_CHALLENGES_KEY = 'recentCustomChallenges';

interface CustomChallengeFormProps {
  isOpen: boolean;
  onClose: () => void;
  editChallenge?: Challenge; // Challenge to edit, if in edit mode
}

// Interface for validation errors
interface ValidationError {
  id: string;
  message: string;
}

const CustomChallengeForm: React.FC<CustomChallengeFormProps> = ({
  isOpen,
  onClose,
  editChallenge
}) => {
  const { t } = useTranslation();
  const { dispatch } = useGame();
  const { user, isAuthenticated, getValidUserId } = useValidatedAuth(); // Use validated auth
  const [recentChallenges, setRecentChallenges] = useLocalStorage<Challenge[]>(RECENT_CHALLENGES_KEY, []);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChallengeType>(ChallengeType.INDIVIDUAL);
  const [points, setPoints] = useState(1);
  const [canReuse, setCanReuse] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Punishment state
  const [hasPunishment, setHasPunishment] = useState(false);
  const [punishmentType, setPunishmentType] = useState<'sips' | 'custom'>('sips');
  const [punishmentValue, setPunishmentValue] = useState(1);
  const [customPunishmentDescription, setCustomPunishmentDescription] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState<ValidationError[]>([]);
  
  // Load challenges from Supabase when the form opens
  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      loadChallenges();
    }
  }, [isOpen, isAuthenticated, user]);
  
  // Load challenges from Supabase
  const loadChallenges = async () => {
    setIsLoadingChallenges(true);
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setIsLoadingChallenges(false);
    }, 5000); // 5 seconds max loading time
    
    try {
      if (isAuthenticated && user) {
        // Get a valid UUID format user ID
        const validUserId = getValidUserId();
        if (!validUserId) {
          throw new Error('Could not get a valid user ID');
        }
        const dbChallenges = await challengesService.getChallenges(validUserId);
        console.log('Loaded challenges from database:', dbChallenges ? dbChallenges.length : 0);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoadingChallenges(false);
    }
  };
  
  // Load challenge data when editing
  useEffect(() => {
    if (editChallenge) {
      setTitle(editChallenge.title);
      setDescription(editChallenge.description);
      setType(editChallenge.type);
      setPoints(editChallenge.points);
      setCanReuse(editChallenge.canReuse);
      
      // Set punishment data if it exists
      if (editChallenge.punishment) {
        setHasPunishment(true);
        setPunishmentType(editChallenge.punishment.type);
        setPunishmentValue(editChallenge.punishment.value);
        setCustomPunishmentDescription(editChallenge.punishment.customDescription || '');
      } else {
        setHasPunishment(false);
      }
    }
  }, [editChallenge]);
  
  // Create punishment object if enabled
  const getPunishment = (): Punishment | undefined => {
    if (!hasPunishment) return undefined;
    
    const punishment: Punishment = {
      type: punishmentType,
      value: punishmentValue
    };
    
    if (punishmentType === 'custom' && customPunishmentDescription) {
      punishment.customDescription = customPunishmentDescription;
    }
    
    return punishment;
  };
  
  // Helper function to update recent challenges in local storage
  const updateRecentChallengesLocally = (challenge: Challenge) => {
    // Remove existing challenge with the same ID or title
    const filtered = recentChallenges.filter(c => 
      c.id !== challenge.id && 
      c.title.toLowerCase() !== challenge.title.toLowerCase()
    );
    
    // Add new challenge to front of array
    const updated = [challenge, ...filtered].slice(0, MAX_RECENT_CHALLENGES);
    
    // Update localStorage via the hook
    setRecentChallenges(updated);
  };
  
  // Convert app punishment to database punishment
  const punishmentToDbFormat = (punishment: Punishment | undefined): Record<string, any> | null => {
    if (!punishment) return null;
    return {
      type: punishment.type,
      value: punishment.value,
      ...(punishment.customDescription ? { customDescription: punishment.customDescription } : {})
    };
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];
    
    if (!title.trim()) {
      newErrors.push({ id: 'title', message: t('validation.titleRequired') });
    }
    
    if (!description.trim()) {
      newErrors.push({ id: 'description', message: t('validation.descriptionRequired') });
    }
    
    if (hasPunishment && punishmentType === 'custom' && !customPunishmentDescription.trim()) {
      newErrors.push({ id: 'punishment', message: t('validation.punishmentDescriptionRequired') });
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };
  
  // Remove a specific error
  const removeError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Set a timeout to prevent infinite submitting
    const submittingTimeout = setTimeout(() => {
      setIsSubmitting(false);
      setErrors([...errors, { id: 'timeout', message: t('common.requestTimeout') }]);
    }, 10000); // 10 seconds max submission time
    
    try {
      let challenge: Challenge;
      
      if (editChallenge) {
        // Update existing challenge - preserve the original ID
        challenge = {
          ...editChallenge,
          title,
          description,
          type,
          points,
          canReuse,
          punishment: getPunishment()
        };
        
        // Update in Supabase if authenticated
        if (isAuthenticated && user) {
          // Get a valid UUID format user ID
          const validUserId = getValidUserId();
          if (!validUserId) {
            throw new Error('Could not get a valid user ID');
          }
          
          try {
            const updated = await challengesService.updateChallenge(challenge.id, {
              title,
              description,
              type: type.toString(),
              points,
              can_reuse: canReuse,
              punishment: punishmentToDbFormat(getPunishment())
            });
            
            if (updated) {
              // Keep using the same database ID
              console.log('Challenge updated in database:', updated.id);
            } else {
              console.warn('Challenge update failed in database');
            }
          } catch (dbError) {
            console.error("Error updating challenge in Supabase:", dbError);
            // Continue with local update regardless of DB error
          }
        }
        
        dispatch({
          type: 'UPDATE_CUSTOM_CHALLENGE',
          payload: challenge
        });
      } else {
        // Create a new challenge with UUID
        const challengeId = uuidv4();
        
        // Add new challenge
        challenge = {
          id: challengeId,
          title,
          description,
          type,
          points,
          canReuse,
          punishment: getPunishment()
        };
        
        // Save to Supabase if authenticated
        if (isAuthenticated && user) {
          // Get a valid UUID format user ID
          const validUserId = getValidUserId();
          if (!validUserId) {
            throw new Error('Could not get a valid user ID');
          }
          
          const dbChallengeData: Omit<DBChallenge, 'id' | 'created_at' | 'updated_at' | 'times_played'> = {
            user_id: validUserId,
            title,
            description,
            type: type.toString(),
            points,
            can_reuse: canReuse,
            punishment: punishmentToDbFormat(getPunishment()),
            is_prebuilt: false,
            is_favorite: false,
            category: null,
            prebuilt_type: null,
            prebuilt_settings: null
          };
          
          try {
            const dbChallenge = await challengesService.addChallenge(dbChallengeData);
            
            if (dbChallenge) {
              // Use the Supabase-generated ID
              challenge.id = dbChallenge.id;
              console.log('Challenge saved to database with ID:', dbChallenge.id);
            } else {
              console.warn("Failed to save challenge to Supabase, using local ID");
            }
          } catch (dbError) {
            console.error("Error saving challenge to Supabase:", dbError);
            // Continue with local ID if DB operation fails
          }
        }
        
        dispatch({
          type: 'ADD_CUSTOM_CHALLENGE',
          payload: challenge
        });
      }
      
      // Add to recent challenges in localStorage as a fallback
      updateRecentChallengesLocally(challenge);
      
      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving custom challenge:', error);
      setErrors([...errors, { id: 'form', message: t('common.errorSaving') }]);
    } finally {
      clearTimeout(submittingTimeout);
      setIsSubmitting(false);
    }
  };
  
  // Reset form values
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType(ChallengeType.INDIVIDUAL);
    setPoints(1);
    setCanReuse(true);
    setHasPunishment(false);
    setPunishmentType('sips');
    setPunishmentValue(1);
    setCustomPunishmentDescription('');
    setErrors([]);
  };
  
  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Number input with increment/decrement buttons
  const NumberInput = ({ 
    value, 
    onChange, 
    min = 1, 
    max = 10,
    label,
    id
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    min?: number; 
    max?: number;
    label?: string;
    id: string;
  }) => {
    const decrement = () => {
      if (value > min) {
        onChange(value - 1);
      }
    };
    
    const increment = () => {
      if (value < max) {
        onChange(value + 1);
      }
    };
    
    return (
      <div className="flex items-center">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className={`
            flex items-center justify-center w-10 h-10 rounded-l-md
            ${value <= min 
              ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
            transition-colors
          `}
        >
          <span className="text-lg font-bold">−</span>
        </button>
        
        <div className="relative flex-1">
          <input
            id={id}
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
            className="w-full h-10 text-center border-y border-x border-gray-300 dark:border-gray-700 focus:ring-0 focus:outline-none dark:bg-gray-700 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none rounded-none"
          />
          {label && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
              {label}
            </span>
          )}
        </div>
        
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className={`
            flex items-center justify-center w-10 h-10 rounded-r-md
            ${value >= max 
              ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
            transition-colors
          `}
        >
          <span className="text-lg font-bold">+</span>
        </button>
      </div>
    );
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editChallenge ? t('challenges.editChallenge') : t('challenges.customChallenge')}
      size="lg"
    >
      {/* Error notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {errors.map((error) => (
            <motion.div
              key={error.id}
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="bg-red-500 text-white px-4 py-2 rounded shadow-lg flex items-center"
            >
              <span className="flex-1">{error.message}</span>
              <button 
                onClick={() => removeError(error.id)}
                className="ml-2 text-white hover:text-red-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
              
              <button
                type="button"
                onClick={() => setType(ChallengeType.ALL_VS_ALL)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${type === ChallengeType.ALL_VS_ALL 
                    ? 'bg-pastel-purple text-gray-800 border-2 border-pastel-purple' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-pastel-purple/20'}
                `}
              >
                {t('game.challengeTypes.allVsAll')}
              </button>
            </div>
          </div>
          
          {/* Points - Enhanced with custom number input */}
          <div>
            <label htmlFor="challenge-points" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.points')} * <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(1-10)</span>
            </label>
            <div className="max-w-xs">
              <NumberInput
                id="challenge-points"
                value={points}
                onChange={setPoints}
                label={points === 1 ? t('common.point') : t('common.points')}
              />
            </div>
          </div>
          
          {/* Can Reuse - Using common Switch component with custom icons */}
          <div className="flex items-center">
            <Switch
              checked={canReuse}
              onChange={() => setCanReuse(!canReuse)}
              ariaLabel={t('challenges.canReuse')}
              activeIcon={<CheckIcon className="h-4 w-4 text-green-500" />}
              inactiveIcon={<XMarkIcon className="h-4 w-4 text-red-500" />}
            />
            <label className="ml-3 text-sm text-gray-700 dark:text-gray-300">
              {t('challenges.canReuse')}
            </label>
          </div>
          
          {/* Punishment options */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {/* Include Punishment - Using common Switch component with custom icons */}
            <div className="flex items-center mb-4">
              <Switch
                checked={hasPunishment}
                onChange={() => setHasPunishment(!hasPunishment)}
                ariaLabel={t('challenges.includePunishment')}
                activeIcon={<CheckIcon className="h-4 w-4 text-green-500" />}
                inactiveIcon={<XMarkIcon className="h-4 w-4 text-red-500" />}
              />
              <label className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('challenges.includePunishment')}
              </label>
            </div>
            
            {/* Animated punishment section */}
            <AnimatePresence>
              {hasPunishment && (
                <motion.div
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-50 dark:bg-gray-800 rounded-md p-4 space-y-4 overflow-hidden"
                >
                  {/* Punishment Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('challenges.punishmentType')}
                    </label>
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setPunishmentType('sips')}
                        className={`
                          flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors
                          ${punishmentType === 'sips' 
                            ? 'bg-red-400 text-white' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'}
                        `}
                      >
                        {t('challenges.sips')}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setPunishmentType('custom')}
                        className={`
                          flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors
                          ${punishmentType === 'custom' 
                            ? 'bg-purple-400 text-white' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30'}
                        `}
                      >
                        {t('challenges.custom')}
                      </button>
                    </div>
                  </div>
                  
                  {/* Animated punishment content based on type */}
                  <AnimatePresence mode="wait">
                    {punishmentType === 'sips' ? (
                      <motion.div
                        key="sips"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <label htmlFor="punishment-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('challenges.numberOfSips')} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(1-10)</span>
                        </label>
                        <div className="max-w-xs">
                          <NumberInput
                            id="punishment-value"
                            value={punishmentValue}
                            onChange={setPunishmentValue}
                            label={t('challenges.sips')}
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="custom"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <label htmlFor="custom-punishment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('challenges.customPunishment')}
                        </label>
                        <textarea
                          id="custom-punishment"
                          value={customPunishmentDescription}
                          onChange={(e) => setCustomPunishmentDescription(e.target.value)}
                          className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                          placeholder={t('challenges.customPunishmentPlaceholder')}
                          rows={2}
                          required={punishmentType === 'custom'}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            type="button"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
          >
            {editChallenge ? t('common.save') : t('challenges.addChallenge')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomChallengeForm;