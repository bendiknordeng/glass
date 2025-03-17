import { Challenge, ChallengeType, Punishment } from '@/types/Challenge';
import { GameMode } from '@/types/Team';

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
  const availableCustomChallenges = customChallenges.filter(challenge => {
    // Exclude challenges that can't be reused and have been used
    if (!challenge.canReuse && usedChallenges.includes(challenge.id)) {
      return false;
    }
    
    // In FREE_FOR_ALL mode, exclude team challenges
    if (gameMode === GameMode.FREE_FOR_ALL && challenge.type === ChallengeType.TEAM) {
      return false;
    }
    
    // In TEAMS mode, exclude all vs all if not enough players
    if (gameMode === GameMode.TEAMS && challenge.type === ChallengeType.ALL_VS_ALL) {
      // Allow it for now, player selection will handle it
      return true;
    }
    
    return true;
  });
  
  // If we have custom challenges available, prioritize them
  if (availableCustomChallenges.length > 0) {
    // Pick a random custom challenge
    const randomIndex = Math.floor(Math.random() * availableCustomChallenges.length);
    return availableCustomChallenges[randomIndex];
  }
  
  // Otherwise, fall back to default challenges
  const availableDefaultChallenges = challenges.filter(challenge => {
    // Exclude challenges that can't be reused and have been used
    if (!challenge.canReuse && usedChallenges.includes(challenge.id)) {
      return false;
    }
    
    // In FREE_FOR_ALL mode, exclude team challenges
    if (gameMode === GameMode.FREE_FOR_ALL && challenge.type === ChallengeType.TEAM) {
      return false;
    }
    
    // In TEAMS mode, exclude all vs all if not enough players
    if (gameMode === GameMode.TEAMS && challenge.type === ChallengeType.ALL_VS_ALL) {
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
  const randomIndex = Math.floor(Math.random() * availableDefaultChallenges.length);
  return availableDefaultChallenges[randomIndex];
};

/**
 * Generates a set of default challenges for the game
 * @returns Array of Challenge objects
 */
export const generateDefaultChallenges = (): Challenge[] => {
  return [
    // Individual challenges
    {
      id: '1',
      title: 'Truth or Dare',
      description: 'Choose truth: Answer a personal question. Choose dare: Perform a challenge.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: true,
      points: 2,
      punishment: {
        type: 'sips',
        value: 2
      }
    },
    {
      id: '2',
      title: 'Dance Move',
      description: 'Show your best dance move for 15 seconds.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: true,
      points: 1
    },
    {
      id: '3',
      title: 'Tongue Twister',
      description: 'Say "She sells seashells by the seashore" 3 times fast without messing up.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: true,
      points: 2,
      punishment: {
        type: 'sips',
        value: 1
      }
    },
    {
      id: '4',
      title: 'Phone Reveal',
      description: 'Let another player send a text message from your phone.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: false,
      points: 3,
      punishment: {
        type: 'custom',
        value: 1,
        customDescription: 'Show the last photo in your camera roll to everyone'
      }
    },
    {
      id: '5',
      title: 'Impression',
      description: 'Do your best impression of a celebrity or character of your choice.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: true,
      points: 2
    },
    
    // One-on-one challenges
    {
      id: '6',
      title: 'Rock, Paper, Scissors',
      description: 'Play best of 3 rock, paper, scissors.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      points: 1,
      punishment: {
        type: 'sips',
        value: 1
      }
    },
    {
      id: '7',
      title: 'Arm Wrestling',
      description: 'Challenge your opponent to an arm wrestling match.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      points: 2
    },
    {
      id: '8',
      title: 'Staring Contest',
      description: 'Have a staring contest with your opponent. First to blink or laugh loses.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      points: 2,
      punishment: {
        type: 'sips',
        value: 2
      }
    },
    {
      id: '9',
      title: 'Water or Vodka',
      description: 'Fill 5 shot glasses - 4 with water, 1 with vodka. Your opponent chooses a glass for you to drink, then you choose one for them.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      points: 3
    },
    {
      id: '10',
      title: 'Compliment Battle',
      description: 'Take turns giving each other compliments. First person who can\'t think of a unique compliment loses.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      points: 1
    },
    
    // Team challenges
    {
      id: '11',
      title: 'Team Quiz',
      description: 'Teams take turns answering trivia questions. First team to 5 points wins.',
      type: ChallengeType.TEAM,
      canReuse: false,
      points: 3,
      category: 'quiz',
      punishment: {
        type: 'sips',
        value: 3
      }
    },
    {
      id: '12',
      title: 'Team Acting',
      description: 'One team member acts out a word or phrase for their team to guess. Most correct guesses in 1 minute wins.',
      type: ChallengeType.TEAM,
      canReuse: false,
      points: 3,
      category: 'acting'
    },
    {
      id: '13',
      title: 'Team Whispers',
      description: 'Teams line up. Whisper a phrase from one end to the other. Most accurate transmission wins.',
      type: ChallengeType.TEAM,
      canReuse: false,
      points: 2,
      category: 'communication'
    },
    {
      id: '14',
      title: 'Team Shot Race',
      description: 'Each team member must take a shot (of water or alcohol) in sequence. Fastest team wins.',
      type: ChallengeType.TEAM,
      canReuse: false,
      points: 2,
      category: 'drinking'
    },
    {
      id: '15',
      title: 'Team Story',
      description: 'Teams create a story one word at a time, going around the circle. Most creative and coherent story wins.',
      type: ChallengeType.TEAM,
      canReuse: false,
      points: 3,
      category: 'creativity'
    },
    
    // Norwegian inspired challenges (from Børst)
    {
      id: '16',
      title: 'Never Have I Ever',
      description: 'Say something you have never done. Anyone who has done it must drink.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: true,
      points: 1,
      category: 'drinking'
    },
    {
      id: '17',
      title: 'Categories',
      description: 'Name a category (e.g., car brands). Go around the circle naming items in that category. First to hesitate loses.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      points: 2,
      category: 'knowledge',
      punishment: {
        type: 'sips',
        value: 2
      }
    },
    {
      id: '18',
      title: 'Viking King',
      description: 'Be the Viking King! Choose someone to drink whenever you drink for the next 3 rounds.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: false,
      points: 1,
      category: 'drinking'
    },
    {
      id: '19',
      title: 'Rhyme Time',
      description: 'Say a word. Go around the circle with each person saying a word that rhymes. First to fail loses.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      points: 2,
      category: 'language'
    },
    {
      id: '20',
      title: 'Question Master',
      description: 'You are the Question Master for the next 3 rounds. Anyone who answers your questions must drink.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: false,
      points: 2,
      category: 'drinking'
    },
    
    // All vs All challenges
    {
      id: '21',
      title: 'Trivia Royale',
      description: 'Everyone competes in a rapid-fire trivia battle. First player to 3 correct answers wins!',
      type: ChallengeType.ALL_VS_ALL,
      canReuse: true,
      points: 3,
      category: 'knowledge',
      punishment: {
        type: 'sips',
        value: 2
      }
    },
    {
      id: '22',
      title: 'Word Association Sprint',
      description: 'Start with a word. Go around quickly with each player saying a related word. If you hesitate more than 3 seconds or repeat a word, you\'re out. Last player standing wins!',
      type: ChallengeType.ALL_VS_ALL,
      canReuse: true,
      points: 2,
      category: 'language',
      punishment: {
        type: 'sips',
        value: 1
      }
    },
    {
      id: '23',
      title: 'Bottle Flip Championship',
      description: 'Each player gets 3 attempts to flip a water bottle and make it land upright. Player with most successful flips wins!',
      type: ChallengeType.ALL_VS_ALL,
      canReuse: true,
      points: 2,
      category: 'skill'
    },
    {
      id: '24',
      title: 'Dance Off',
      description: 'Each player performs a 15-second dance. Everyone votes for the best dancer (can\'t vote for yourself). Most votes wins!',
      type: ChallengeType.ALL_VS_ALL,
      canReuse: false,
      points: 3,
      category: 'performance',
      punishment: {
        type: 'custom',
        value: 1,
        customDescription: 'Loser must dance again, but twice as long this time!'
      }
    },
    {
      id: '25',
      title: 'Draw & Guess Battle',
      description: 'Everyone gets a word to draw. After 30 seconds, all drawings are revealed and players guess each other\'s drawings. Most correct guesses wins!',
      type: ChallengeType.ALL_VS_ALL,
      canReuse: true,
      points: 2,
      category: 'creativity'
    }
  ];
};