import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Challenge, 
  ChallengeType, 
  PrebuiltChallengeType,
  SpotifyMusicQuizSettings 
} from '@/types/Challenge';
import { useGame } from '@/contexts/GameContext';
import spotifyService, { SpotifyPlaylist, SpotifyUser } from '@/services/SpotifyService';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { MusicalNoteIcon, PlayCircleIcon, PlusIcon, MinusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

interface SpotifyMusicQuizFormProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeCreated: (challenge: Challenge) => void;
  editChallenge?: Challenge; // Optional challenge for editing mode
}

type FormTab = 'url' | 'playlists';

const SpotifyMusicQuizForm: React.FC<SpotifyMusicQuizFormProps> = ({
  isOpen,
  onClose,
  onChallengeCreated,
  editChallenge
}) => {
  const { t } = useTranslation();
  const { state } = useGame();
  
  // Spotify authentication state
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | undefined>(undefined);
  
  // UI state
  const [activeTab, setActiveTab] = useState<FormTab>('url');
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [hasCredentialsConfigured, setHasCredentialsConfigured] = useState(true);
  
  // Form state
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [numberOfSongs, setNumberOfSongs] = useState(5);
  const [playDurationSeconds, setPlayDurationSeconds] = useState(10);
  const [type, setType] = useState<ChallengeType>(ChallengeType.ALL_VS_ALL);
  const [points, setPoints] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isValidatingPlaylist, setIsValidatingPlaylist] = useState(false);
  const [isExtractingPlaylistDetails, setIsExtractingPlaylistDetails] = useState(false);
  
  // Load values from editChallenge if provided
  useEffect(() => {
    if (editChallenge && editChallenge.prebuiltSettings) {
      const settings = editChallenge.prebuiltSettings as SpotifyMusicQuizSettings;
      
      // Set form values from challenge settings
      setPlaylistUrl(settings.playlistUrl || '');
      setPlaylistName(settings.playlistName || '');
      setNumberOfSongs(settings.numberOfSongs || 5);
      setPlayDurationSeconds(settings.playDurationSeconds || 10);
      setType(editChallenge.type || ChallengeType.ALL_VS_ALL);
      setPoints(editChallenge.points || 3);
      
      // Try to extract playlist ID from URL
      if (settings.playlistUrl) {
        const id = extractPlaylistId(settings.playlistUrl);
        if (id) {
          setPlaylistId(id);
        }
      }
    }
  }, [editChallenge]);
  
  // Check Spotify authentication on mount and when the form opens
  useEffect(() => {
    if (isOpen) {
      const checkAuthentication = async () => {
        // Check if Spotify credentials are configured
        const hasCredentials = spotifyService.hasCredentials();
        setHasCredentialsConfigured(hasCredentials);
        
        if (!hasCredentials) {
          console.error('Spotify API credentials are not configured');
          return;
        }
        
        const isAuthenticated = spotifyService.isAuthenticated();
        setIsSpotifyAuthenticated(isAuthenticated);
        
        if (isAuthenticated) {
          const user = spotifyService.getCurrentUser();
          setSpotifyUser(user);
          loadUserPlaylists();
        }
      };
      
      checkAuthentication();
    }
  }, [isOpen]);
  
  // Load user playlists when authenticated
  const loadUserPlaylists = async () => {
    if (!spotifyService.isAuthenticated()) return;
    
    setIsLoadingPlaylists(true);
    try {
      const userPlaylists = await spotifyService.getUserPlaylists();
      setPlaylists(userPlaylists);
      setFilteredPlaylists(userPlaylists);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };
  
  // Filter playlists based on search query
  useEffect(() => {
    if (playlistSearchQuery.trim() === '') {
      setFilteredPlaylists(playlists);
      return;
    }
    
    const query = playlistSearchQuery.toLowerCase();
    const filtered = playlists.filter(playlist => 
      playlist.name.toLowerCase().includes(query) || 
      playlist.description?.toLowerCase().includes(query)
    );
    
    setFilteredPlaylists(filtered);
  }, [playlistSearchQuery, playlists]);
  
  // Extract playlist ID from URL
  const extractPlaylistId = (url: string): string | null => {
    const regex = /playlist\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Handle selecting a playlist from user's playlists
  const handleSelectPlaylist = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    setPlaylistName(playlist.name);
    setPlaylistId(playlist.id);
    setPlaylistUrl(playlist.external_urls.spotify);
  };

  // Fetch playlist details when URL changes
  useEffect(() => {
    const fetchPlaylistDetails = async () => {
      // Skip if we already have details from selected playlist
      if (selectedPlaylist && selectedPlaylist.external_urls.spotify === playlistUrl) {
        return;
      }
      
      // Validate URL first
      if (!validatePlaylistUrl(playlistUrl)) {
        return;
      }

      const extractedId = extractPlaylistId(playlistUrl);
      if (!extractedId) {
        return;
      }

      setIsExtractingPlaylistDetails(true);

      try {
        // Use the Spotify service to get playlist details
        const playlist = await spotifyService.getPlaylistById(extractedId);
        
        if (playlist) {
          setPlaylistName(playlist.name);
          setPlaylistId(extractedId);
        } else {
          // If we can't get playlist details, use a generic name
          setPlaylistName(`Spotify Playlist (${extractedId.slice(0, 6)}...)`);
          setPlaylistId(extractedId);
        }
      } catch (error) {
        console.error('Error fetching playlist details:', error);
        // Default placeholder if we can't get the actual name
        setPlaylistName('Spotify Playlist');
      } finally {
        setIsExtractingPlaylistDetails(false);
      }
    };

    if (playlistUrl && activeTab === 'url') {
      fetchPlaylistDetails();
    }
  }, [playlistUrl, activeTab, selectedPlaylist]);
  
  // Handle Spotify login
  const handleSpotifyLogin = () => {
    window.location.href = spotifyService.getLoginUrl();
  };
  
  // Handle Spotify logout
  const handleSpotifyLogout = () => {
    spotifyService.logout();
    setIsSpotifyAuthenticated(false);
    setSpotifyUser(undefined);
    setPlaylists([]);
    setFilteredPlaylists([]);
    setSelectedPlaylist(null);
    setActiveTab('url');
  };
  
  // Validation functions
  const validatePlaylistUrl = (url: string): boolean => {
    // Basic Spotify playlist URL validation
    const spotifyPlaylistRegex = /^https:\/\/open\.spotify\.com\/playlist\/[a-zA-Z0-9]+(\?si=[a-zA-Z0-9_-]+)?$/;
    return spotifyPlaylistRegex.test(url);
  };
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // For URL input method
    if (activeTab === 'url') {
      if (!playlistUrl.trim()) {
        errors.playlistUrl = t('validation.required', { field: 'Spotify playlist URL' });
      } else if (!validatePlaylistUrl(playlistUrl)) {
        errors.playlistUrl = t('validation.invalidSpotifyUrl');
      }
    }
    
    // For playlist selection method
    if (activeTab === 'playlists' && !selectedPlaylist) {
      errors.playlist = t('validation.required', { field: 'Playlist' });
    }
    
    // Common validations
    if (numberOfSongs < 1) {
      errors.numberOfSongs = t('validation.minValue', { min: 1 });
    } else if (numberOfSongs > 20) {
      errors.numberOfSongs = t('validation.maxValue', { max: 20 });
    }
    
    if (playDurationSeconds < 5) {
      errors.playDurationSeconds = t('validation.minValue', { min: 5 });
    } else if (playDurationSeconds > 30) {
      errors.playDurationSeconds = t('validation.maxValue', { max: 30 });
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Event handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setIsValidatingPlaylist(true);
    
    try {
      // Generate title with playlist name
      const challengeTitle = playlistName 
        ? `${t('prebuilt.spotifyMusicQuiz.title')}: ${playlistName}`
        : t('prebuilt.spotifyMusicQuiz.title');
      
      // Prepare the challenge settings
      const challengeSettings: SpotifyMusicQuizSettings = {
        playlistUrl: playlistUrl,
        numberOfSongs,
        playDurationSeconds,
        currentSongIndex: editChallenge?.prebuiltSettings 
          ? (editChallenge.prebuiltSettings as SpotifyMusicQuizSettings).currentSongIndex || 0 
          : 0,
        playlistName: playlistName,
        // Preserve any existing selected songs if this is an edit
        selectedSongs: editChallenge?.prebuiltSettings 
          ? (editChallenge.prebuiltSettings as SpotifyMusicQuizSettings).selectedSongs 
          : undefined
      };
      
      if (editChallenge) {
        // Update existing challenge
        const updatedChallenge: Challenge = {
          ...editChallenge,
          title: challengeTitle,
          description: t('prebuilt.spotifyMusicQuiz.description', { numberOfSongs, playDurationSeconds }),
          type,
          points,
          prebuiltSettings: challengeSettings
        };
        
        // Call the callback with the updated challenge
        onChallengeCreated(updatedChallenge);
      } else {
        // Create a new challenge
        const newChallenge: Challenge = {
          id: `spotify-music-quiz-${Date.now()}`,
          title: challengeTitle,
          description: t('prebuilt.spotifyMusicQuiz.description', { numberOfSongs, playDurationSeconds }),
          type,
          canReuse: true,
          points,
          category: 'Music',
          isPrebuilt: true,
          prebuiltType: PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ,
          prebuiltSettings: challengeSettings
        };
        
        // Call the callback with the new challenge
        onChallengeCreated(newChallenge);
      }
      
      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating/updating Spotify Music Quiz challenge:', error);
      setFormErrors({
        ...formErrors,
        general: t('error.general')
      });
    } finally {
      setIsSubmitting(false);
      setIsValidatingPlaylist(false);
    }
  };
  
  const resetForm = () => {
    setPlaylistUrl('');
    setPlaylistName('');
    setPlaylistId('');
    setNumberOfSongs(5);
    setPlayDurationSeconds(10);
    setType(ChallengeType.ALL_VS_ALL);
    setPoints(3);
    setFormErrors({});
    setActiveTab('url');
    setSelectedPlaylist(null);
    setPlaylistSearchQuery('');
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Render playlist selection UI
  const renderPlaylistSelection = () => {
    // Show warning if credentials are not configured
    if (!hasCredentialsConfigured) {
      return (
        <div className="border-2 border-red-400 dark:border-red-700 rounded-lg p-4 text-center bg-red-50 dark:bg-red-900/20">
          <div className="mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">
              Spotify Configuration Error
            </h3>
            <p className="text-red-600 dark:text-red-300 mb-4">
              Spotify API credentials are not properly configured. Please add valid VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_CLIENT_SECRET to your .env file.
            </p>
          </div>
          <p className="text-sm text-red-600 dark:text-red-300">
            Contact the app administrator for assistance.
          </p>
        </div>
      );
    }
    
    if (!isSpotifyAuthenticated) {
      return (
        <div className="text-center py-8">
          <div className="mb-4">
            <MusicalNoteIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('prebuilt.spotifyMusicQuiz.spotifyLoginRequired')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              {t('prebuilt.spotifyMusicQuiz.spotifyLoginHelp')}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleSpotifyLogin}
            leftIcon={<MusicalNoteIcon className="h-5 w-5" />}
          >
            {t('prebuilt.spotifyMusicQuiz.connectSpotify')}
          </Button>
        </div>
      );
    }
    
    return (
      <div>
        {/* User info */}
        {spotifyUser && (
          <div className="flex items-center mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {spotifyUser.images && spotifyUser.images.length > 0 ? (
              <img 
                src={spotifyUser.images[0].url} 
                alt={spotifyUser.displayName} 
                className="w-10 h-10 rounded-full mr-3"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full mr-3 flex items-center justify-center">
                <MusicalNoteIcon className="h-5 w-5 text-gray-500" />
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('auth.spotifyLoggedInAs')}
              </div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {spotifyUser.displayName || spotifyUser.email}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSpotifyLogout}
            >
              {t('common.logout')}
            </Button>
          </div>
        )}
        
        {/* Search bar */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('prebuilt.spotifyMusicQuiz.searchPlaylists')}
              value={playlistSearchQuery}
              onChange={(e) => setPlaylistSearchQuery(e.target.value)}
              className="block w-full pl-10 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-game-primary focus:border-game-primary sm:text-sm dark:bg-gray-800 dark:text-white"
              disabled={isLoadingPlaylists}
            />
          </div>
        </div>
        
        {/* Playlists grid */}
        {isLoadingPlaylists ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-game-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('prebuilt.spotifyMusicQuiz.loadingSongs')}
            </p>
          </div>
        ) : filteredPlaylists.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <MusicalNoteIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('prebuilt.spotifyMusicQuiz.noPlaylists')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('prebuilt.spotifyMusicQuiz.noPlaylistsMessage')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
            {filteredPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => handleSelectPlaylist(playlist)}
                className={`flex border p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedPlaylist?.id === playlist.id
                    ? 'border-game-primary bg-game-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="w-16 h-16 mr-3 flex-shrink-0 overflow-hidden rounded-md">
                  {playlist.images && playlist.images.length > 0 ? (
                    <img
                      src={playlist.images[0].url}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <MusicalNoteIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {playlist.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('prebuilt.spotifyMusicQuiz.playlistOwner', { owner: playlist.owner.displayName })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('prebuilt.spotifyMusicQuiz.tracks', { count: playlist.trackCount })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {formErrors.playlist && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-500">
            {formErrors.playlist}
          </p>
        )}
      </div>
    );
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('prebuilt.spotifyMusicQuiz.formTitle')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form error display */}
        {formErrors.general && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
            {formErrors.general}
          </div>
        )}
        
        {/* Playlist selection tabs */}
        <div>
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`py-2 px-4 text-sm font-medium rounded-t-md focus:outline-none ${
                activeTab === 'url'
                  ? 'bg-white dark:bg-gray-800 dark:text-gray-200 dark:hover:text-gray-100 border-l border-r border-t border-gray-200 dark:border-gray-700 -mb-px'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('prebuilt.spotifyMusicQuiz.publicPlaylist')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isSpotifyAuthenticated) {
                  setActiveTab('playlists');
                } else {
                  handleSpotifyLogin();
                }
              }}
              className={`py-2 px-4 text-sm font-medium rounded-t-md focus:outline-none ${
                activeTab === 'playlists'
                  ? 'bg-white dark:bg-gray-800 dark:text-gray-200 dark:hover:text-gray-100 border-l border-r border-t border-gray-200 dark:border-gray-700 -mb-px'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('prebuilt.spotifyMusicQuiz.yourPlaylists')}
            </button>
          </div>
          
          {/* URL input tab */}
          {activeTab === 'url' && (
            <div>
              <label htmlFor="playlist-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('prebuilt.spotifyMusicQuiz.playlistUrl')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MusicalNoteIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="playlist-url"
                  type="text"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className={`
                    block w-full pl-10 pr-12 py-2 sm:text-sm border-gray-300 dark:border-gray-700 rounded-md shadow-sm 
                    focus:ring-game-primary focus:border-game-primary dark:bg-gray-800 dark:text-white
                    ${formErrors.playlistUrl ? 'border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500' : ''}
                  `}
                  placeholder="https://open.spotify.com/playlist/..."
                  disabled={isSubmitting}
                />
                {isExtractingPlaylistDetails && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-game-primary"></div>
                  </div>
                )}
              </div>
              {formErrors.playlistUrl && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                  {formErrors.playlistUrl}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('prebuilt.spotifyMusicQuiz.playlistUrlHelp')}
              </p>
              {playlistName && activeTab === 'url' && (
                <div className="mt-3 border rounded-lg p-3 bg-white dark:bg-gray-800 shadow-sm">
                  <div className="flex items-center">
                    <div className="w-16 h-16 mr-3 flex-shrink-0 overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {isExtractingPlaylistDetails ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-game-primary"></div>
                      ) : (
                        <MusicalNoteIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-pastel-green mb-1">
                        {t('common.selected')}
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {playlistName}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('prebuilt.spotifyMusicQuiz.playlistUrl')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* User playlists tab */}
          {activeTab === 'playlists' && renderPlaylistSelection()}
        </div>
        
        {/* Number of Songs */}
        <div>
          <label htmlFor="number-of-songs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('prebuilt.spotifyMusicQuiz.numberOfSongs')} *
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setNumberOfSongs(Math.max(1, numberOfSongs - 1))}
              className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              disabled={numberOfSongs <= 1 || isSubmitting}
            >
              <MinusIcon className="h-5 w-5" />
            </button>
            <div className="w-16 text-center font-medium text-gray-900 dark:text-white">
              {numberOfSongs}
            </div>
            <button
              type="button"
              onClick={() => setNumberOfSongs(Math.min(20, numberOfSongs + 1))}
              className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              disabled={numberOfSongs >= 20 || isSubmitting}
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
          {formErrors.numberOfSongs && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {formErrors.numberOfSongs}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('prebuilt.spotifyMusicQuiz.numberOfSongsHelp')}
          </p>
        </div>
        
        {/* Play Duration */}
        <div>
          <label htmlFor="play-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('prebuilt.spotifyMusicQuiz.playDuration')} * <span className="font-normal text-gray-500">({playDurationSeconds}s)</span>
          </label>
          <input
            id="play-duration"
            type="range"
            min="5"
            max="30"
            step="1"
            value={playDurationSeconds}
            onChange={(e) => setPlayDurationSeconds(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            disabled={isSubmitting}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>5s</span>
            <span>30s</span>
          </div>
          {formErrors.playDurationSeconds && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {formErrors.playDurationSeconds}
            </p>
          )}
        </div>
        
        {/* Challenge Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('challenges.challengeType')} *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setType(ChallengeType.INDIVIDUAL)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${type === ChallengeType.INDIVIDUAL 
                  ? 'bg-pastel-blue text-gray-800 border-2 border-pastel-blue' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-pastel-blue/20'}
              `}
              disabled={isSubmitting}
            >
              {t('game.challengeTypes.individual')}
            </button>
            
            <button
              type="button"
              onClick={() => setType(ChallengeType.ONE_ON_ONE)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${type === ChallengeType.ONE_ON_ONE 
                  ? 'bg-pastel-orange text-gray-800 border-2 border-pastel-orange' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-pastel-orange/20'}
              `}
              disabled={isSubmitting}
            >
              {t('game.challengeTypes.oneOnOne')}
            </button>
            
            <button
              type="button"
              onClick={() => setType(ChallengeType.TEAM)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${type === ChallengeType.TEAM 
                  ? 'bg-pastel-green text-gray-800 border-2 border-pastel-green' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-pastel-green/20'}
              `}
              disabled={isSubmitting}
            >
              {t('game.challengeTypes.team')}
            </button>
            
            <button
              type="button"
              onClick={() => setType(ChallengeType.ALL_VS_ALL)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${type === ChallengeType.ALL_VS_ALL 
                  ? 'bg-pastel-purple text-gray-800 border-2 border-pastel-purple' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-pastel-purple/20'}
              `}
              disabled={isSubmitting}
            >
              {t('game.challengeTypes.allVsAll')}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('prebuilt.spotifyMusicQuiz.challengeTypeHelp')}
          </p>
        </div>
        
        {/* Points */}
        <div>
          <label htmlFor="challenge-points" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('common.points')} * <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(1-10)</span>
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setPoints(Math.max(1, points - 1))}
              className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              disabled={points <= 1 || isSubmitting}
            >
              <MinusIcon className="h-5 w-5" />
            </button>
            <div className="w-16 text-center font-medium text-gray-900 dark:text-white">
              {points}
            </div>
            <button
              type="button"
              onClick={() => setPoints(Math.min(10, points + 1))}
              className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              disabled={points >= 10 || isSubmitting}
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            type="button"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting || (activeTab === 'playlists' && !selectedPlaylist) || (activeTab === 'url' && !playlistUrl)}
            leftIcon={<PlayCircleIcon className="h-5 w-5" />}
          >
            {isValidatingPlaylist ? t('prebuilt.spotifyMusicQuiz.validating') : t('prebuilt.spotifyMusicQuiz.createChallenge')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SpotifyMusicQuizForm; 