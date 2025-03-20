import { Player } from '@/types/Player';
import { Team, GameMode } from '@/types/Team';
import { Challenge, ChallengeResult, ChallengeType } from '@/types/Challenge';
import { getAvatarByName, getRandomAvatar } from './avatarUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique ID using UUID v4
 * @returns A unique UUID string
 */
export const generateId = (): string => {
  return uuidv4();
};

/**
 * Creates random teams from a list of players
 * @param players List of players to divide into teams
 * @param numTeams Number of teams to create
 * @returns Array of Team objects
 */
export const createRandomTeams = (players: Player[], numTeams: number): Team[] => {
  // Ensure we have at least one team and at least one player per team
  const actualNumTeams = Math.min(numTeams, players.length);
  
  // Shuffle players
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  
  // Create teams
  const teams: Team[] = Array.from({ length: actualNumTeams }, (_, i) => ({
    id: generateId(),
    name: `Team ${i + 1}`,
    color: getTeamColor(i),
    playerIds: [],
    score: 0,
  }));
  
  // Distribute players evenly among teams
  shuffledPlayers.forEach((player, index) => {
    const teamIndex = index % actualNumTeams;
    teams[teamIndex].playerIds.push(player.id);
  });
  
  return teams;
};

/**
 * Gets a color for a team based on index
 * @param index Team index
 * @returns CSS color class name
 */
export const getTeamColor = (index: number): string => {
  const colors = [
    'pastel-blue',
    'pastel-pink',
    'pastel-yellow',
    'pastel-green',
    'pastel-purple',
    'pastel-orange',
  ];
  return colors[index % colors.length];
};

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param array Array to shuffle
 * @returns New shuffled array
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Calculates current standings (scores)
 * @param players List of players
 * @param teams List of teams
 * @param gameMode Current game mode
 * @returns Array of player or team standings
 */
export const calculateStandings = (
  players: Player[],
  teams: Team[],
  gameMode: GameMode
): { id: string; name: string; score: number; type: 'player' | 'team' }[] => {
  if (gameMode === GameMode.TEAMS) {
    return teams
      .map(team => ({
        id: team.id,
        name: team.name,
        score: team.score,
        type: 'team' as const,
      }))
      .sort((a, b) => b.score - a.score);
  } else {
    return players
      .map(player => ({
        id: player.id,
        name: player.name,
        score: player.score,
        type: 'player' as const,
      }))
      .sort((a, b) => b.score - a.score);
  }
};

/**
 * Gets player or team info by ID
 * @param id Player or team ID
 * @param players List of players
 * @param teams List of teams
 * @returns Player or team info, or null if not found
 */
export const getParticipantById = (
  id: string,
  players: Player[],
  teams: Team[]
): { id: string; name: string; type: 'player' | 'team' } | null => {
  // Check if ID is a team ID
  const team = teams.find(t => t.id === id);
  if (team) {
    return { id: team.id, name: team.name, type: 'team' };
  }
  
  // Check if ID is a player ID
  const player = players.find(p => p.id === id);
  if (player) {
    return { id: player.id, name: player.name, type: 'player' };
  }
  
  // Handle special case for free-for-all team challenges
  if (id.startsWith('group')) {
    const groupNumber = id.startsWith('group1:') ? 1 : 2;
    return { id, name: `Group ${groupNumber}`, type: 'team' };
  }
  
  return null;
};

/**
 * Gets player IDs for a group (used in free-for-all team challenges)
 * @param groupId Group ID string (e.g., 'group1:id1,id2,id3')
 * @returns Array of player IDs
 */
export const getPlayerIdsFromGroup = (groupId: string): string[] => {
  const parts = groupId.split(':');
  if (parts.length !== 2) return [];
  return parts[1].split(',');
};

/**
 * Formats a time duration in minutes and seconds
 * @param timeInSeconds Time in seconds
 * @returns Formatted time string (MM:SS)
 */
export const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Gets the appropriate image for a player or placeholder if none
 * @param imageUrl Player's image URL or base64
 * @param playerName Optional player name for deterministic avatar selection
 * @returns Image URL to use
 */
export const getPlayerImage = (imageUrl: string | undefined, playerName?: string): string => {
  // If image is undefined or empty, use avatar
  if (!imageUrl) {
    return playerName ? getAvatarByName(playerName).url : getRandomAvatar().url;
  }
  
  // Handle any avatar references we might get
  if (imageUrl.startsWith('avatar_ref_')) {
    try {
      // Extract player name from reference (format: avatar_ref_id|encodedName)
      const parts = imageUrl.split('|');
      const name = parts.length > 1 ? decodeURIComponent(parts[1]) : playerName || '';
      return getAvatarByName(name).url;
    } catch (error) {
      console.error('Error generating avatar from reference:', error);
      return playerName ? getAvatarByName(playerName).url : getRandomAvatar().url;
    }
  }
  
  // Return the actual image URL for all other cases
  return imageUrl;
};

/**
 * Converts a file to a base64 data URL
 * @param file File to convert
 * @returns Promise resolving to a base64 data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Gets player names for a challenge result display
 * @param result Challenge result
 * @param players List of players
 * @param teams List of teams
 * @param gameMode Current game mode
 * @returns Object with participant names
 */
export const getChallengeParticipantNames = (
  result: ChallengeResult,
  players: Player[],
  teams: Team[],
  gameMode: GameMode
): { participants: string[]; winner: string | null } => {
  const participantNames: string[] = [];
  let winnerName: string | null = null;
  
  result.participantIds.forEach(id => {
    const participant = getParticipantById(id, players, teams);
    if (participant) {
      participantNames.push(participant.name);
      
      if (result.winnerId === id) {
        winnerName = participant.name;
      }
    }
  });
  
  return { participants: participantNames, winner: winnerName };
};