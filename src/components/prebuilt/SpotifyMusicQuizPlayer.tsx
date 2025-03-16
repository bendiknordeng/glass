import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Challenge, 
  SpotifyMusicQuizSettings,
  SpotifySong 
} from '@/types/Challenge';
import { useGame } from '@/contexts/GameContext';
import spotifyService from '@/services/SpotifyService';
import Button from '@/components/common/Button';
import { 
  PlayCircleIcon, 
  PauseCircleIcon, 
  ForwardIcon, 
  QuestionMarkCircleIcon,
  EyeIcon,
  MusicalNoteIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

interface SpotifyMusicQuizPlayerProps {
  challenge: Challenge;
  onComplete: (completed: boolean, winnerId?: string) => void;
}

const SpotifyMusicQuizPlayer: React.FC<SpotifyMusicQuizPlayerProps> = ({
  challenge,
  onComplete
}) => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  
  // Type assertion for the challenge settings
  const settings = challenge.prebuiltSettings as SpotifyMusicQuizSettings;
  
  // Player state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [songs, setSongs] = useState<SpotifySong[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(settings.currentSongIndex || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [playTimerProgress, setPlayTimerProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Audio player ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Timer refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Extract playlist ID from URL
  const extractPlaylistId = (url: string): string | null => {
    const regex = /playlist\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };
  
  // Fetch songs from Spotify playlist
  const fetchSongsFromPlaylist = async (playlistUrl: string, count: number): Promise<SpotifySong[]> => {
    try {
      // Extract playlist ID from URL
      const playlistId = extractPlaylistId(playlistUrl);
      if (!playlistId) {
        throw new Error('Invalid playlist URL');
      }
      
      // Get tracks using Spotify service
      const spotifyTracks = await spotifyService.getPlaylistTracks(playlistId, Math.max(50, count * 2));
      
      // If we got tracks, check if we have any with preview URLs
      if (spotifyTracks.length === 0) {
        throw new Error('No tracks found in this playlist. Please try another playlist.');
      }
      
      // Filter tracks that have preview URLs
      const tracksWithPreviews = spotifyTracks.filter(track => track.previewUrl);
      
      if (tracksWithPreviews.length === 0) {
        throw new Error('No tracks with playable audio found in this playlist. Please try another playlist.');
      }
      
      // Shuffle and take requested number
      const shuffled = [...tracksWithPreviews].sort(() => 0.5 - Math.random());
      const selectedTracks = shuffled.slice(0, Math.min(count, shuffled.length));
      
      // Map to our SpotifySong interface
      return selectedTracks.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artist,
        previewUrl: track.previewUrl || '',
        albumArt: track.albumArt,
        isRevealed: false,
        isPlaying: false
      }));
    } catch (error) {
      console.error('Error fetching songs from Spotify:', error);
      throw error; // Re-throw to handle in the calling code
    }
  };
  
  // Generate mock songs for fallback or demonstration
  const generateMockSongs = (count: number): SpotifySong[] => {
    return [
      {
        id: 'track1',
        name: 'Spotify Preview Unavailable',
        artist: 'Please try a different playlist',
        previewUrl: '',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273d7fb5095313b5c82c64c8940',
        isRevealed: false,
        isPlaying: false
      }
    ];
  };
  
  // Initialize by fetching songs from the playlist
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        // Check if we already have songs from a previous state
        if (settings.selectedSongs && settings.selectedSongs.length > 0) {
          setSongs(settings.selectedSongs);
        } else {
          try {
            // Fetch new songs from the playlist
            const fetchedSongs = await fetchSongsFromPlaylist(
              settings.playlistUrl,
              settings.numberOfSongs
            );
            
            setSongs(fetchedSongs);
            
            // Update the challenge settings with the selected songs
            dispatch({
              type: 'UPDATE_CUSTOM_CHALLENGE',
              payload: {
                ...challenge,
                prebuiltSettings: {
                  ...settings,
                  selectedSongs: fetchedSongs
                }
              }
            });
          } catch (error) {
            console.error('Error loading songs:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            setError(errorMessage);
            
            // If we couldn't fetch songs, show error but don't use mock songs
            setSongs([]);
            onComplete(false);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
    
    // Clean up on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [challenge, settings, dispatch]);
  
  // Helper function to check if a URL is from an alternative source
  const isAlternativeSource = (url: string | null | undefined): boolean => {
    // We no longer need to identify alternative sources
    return false;
  };
  
  // Update audio element when current song changes
  useEffect(() => {
    if (songs.length > 0 && currentSongIndex < songs.length) {
      const current = songs[currentSongIndex];
      
      if (audioRef.current) {
        // Log the preview URL we're attempting to use
        console.log(`Setting audio source to: ${current.previewUrl}`);
        audioRef.current.src = current.previewUrl;
        audioRef.current.crossOrigin = "anonymous"; // Handle CORS for alternative sources
        
        // Add error handler for audio loading
        const handleAudioError = (e: ErrorEvent) => {
          console.error('Error loading audio:', current.previewUrl, e);
          
          // If we can't load this song's audio, try to skip to the next one
          if (currentSongIndex < songs.length - 1) {
            setCurrentSongIndex(prevIndex => prevIndex + 1);
          } else {
            setError('Unable to play audio. The preview may not be available.');
          }
        };
        
        const handleCanPlay = () => {
          console.log('Audio is ready to play');
        };
        
        audioRef.current.addEventListener('error', handleAudioError as EventListener);
        audioRef.current.addEventListener('canplay', handleCanPlay);
        
        // Load the audio file
        audioRef.current.load();
        
        return () => {
          if (audioRef.current) {
            audioRef.current.removeEventListener('error', handleAudioError as EventListener);
            audioRef.current.removeEventListener('canplay', handleCanPlay);
            // Important: pause any currently playing audio before changing source
            audioRef.current.pause();
          }
        };
      }
      
      // Update the challenge settings with the current song index
      dispatch({
        type: 'UPDATE_CUSTOM_CHALLENGE',
        payload: {
          ...challenge,
          prebuiltSettings: {
            ...settings,
            currentSongIndex
          }
        }
      });
    }
  }, [currentSongIndex, songs, challenge, settings, dispatch]);
  
  // Play the current song for the specified duration
  const playSong = () => {
    if (!audioRef.current || songs.length === 0 || currentSongIndex >= songs.length) {
      console.error('Cannot play song: audio element or songs not available');
      return;
    }
    
    const song = songs[currentSongIndex];
    console.log(`Attempting to play: ${song.name} by ${song.artist}, URL: ${song.previewUrl}`);
    
    setIsPlaying(true);
    setHasStarted(true);
    
    // Update the song state
    setSongs(prevSongs => 
      prevSongs.map((s, i) => 
        i === currentSongIndex 
          ? { ...s, isPlaying: true } 
          : { ...s, isPlaying: false }
      )
    );
    
    // Play the audio with error handling
    try {
      // Make sure audio is at the beginning
      audioRef.current.currentTime = 0;
      
      // Create a function to actually play the audio
      const attemptPlay = () => {
        console.log('Attempting to play audio...');
        
        // Regular audio playback for actual preview URLs
        const playPromise = audioRef.current?.play();
        
        // Handle promise rejection (browsers might return a promise from play())
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Audio playback started successfully');
            })
            .catch(error => {
              console.error('Error playing audio:', error);
              setIsPlaying(false);
              
              // Update UI to show error state
              setSongs(prevSongs => 
                prevSongs.map((s, i) => 
                  i === currentSongIndex 
                    ? { ...s, isPlaying: false } 
                    : s
                )
              );
              
              // Check for autoplay policy error
              if (error.name === 'NotAllowedError') {
                setError('Autoplay was blocked by your browser. Please click play again to start playback.');
              } else {
                setError(`Error playing audio: ${error.message}. Try clicking play again or use a different playlist.`);
              }
            });
        }
      };
      
      // Check if the audio is ready to play
      if (audioRef.current.readyState >= 2) {
        // Audio is loaded enough to play
        attemptPlay();
      } else {
        // Wait for the audio to be loaded
        console.log('Waiting for audio to load before playing...');
        
        const canPlayHandler = () => {
          console.log('Audio can now play, starting playback...');
          attemptPlay();
          audioRef.current?.removeEventListener('canplay', canPlayHandler);
        };
        
        audioRef.current.addEventListener('canplay', canPlayHandler);
        
        // Set a timeout in case the canplay event doesn't fire
        setTimeout(() => {
          if (audioRef.current) {
            // If still waiting, try to play anyway
            console.log('Timeout reached, attempting to play anyway...');
            if (audioRef.current.readyState > 0) {
              attemptPlay();
            } else {
              console.error('Audio not ready after timeout');
              setError('Could not load audio. The preview may not be available.');
              setIsPlaying(false);
            }
            audioRef.current.removeEventListener('canplay', canPlayHandler);
          }
        }, 2000);
      }
      
      // Set a timer to pause after the specified duration
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      timerRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
        
        // Update the song state
        setSongs(prevSongs => 
          prevSongs.map((s, i) => 
            i === currentSongIndex 
              ? { ...s, isPlaying: false } 
              : s
          )
        );
      }, settings.playDurationSeconds * 1000);
    } catch (error) {
      console.error('Error in play attempt:', error);
      setIsPlaying(false);
    }
    
    // Progress indicator
    setPlayTimerProgress(0);
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    const intervalDuration = 100; // Update every 100ms for smooth progress
    progressIntervalRef.current = setInterval(() => {
      setPlayTimerProgress(prev => {
        const newProgress = prev + (intervalDuration / (settings.playDurationSeconds * 1000)) * 100;
        return newProgress > 100 ? 100 : newProgress;
      });
    }, intervalDuration);
  };
  
  // Pause the current song
  const pauseSong = () => {
    if (!audioRef.current) {
      return;
    }
    
    setIsPlaying(false);
    audioRef.current.pause();
    
    // Update the song state
    setSongs(prevSongs => 
      prevSongs.map((s, i) => 
        i === currentSongIndex 
          ? { ...s, isPlaying: false } 
          : s
      )
    );
    
    // Clear timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };
  
  // Reveal the current song
  const revealSong = () => {
    setIsRevealed(true);
    pauseSong(); // Pause the song when revealing
    
    // Update the song state
    setSongs(prevSongs => 
      prevSongs.map((s, i) => 
        i === currentSongIndex 
          ? { ...s, isRevealed: true, isPlaying: false } 
          : s
      )
    );
  };
  
  // Move to the next song
  const nextSong = () => {
    pauseSong(); // Pause the current song
    
    if (currentSongIndex < songs.length - 1) {
      setCurrentSongIndex(prevIndex => prevIndex + 1);
      setIsRevealed(false);
      setPlayTimerProgress(0);
    } else {
      // No more songs, complete the challenge
      onComplete(true);
    }
  };
  
  // Reset the current song (play again from start)
  const resetSong = () => {
    pauseSong();
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    
    setPlayTimerProgress(0);
    playSong();
  };
  
  // Get the current song
  const currentSong = songs.length > 0 && currentSongIndex < songs.length 
    ? songs[currentSongIndex] 
    : null;
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pastel-purple mb-4"></div>
        <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
          {t('prebuilt.spotifyMusicQuiz.loadingSongs')}
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
          {t('prebuilt.spotifyMusicQuiz.pleaseWait')}
        </p>
      </div>
    );
  }
  
  if (!currentSong) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-md">
        <h3 className="text-lg font-semibold mb-2">{t('prebuilt.spotifyMusicQuiz.noSongs')}</h3>
        <p>{t('prebuilt.spotifyMusicQuiz.noSongsMessage')}</p>
        <div className="mt-4">
          <Button
            variant="danger"
            onClick={() => onComplete(false)}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center p-4">
      {/* Show error message if any, but don't prevent player from working */}
      {error && (
        <div className="w-full mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-6 py-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Audio Notice
          </h3>
          <p className="mb-2">{error}</p>
        </div>
      )}
      
      {/* Playlist Name */}
      {settings.playlistName && (
        <div className="w-full mb-4 text-center">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
            {settings.playlistName}
          </h3>
        </div>
      )}
      
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />
      
      {/* Progress indicator */}
      <div className="w-full mb-6">
        <div className="flex justify-between mb-1 text-xs text-gray-600 dark:text-gray-400">
          <span>{`${currentSongIndex + 1} / ${songs.length}`}</span>
          {hasStarted && (
            <span>{Math.round(playTimerProgress)}%</span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-pastel-purple h-2.5 rounded-full transition-all duration-100"
            style={{ width: `${hasStarted ? playTimerProgress : 0}%` }}
          ></div>
        </div>
      </div>
      
      {/* Music visualization or album art */}
      <AnimatePresence mode="wait">
        {isRevealed ? (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="w-64 h-64 rounded-lg overflow-hidden shadow-lg mb-6"
          >
            <img
              src={currentSong.albumArt}
              alt={`${currentSong.name} album art`}
              className="w-full h-full object-cover"
            />
          </motion.div>
        ) : (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="w-64 h-64 rounded-lg bg-gradient-to-br from-pastel-blue via-pastel-purple to-pastel-pink flex items-center justify-center mb-6 shadow-lg relative overflow-hidden"
          >
            {/* Music visualization animation */}
            <div className="absolute inset-0 flex items-center justify-center mt-[50%]">
              {isPlaying ? (
                // Active visualization
                <div className="flex items-end space-x-1 h-24">
                  {[...Array(10)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-2 bg-white bg-opacity-80 rounded-full"
                      animate={{
                        height: [
                          `${20 + Math.random() * 30}%`,
                          `${20 + Math.random() * 30}%`,
                          `${20 + Math.random() * 30}%`,
                          `${20 + Math.random() * 30}%`,
                        ]
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: i * 0.05
                      }}
                    />
                  ))}
                </div>
              ) : (
                // Static visualization
                <div className="flex items-end space-x-1 h-24">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 bg-white bg-opacity-60 rounded-full"
                      style={{ height: `${20 + Math.floor(Math.random() * 30)}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Question mark or note icon */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={isPlaying ? { scale: [1, 1.1, 1], rotate: [0, 5, 0, -5, 0] } : {}}
              transition={{ 
                duration: 2,
                repeat: isPlaying ? Infinity : 0,
                repeatType: "loop"
              }}
            >
              <QuestionMarkCircleIcon className="h-24 w-24 text-white text-opacity-60" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Song info - only shown when revealed */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-6"
          >
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {currentSong.name}
            </h3>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              {currentSong.artist}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Control buttons */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        {!isRevealed && (
          <>
            {isPlaying ? (
              <Button
                variant="secondary"
                leftIcon={<PauseCircleIcon className="h-5 w-5" />}
                onClick={pauseSong}
              >
                {t('prebuilt.spotifyMusicQuiz.pause')}
              </Button>
            ) : (
              <Button
                variant="primary"
                leftIcon={<PlayCircleIcon className="h-5 w-5" />}
                onClick={playSong}
              >
                {hasStarted ? t('prebuilt.spotifyMusicQuiz.playAgain') : t('prebuilt.spotifyMusicQuiz.play')}
              </Button>
            )}
            
            {hasStarted && (
              <Button
                variant="info"
                leftIcon={<ArrowPathIcon className="h-5 w-5" />}
                onClick={resetSong}
              >
                {t('prebuilt.spotifyMusicQuiz.restart')}
              </Button>
            )}
          </>
        )}
        
        {!isRevealed && hasStarted && (
          <Button
            variant="success"
            leftIcon={<EyeIcon className="h-5 w-5" />}
            onClick={revealSong}
          >
            {t('prebuilt.spotifyMusicQuiz.reveal')}
          </Button>
        )}
        
        {(isRevealed || currentSongIndex === songs.length - 1) && (
          <Button
            variant={currentSongIndex === songs.length - 1 ? "success" : "primary"}
            leftIcon={<ForwardIcon className="h-5 w-5" />}
            onClick={nextSong}
          >
            {currentSongIndex === songs.length - 1 
              ? t('prebuilt.spotifyMusicQuiz.finish') 
              : t('prebuilt.spotifyMusicQuiz.nextSong')}
          </Button>
        )}
      </div>
      
      {/* Song counter */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        {t('prebuilt.spotifyMusicQuiz.songCounter', { 
          current: currentSongIndex + 1, 
          total: songs.length 
        })}
      </div>
    </div>
  );
};

export default SpotifyMusicQuizPlayer; 