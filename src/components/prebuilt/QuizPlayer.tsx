import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Challenge,
  QuizSettings,
  QuizQuestion,
  QuizOption,
  ChallengeType
} from '@/types/Challenge';
import { useGame } from '@/contexts/GameContext';
import Button from '@/components/common/Button';
import { Player } from '@/types/Player';
import { Team } from '@/types/Team';
import PlayerCard from '@/components/common/PlayerCard';
import TeamCard from '@/components/common/TeamCard';
import { 
  CheckIcon, 
  XMarkIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon,
  QuestionMarkCircleIcon, 
  LightBulbIcon,
  EyeIcon,
  TrophyIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';
import { getParticipantById } from '@/utils/helpers';

interface QuizPlayerProps {
  challenge: Challenge;
  /**
   * Callback for when the quiz is completed.
   * @param completed Whether the entire challenge should be marked as completed
   * @param winnerId The ID of the winning participant (if there is one)
   * @param scores The final scores for all participants
   */
  onComplete: (completed: boolean, winnerId?: string, scores?: Record<string, number>) => void;
  selectedParticipantPlayers?: Player[];
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({
  challenge,
  onComplete,
  selectedParticipantPlayers
}) => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  
  // Type assertion for the challenge settings
  const settings = challenge.prebuiltSettings as QuizSettings;
  
  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>(settings.questions || []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(settings.currentQuestionIndex || 0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedQuestionIndex, setRevealedQuestionIndex] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Score tracking - Map participant ID to their total score
  const [scores, setScores] = useState<Record<string, number>>({});
  
  // Points per question - Default to 1 point per question if not specified (NOT using global challenge points)
  const [questionPoints, setQuestionPoints] = useState<Record<string, number>>(
    questions.reduce((acc, q) => ({ ...acc, [q.id]: q.points || 1 }), {})
  );
  
  // Track which participants got each question right
  const [correctParticipants, setCorrectParticipants] = useState<Record<string, string[]>>(
    settings.questionPoints || {}
  );
  
  // Track which participants got partial points for questions
  const [partialScores, setPartialScores] = useState<Record<string, Record<string, number>>>({});
  
  // Active participants based on challenge type
  const [activeParticipants, setActiveParticipants] = useState<string[]>([]);
  
  // Initialize active participants based on challenge type
  useEffect(() => {
    if (challenge.type === ChallengeType.ONE_ON_ONE && selectedParticipantPlayers) {
      // For one-on-one, use the selected participant players
      setActiveParticipants(selectedParticipantPlayers.map(p => p.id));
    } else if (challenge.type === ChallengeType.TEAM) {
      // For team challenges, use all teams
      setActiveParticipants(state.teams.map(team => team.id));
    } else {
      // For individual or all-vs-all challenges, use all players
      setActiveParticipants(state.players.map(player => player.id));
    }
  }, [challenge.type, selectedParticipantPlayers, state.players, state.teams]);
  
  // Initialize question points if they haven't been set
  useEffect(() => {
    // Set default points per question to 1 point (NOT using global challenge points)
    const defaultPoints: Record<string, number> = {};
    
    questions.forEach(question => {
      // Use question-specific points or fallback to 1 point
      const pointValue = question.points || 1;
      defaultPoints[question.id] = pointValue;
      
      // For debugging
      console.log(`Question [${question.id}]: ${question.text.substring(0, 20)}... - ${pointValue} points`);
    });
    
    setQuestionPoints(defaultPoints);
  }, [questions]);
  
  // Initialize partial scores data structure for each question
  useEffect(() => {
    const initialPartialScores: Record<string, Record<string, number>> = {};
    
    questions.forEach(question => {
      initialPartialScores[question.id] = {};
      activeParticipants.forEach(participantId => {
        initialPartialScores[question.id][participantId] = 0;
      });
    });
    
    setPartialScores(initialPartialScores);
  }, [questions, activeParticipants]);
  
  // Get the current question
  const currentQuestion = questions[currentQuestionIndex];
  
  // Get all questions that have been revealed
  const revealedQuestions = questions.filter(q => q.isRevealed);
  
  // Go to the next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Scroll to top when navigating to next question
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Start revealing answers if we're at the last question
      startRevealProcess();
    }
  };
  
  // Go to the previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Scroll to top when navigating to previous question
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Start the reveal process
  const startRevealProcess = () => {
    setIsRevealing(true);
    setRevealedQuestionIndex(0);
  };
  
  // Mark a participant as having answered correctly
  const markCorrect = (questionId: string, participantId: string) => {
    setCorrectParticipants(prev => {
      const updatedIds = [...(prev[questionId] || [])];
      if (!updatedIds.includes(participantId)) {
        updatedIds.push(participantId);
      }
      return { ...prev, [questionId]: updatedIds };
    });
    
    // Add full points to their score
    const pointsToAdd = questionPoints[questionId] || 1;
    setScores(prev => ({
      ...prev,
      [participantId]: (prev[participantId] || 0) + pointsToAdd
    }));
    
    // Update game state immediately with the question-specific points
    const participant = getParticipantById(participantId, state.players, state.teams);
    if (participant) {
      if ('teamColor' in participant) {
        // It's a team
        dispatch({
          type: 'UPDATE_TEAM_SCORE',
          payload: {
            teamId: participantId,
            points: pointsToAdd
          }
        });
      } else {
        // It's a player
        dispatch({
          type: 'UPDATE_PLAYER_SCORE',
          payload: {
            playerId: participantId,
            points: pointsToAdd
          }
        });
      }
      console.log(`Awarded ${pointsToAdd} points to ${participant.name} for question ${questionId}`);
    }
    
    // Remove any partial score for this participant
    setPartialScores(prev => {
      const questionScores = { ...(prev[questionId] || {}) };
      delete questionScores[participantId];
      return { ...prev, [questionId]: questionScores };
    });
  };
  
  // Mark a participant as incorrect (remove them from correct list)
  const markIncorrect = (questionId: string, participantId: string) => {
    // Check if they were previously marked correct to subtract points
    const wasCorrect = (correctParticipants[questionId] || []).includes(participantId);
    
    setCorrectParticipants(prev => {
      const updatedIds = (prev[questionId] || []).filter(id => id !== participantId);
      return { ...prev, [questionId]: updatedIds };
    });
    
    // Subtract full points from their score if they were previously marked correct
    if (wasCorrect) {
      const pointsToSubtract = questionPoints[questionId] || 1;
      setScores(prev => ({
        ...prev,
        [participantId]: Math.max(0, (prev[participantId] || 0) - pointsToSubtract)
      }));
      
      // Update game state by subtracting points
      const participant = getParticipantById(participantId, state.players, state.teams);
      if (participant) {
        if ('teamColor' in participant) {
          // It's a team
          dispatch({
            type: 'UPDATE_TEAM_SCORE',
            payload: {
              teamId: participantId,
              points: -pointsToSubtract // Use negative value to subtract
            }
          });
        } else {
          // It's a player
          dispatch({
            type: 'UPDATE_PLAYER_SCORE',
            payload: {
              playerId: participantId,
              points: -pointsToSubtract // Use negative value to subtract
            }
          });
        }
        console.log(`Subtracted ${pointsToSubtract} points from ${participant.name} for question ${questionId}`);
      }
    }
    
    // Remove any partial score
    setPartialScores(prev => {
      const questionScores = { ...(prev[questionId] || {}) };
      delete questionScores[participantId];
      return { ...prev, [questionId]: questionScores };
    });
  };
  
  // Set partial score for a participant
  const setPartialScore = (questionId: string, participantId: string, points: number) => {
    // Ensure this participant is not in the fully correct list
    if ((correctParticipants[questionId] || []).includes(participantId)) {
      markIncorrect(questionId, participantId);
    }
    
    // Calculate the previous partial points if any
    const previousPartialPoints = partialScores[questionId]?.[participantId] || 0;
    
    // Update partial scores
    setPartialScores(prev => {
      const updatedScores = { ...prev };
      if (!updatedScores[questionId]) {
        updatedScores[questionId] = {};
      }
      updatedScores[questionId][participantId] = points;
      return updatedScores;
    });
    
    // Update the score difference
    if (previousPartialPoints !== points) {
      const pointsDifference = points - previousPartialPoints;
      
      // Update local scores state
      if (previousPartialPoints > 0) {
        setScores(prev => ({
          ...prev,
          [participantId]: Math.max(0, (prev[participantId] || 0) - previousPartialPoints + points)
        }));
      } else if (points > 0) {
        setScores(prev => ({
          ...prev,
          [participantId]: (prev[participantId] || 0) + points
        }));
      }
      
      // Only update game state if there's an actual change in points
      if (pointsDifference !== 0) {
        // Update game state with the partial points difference
        const participant = getParticipantById(participantId, state.players, state.teams);
        if (participant) {
          if ('teamColor' in participant) {
            // It's a team
            dispatch({
              type: 'UPDATE_TEAM_SCORE',
              payload: {
                teamId: participantId,
                points: pointsDifference
              }
            });
          } else {
            // It's a player
            dispatch({
              type: 'UPDATE_PLAYER_SCORE',
              payload: {
                playerId: participantId,
                points: pointsDifference
              }
            });
          }
          console.log(`${pointsDifference > 0 ? 'Added' : 'Subtracted'} ${Math.abs(pointsDifference)} points ${pointsDifference > 0 ? 'to' : 'from'} ${participant.name} for question ${questionId}`);
        }
      }
    }
  };
  
  // Move to a specific question during the reveal phase
  const goToRevealQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setRevealedQuestionIndex(index);
    }
  };
  
  // Reveal the next question's answers
  const handleRevealNextQuestion = () => {
    if (revealedQuestionIndex === null) return;
    
    // Mark the current question as revealed
    setQuestions(prevQuestions => 
      prevQuestions.map((q, idx) => 
        idx === revealedQuestionIndex ? { ...q, isRevealed: true } : q
      )
    );
    
    // Update game state with current scores immediately before moving to next question
    // This ensures ScoreBoard is updated with each question's points
    if (Object.keys(scores).length > 0) {
      // For each participant with points, update their score in the game state
      Object.entries(scores).forEach(([participantId, score]) => {
        // Find the participant in players or teams
        const participant = getParticipantById(participantId, state.players, state.teams);
        if (participant) {
          if ('teamColor' in participant) {
            // It's a team - update team score
            const currentTeamScore = state.teams.find(t => t.id === participantId)?.score || 0;
            // Only update if the score has changed
            if (score !== currentTeamScore) {
              dispatch({
                type: 'UPDATE_TEAM_SCORE',
                payload: {
                  teamId: participantId,
                  // Set the absolute score rather than incrementing
                  points: score - currentTeamScore
                }
              });
            }
          } else {
            // It's a player - update player score
            const currentPlayerScore = state.players.find(p => p.id === participantId)?.score || 0;
            // Only update if the score has changed
            if (score !== currentPlayerScore) {
              dispatch({
                type: 'UPDATE_PLAYER_SCORE',
                payload: {
                  playerId: participantId,
                  // Set the absolute score rather than incrementing
                  points: score - currentPlayerScore
                }
              });
            }
          }
        }
      });
    }
    
    // Move to the next question or finish
    if (revealedQuestionIndex < questions.length - 1) {
      // Small delay before moving to the next question
      setTimeout(() => {
        setRevealedQuestionIndex(revealedQuestionIndex + 1);
        // Scroll to top when navigating to next question
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 300); // Reduced from 500ms to make it feel snappier
    } else {
      // We've revealed all questions
      finishQuiz();
    }
  };

  // Handle going to the previous question in reveal mode
  const handleRevealPreviousQuestion = () => {
    if (revealedQuestionIndex !== null && revealedQuestionIndex > 0) {
      setRevealedQuestionIndex(revealedQuestionIndex - 1);
      // Scroll to top when navigating to previous question
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Finish the quiz and complete the challenge
  const finishQuiz = () => {
    setIsCompleted(true);
    
    console.log('Finishing quiz and calculating final scores...');
    console.log('Question points configuration:', questionPoints);
    console.log('Correct participants by question:', correctParticipants);
    console.log('Partial scores by question:', partialScores);
    
    // Calculate final scores for display only - points have already been added to the game state
    // Start fresh to avoid any potential double-counting
    const finalScores: Record<string, number> = {};
    
    // First, process all correct answers with their question-specific points
    Object.entries(correctParticipants).forEach(([questionId, participantIds]) => {
      const pointValue = questionPoints[questionId] || 1;
      console.log(`Question ${questionId} is worth ${pointValue} points`);
      
      participantIds.forEach(participantId => {
        finalScores[participantId] = (finalScores[participantId] || 0) + pointValue;
        console.log(`Participant ${participantId} gets ${pointValue} points for question ${questionId}`);
      });
    });
    
    // Then add any partial points
    Object.entries(partialScores).forEach(([questionId, participantScores]) => {
      Object.entries(participantScores).forEach(([participantId, points]) => {
        // Only add partial points if this participant didn't get full points for this question
        if (points > 0 && !correctParticipants[questionId]?.includes(participantId)) {
          finalScores[participantId] = (finalScores[participantId] || 0) + points;
          console.log(`Participant ${participantId} gets ${points} partial points for question ${questionId}`);
        }
      });
    });
    
    // Update the scores state for UI display
    setScores(finalScores);
    console.log('Final scores:', finalScores);
    
    // Final sync of scores with game state
    // This ensures the ScoreBoard reflects all points accumulated throughout the quiz
    if (Object.keys(finalScores).length > 0) {
      // For each participant with points, ensure their score in the game state matches
      Object.entries(finalScores).forEach(([participantId, finalScore]) => {
        // Find the participant in players or teams
        const participant = getParticipantById(participantId, state.players, state.teams);
        if (participant) {
          if ('teamColor' in participant) {
            // It's a team - sync team score
            const currentTeamScore = state.teams.find(t => t.id === participantId)?.score || 0;
            // Only update if the score is different
            if (finalScore !== currentTeamScore) {
              dispatch({
                type: 'UPDATE_TEAM_SCORE',
                payload: {
                  teamId: participantId,
                  // Set the absolute score rather than incrementing
                  points: finalScore - currentTeamScore
                }
              });
            }
          } else {
            // It's a player - sync player score
            const currentPlayerScore = state.players.find(p => p.id === participantId)?.score || 0;
            // Only update if the score is different
            if (finalScore !== currentPlayerScore) {
              dispatch({
                type: 'UPDATE_PLAYER_SCORE',
                payload: {
                  playerId: participantId,
                  // Set the absolute score rather than incrementing
                  points: finalScore - currentPlayerScore
                }
              });
            }
          }
          console.log(`Final sync for ${participant.name}: ${finalScore} points`);
        }
      });
    }
    
    // Find the winner(s) with the highest score
    let maxScore = 0;
    let winners: string[] = [];
    
    Object.entries(finalScores).forEach(([participantId, score]) => {
      if (score > maxScore) {
        maxScore = score;
        winners = [participantId];
      } else if (score === maxScore) {
        winners.push(participantId);
      }
    });
    
    // If there's a tie, we don't select a single winner
    const winnerId = winners.length === 1 ? winners[0] : undefined;
    console.log('Winner(s):', winners, 'with score:', maxScore);
    
    // Save the quiz state for persistence
    const updatedQuizSettings: QuizSettings = {
      ...settings,
      questions,
      questionPoints: correctParticipants,
      currentQuestionIndex: questions.length - 1, // Mark as completed
      finalScores: finalScores // Save the final scores in the settings for persistence
    };
    
    // Use a much shorter timeout to make the quiz feel responsive
    setTimeout(() => {
      // Pass the winner ID and scores to the parent component
      // Make sure all participants with points are recorded, not just the winner
      // This ensures proper integration with useGameState and ScoreBoard display
      console.log('Completing quiz with winner:', winnerId, 'and scores:', finalScores);
      onComplete(true, winnerId, finalScores);
    }, 300);
  };
  
  // Get participant display information
  const getParticipantDisplay = (participantId: string) => {
    let participant;
    
    if (challenge.type === ChallengeType.TEAM) {
      participant = state.teams.find(t => t.id === participantId);
    } else {
      participant = state.players.find(p => p.id === participantId);
    }
    
    return {
      name: participant?.name || t('common.unknown')
    };
  };
  
  // Render the appropriate participant card
  const renderParticipantCard = (participantId: string) => {
    const participant = getParticipantById(participantId, state.players, state.teams);
    
    if (!participant) return null;
    
    if ('teamColor' in participant) {
      // It's a team
      const team = state.teams.find(t => t.id === participantId);
      if (!team) return null;
      
      return (
        <TeamCard 
          team={team}
          players={state.players}
          size="sm" 
          className="mb-2"
        />
      );
    } else {
      // It's a player
      const player = state.players.find(p => p.id === participantId);
      if (!player) return null;
      
      return (
        <PlayerCard 
          player={player} 
          size="sm" 
          className="mb-2"
        />
      );
    }
  };
  
  // Render the current scores section with participant cards
  const renderCurrentScores = (scoresData: Record<string, number>, hasAnyPoints: boolean) => {
    if (!hasAnyPoints) return null;
    
    return (
      <div className="mb-8">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3">
          {t('prebuilt.quiz.currentScores')}
        </h4>
        
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            {Object.entries(scoresData)
              .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
              .map(([participantId, score], idx) => {
                return (
                  <div key={participantId} className="flex justify-between items-center p-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 flex items-center justify-center mr-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm font-medium">
                        {idx + 1}
                      </div>
                      {/* Display the participant card with proper styling */}
                      <div className="flex-shrink-0">
                        {renderParticipantCard(participantId)}
                      </div>
                      <span className="ml-2 font-medium dark:text-white">
                        {getParticipantDisplay(participantId).name}
                      </span>
                    </div>
                    <span className="font-bold text-lg dark:text-white">{score}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };
  
  // Render the quiz interface
  if (!currentQuestion) {
    return (
      <div className="p-4 text-center">
        <QuestionMarkCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {t('prebuilt.quiz.noQuestions')}
        </p>
      </div>
    );
  }
  
  // Render the reveal mode - this is the question review phase
  if (isRevealing && revealedQuestionIndex !== null) {
    const revealQuestion = questions[revealedQuestionIndex];
    const correctOption = revealQuestion.options?.find(opt => opt.isCorrect);
    const questionCorrectParticipants = correctParticipants[revealQuestion.id] || [];
    const questionPartialScores = partialScores[revealQuestion.id] || {};
    const maxPointsForQuestion = questionPoints[revealQuestion.id] || 1;
    
    // Check if any points have been assigned for this quiz
    const hasAnyPoints = Object.values(scores).some(score => score > 0) || 
                           Object.values(partialScores).some(questionScores => 
                             Object.values(questionScores).some(points => points > 0)
                           );
    
    // Check if this is a multiple choice question (with options) or a direct question
    const isMultipleChoice = revealQuestion.options && revealQuestion.options.length > 1;
    
    return (
      <div className="max-w-3xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-300">
            {t('prebuilt.quiz.revealingQuestion', { 
              current: revealedQuestionIndex + 1, 
              total: questions.length 
            })}
          </div>
          <div className="flex space-x-1">
            {questions.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 w-6 rounded-full ${
                  idx < revealedQuestionIndex
                    ? 'bg-green-500 dark:bg-green-400'
                    : idx === revealedQuestionIndex
                    ? 'bg-blue-500 dark:bg-blue-400'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Question */}
        <div className="mb-6">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {revealQuestion.text}
          </h3>
          
          {/* Point value */}
          <div className="mb-3 text-sm font-medium text-blue-600 dark:text-blue-300">
            {t('prebuilt.quiz.questionPoints')}: {maxPointsForQuestion}
          </div>
          
          {/* Question images if any */}
          {revealQuestion.images && revealQuestion.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 mb-4">
              {revealQuestion.images.map((image, idx) => (
                <div key={idx} className="rounded-lg overflow-hidden">
                  <img 
                    src={image.url} 
                    alt={image.alt || `Question image ${idx + 1}`} 
                    className="w-full h-32 object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Answer reveal */}
        <div className="mb-8">
          <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center">
            <LightBulbIcon className="w-5 h-5 text-yellow-500 mr-2" />
            {t('prebuilt.quiz.correctAnswer')}
          </h4>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
          >
            {isMultipleChoice && correctOption && (
              <>
                <div className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-green-700 dark:text-green-300 font-medium">
                      {correctOption.text}
                    </p>
                    
                    {/* Answer images if any */}
                    {correctOption.images && correctOption.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        {correctOption.images.map((image, idx) => (
                          <div key={idx} className="rounded-lg overflow-hidden">
                            <img 
                              src={image.url} 
                              alt={image.alt || `Answer image ${idx + 1}`} 
                              className="w-full h-24 object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {!isMultipleChoice && (
              <div className="flex items-start">
                <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-green-700 dark:text-green-300 font-medium">
                  {t('prebuilt.quiz.freeformAnswer')}
                </p>
              </div>
            )}
          </motion.div>
        </div>
        
        {/* Score Assignment Section */}
        <div className="mb-8">
          <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center">
            <TrophyIcon className="w-5 h-5 text-yellow-500 mr-2" />
            {t('prebuilt.quiz.assignPoints')}
          </h4>
          
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="space-y-4">
              {activeParticipants.map(participantId => {
                const isCorrect = questionCorrectParticipants.includes(participantId);
                const partialScore = questionPartialScores[participantId] || 0;
                const hasPartialScore = partialScore > 0;
                
                return (
                  <div key={participantId} className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <div className="flex items-center">
                      {renderParticipantCard(participantId)}
                      <span className="ml-2 font-medium dark:text-white">
                        {getParticipantDisplay(participantId).name}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Partial Points Controls */}
                      <div className={`flex items-center ${isCorrect ? 'opacity-50' : ''}`}>
                        <button
                          className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-l-md transition-colors ${
                            isCorrect || partialScore <= 0
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                          }`}
                          onClick={() => !isCorrect && partialScore > 0 && setPartialScore(
                            revealQuestion.id,
                            participantId,
                            Math.max(0, partialScore - 1)
                          )}
                          disabled={isCorrect || partialScore <= 0}
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <div className="px-3 py-1 min-w-[40px] text-center bg-white dark:bg-gray-900 border-y border-x border-gray-200 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300">
                          {partialScore}
                        </div>
                        <button
                          className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-r-md transition-colors ${
                            isCorrect || partialScore >= maxPointsForQuestion - 1
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                          }`}
                          onClick={() => !isCorrect && partialScore < maxPointsForQuestion - 1 && setPartialScore(
                            revealQuestion.id,
                            participantId,
                            Math.min(maxPointsForQuestion - 1, partialScore + 1)
                          )}
                          disabled={isCorrect || partialScore >= maxPointsForQuestion - 1}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Full Points Control */}
                      <Button
                        size="xs"
                        variant={isCorrect ? "success" : "secondary"}
                        className={isCorrect ? "" : "dark:text-white dark:hover:bg-gray-700"}
                        onClick={() => isCorrect 
                          ? markIncorrect(revealQuestion.id, participantId)
                          : markCorrect(revealQuestion.id, participantId)
                        }
                      >
                        {isCorrect ? (
                          <>
                            <CheckIcon className="h-4 w-4 mr-1" />
                            {maxPointsForQuestion} {t('prebuilt.quiz.points')}
                          </>
                        ) : (
                          t('prebuilt.quiz.fullPoints')
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Current Scores - using the new renderCurrentScores method */}
        {renderCurrentScores(scores, hasAnyPoints)}
        
        {/* Navigation buttons with previous and next - hide previous on first question */}
        <div className="flex justify-between mt-6">
          <div>
            {revealedQuestionIndex > 0 && (
              <Button
                variant="secondary"
                onClick={handleRevealPreviousQuestion}
                leftIcon={<ChevronLeftIcon className="w-5 h-5" />}
                className="dark:text-white dark:hover:bg-gray-700"
              >
                {t('prebuilt.quiz.previousQuestion')}
              </Button>
            )}
          </div>
          
          <Button
            variant="primary"
            onClick={handleRevealNextQuestion}
            rightIcon={revealedQuestionIndex < questions.length - 1 ? <ChevronRightIcon className="w-5 h-5" /> : undefined}
          >
            {revealedQuestionIndex < questions.length - 1
              ? t('prebuilt.quiz.nextReveal')
              : t('prebuilt.quiz.finishQuiz')
            }
          </Button>
        </div>
      </div>
    );
  }
  
  // Render the completed state
  if (isCompleted) {
    return (
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <TrophyIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('prebuilt.quiz.quizCompleted')}
            </h2>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
              {t('prebuilt.quiz.finalScores')}
            </h3>
            
            {Object.entries(scores)
              .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
              .map(([participantId, score], idx) => (
                <motion.div
                  key={participantId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  className={`flex items-center justify-between p-3 mb-2 rounded-lg ${
                    idx === 0 
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700' 
                      : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center font-bold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 mr-3">
                      {idx + 1}
                    </div>
                    <div>
                      {renderParticipantCard(participantId)}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {score}
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>
      </div>
    );
  }
  
  // Render the question browsing phase
  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-300">
          {t('prebuilt.quiz.questionProgress', { 
            current: currentQuestionIndex + 1, 
            total: questions.length 
          })}
        </div>
        <div className="flex space-x-1">
          {questions.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 w-6 rounded-full ${
                idx < currentQuestionIndex
                  ? 'bg-blue-500 dark:bg-blue-400'
                  : idx === currentQuestionIndex
                  ? 'bg-blue-500 dark:bg-blue-400 animate-pulse'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Current Question */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
        {/* Question header */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">
            {t('prebuilt.quiz.questionNumber', { number: currentQuestionIndex + 1 })}
          </h3>
          
          <div className="text-sm font-medium text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
            {questionPoints[currentQuestion.id] || 1} {t('common.points')}
          </div>
        </div>
        
        {/* Question text */}
        <p className="text-lg text-gray-800 dark:text-white mb-4">
          {currentQuestion.text}
        </p>
        
        {/* Question images if any */}
        {currentQuestion.images && currentQuestion.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            {currentQuestion.images.map((image, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden shadow-md">
                <img 
                  src={image.url} 
                  alt={image.alt || `Question image ${idx + 1}`} 
                  className="w-full h-48 object-contain"
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Display question options ONLY if they exist AND there's more than one option */}
        {currentQuestion.options && currentQuestion.options.filter(option => option.text).length > 1 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-200 mb-2">
              {t('prebuilt.quiz.options')}:
            </h4>
            {currentQuestion.options.map((option, idx) => (
              <div 
                key={option.id || idx} 
                className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <p className="text-gray-800 dark:text-gray-100">
                  {option.text}
                </p>
                
                {/* Option images if any */}
                {option.images && option.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {option.images.map((image, imgIdx) => (
                      <div key={imgIdx} className="rounded-lg overflow-hidden">
                        <img 
                          src={image.url} 
                          alt={image.alt || `Option image ${imgIdx + 1}`} 
                          className="w-full h-24 object-contain"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Navigation buttons - hide previous on first question */}
      <div className="flex justify-between mt-6">
        <div>
          {currentQuestionIndex > 0 && (
            <Button
              variant="secondary"
              onClick={handlePreviousQuestion}
              leftIcon={<ChevronLeftIcon className="w-5 h-5" />}
            >
              {t('prebuilt.quiz.previousQuestion')}
            </Button>
          )}
        </div>
        
        <Button
          variant="primary"
          onClick={handleNextQuestion}
          rightIcon={<ChevronRightIcon className="w-5 h-5" />}
        >
          {currentQuestionIndex < questions.length - 1
            ? t('prebuilt.quiz.nextQuestion')
            : t('prebuilt.quiz.finishAndReveal')
          }
        </Button>
      </div>
    </div>
  );
};

export default QuizPlayer; 