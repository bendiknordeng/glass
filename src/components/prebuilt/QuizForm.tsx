import React, { useState, useEffect, ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Challenge,
  ChallengeType,
  PrebuiltChallengeType,
  QuizSettings,
  QuizQuestion,
  QuizOption,
  MediaItem,
  Punishment,
} from "@/types/Challenge";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Switch from "@/components/common/Switch";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import { challengesService } from "@/services/supabase";
import { DBChallenge } from "@/types/supabase";
import { useValidatedAuth } from "@/utils/auth-helpers";
import {
  PlusIcon,
  MinusIcon,
  CheckIcon,
  XMarkIcon,
  QuestionMarkCircleIcon,
  PhotoIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";

interface QuizFormProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeCreated: (challenge: Challenge) => void;
  editChallenge?: Challenge; // Optional challenge for editing mode
}

// Basic question template
const createEmptyQuestion = (defaultPoints: number = 1): QuizQuestion => ({
  id: uuidv4(),
  text: "",
  options: [
    { id: uuidv4(), text: "", isCorrect: true, images: [] },
    { id: uuidv4(), text: "", isCorrect: false, images: [] },
  ],
  images: [],
  isRevealed: false,
  showOptions: true, // Default to showing options
  points: defaultPoints, // Points for this question
});

const QuizForm: React.FC<QuizFormProps> = ({
  isOpen,
  onClose,
  onChallengeCreated,
  editChallenge,
}) => {
  const { t } = useTranslation();
  // Add authentication context
  const { isAuthenticated, user } = useAuth();
  const { getValidUserId } = useValidatedAuth();

  // Form state
  const [title, setTitle] = useState("Custom Quiz");
  const [description, setDescription] = useState("A custom quiz challenge");
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    createEmptyQuestion(),
  ]);
  const [type, setType] = useState<ChallengeType>(ChallengeType.ALL_VS_ALL);
  const [points, setPoints] = useState(1);
  const [teamPoints, setTeamPoints] = useState(10); // New state for team points
  const [canReuse, setCanReuse] = useState(false);
  const [maxReuseCount, setMaxReuseCount] = useState<number | undefined>(undefined);
  const [showMaxReuseCount, setShowMaxReuseCount] = useState(false); // Track if we should show the max reuse count option
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Punishment state
  const [hasPunishment, setHasPunishment] = useState(false);
  const [punishmentType, setPunishmentType] = useState<"sips" | "custom">(
    "sips"
  );
  const [punishmentValue, setPunishmentValue] = useState(1);
  const [customPunishmentDescription, setCustomPunishmentDescription] =
    useState("");

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggingOver, setDraggingOver] = useState<string | null>(null);

  // Toggle max reuse count visibility based on canReuse value
  useEffect(() => {
    setShowMaxReuseCount(canReuse);
    if (!canReuse) {
      setMaxReuseCount(undefined); // Reset max reuse count if canReuse is set to false
    }
  }, [canReuse]);

  // Load values from editChallenge if provided
  useEffect(() => {
    if (editChallenge && editChallenge.prebuiltSettings) {
      const settings = editChallenge.prebuiltSettings as QuizSettings;

      // Load form values from challenge
      setTitle(editChallenge.title);
      setDescription(editChallenge.description);
      setQuestions(settings.questions || [createEmptyQuestion()]);
      setType(editChallenge.type);
      setPoints(editChallenge.points);
      setTeamPoints(editChallenge.points || 10);
      setCanReuse(editChallenge.canReuse || false);
      setMaxReuseCount(editChallenge.maxReuseCount);
      setShowMaxReuseCount(editChallenge.canReuse || false);

      // Set punishment values if available
      if (editChallenge.punishment) {
        setHasPunishment(true);
        setPunishmentType(editChallenge.punishment.type);
        setPunishmentValue(editChallenge.punishment.value);
        if (editChallenge.punishment.customDescription) {
          setCustomPunishmentDescription(
            editChallenge.punishment.customDescription
          );
        }
      }
    }
  }, [editChallenge]);

  // Add a new question
  const handleAddQuestion = () => {
    setQuestions([...questions, createEmptyQuestion(points)]);
  };

  // Remove a question
  const handleRemoveQuestion = (questionId: string) => {
    if (questions.length <= 1) return; // Prevent removing all questions
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  // Update question text
  const handleQuestionTextChange = (questionId: string, text: string) => {
    setQuestions(
      questions.map((q) => (q.id === questionId ? { ...q, text } : q))
    );
  };

  // Add an option to a question
  const handleAddOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: [
              ...q.options,
              { id: uuidv4(), text: "", isCorrect: false, images: [] },
            ],
          };
        }
        return q;
      })
    );
  };

  // Remove an option from a question
  const handleRemoveOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          // Prevent removing all options (must have at least 2)
          if (q.options.length <= 2) return q;

          // Get remaining options after removal
          const updatedOptions = q.options.filter((o) => o.id !== optionId);

          // Make sure at least one option is marked as correct
          if (!updatedOptions.some((o) => o.isCorrect)) {
            updatedOptions[0].isCorrect = true;
          }

          return { ...q, options: updatedOptions };
        }
        return q;
      })
    );
  };

  // Update option text
  const handleOptionTextChange = (
    questionId: string,
    optionId: string,
    text: string
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: q.options.map((o) =>
              o.id === optionId ? { ...o, text } : o
            ),
          };
        }
        return q;
      })
    );
  };

  // Toggle option correctness
  const handleToggleCorrect = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: q.options.map((o) => ({
              ...o,
              isCorrect: o.id === optionId,
            })),
          };
        }
        return q;
      })
    );
  };

  // Handle image upload for questions
  const handleQuestionImageUpload = (
    questionId: string,
    e: ChangeEvent<HTMLInputElement> | React.DragEvent
  ) => {
    let files: FileList | null = null;

    if ("dataTransfer" in e) {
      // This is a drag event
      e.preventDefault();
      files = e.dataTransfer.files;
    } else {
      // This is a change event
      files = e.target.files;
    }

    if (!files || files.length === 0) return;

    setUploadingImage(true);

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const imageUrl = reader.result as string;

      setQuestions(
        questions.map((q) => {
          if (q.id === questionId) {
            return {
              ...q,
              images: [
                ...(q.images || []),
                {
                  type: "image",
                  url: imageUrl,
                  alt: file.name,
                },
              ],
            };
          }
          return q;
        })
      );

      setUploadingImage(false);
    };

    reader.onerror = () => {
      console.error("Error reading file");
      setUploadingImage(false);
    };

    reader.readAsDataURL(file);

    // Clear the input value if it's an input element
    if ("target" in e && e.target instanceof HTMLInputElement) {
      e.target.value = "";
    }
  };

  // Handle removing a question image
  const handleRemoveQuestionImage = (
    questionId: string,
    imageIndex: number
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.images) {
          return {
            ...q,
            images: q.images.filter((_, index) => index !== imageIndex),
          };
        }
        return q;
      })
    );
  };

  // Handle image upload for options
  const handleOptionImageUpload = (
    questionId: string,
    optionId: string,
    e: ChangeEvent<HTMLInputElement> | React.DragEvent
  ) => {
    let files: FileList | null = null;

    if ("dataTransfer" in e) {
      // This is a drag event
      e.preventDefault();
      files = e.dataTransfer.files;
    } else {
      // This is a change event
      files = e.target.files;
    }

    if (!files || files.length === 0) return;

    setUploadingImage(true);

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const imageUrl = reader.result as string;

      setQuestions(
        questions.map((q) => {
          if (q.id === questionId) {
            return {
              ...q,
              options: q.options.map((o) => {
                if (o.id === optionId) {
                  return {
                    ...o,
                    images: [
                      ...(o.images || []),
                      {
                        type: "image",
                        url: imageUrl,
                        alt: file.name,
                      },
                    ],
                  };
                }
                return o;
              }),
            };
          }
          return q;
        })
      );

      setUploadingImage(false);
    };

    reader.onerror = () => {
      console.error("Error reading file");
      setUploadingImage(false);
    };

    reader.readAsDataURL(file);

    // Clear the input value if it's an input element
    if ("target" in e && e.target instanceof HTMLInputElement) {
      e.target.value = "";
    }
  };

  // Handle removing an option image
  const handleRemoveOptionImage = (
    questionId: string,
    optionId: string,
    imageIndex: number
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: q.options.map((o) => {
              if (o.id === optionId && o.images) {
                return {
                  ...o,
                  images: o.images.filter((_, index) => index !== imageIndex),
                };
              }
              return o;
            }),
          };
        }
        return q;
      })
    );
  };

  // Fix the hasPunishment switch handler
  const handleHasPunishmentChange = (value: boolean) => {
    setHasPunishment(value);
  };

  // Validate the form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = t("validation.titleRequired");
    }

    if (!description.trim()) {
      errors.description = t("validation.descriptionRequired");
    }

    // Validate team points when in team mode
    if (type === ChallengeType.TEAM) {
      if (!teamPoints || teamPoints < 1 || teamPoints > 100) {
        errors.teamPoints = t("validation.teamPointsInvalid") || "Team points must be between 1 and 100";
      }
    }

    // Validate questions
    const questionErrors: string[] = [];
    questions.forEach((q, index) => {
      if (!q.text.trim()) {
        questionErrors.push(
          t("prebuilt.quiz.emptyQuestionText", { number: index + 1 })
        );
      }

      // When in multiple choice mode
      if (q.showOptions !== false) {
        // Check if any option is marked as correct
        if (!q.options.some((o) => o.isCorrect)) {
          questionErrors.push(
            t("prebuilt.quiz.noCorrectOption", { number: index + 1 })
          );
        }

        // Check option texts
        q.options.forEach((o, oIndex) => {
          if (!o.text.trim()) {
            questionErrors.push(
              t("prebuilt.quiz.emptyOptionText", {
                questionNumber: index + 1,
                optionNumber: oIndex + 1,
              })
            );
          }
        });
      } else {
        // In direct answer mode, check only if the correct answer has text
        const correctOption = q.options.find(o => o.isCorrect);
        if (!correctOption || !correctOption.text.trim()) {
          questionErrors.push(
            t("prebuilt.quiz.noCorrectOption", { number: index + 1 })
          );
        }
      }
    });

    if (questionErrors.length > 0) {
      errors.questions = questionErrors.join("\n");
    }

    // Validate punishment
    if (hasPunishment) {
      if (punishmentType === "sips" && punishmentValue <= 0) {
        errors.punishment = t("validation.minValue", { min: 1 });
      } else if (
        punishmentType === "custom" &&
        !customPunishmentDescription.trim()
      ) {
        errors.punishment = t("validation.punishmentDescriptionRequired");
      }
    }

    // Validate max reuse count
    if (canReuse && maxReuseCount !== undefined && maxReuseCount < 1) {
      errors.maxReuseCount = t("validation.maxReuseCountInvalid") || "Maximum reuse count must be at least 1";
    }

    setFormErrors(errors);
    
    // Display toast notification with specific errors
    if (Object.keys(errors).length > 0) {
      // Create a formatted error message
      const errorMessages = Object.entries(errors).map(([key, value]) => {
        if (key === 'questions') {
          // For questions, create a list of errors
          const questionErrorLines = value.split('\n');
          return questionErrorLines.map(line => `• ${line}`).join('\n');
        }
        return `• ${value}`;
      }).join('\n');
      
      toast.error(
        <div className="text-sm">
          <div className="font-medium mb-1">{t("validation.formHasErrors")}</div>
          <div className="text-xs whitespace-pre-line">{errorMessages}</div>
        </div>,
        {
          duration: 5000,
          position: "top-center",
          className: "dark:bg-gray-800 dark:text-white dark:border-gray-700 bg-white text-gray-800 border-gray-200",
          style: {
            maxWidth: '400px',
          }
        }
      );
    }
    
    return Object.keys(errors).length === 0;
  };

  // Convert punishment to database format
  const punishmentToDbFormat = (punishment: Punishment | undefined): Record<string, any> | null => {
    if (!punishment) return null;
    return {
      type: punishment.type,
      value: punishment.value,
      ...(punishment.customDescription ? { customDescription: punishment.customDescription } : {})
    };
  };

  // Create the challenge
  const handleCreateChallenge = async () => {
    console.log("Starting handleCreateChallenge...");
    console.log("Authentication state:", { isAuthenticated, userId: user?.id });
    
    if (!validateForm()) {
      console.log("Form validation failed, aborting");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare punishment if enabled
      let punishment: Punishment | undefined;
      if (hasPunishment) {
        punishment = {
          type: punishmentType,
          value: punishmentValue,
          ...(punishmentType === "custom" && {
            customDescription: customPunishmentDescription,
          }),
        };
      }

      // Create the quiz settings
      const quizSettings: QuizSettings = {
        questions,
        currentQuestionIndex: 0,
      };

      let newChallenge: Challenge;

      if (editChallenge) {
        console.log("Updating existing challenge:", editChallenge.id);
        // Update existing challenge
        newChallenge = {
          ...editChallenge,
          title,
          description,
          type,
          canReuse,
          maxReuseCount: canReuse ? maxReuseCount : undefined,
          points: type === ChallengeType.TEAM ? teamPoints : points,
          isPrebuilt: true,
          prebuiltType: PrebuiltChallengeType.QUIZ,
          prebuiltSettings: quizSettings,
          punishment,
        };

        // Update in Supabase if authenticated
        if (isAuthenticated && user) {
          // Get a valid UUID format user ID
          const validUserId = getValidUserId();
          if (!validUserId) {
            console.error("Could not get valid user ID");
            throw new Error('Could not get a valid user ID');
          }
          
          console.log("Sending update to Supabase with validUserId:", validUserId);
          try {
            const updateData = {
              title,
              description,
              type: type.toString(),
              points: type === ChallengeType.TEAM ? teamPoints : points,
              can_reuse: canReuse,
              max_reuse_count: canReuse ? (maxReuseCount ?? null) : null,
              punishment: punishmentToDbFormat(punishment),
              is_prebuilt: true,
              prebuilt_type: PrebuiltChallengeType.QUIZ.toString(),
              prebuilt_settings: quizSettings
            };
            console.log("Challenge update data:", updateData);
            
            const updated = await challengesService.updateChallenge(newChallenge.id, updateData);
            
            if (updated) {
              // Keep using the same database ID
              console.log('Quiz challenge updated in database:', updated);
              toast.success(t("challenges.challengeUpdated"), {
                duration: 3000,
                position: "top-center",
              });
            } else {
              console.warn('Quiz challenge update failed in database');
              toast.error(t("challenges.updateFailed"), {
                duration: 3000,
                position: "top-center",
              });
            }
          } catch (dbError) {
            console.error("Error updating quiz challenge in Supabase:", dbError);
            // Continue with local update regardless of DB error
            toast.error(t("error.savingChallenge"), {
              duration: 3000,
              position: "top-center",
            });
          }
        } else {
          console.log("Not updating in Supabase - not authenticated");
        }
      } else {
        console.log("Creating new challenge");
        // Create a new challenge
        const challengeId = uuidv4();
        
        newChallenge = {
          id: challengeId,
          title,
          description,
          type,
          canReuse,
          maxReuseCount: canReuse ? maxReuseCount : undefined,
          points: type === ChallengeType.TEAM ? teamPoints : points,
          isPrebuilt: true,
          prebuiltType: PrebuiltChallengeType.QUIZ,
          prebuiltSettings: quizSettings,
          punishment,
        };
        
        // Save to Supabase if authenticated
        if (isAuthenticated && user) {
          // Get a valid UUID format user ID
          const validUserId = getValidUserId();
          if (!validUserId) {
            console.error("Could not get valid user ID");
            throw new Error('Could not get a valid user ID');
          }
          
          const dbChallengeData: Omit<DBChallenge, 'id' | 'created_at' | 'updated_at' | 'times_played'> = {
            user_id: validUserId,
            title,
            description,
            type: type.toString(),
            points: type === ChallengeType.TEAM ? teamPoints : points,
            can_reuse: canReuse,
            max_reuse_count: canReuse ? (maxReuseCount ?? null) : null,
            punishment: punishmentToDbFormat(punishment),
            is_prebuilt: true,
            is_favorite: false,
            category: 'Quiz',
            prebuilt_type: PrebuiltChallengeType.QUIZ.toString(),
            prebuilt_settings: quizSettings
          };
          
          console.log("Sending to Supabase:", dbChallengeData);
          try {
            const dbChallenge = await challengesService.addChallenge(dbChallengeData);
            
            if (dbChallenge) {
              // Use the Supabase-generated ID
              newChallenge.id = dbChallenge.id;
              console.log('Quiz challenge saved to database with ID:', dbChallenge);
              toast.success(t("challenges.challengeCreated"), {
                duration: 3000,
                position: "top-center",
              });
            } else {
              console.warn("Failed to save quiz challenge to Supabase, using local ID");
              toast.error(t("challenges.saveFailed"), {
                duration: 3000,
                position: "top-center",
              });
            }
          } catch (dbError) {
            console.error("Error saving quiz challenge to Supabase:", dbError);
            // Continue with local ID if DB operation fails
            toast.error(t("error.savingChallenge"), {
              duration: 3000,
              position: "top-center",
            });
          }
        } else {
          console.log("Not saving to Supabase - not authenticated", { isAuthenticated, user });
        }
      }

      console.log("Challenge creation complete. Calling onChallengeCreated with:", newChallenge);
      onChallengeCreated(newChallenge);
      onClose();
    } catch (error) {
      console.error("Error creating quiz challenge:", error);
      setFormErrors({
        submit: typeof error === "string" ? error : t("common.errorOccurred"),
      });
      toast.error(typeof error === "string" ? error : t("common.errorOccurred"), {
        duration: 3000,
        position: "top-center",
      });
    } finally {
      setIsSubmitting(false);
      console.log("handleCreateChallenge finished");
    }
  };

  // Drag-and-drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent, id: string, optionId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Set a combined ID for options, or just the question ID
    setDraggingOver(optionId ? `${id}-${optionId}` : id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only reset if we're leaving to an element outside our drop zone
    // This helps prevent flickering when moving over child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDraggingOver(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    questionId: string,
    optionId?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(null);

    if (optionId) {
      handleOptionImageUpload(questionId, optionId, e);
    } else {
      handleQuestionImageUpload(questionId, e);
    }
  };

  // Fix for the input onChange events
  const handleFileInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    questionId: string,
    optionId?: string
  ) => {
    if (optionId) {
      handleOptionImageUpload(questionId, optionId, e);
    } else {
      handleQuestionImageUpload(questionId, e);
    }
  };

  // Basic rendering of the form
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editChallenge
          ? t("prebuilt.quiz.editTitle")
          : t("prebuilt.quiz.createTitle")
      }
      size="xl"
    >
      <div className="space-y-6 p-4">
        {/* Form error message */}
        {formErrors.submit && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-md mb-4">
            {formErrors.submit}
          </div>
        )}

        {/* Title and Description */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("common.title")}
            </label>
            <input
              type="text"
              placeholder={t("prebuilt.quiz.titlePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            {formErrors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {formErrors.title}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("common.description")}
            </label>
            <textarea
              placeholder={t("prebuilt.quiz.descriptionPlaceholder")}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {formErrors.description}
              </p>
            )}
          </div>
        </div>

        {/* Challenge Settings */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            {t("game.settings")}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("common.type")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType(ChallengeType.ALL_VS_ALL)}
                  className={`py-2 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                    type === ChallengeType.ALL_VS_ALL
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                      : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  {t("game.type.allVsAll")}
                </button>
                <button
                  type="button"
                  onClick={() => setType(ChallengeType.ONE_ON_ONE)}
                  className={`py-2 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                    type === ChallengeType.ONE_ON_ONE
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                      : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  {t("game.type.oneOnOne")}
                </button>
                <button
                  type="button"
                  onClick={() => setType(ChallengeType.TEAM)}
                  className={`py-2 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                    type === ChallengeType.TEAM
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                      : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  {t("game.type.team")}
                </button>
                <button
                  type="button"
                  onClick={() => setType(ChallengeType.INDIVIDUAL)}
                  className={`py-2 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                    type === ChallengeType.INDIVIDUAL
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                      : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  {t("game.type.individual")}
                </button>
              </div>
            </div>

            {/* Team Points - Only shown for team mode */}
            <AnimatePresence>
              {type === ChallengeType.TEAM && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("challenges.teamPoints") || "Team Points"} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(1-100)</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t("challenges.teamPointsHelp") || "Total points for the team that wins this challenge"}
                      </p>
                    </label>
                    
                    {/* Preset buttons for quick selection */}
                    <div className="grid grid-cols-5 gap-2 mb-2">
                      {[5, 10, 15, 20, 25].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTeamPoints(value)}
                          className={`py-2 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                            teamPoints === value
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                              : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom input for any value */}
                    <div className="mt-3">
                      <label htmlFor="custom-team-points" className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                        {t("challenges.customTeamPoints") || "Custom Points Value"}
                      </label>
                      <div className="flex items-center">
                        <input
                          id="custom-team-points"
                          type="number"
                          min="1"
                          max="100"
                          value={teamPoints}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (!isNaN(value) && value > 0) {
                              setTeamPoints(value);
                            }
                          }}
                          className="w-24 px-3 py-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                        <div className="ml-3 flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setTeamPoints(Math.max(1, teamPoints - 1))}
                            className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeamPoints(Math.min(100, teamPoints + 1))}
                            className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {formErrors.teamPoints && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {formErrors.teamPoints}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Can Reuse Switch */}
            <div className="flex items-center space-x-2">
              <Switch
                checked={canReuse}
                onChange={() => setCanReuse(!canReuse)}
                ariaLabel={t("challenges.canReuse")}
                activeIcon={<CheckIcon className="h-4 w-4 text-green-500" />}
                inactiveIcon={<XMarkIcon className="h-4 w-4 text-red-500" />}
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                {t("challenges.canReuse")}
              </label>
            </div>

            {/* Max Reuse Count - Only shown if canReuse is true */}
            <AnimatePresence>
              {showMaxReuseCount && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("challenges.maxReuseCount") || "Max times to use"} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(1-10)</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t("challenges.maxReuseCountHelp") || "Leave empty for unlimited reuse"}
                      </p>
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[2, 3, 5, 7, 10].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setMaxReuseCount(count)}
                          className={`py-2 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                            maxReuseCount === count
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                              : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setMaxReuseCount(undefined)}
                        className={`py-2 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-colors w-full ${
                          maxReuseCount === undefined
                            ? "bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300 border border-green-300 dark:border-green-700"
                            : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                        }`}
                      >
                        {t("challenges.unlimited") || "Unlimited"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {t("prebuilt.quiz.questions")}
            </h3>
          </div>

          {formErrors.questions && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-md text-sm whitespace-pre-line">
              {formErrors.questions}
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-8">
            {questions.map((question, qIndex) => (
              <div
                key={question.id}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {t("prebuilt.quiz.questionNumber", { number: qIndex + 1 })}
                  </h4>

                  <div className="flex items-center space-x-4">
                    <label className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                      {question.showOptions !== false ? (
                        <>
                          {t("prebuilt.quiz.showOptions")}
                        </>
                      ) : (
                        <>
                          {t("prebuilt.quiz.hideOptions")}
                        </>
                      )}
                    </label>
                    <div className="flex items-center mr-4">
                      <Switch
                        checked={question.showOptions !== false}
                        onChange={() => {
                          setQuestions(
                            questions.map((q) =>
                              q.id === question.id
                                ? { ...q, showOptions: !q.showOptions }
                                : q
                            )
                          );
                        }}
                        activeIcon={
                          <EyeIcon className="h-4 w-4 text-green-500" />
                        }
                        inactiveIcon={
                          <EyeSlashIcon className="h-4 w-4 text-red-500" />
                        }
                      />
                    </div>
                    
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveQuestion(question.id)}
                      disabled={questions.length <= 1}
                      title={t("common.remove")}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Question Text */}
                  <div>
                    <input
                      type="text"
                      placeholder={t("prebuilt.quiz.questionPlaceholder")}
                      value={question.text}
                      onChange={(e) =>
                        handleQuestionTextChange(question.id, e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {/* Points per question control with +/- buttons */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300">
                      {t("prebuilt.quiz.questionPoints")}:
                    </label>
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md">
                      <button 
                        type="button"
                        onClick={() => {
                          setQuestions(
                            questions.map((q) =>
                              q.id === question.id
                                ? { 
                                    ...q, 
                                    points: Math.max(1, (q.points || 1) - 1) 
                                  }
                                : q
                            )
                          );
                        }}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-l-md border-r border-gray-300 dark:border-gray-600"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm">
                        {question.points || 1}
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          setQuestions(
                            questions.map((q) =>
                              q.id === question.id
                                ? { 
                                    ...q, 
                                    points: (q.points || 1) + 1 
                                  }
                                : q
                            )
                          );
                        }}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-r-md border-l border-gray-300 dark:border-gray-600"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Images */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400">
                        {t("prebuilt.quiz.questionImages")}
                      </label>
                      <label
                        htmlFor={`question-image-${question.id}`}
                        className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded-md cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors flex items-center space-x-1"
                      >
                        <PhotoIcon className="h-3 w-3" />
                        <span>{t("prebuilt.quiz.addImage")}</span>
                      </label>
                      <input
                        id={`question-image-${question.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileInputChange(e, question.id)}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </div>

                    {/* Integrated drag-drop area with image previews */}
                    <div
                      className={`border border-dashed rounded-md p-3 min-h-[120px] transition-colors cursor-pointer
                        ${
                          draggingOver === question.id
                            ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30"
                            : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        }`}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, question.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, question.id)}
                      onClick={() => {
                        const input = document.getElementById(`question-image-${question.id}`);
                        if (input) input.click();
                      }}
                    >
                      {question.images && question.images.length > 0 ? (
                        <div className="w-full">
                          {/* Show images as flex layout with larger previews */}
                          <div className="flex flex-wrap gap-3 mb-2">
                            {question.images.map((image, imageIndex) => (
                              <div
                                key={imageIndex}
                                className="relative group border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden w-32 h-32"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <img
                                  src={image.url}
                                  alt={image.alt || "Question image"}
                                  className="w-full h-full object-contain bg-gray-50 dark:bg-gray-800/30"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveQuestionImage(question.id, imageIndex);
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title={t("common.remove")}
                                >
                                  <XMarkIcon className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            
                            {/* Add a hint that you can still drop more images */}
                            <div className="flex items-center justify-center w-32 h-32 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/30">
                              <div className="text-center">
                                <PhotoIcon className="h-6 w-6 mx-auto text-gray-400" />
                                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                                  {t("prebuilt.quiz.addImage")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                          <PhotoIcon
                            className={`h-8 w-8 mx-auto ${
                              draggingOver === question.id
                                ? "text-blue-500 dark:text-blue-400"
                                : "text-gray-400"
                            }`}
                          />
                          <p
                            className={`text-sm mt-2 ${
                              draggingOver === question.id
                                ? "text-blue-600 dark:text-blue-300"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {draggingOver === question.id
                              ? t("prebuilt.quiz.dropImageHere")
                              : t("prebuilt.quiz.dragDropImage")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Options - only show if showOptions is true */}
                  {question.showOptions !== false && (
                    <div className="space-y-3 mt-4">
                      <div className="flex justify-between items-center">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t("prebuilt.quiz.options")}
                        </h5>
                        <Button
                          variant="secondary"
                          size="xs"
                          leftIcon={<PlusIcon className="h-3 w-3" />}
                          onClick={() => handleAddOption(question.id)}
                        >
                          {t("prebuilt.quiz.addOption")}
                        </Button>
                      </div>

                      {question.options.map((option) => (
                        <div
                          key={option.id}
                          className="space-y-2 p-3 border border-gray-200 dark:border-gray-700 rounded-md"
                        >
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                handleToggleCorrect(question.id, option.id)
                              }
                              className={`p-1 rounded-full flex-shrink-0 ${
                                option.isCorrect
                                  ? "bg-green-100 text-green-600 dark:bg-green-700/20 dark:text-green-400"
                                  : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                              }`}
                              title={
                                option.isCorrect
                                  ? t("prebuilt.quiz.correct")
                                  : t("prebuilt.quiz.incorrect")
                              }
                            >
                              {option.isCorrect ? (
                                <CheckIcon className="h-4 w-4" />
                              ) : (
                                <XMarkIcon className="h-4 w-4" />
                              )}
                            </button>

                            <input
                              type="text"
                              placeholder={t("prebuilt.quiz.optionPlaceholder")}
                              value={option.text}
                              onChange={(e) =>
                                handleOptionTextChange(
                                  question.id,
                                  option.id,
                                  e.target.value
                                )
                              }
                              className="flex-grow px-3 py-1 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />

                            <button
                              onClick={() =>
                                handleRemoveOption(question.id, option.id)
                              }
                              className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                              disabled={question.options.length <= 2}
                              title={t("common.remove")}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Option Images */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs text-gray-600 dark:text-gray-400">
                                {t("prebuilt.quiz.optionImages")}
                              </label>
                              <label
                                htmlFor={`option-image-${question.id}-${option.id}`}
                                className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded-md cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors flex items-center space-x-1"
                              >
                                <PhotoIcon className="h-3 w-3" />
                                <span>{t("prebuilt.quiz.addImage")}</span>
                              </label>
                              <input
                                id={`option-image-${question.id}-${option.id}`}
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleFileInputChange(e, question.id, option.id)
                                }
                                className="hidden"
                                disabled={uploadingImage}
                              />
                            </div>

                            {/* Integrated drag-drop area with image previews for options */}
                            <div
                              className={`border border-dashed rounded-md p-3 min-h-[100px] transition-colors cursor-pointer
                                ${
                                  draggingOver === `${question.id}-${option.id}`
                                    ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30"
                                    : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                }`}
                              onDragOver={handleDragOver}
                              onDragEnter={(e) =>
                                handleDragEnter(e, question.id, option.id)
                              }
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, question.id, option.id)}
                              onClick={() => {
                                const input = document.getElementById(
                                  `option-image-${question.id}-${option.id}`
                                );
                                if (input) input.click();
                              }}
                            >
                              {option.images && option.images.length > 0 ? (
                                <div className="w-full">
                                  {/* Show option images as flex layout with larger previews */}
                                  <div className="flex flex-wrap gap-3 mb-2">
                                    {option.images.map((image, imageIndex) => (
                                      <div
                                        key={imageIndex}
                                        className="relative group border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden w-28 h-28"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <img
                                          src={image.url}
                                          alt={image.alt || "Option image"}
                                          className="w-full h-full object-contain bg-gray-50 dark:bg-gray-800/30"
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveOptionImage(
                                              question.id,
                                              option.id,
                                              imageIndex
                                            );
                                          }}
                                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title={t("common.remove")}
                                        >
                                          <XMarkIcon className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                    
                                    {/* Add a hint that you can still drop more images */}
                                    <div className="flex items-center justify-center w-28 h-28 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/30">
                                      <div className="text-center">
                                        <PhotoIcon className="h-5 w-5 mx-auto text-gray-400" />
                                        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                                          {t("prebuilt.quiz.addImage")}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                                  <PhotoIcon
                                    className={`h-6 w-6 mx-auto ${
                                      draggingOver === `${question.id}-${option.id}`
                                        ? "text-blue-500 dark:text-blue-400"
                                        : "text-gray-400"
                                    }`}
                                  />
                                  <p
                                    className={`text-xs mt-1 ${
                                      draggingOver === `${question.id}-${option.id}`
                                        ? "text-blue-600 dark:text-blue-300"
                                        : "text-gray-500 dark:text-gray-400"
                                    }`}
                                  >
                                    {draggingOver === `${question.id}-${option.id}`
                                      ? t("prebuilt.quiz.dropImageHere")
                                      : t("prebuilt.quiz.dragDropImage")}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Single answer field when options are hidden */}
                  {question.showOptions === false && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t("prebuilt.quiz.correctAnswer")}
                        </h5>
                      </div>

                      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-green-50 dark:bg-green-900/20">
                        <input
                          type="text"
                          placeholder={t(
                            "prebuilt.quiz.correctAnswerPlaceholder"
                          )}
                          value={question.options[0]?.text || ""}
                          onChange={(e) => {
                            // Make sure we have at least one option that is marked correct
                            const updatedOptions = [
                              ...(question.options || []),
                            ];
                            if (updatedOptions.length === 0) {
                              updatedOptions.push({
                                id: uuidv4(),
                                text: e.target.value,
                                isCorrect: true,
                                images: [],
                              });
                            } else {
                              updatedOptions[0] = {
                                ...updatedOptions[0],
                                text: e.target.value,
                                isCorrect: true,
                              };
                            }

                            setQuestions(
                              questions.map((q) =>
                                q.id === question.id
                                  ? { ...q, options: updatedOptions }
                                  : q
                              )
                            );
                          }}
                          className="w-full px-3 py-2 border rounded-md border-green-300 dark:border-green-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />

                        {/* Option Images for single answer */}
                        <div className="mt-2">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-xs text-gray-600 dark:text-gray-400">
                              {t("prebuilt.quiz.answerImages")}
                            </label>
                            <label
                              htmlFor={`answer-image-${question.id}`}
                              className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded-md cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors flex items-center space-x-1"
                            >
                              <PhotoIcon className="h-3 w-3" />
                              <span>{t("prebuilt.quiz.addImage")}</span>
                            </label>
                            <input
                              id={`answer-image-${question.id}`}
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleFileInputChange(
                                  e,
                                  question.id,
                                  question.options[0]?.id
                                )
                              }
                              className="hidden"
                              disabled={uploadingImage}
                            />
                          </div>

                          {/* Integrated drag-drop area with image previews for answer */}
                          <div
                            className={`border border-dashed rounded-md p-3 min-h-[100px] transition-colors cursor-pointer
                              ${
                                draggingOver === `${question.id}-${question.options[0]?.id}`
                                  ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30"
                                  : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                              }`}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) =>
                              handleDragEnter(e, question.id, question.options[0]?.id)
                            }
                            onDragLeave={handleDragLeave}
                            onDrop={(e) =>
                              handleDrop(e, question.id, question.options[0]?.id)
                            }
                            onClick={() => {
                              const input = document.getElementById(
                                `answer-image-${question.id}`
                              );
                              if (input) input.click();
                            }}
                          >
                            {question.options[0]?.images && question.options[0]?.images.length > 0 ? (
                              <div className="w-full">
                                {/* Show answer images as flex layout with larger previews */}
                                <div className="flex flex-wrap gap-3 mb-2">
                                  {question.options[0].images.map((image, imageIndex) => (
                                    <div
                                      key={imageIndex}
                                      className="relative group border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden w-28 h-28"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <img
                                        src={image.url}
                                        alt={image.alt || "Answer image"}
                                        className="w-full h-full object-contain bg-gray-50 dark:bg-gray-800/30"
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveOptionImage(
                                            question.id,
                                            question.options[0].id,
                                            imageIndex
                                          );
                                        }}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title={t("common.remove")}
                                      >
                                        <XMarkIcon className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                  
                                  {/* Add a hint that you can still drop more images */}
                                  <div className="flex items-center justify-center w-28 h-28 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/30">
                                    <div className="text-center">
                                      <PhotoIcon className="h-5 w-5 mx-auto text-gray-400" />
                                      <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                                        {t("prebuilt.quiz.addImage")}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                                <PhotoIcon
                                  className={`h-6 w-6 mx-auto ${
                                    draggingOver === `${question.id}-${question.options[0]?.id}`
                                      ? "text-blue-500 dark:text-blue-400"
                                      : "text-gray-400"
                                  }`}
                                />
                                <p
                                  className={`text-xs mt-1 ${
                                    draggingOver === `${question.id}-${question.options[0]?.id}`
                                      ? "text-blue-600 dark:text-blue-300"
                                      : "text-gray-500 dark:text-gray-400"
                                  }`}
                                >
                                  {draggingOver === `${question.id}-${question.options[0]?.id}`
                                    ? t("prebuilt.quiz.dropImageHere")
                                    : t("prebuilt.quiz.dragDropImage")}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Add Question button at the bottom */}
          <div className="flex justify-center mt-5">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={handleAddQuestion}
            >
              {t("prebuilt.quiz.addQuestion")}
            </Button>
          </div>
        </div>

        {/* Punishment Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {t("prebuilt.quiz.punishment")}
            </h3>
            
            {/* Add the punishment toggle switch */}
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                {t("challenges.includePunishment")}
              </label>
              <Switch
                checked={hasPunishment}
                onChange={() => setHasPunishment(!hasPunishment)}
                activeIcon={<CheckIcon className="h-4 w-4 text-green-500" />}
                inactiveIcon={<XMarkIcon className="h-4 w-4 text-gray-500" />}
              />
            </div>
          </div>

          {/* Only show punishment options if hasPunishment is true */}
          {hasPunishment && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("prebuilt.quiz.punishmentType")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPunishmentType("sips")}
                    className={`py-2 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                      punishmentType === "sips"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                        : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    }`}
                  >
                    {t("prebuilt.quiz.sips")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPunishmentType("custom")}
                    className={`py-2 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                      punishmentType === "custom"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                        : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    }`}
                  >
                    {t("prebuilt.quiz.custom")}
                  </button>
                </div>
              </div>

              {punishmentType === "custom" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("prebuilt.quiz.punishmentDescription")}
                  </label>
                  <textarea
                    placeholder={t("prebuilt.quiz.punishmentDescriptionPlaceholder")}
                    value={customPunishmentDescription}
                    onChange={(e) => setCustomPunishmentDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("prebuilt.quiz.punishmentValue")}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 5, 10].map((pointValue) => (
                    <button
                      key={pointValue}
                      type="button"
                      onClick={() => setPunishmentValue(pointValue)}
                      className={`py-2 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                        punishmentValue === pointValue
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                          : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                      }`}
                    >
                      {pointValue}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleCreateChallenge}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("common.submitting") : editChallenge ? t("common.save") : t("common.create")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default QuizForm;