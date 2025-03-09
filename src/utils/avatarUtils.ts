/**
 * Avatar interface representing a default player avatar
 */
export interface Avatar {
    id: string;
    url: string;
    alt: string;
  }
  
  /**
   * Generates a random string to use as a seed
   * @returns Random string seed
   */
  const generateRandomSeed = (): string => {
    return Math.random().toString(36).substring(2, 15);
  };
  
  /**
   * Generates a random pastel color in hex format
   * @returns Hex color string without the # prefix
   */
  const generatePastelColor = (): string => {
    // Generate pastel colors by using high base values and smaller random variations
    const r = Math.floor((Math.random() * 55) + 200).toString(16);
    const g = Math.floor((Math.random() * 55) + 200).toString(16);
    const b = Math.floor((Math.random() * 55) + 200).toString(16);
    return `${r}${g}${b}`;
  };
  
  /**
   * Creates a new random avatar
   * @returns Random avatar object
   */
  export const getRandomAvatar = (): Avatar => {
    const seed = generateRandomSeed();
    const backgroundColor = generatePastelColor();
    
    return {
      id: `avatar-${seed}`,
      url: `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=${backgroundColor}`,
      alt: 'Random player avatar'
    };
  };
  
  /**
   * Get avatar based on player name
   * @param name - Player name
   * @returns Avatar object
   */
  export const getAvatarByName = (name: string): Avatar => {
    if (!name) return getRandomAvatar();
    
    // Use the name as the seed to ensure consistent avatar for the same name
    const backgroundColor = generatePastelColor();
    
    return {
      id: `avatar-${name}`,
      url: `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(name)}&backgroundColor=${backgroundColor}`,
      alt: `${name}'s avatar`
    };
  };