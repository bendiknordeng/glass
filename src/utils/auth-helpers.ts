import { useAuth } from '@/contexts/AuthContext';

/**
 * A helper function to ensure the user ID is a valid UUID.
 * This is needed because Supabase expects UUIDs for user_id columns
 * but sometimes the ID might come in a different format.
 */
export function useValidatedAuth() {
  const auth = useAuth();
  
  // Ensure the user ID is a valid UUID if present
  const isValidUuid = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };
  
  // Generate a consistent UUID for a given string
  const generateConsistentUuid = (inputString: string): string => {
    // This is a simple function to generate a UUID-like string
    // In production, you would want a more robust approach
    const hash = Array.from(inputString).reduce(
      (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0
    );
    
    // Format as UUID (this is not cryptographically secure but works for demos)
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(1, 4)}-${hex.slice(0, 12)}`;
  };
  
  // Get a valid user ID for Supabase operations
  const getValidUserId = (): string | undefined => {
    if (!auth.user) return undefined;
    
    const userId = auth.user.id;
    
    if (isValidUuid(userId)) {
      return userId;
    }
    
    console.warn(`User ID "${userId}" is not a valid UUID, generating a consistent UUID instead.`);
    return generateConsistentUuid(userId);
  };
  
  return {
    ...auth,
    getValidUserId,
  };
}

/**
 * Function to generate a default anonymous user ID
 * This should only be used for non-authenticated operations
 */
export function getAnonymousUserId(): string {
  // Check if we have a stored anonymous ID
  const storedId = localStorage.getItem('anonymous_user_id');
  if (storedId) return storedId;
  
  // Generate a new UUID
  const newId = crypto.randomUUID ? 
    crypto.randomUUID() : 
    '00000000-0000-0000-0000-000000000000';
  
  // Store it for future use
  localStorage.setItem('anonymous_user_id', newId);
  return newId;
} 