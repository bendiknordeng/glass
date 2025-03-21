import { Challenge, ChallengeType } from "@/types/Challenge";
import { GameMode } from "@/types/Team";
/**
 * Gets the next available challenge based on game state
 * @param challenges All SELECTED standard challenges for this game session
 * @param usedChallenges IDs of challenges already used
 * @param gameMode Current game mode
 * @param customChallenges User-created custom challenges ALREADY SELECTED for this game session
 * @returns A challenge or null if none available
 */
export const getNextChallenge = (
  challenges: Challenge[],
  usedChallenges: string[],
  gameMode: GameMode,
  customChallenges: Challenge[] = []
): Challenge | null => {
  console.log('getNextChallenge called with:', { 
    standardChallengesCount: challenges.length, 
    customChallengesCount: customChallenges.length,
    usedChallengeIds: usedChallenges 
  });
  
  // IMPORTANT: This function assumes both 'challenges' and 'customChallenges' parameters
  // ONLY contain challenges that have been explicitly selected for the current game.
  // Any filtering of unselected challenges should happen BEFORE calling this function.
  
  // Combine all available challenges that can be used
  const allAvailableChallenges: Challenge[] = [];
  
  // Create arrays for storing both types of challenges
  const availableStandardChallenges: Challenge[] = [];
  const availableCustomChallenges: Challenge[] = [];
  
  // Process standard challenges
  challenges.forEach(challenge => {
    // Skip challenges that can't be reused and have already been used
    if (!challenge.canReuse && usedChallenges.includes(challenge.id)) {
      return;
    }
    
    // Skip team challenges in FREE_FOR_ALL mode
    if (gameMode === GameMode.FREE_FOR_ALL && challenge.type === ChallengeType.TEAM) {
      return;
    }
    
    // Add the challenge to available standard challenges
    availableStandardChallenges.push(challenge);
  });
  
  // Process custom challenges
  customChallenges.forEach(challenge => {
    // Skip challenges that can't be reused and have already been used
    if (!challenge.canReuse && usedChallenges.includes(challenge.id)) {
      return;
    }
    
    // Skip team challenges in FREE_FOR_ALL mode
    if (gameMode === GameMode.FREE_FOR_ALL && challenge.type === ChallengeType.TEAM) {
      return;
    }
    
    // Add the challenge to available custom challenges
    availableCustomChallenges.push(challenge);
  });
  
  console.log(`Found ${availableStandardChallenges.length} available standard challenges and ${availableCustomChallenges.length} available custom challenges`);
  
  // Merge all available challenges to create a pool for selection
  allAvailableChallenges.push(...availableStandardChallenges, ...availableCustomChallenges);
  
  // If no challenges available, return null
  if (allAvailableChallenges.length === 0) {
    console.log('No available challenges found');
    return null;
  }
  
  // Create a weighted selection mechanism that:
  // 1. Ensures both standard and custom challenges are mixed
  // 2. Gives reusable challenges higher probability
  const enhancedChallenges = allAvailableChallenges.map(challenge => {
    // Count how many times this challenge has been used
    const usageCount = usedChallenges.filter(id => id === challenge.id).length;
    
    // Define weight parameters
    let weight = 1; // Base weight
    
    // Reusable challenges get higher weight if they haven't been used many times
    if (challenge.canReuse) {
      // Higher weight for challenges that can be reused but haven't been used much
      weight = Math.max(1, 3 - usageCount);
    }
    
    // Return the challenge with its calculated weight
    return { challenge, weight };
  });
  
  // Calculate total weight
  const totalWeight = enhancedChallenges.reduce((sum, item) => sum + item.weight, 0);
  
  // Choose a random number between 0 and the total weight
  let randomValue = Math.random() * totalWeight;
  
  // Select a challenge based on the weights
  for (const { challenge, weight } of enhancedChallenges) {
    randomValue -= weight;
    if (randomValue <= 0) {
      console.log(`Selected challenge: "${challenge.title}" (ID: ${challenge.id}), Type: ${challenge.type}, isPrebuilt: ${challenge.isPrebuilt || false}`);
      return challenge;
    }
  }
  
  // Fallback to a plain random selection if the weighted selection fails for any reason
  const randomIndex = Math.floor(Math.random() * allAvailableChallenges.length);
  const selectedChallenge = allAvailableChallenges[randomIndex];
  
  console.log(`Fallback selection: "${selectedChallenge.title}" (ID: ${selectedChallenge.id}), Type: ${selectedChallenge.type}, isPrebuilt: ${selectedChallenge.isPrebuilt || false}`);
  
  return selectedChallenge;
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
      title: `challenges.standard.categories.${category}.title`,
      description: `challenges.standard.categories.${category}.description`,
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
      title: "challenges.standard.waterOrVodka.title",
      description: "challenges.standard.waterOrVodka.description",
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
