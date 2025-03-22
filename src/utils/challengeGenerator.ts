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
  
  // Create arrays for storing both types of challenges
  const availableStandardChallenges: Challenge[] = [];
  
  // Process standard challenges
  challenges.forEach(challenge => {
    // Skip challenges that can't be reused and have already been used
    if (!challenge.canReuse && usedChallenges.includes(challenge.id)) {
      return;
    }
    
    // Check if the challenge has reached its maximum reuse count
    if (challenge.canReuse && challenge.maxReuseCount !== undefined) {
      // Count how many times this challenge has been used
      const usageCount = usedChallenges.filter(id => id === challenge.id).length;
      
      // Skip if we've already used it the maximum number of times
      if (usageCount >= challenge.maxReuseCount) {
        return;
      }
    }
    
    // Skip team challenges in FREE_FOR_ALL mode
    if (gameMode === GameMode.FREE_FOR_ALL && challenge.type === ChallengeType.TEAM) {
      return;
    }
    
    // Add the challenge to available standard challenges
    availableStandardChallenges.push(challenge);
  });
  
  // Get all custom challenges that match the game mode
  const availableCustomChallenges: Challenge[] = [];
  
  // Process custom challenges - must be included if they match the game mode
  customChallenges.forEach(challenge => {
    // Skip team challenges in FREE_FOR_ALL mode - only constraint for custom challenges
    if (gameMode === GameMode.FREE_FOR_ALL && challenge.type === ChallengeType.TEAM) {
      return;
    }
    
    // For custom challenges, we need to check if they've been used before
    // but we still include them in the available pool (with appropriate weighting)
    availableCustomChallenges.push(challenge);
  });
  
  console.log(`Found ${availableStandardChallenges.length} available standard challenges and ${availableCustomChallenges.length} available custom challenges`);
  
  // Create the final pool of challenges to select from
  // If we have no challenges available, return null
  if (availableStandardChallenges.length === 0 && availableCustomChallenges.length === 0) {
    console.log('No available challenges found');
    return null;
  }
  
  // Create a weighted selection mechanism that:
  // 1. Ensures custom challenges are always included
  // 2. Gives higher priority to unused custom challenges
  // 3. Uses appropriate weighting for standard challenges
  const enhancedChallenges = [];
  
  // Process custom challenges first - they MUST be in the mix
  for (const challenge of availableCustomChallenges) {
    // Count how many times this challenge has been used
    const usageCount = usedChallenges.filter(id => id === challenge.id).length;
    
    // Calculate weight for custom challenges
    let weight = 1; // Base weight
    
    // If this challenge hasn't been used yet, give it higher priority
    if (usageCount === 0) {
      weight = 5; // High priority for unused custom challenges
    } 
    // For reusable challenges that have been used before
    else if (challenge.canReuse) {
      // If it has a max reuse count, decrease weight as it approaches its limit
      if (challenge.maxReuseCount !== undefined) {
        const remainingUses = challenge.maxReuseCount - usageCount;
        weight = Math.max(1, remainingUses + 1); // Still give it slightly higher weight
      } else {
        weight = Math.max(1, 3 - usageCount);
      }
    }
    // For non-reusable challenges that have been used before
    else if (!challenge.canReuse && usageCount > 0) {
      weight = 0; // Skip this challenge
      continue;
    }
    
    enhancedChallenges.push({ challenge, weight });
  }
  
  // Then add standard challenges with their weights
  for (const challenge of availableStandardChallenges) {
    // Count how many times this challenge has been used
    const usageCount = usedChallenges.filter(id => id === challenge.id).length;
    
    // Define weight parameters
    let weight = 1; // Base weight
    
    // Reusable challenges get higher weight if they haven't been used many times
    if (challenge.canReuse) {
      // If challenge has a maxReuseCount, decrease weight as it approaches its limit
      if (challenge.maxReuseCount !== undefined) {
        // Higher weight for challenges that are further from their max use limit
        const remainingUses = challenge.maxReuseCount - usageCount;
        weight = Math.max(1, remainingUses);
      } else {
        // Higher weight for challenges that can be reused but haven't been used much
        weight = Math.max(1, 3 - usageCount);
      }
    }
    
    enhancedChallenges.push({ challenge, weight });
  }
  
  // If we have no challenges with positive weights, return null
  if (enhancedChallenges.length === 0) {
    console.log('No challenges with positive weights found');
    return null;
  }
  
  // Calculate total weight
  const totalWeight = enhancedChallenges.reduce((sum, item) => sum + item.weight, 0);
  
  // Choose a random number between 0 and the total weight
  let randomValue = Math.random() * totalWeight;
  
  // Select a challenge based on the weights
  for (const { challenge, weight } of enhancedChallenges) {
    randomValue -= weight;
    if (randomValue <= 0) {
      console.log(`Selected challenge: "${challenge.title}" (ID: ${challenge.id}), Type: ${challenge.type}, isCustom: ${!challenge.isPrebuilt || false}`);
      return challenge;
    }
  }
  
  // Fallback to a plain random selection if the weighted selection fails for any reason
  const randomIndex = Math.floor(Math.random() * enhancedChallenges.length);
  const selectedChallenge = enhancedChallenges[randomIndex].challenge;
  
  console.log(`Fallback selection: "${selectedChallenge.title}" (ID: ${selectedChallenge.id}), Type: ${selectedChallenge.type}, isCustom: ${!selectedChallenge.isPrebuilt || false}`);
  
  return selectedChallenge;
};

/**
 * Generates a set of default challenges for the game
 * @param t Translation function to use for localizing challenge content
 * @returns Array of Challenge objects
 */
export const generateDefaultChallenges = () => {
  const allCategories = [
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
  
  // Select a smaller subset of categories (3-4) instead of using all of them
  const getRandomCategories = (categories: string[], count: number = 4) => {
    // Shuffle the categories array
    const shuffled = [...categories].sort(() => 0.5 - Math.random());
    // Return the first 'count' elements
    return shuffled.slice(0, Math.min(count, categories.length));
  };
  
  // Get a random selection of categories to use
  const selectedCategories = getRandomCategories(allCategories, 4);
  
  return [
    ...selectedCategories.map((category, index) => ({
      id: `cat-${index}-${category}`, // Ensure unique IDs for each category challenge
      title: `challenges.standard.categories.title`,
      description: `challenges.standard.categories.${category}`,
      type: ChallengeType.ONE_ON_ONE,
      canReuse: false,
      points: 2,
      category: "knowledge",
      punishment: {
        type: "sips",
        value: 3,
      },
    })),
    {
      id: "water-vodka-1", // Fixed unique ID
      title: "challenges.standard.waterOrVodka.title",
      description: "challenges.standard.waterOrVodka.description",
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      maxReuseCount: 3,
      points: 2,
      category: "knowledge"
    },
    {
      id: "water-vodka-team", // Fixed unique ID for team version
      title: "challenges.standard.waterOrVodka.title",
      description: "challenges.standard.waterOrVodka.description",
      type: ChallengeType.TEAM,
      canReuse: false,
      points: 3,
      category: "knowledge"
    },
    {
      id: "back-against-back",
      title: "challenges.standard.backAgainstBack.title",
      description: "challenges.standard.backAgainstBack.description",
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      maxReuseCount: 2,
      points: 1,
      category: "knowledge"
    }
  ];
};
