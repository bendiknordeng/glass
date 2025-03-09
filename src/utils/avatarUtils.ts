/**
 * Avatar interface representing a default player avatar
 */
export interface Avatar {
    id: string;
    url: string;
    alt: string;
  }
  
  /**
   * Default avatars for players who don't upload a profile picture
   * Each avatar is a funny cartoon character
   */
  export const defaultAvatars: Avatar[] = [
    {
      id: 'avatar-1',
      url: '/api/placeholder/150/150?text=🎮',
      alt: 'Gamer avatar'
    },
    {
      id: 'avatar-2',
      url: '/api/placeholder/150/150?text=🎲',
      alt: 'Dice avatar'
    },
    {
      id: 'avatar-3',
      url: '/api/placeholder/150/150?text=🍺',
      alt: 'Beer avatar'
    },
    {
      id: 'avatar-4',
      url: '/api/placeholder/150/150?text=🎭',
      alt: 'Party avatar'
    },
    {
      id: 'avatar-5',
      url: '/api/placeholder/150/150?text=🎯',
      alt: 'Target avatar'
    },
    {
      id: 'avatar-6',
      url: '/api/placeholder/150/150?text=🎪',
      alt: 'Circus avatar'
    },
    {
      id: 'avatar-7',
      url: '/api/placeholder/150/150?text=🧙',
      alt: 'Wizard avatar'
    },
    {
      id: 'avatar-8',
      url: '/api/placeholder/150/150?text=🦸',
      alt: 'Superhero avatar'
    },
    {
      id: 'avatar-9',
      url: '/api/placeholder/150/150?text=🤠',
      alt: 'Cowboy avatar'
    },
    {
      id: 'avatar-10',
      url: '/api/placeholder/150/150?text=🧠',
      alt: 'Brain avatar'
    }
  ];
  
  /**
   * Get a random default avatar
   * @returns Random avatar object
   */
  export const getRandomAvatar = (): Avatar => {
    const randomIndex = Math.floor(Math.random() * defaultAvatars.length);
    return defaultAvatars[randomIndex];
  };
  
  /**
   * Get default avatar based on player name
   * @param name - Player name
   * @returns Avatar object
   */
  export const getAvatarByName = (name: string): Avatar => {
    if (!name) return getRandomAvatar();
    
    // Use the name to deterministically select an avatar
    const nameSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const index = nameSum % defaultAvatars.length;
    
    return defaultAvatars[index];
  };