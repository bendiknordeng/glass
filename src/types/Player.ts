/**
 * Player interface representing a participant in the game
 */
export interface Player {
    id: string;
    name: string;
    image: string; // URL to the image or base64 encoded image data
    score: number;
    teamId?: string; // Optional team ID, undefined for free-for-all mode
  }
  
  /**
   * Player creation input interface for the registration form
   */
  export interface PlayerInput {
    name: string;
    image?: File; // Optional image file upload
  }