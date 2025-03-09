import { Challenge, ChallengeType } from '@/types/Challenge';
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
  // Combine default and custom challenges
  const allChallenges = [...challenges, ...customChallenges];
  
  // Filter challenges
  const availableChallenges = allChallenges.filter(challenge => {
    // Exclude challenges that can't be reused and have been used
    if (!challenge.canReuse && usedChallenges.includes(challenge.id)) {
      return false;
    }
    
    // In FREE_FOR_ALL mode, exclude team challenges
    if (gameMode === GameMode.FREE_FOR_ALL && challenge.type === ChallengeType.TEAM) {
      return false;
    }
    
    return true;
  });
  
  // If no challenges available, return null
  if (availableChallenges.length === 0) {
    return null;
  }
  
  // Pick a random challenge
  const randomIndex = Math.floor(Math.random() * availableChallenges.length);
  return availableChallenges[randomIndex];
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
      difficulty: 2,
      points: 2
    },
    {
      id: '2',
      title: 'Dance Move',
      description: 'Show your best dance move for 15 seconds.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: true,
      difficulty: 1,
      points: 1
    },
    {
      id: '3',
      title: 'Tongue Twister',
      description: 'Say "She sells seashells by the seashore" 3 times fast without messing up.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: true,
      difficulty: 2,
      points: 2
    },
    {
      id: '4',
      title: 'Phone Reveal',
      description: 'Let another player send a text message from your phone.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: false,
      difficulty: 3,
      points: 3
    },
    {
      id: '5',
      title: 'Impression',
      description: 'Do your best impression of a celebrity or character of your choice.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: true,
      difficulty: 2,
      points: 2
    },
    
    // One-on-one challenges
    {
      id: '6',
      title: 'Rock, Paper, Scissors',
      description: 'Play best of 3 rock, paper, scissors.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      difficulty: 1,
      points: 1
    },
    {
      id: '7',
      title: 'Arm Wrestling',
      description: 'Challenge your opponent to an arm wrestling match.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      difficulty: 2,
      points: 2
    },
    {
      id: '8',
      title: 'Staring Contest',
      description: 'Have a staring contest with your opponent. First to blink or laugh loses.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      difficulty: 2,
      points: 2
    },
    {
      id: '9',
      title: 'Water or Vodka',
      description: 'Fill 5 shot glasses - 4 with water, 1 with vodka. Your opponent chooses a glass for you to drink, then you choose one for them.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      difficulty: 3,
      points: 3
    },
    {
      id: '10',
      title: 'Compliment Battle',
      description: 'Take turns giving each other compliments. First person who can\'t think of a unique compliment loses.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      difficulty: 1,
      points: 1
    },
    
    // Team challenges
    {
      id: '11',
      title: 'Team Quiz',
      description: 'Teams take turns answering trivia questions. First team to 5 points wins.',
      type: ChallengeType.TEAM,
      canReuse: false,
      difficulty: 2,
      points: 3,
      category: 'quiz'
    },
    {
      id: '12',
      title: 'Team Acting',
      description: 'One team member acts out a word or phrase for their team to guess. Most correct guesses in 1 minute wins.',
      type: ChallengeType.TEAM,
      canReuse: false,
      difficulty: 2,
      points: 3,
      category: 'acting'
    },
    {
      id: '13',
      title: 'Team Whispers',
      description: 'Teams line up. Whisper a phrase from one end to the other. Most accurate transmission wins.',
      type: ChallengeType.TEAM,
      canReuse: false,
      difficulty: 2,
      points: 2,
      category: 'communication'
    },
    {
      id: '14',
      title: 'Team Shot Race',
      description: 'Each team member must take a shot (of water or alcohol) in sequence. Fastest team wins.',
      type: ChallengeType.TEAM,
      canReuse: false,
      difficulty: 1,
      points: 2,
      category: 'drinking'
    },
    {
      id: '15',
      title: 'Team Story',
      description: 'Teams create a story one word at a time, going around the circle. Most creative and coherent story wins.',
      type: ChallengeType.TEAM,
      canReuse: false,
      difficulty: 3,
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
      difficulty: 1,
      points: 1,
      category: 'drinking'
    },
    {
      id: '17',
      title: 'Categories',
      description: 'Name a category (e.g., car brands). Go around the circle naming items in that category. First to hesitate loses.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      difficulty: 2,
      points: 2,
      category: 'knowledge'
    },
    {
      id: '18',
      title: 'Viking King',
      description: 'Be the Viking King! Choose someone to drink whenever you drink for the next 3 rounds.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: false,
      difficulty: 1,
      points: 1,
      category: 'drinking'
    },
    {
      id: '19',
      title: 'Rhyme Time',
      description: 'Say a word. Go around the circle with each person saying a word that rhymes. First to fail loses.',
      type: ChallengeType.ONE_ON_ONE,
      canReuse: true,
      difficulty: 2,
      points: 2,
      category: 'language'
    },
    {
      id: '20',
      title: 'Question Master',
      description: 'You are the Question Master for the next 3 rounds. Anyone who answers your questions must drink.',
      type: ChallengeType.INDIVIDUAL,
      canReuse: false,
      difficulty: 2,
      points: 2,
      category: 'drinking'
    }
  ];
};