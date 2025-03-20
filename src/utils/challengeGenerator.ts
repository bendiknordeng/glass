import { Challenge, ChallengeType } from "@/types/Challenge";
import { GameMode } from "@/types/Team";
/**
 * Gets the next available challenge based on game state
 * @param challenges All available challenges
 * @param usedChallenges IDs of challenges already used
 * @param gameMode Current game mode
 * @param customChallenges User-created custom challenges
 * @returns A challenge or null if none available
 */
export const getNextChallenge = (
  challenges: Challenge[],
  usedChallenges: string[],
  gameMode: GameMode,
  customChallenges: Challenge[] = []
): Challenge | null => {
  // First filter custom challenges (give them priority)
  const availableCustomChallenges = customChallenges.filter((challenge) => {
    // Exclude challenges that can't be reused and have been used
    if (!challenge.canReuse && usedChallenges.includes(challenge.id)) {
      return false;
    }

    // In FREE_FOR_ALL mode, exclude team challenges
    if (
      gameMode === GameMode.FREE_FOR_ALL &&
      challenge.type === ChallengeType.TEAM
    ) {
      return false;
    }

    // In TEAMS mode, exclude all vs all if not enough players
    if (
      gameMode === GameMode.TEAMS &&
      challenge.type === ChallengeType.ALL_VS_ALL
    ) {
      // Allow it for now, player selection will handle it
      return true;
    }

    return true;
  });

  // If we have custom challenges available, prioritize them
  if (availableCustomChallenges.length > 0) {
    // Pick a random custom challenge
    const randomIndex = Math.floor(
      Math.random() * availableCustomChallenges.length
    );
    return availableCustomChallenges[randomIndex];
  }

  // Otherwise, fall back to default challenges
  const availableDefaultChallenges = challenges.filter((challenge) => {
    // Exclude challenges that can't be reused and have been used
    if (!challenge.canReuse && usedChallenges.includes(challenge.id)) {
      return false;
    }

    // In FREE_FOR_ALL mode, exclude team challenges
    if (
      gameMode === GameMode.FREE_FOR_ALL &&
      challenge.type === ChallengeType.TEAM
    ) {
      return false;
    }

    // In TEAMS mode, exclude all vs all if not enough players
    if (
      gameMode === GameMode.TEAMS &&
      challenge.type === ChallengeType.ALL_VS_ALL
    ) {
      // Allow it for now, player selection will handle it
      return true;
    }

    return true;
  });

  // If no challenges available, return null
  if (availableDefaultChallenges.length === 0) {
    return null;
  }

  // Pick a random default challenge
  const randomIndex = Math.floor(
    Math.random() * availableDefaultChallenges.length
  );
  return availableDefaultChallenges[randomIndex];
};

/**
 * Generates a set of default challenges for the game
 * @param t Translation function to use for localizing challenge content
 * @returns Array of Challenge objects
 */
export const generateDefaultChallenges = () => {
  const categories = [
    "beer-brands",
    "tv-shows",
    "cities",
    "animals",
    "fruits",
    "countries",
    "celebrities",
    "movies",
    "sports",
  ];
  return [
    ...categories.map((category, index) => ({
      id: `1-${index}`,
      title: `standard.categories.${category}.title`,
      description: `standard.categories.${category}.description`,
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      points: 2,
      category: "knowledge",
      punishment: {
        type: "sips",
        value: 3,
      },
    })),
    {
      id: "2",
      title: "standard.categories.waterOrVodka.title",
      description: "standard.categories.waterOrVodka.description",
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      points: 2,
      category: "knowledge",
      punishment: {
        type: "sips",
        value: 3,
      },
    },
  ];
};
