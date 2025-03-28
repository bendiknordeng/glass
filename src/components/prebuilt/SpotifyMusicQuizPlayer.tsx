import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Challenge,
  SpotifyMusicQuizSettings,
  SpotifySong,
  ChallengeType,
} from "@/types/Challenge";
import { useGame } from "@/contexts/GameContext";
import spotifyService, {
  SpotifyTrack,
  GetPlaylistTracksOptions,
} from "@/services/SpotifyService";
import Button from "@/components/common/Button";
import { Player } from "@/types/Player";
import { Team, GameMode } from "@/types/Team";
import PlayerCard from "@/components/common/PlayerCard";
import TeamCard from "@/components/common/TeamCard";
import {
  ArrowPathIcon,
  MusicalNoteIcon,
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  TrophyIcon,
  UserIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import { getParticipantById } from "@/utils/helpers";

interface SpotifyMusicQuizPlayerProps {
  challenge: Challenge;
  onComplete: (
    completed: boolean,
    winnerId?: string,
    scores?: Record<string, number>
  ) => void;
  selectedParticipantPlayers?: Player[];
  forceRefreshSongs?: boolean;
}

const SpotifyMusicQuizPlayer: React.FC<SpotifyMusicQuizPlayerProps> = ({
  challenge,
  onComplete,
  selectedParticipantPlayers,
  forceRefreshSongs = false,
}) => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();

  // Type assertion for the challenge settings
  const settings = challenge.prebuiltSettings as SpotifyMusicQuizSettings;

  // Player state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [songs, setSongs] = useState<SpotifySong[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(
    settings.currentSongIndex || 0
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [playTimerProgress, setPlayTimerProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Track scoring
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [songPoints, setSongPoints] = useState<Record<string, string>>({});
  // Track whether points have already been awarded for current song
  const [pointsAwarded, setPointsAwarded] = useState<boolean>(false);

  // Audio player ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Timer refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a flag to track initialization attempts
  const initAttemptedRef = useRef(false);

  // Extract playlist ID from URL
  const extractPlaylistId = (url: string): string | null => {
    const regex = /playlist\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Fetch songs from Spotify playlist - optimize to fetch only what we need
  const fetchSongsFromPlaylist = async (
    playlistUrl: string,
    count: number
  ): Promise<SpotifySong[]> => {
    try {
      // Validate playlist URL
      if (!playlistUrl || playlistUrl.trim() === "") {
        console.error("Empty playlist URL provided");
        throw new Error("Playlist URL is empty or invalid");
      }

      console.log(`Attempting to fetch songs from playlist: ${playlistUrl}`);

      // Extract playlist ID from URL
      const playlistId = extractPlaylistId(playlistUrl);
      if (!playlistId) {
        console.error("Failed to extract playlist ID from URL:", playlistUrl);
        throw new Error(
          "Invalid playlist URL format. Please check the URL and try again."
        );
      }

      // Add a timeout promise to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Spotify API request timed out")),
          10000
        );
      });

      // Get tracks using Spotify service with timeout and explicit randomization
      // Request slightly more tracks than needed to account for those without preview URLs
      const options: GetPlaylistTracksOptions = {
        limit: Math.min(100, count * 3), // Request at most 3x needed tracks, capped at 100
        randomize: true, // Always randomize when fetching
      };

      const spotifyTracksPromise = spotifyService.getPlaylistTracks(
        playlistId,
        options
      );

      // Race the promises to handle timeouts
      const spotifyTracks = (await Promise.race([
        spotifyTracksPromise,
        timeoutPromise,
      ])) as SpotifyTrack[];

      console.log(`Received ${spotifyTracks?.length || 0} tracks from Spotify`);

      // If we got tracks, check if we have any with preview URLs
      if (!spotifyTracks || spotifyTracks.length === 0) {
        console.warn("No tracks found in this playlist");
        // If in development mode, use mock data to avoid errors during testing
        if (process.env.NODE_ENV === "development") {
          console.warn("No tracks found, using mock data in development mode");
          return generateMockSongs(count);
        }
        throw new Error(
          "No tracks found in this playlist. Please try another playlist with more songs."
        );
      }

      // Filter tracks that have preview URLs
      const tracksWithPreviews = spotifyTracks.filter(
        (track) => track.previewUrl
      );
      console.log(
        `Found ${tracksWithPreviews.length} tracks with preview URLs`
      );

      if (tracksWithPreviews.length === 0) {
        console.warn("No tracks with preview URLs found");
        // If in development mode, use mock data to avoid errors during testing
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "No tracks with preview URLs found, using mock data in development mode"
          );
          return generateMockSongs(count);
        }
        throw new Error(
          "No tracks with playable audio found in this playlist. Please try another playlist."
        );
      }

      // Make sure we have enough tracks
      if (tracksWithPreviews.length < count) {
        console.warn(
          `Not enough tracks with previews (${tracksWithPreviews.length}) for requested count (${count})`
        );
      }

      // Use the tracks as returned by SpotifyService, which already properly randomizes them
      // No need for a second shuffle that could undermine the Fisher-Yates algorithm
      const selectedTracks = tracksWithPreviews.slice(
        0,
        Math.min(count, tracksWithPreviews.length)
      );

      console.log(`Selected ${selectedTracks.length} tracks for the quiz`);

      // Map to our SpotifySong interface
      return selectedTracks.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artist,
        previewUrl: track.previewUrl || "",
        albumArt: track.albumArt,
        isRevealed: false,
        isPlaying: false,
      }));
    } catch (error) {
      console.error("Error fetching songs from Spotify:", error);

      // If in development mode, use mock data to avoid errors during testing
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "Falling back to mock data in development mode due to error"
        );
        return generateMockSongs(count);
      }

      throw error; // Re-throw to handle in the calling code
    }
  };

  // Generate mock songs for fallback or demonstration
  const generateMockSongs = (count: number): SpotifySong[] => {
    // Create an array of mock songs with different artists and names
    const mockSongs: SpotifySong[] = [
      {
        id: "mock1",
        name: "Shape of You",
        artist: "Ed Sheeran",
        previewUrl:
          "https://p.scdn.co/mp3-preview/84462d8e1e4d0f9e5ccd06f0da390f65843774a2",
        albumArt:
          "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96",
        isRevealed: false,
        isPlaying: false,
      },
      {
        id: "mock2",
        name: "Uptown Funk",
        artist: "Mark Ronson ft. Bruno Mars",
        previewUrl:
          "https://p.scdn.co/mp3-preview/064c51d0852c62d088c8f455c85fd3d5d33ddae0",
        albumArt:
          "https://i.scdn.co/image/ab67616d0000b2732a9f89db02aca1ba1bd02f29",
        isRevealed: false,
        isPlaying: false,
      },
      {
        id: "mock3",
        name: "Blinding Lights",
        artist: "The Weeknd",
        previewUrl:
          "https://p.scdn.co/mp3-preview/3ebf4544e5a4aff5efa9ab746984d9745a739dd2",
        albumArt:
          "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36",
        isRevealed: false,
        isPlaying: false,
      },
      {
        id: "mock4",
        name: "Dance Monkey",
        artist: "Tones and I",
        previewUrl:
          "https://p.scdn.co/mp3-preview/eef5e7c5d0dc1b06f5791c93f9c65a5dd6eaf0c2",
        albumArt:
          "https://i.scdn.co/image/ab67616d0000b2736b4e466e8de45a95aed1090a",
        isRevealed: false,
        isPlaying: false,
      },
      {
        id: "mock5",
        name: "Someone Like You",
        artist: "Adele",
        previewUrl:
          "https://p.scdn.co/mp3-preview/4299c7f2ba8134a5f41f6904548a32a65f0d097d",
        albumArt:
          "https://i.scdn.co/image/ab67616d0000b2732118bf9b198b05a95ded6300",
        isRevealed: false,
        isPlaying: false,
      },
    ];

    // If we need more songs than our default array, duplicate and modify
    if (count > mockSongs.length) {
      const additional = count - mockSongs.length;
      for (let i = 0; i < additional; i++) {
        const baseSong = mockSongs[i % mockSongs.length];
        mockSongs.push({
          ...baseSong,
          id: `${baseSong.id}-${i}`,
          name: `${baseSong.name} (Remix ${i + 1})`,
          isRevealed: false,
          isPlaying: false,
        });
      }
    }

    // Return only the requested number of songs
    return mockSongs.slice(0, count);
  };

  // Initialize by fetching songs from the playlist
  useEffect(() => {
    const initialize = async () => {
      // Skip initialization if already attempted - prevents infinite loops
      if (initAttemptedRef.current) {
        console.log("Skipping initialization - already attempted");
        return;
      }

      // Mark as attempted
      initAttemptedRef.current = true;

      if (!challenge || !settings) {
        setError("Invalid challenge configuration");
        setLoading(false);
        setInitialized(true); // Mark as initialized even if failed
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check if we should use the stored songs or fetch fresh ones
        const shouldFetchFresh =
          forceRefreshSongs ||
          !settings.selectedSongs ||
          !settings.selectedSongs.length ||
          !settings.lastFetchTimestamp ||
          Date.now() - settings.lastFetchTimestamp > 3600000; // Refresh if older than 1 hour

        if (
          settings.selectedSongs &&
          settings.selectedSongs.length > 0 &&
          !shouldFetchFresh
        ) {
          console.log(
            "Using recently cached songs:",
            settings.selectedSongs.length
          );
          setSongs(settings.selectedSongs);

          // If we have stored song points, restore them
          if (settings.songPoints) {
            setSongPoints(settings.songPoints);
          }

          setInitialized(true);
        } else {
          try {
            // Maximum number of retry attempts for fetching songs
            const maxRetries = 1;
            let retryCount = 0;
            let success = false;
            let fetchedSongs: SpotifySong[] = [];
            let lastError: Error | null = null;

            while (retryCount <= maxRetries && !success) {
              try {
                console.log(
                  `Attempting to fetch songs (attempt ${retryCount + 1}/${
                    maxRetries + 1
                  })`
                );

                // Fetch new songs from the playlist
                fetchedSongs = await fetchSongsFromPlaylist(
                  settings.playlistUrl,
                  settings.numberOfSongs
                );

                if (fetchedSongs.length > 0) {
                  success = true;
                  console.log(
                    `Successfully fetched ${fetchedSongs.length} songs`
                  );
                } else {
                  throw new Error("No valid songs fetched from playlist");
                }
              } catch (err) {
                lastError =
                  err instanceof Error
                    ? err
                    : new Error("Unknown error fetching songs");
                console.warn(
                  `Attempt ${retryCount + 1}/${maxRetries + 1} failed: ${
                    lastError.message
                  }`
                );
                retryCount++;

                // Add a small delay between retries
                if (retryCount <= maxRetries) {
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                }
              }
            }

            if (success) {
              setSongs(fetchedSongs);

              // Update the challenge settings with the selected songs
              dispatch({
                type: "UPDATE_CUSTOM_CHALLENGE",
                payload: {
                  ...challenge,
                  prebuiltSettings: {
                    ...settings,
                    selectedSongs: fetchedSongs,
                    lastFetchTimestamp: Date.now(), // Store when we fetched these songs
                  },
                },
              });

              setInitialized(true);
            } else {
              // All retries failed - use fallback or show error
              console.error("All song fetch attempts failed");

              if (process.env.NODE_ENV === "development") {
                // In development, use mock data to avoid blocking testing
                const mockSongs = generateMockSongs(
                  settings.numberOfSongs || 5
                );
                console.warn(
                  "Using mock songs for development:",
                  mockSongs.length
                );
                setSongs(mockSongs);
                setError(
                  "Could not load songs from playlist. Using sample songs for testing."
                );

                // Update the challenge with mock songs
                dispatch({
                  type: "UPDATE_CUSTOM_CHALLENGE",
                  payload: {
                    ...challenge,
                    prebuiltSettings: {
                      ...settings,
                      selectedSongs: mockSongs,
                    },
                  },
                });
              } else {
                // In production, show error and clear songs
                if (lastError) {
                  throw lastError;
                } else {
                  throw new Error(
                    "Failed to fetch songs after multiple attempts"
                  );
                }
              }

              setInitialized(true);
            }
          } catch (error) {
            console.error("Error loading songs:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "An unknown error occurred";
            setError(errorMessage);

            // If we couldn't fetch songs, show error but don't use mock songs
            setSongs([]);
            setInitialized(true);
            onComplete(false);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
        setInitialized(true);
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
  }, [challenge, settings, dispatch, onComplete, forceRefreshSongs]);

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

        // Skip if the preview URL is empty
        if (!current.previewUrl || current.previewUrl.trim() === "") {
          console.warn(
            "Empty preview URL for current song, trying to skip to next song"
          );

          // Try to skip to the next song if available
          if (currentSongIndex < songs.length - 1) {
            setCurrentSongIndex((prevIndex) => prevIndex + 1);
          } else {
            setError("Unable to play audio. The preview URL is not available.");
          }
          return;
        }

        // Set the audio source
        audioRef.current.src = current.previewUrl;
        audioRef.current.crossOrigin = "anonymous"; // Handle CORS for alternative sources

        // Track error count to prevent infinite loops
        let errorCount = 0;
        const maxErrors = 2;

        // Add error handler for audio loading
        const handleAudioError = (e: ErrorEvent) => {
          errorCount++;
          console.error(
            `Error loading audio (attempt ${errorCount}/${maxErrors}):`,
            current.previewUrl,
            e
          );

          // If we've had too many errors, show a message and don't retry
          if (errorCount >= maxErrors) {
            console.warn("Too many audio errors, giving up on this track");

            // If we can't load this song's audio, try to skip to the next one
            if (currentSongIndex < songs.length - 1) {
              console.log("Skipping to next song due to audio errors");
              setCurrentSongIndex((prevIndex) => prevIndex + 1);
            } else {
              setError(
                "Unable to play audio. The preview may not be available."
              );
            }
            return;
          }

          // Otherwise retry loading
          setTimeout(() => {
            console.log("Retrying audio load...");
            if (audioRef.current) {
              audioRef.current.load();
            }
          }, 1000);
        };

        const handleCanPlay = () => {
          console.log("Audio is ready to play");
        };

        audioRef.current.addEventListener(
          "error",
          handleAudioError as EventListener
        );
        audioRef.current.addEventListener("canplay", handleCanPlay);

        // Load the audio file
        audioRef.current.load();

        return () => {
          if (audioRef.current) {
            audioRef.current.removeEventListener(
              "error",
              handleAudioError as EventListener
            );
            audioRef.current.removeEventListener("canplay", handleCanPlay);
            // Important: pause any currently playing audio before changing source
            audioRef.current.pause();
          }
        };
      }

      // Update the challenge settings with the current song index
      dispatch({
        type: "UPDATE_CUSTOM_CHALLENGE",
        payload: {
          ...challenge,
          prebuiltSettings: {
            ...settings,
            currentSongIndex,
            songPoints,
          },
        },
      });
    }
  }, [currentSongIndex, songs, challenge, settings, dispatch, songPoints]);

  // Play the current song for the specified duration
  const playSong = () => {
    if (
      !audioRef.current ||
      songs.length === 0 ||
      currentSongIndex >= songs.length
    ) {
      console.error("Cannot play song: audio element or songs not available");
      return;
    }

    const song = songs[currentSongIndex];
    console.log(
      `Attempting to play: ${song.name} by ${song.artist}, URL: ${song.previewUrl}`
    );

    setIsPlaying(true);
    setHasStarted(true);

    // Update the song state
    setSongs((prevSongs) =>
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
        console.log("Attempting to play audio...");

        // Regular audio playback for actual preview URLs
        const playPromise = audioRef.current?.play();

        // Handle promise rejection (browsers might return a promise from play())
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Audio playback started successfully");
            })
            .catch((error) => {
              console.error("Error playing audio:", error);
              setIsPlaying(false);

              // Update UI to show error state
              setSongs((prevSongs) =>
                prevSongs.map((s, i) =>
                  i === currentSongIndex ? { ...s, isPlaying: false } : s
                )
              );

              // Check for autoplay policy error
              if (error.name === "NotAllowedError") {
                setError(
                  "Autoplay was blocked by your browser. Please click play again to start playback."
                );
              } else {
                setError(
                  `Error playing audio: ${error.message}. Try clicking play again or use a different playlist.`
                );
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
        console.log("Waiting for audio to load before playing...");

        const canPlayHandler = () => {
          console.log("Audio can now play, starting playback...");
          attemptPlay();
          audioRef.current?.removeEventListener("canplay", canPlayHandler);
        };

        audioRef.current.addEventListener("canplay", canPlayHandler);

        // Clear any existing timeout
        if (canPlayTimeoutRef.current) {
          clearTimeout(canPlayTimeoutRef.current);
          canPlayTimeoutRef.current = null;
        }

        // Set a timeout in case the canplay event doesn't fire
        canPlayTimeoutRef.current = setTimeout(() => {
          if (audioRef.current) {
            // Only attempt to play if we're still supposed to be playing
            if (isPlaying) {
              console.log("Timeout reached, attempting to play anyway...");
              if (audioRef.current.readyState > 0) {
                attemptPlay();
              } else {
                console.error("Audio not ready after timeout");
                setError(
                  "Could not load audio. The preview may not be available."
                );
                setIsPlaying(false);
              }
            } else {
              console.log("Timeout reached but playback was cancelled");
            }
            audioRef.current.removeEventListener("canplay", canPlayHandler);
          }
          canPlayTimeoutRef.current = null;
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
        setSongs((prevSongs) =>
          prevSongs.map((s, i) =>
            i === currentSongIndex ? { ...s, isPlaying: false } : s
          )
        );
      }, settings.playDurationSeconds * 1000);
    } catch (error) {
      console.error("Error in play attempt:", error);
      setIsPlaying(false);
    }

    // Progress indicator
    setPlayTimerProgress(0);

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    const intervalDuration = 100; // Update every 100ms for smooth progress
    progressIntervalRef.current = setInterval(() => {
      setPlayTimerProgress((prev) => {
        const newProgress =
          prev +
          (intervalDuration / (settings.playDurationSeconds * 1000)) * 100;
        return newProgress > 100 ? 100 : newProgress;
      });
    }, intervalDuration);
  };

  // Pause the current song
  const pauseSong = () => {
    if (!audioRef.current) {
      return;
    }

    // Important: Set isPlaying to false first to prevent re-rendering issues
    setIsPlaying(false);

    // Pause the audio element
    try {
      audioRef.current.pause();
      console.log("Audio paused successfully");
    } catch (error) {
      console.error("Error pausing audio:", error);
    }

    // Update the song state
    setSongs((prevSongs) =>
      prevSongs.map((s, i) =>
        i === currentSongIndex ? { ...s, isPlaying: false } : s
      )
    );

    // Clear timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Clear the canPlay timeout if it exists
    if (canPlayTimeoutRef.current) {
      clearTimeout(canPlayTimeoutRef.current);
      canPlayTimeoutRef.current = null;
      console.log("Cleared canPlay timeout during pause");
    }
  };

  // Reveal the current song
  const revealSong = () => {
    setIsRevealed(true);
    pauseSong(); // Pause the song when revealing

    // Reset point tracking when revealing a new song
    setPointsAwarded(false);

    // Update the song state
    setSongs((prevSongs) =>
      prevSongs.map((s, i) =>
        i === currentSongIndex
          ? { ...s, isRevealed: true, isPlaying: false }
          : s
      )
    );
  };

  // Award points to the selected winner
  const awardPointsToWinner = (winnerId: string) => {
    // Record which participant got the point for this song
    setSongPoints((prev) => ({
      ...prev,
      [currentSong?.id || ""]: winnerId,
    }));

    // Add points to the selected player/team
    const participant = getParticipantById(
      winnerId,
      state.players,
      state.teams
    );
    if (participant) {
      const isTeam = "teamColor" in participant;
      const participantType = isTeam ? "team" : "player";
      const participantName = participant.name;

      console.log(
        `Awarding ${
          challenge.points
        } points to ${participantType} "${participantName}" for song ${
          currentSongIndex + 1
        }`
      );

      if (isTeam) {
        // Get current team score
        const team = state.teams.find((t) => t.id === winnerId);
        const currentScore = team?.score || 0;
        const newScore = currentScore + challenge.points;

        console.log(
          `Team "${participantName}" score: ${currentScore} -> ${newScore}`
        );

        // First approach: UPDATE_TEAM_SCORE action
        dispatch({
          type: "UPDATE_TEAM_SCORE",
          payload: {
            teamId: winnerId,
            points: challenge.points,
          },
        });

        // Second approach: To ensure immediate update, also directly modify the team in state
        // This is a more aggressive approach to make sure scoreboard updates
        const updatedTeams = state.teams.map((team) =>
          team.id === winnerId
            ? { ...team, score: team.score + challenge.points }
            : team
        );

        // Force team state update
        dispatch({
          type: "SAVE_TEAMS_STATE",
          payload: updatedTeams,
        });

        // Force a refresh after a short delay
        setTimeout(() => {
          const updatedTeam = state.teams.find((t) => t.id === winnerId);
          console.log(
            `VERIFICATION - Team "${participantName}" current score now: ${updatedTeam?.score}`
          );

          // Force one more refresh with no additional points
          dispatch({
            type: "UPDATE_TEAM_SCORE",
            payload: {
              teamId: winnerId,
              points: 0, // No additional points, just forcing a refresh
            },
          });

          // Also force an overall state update to ensure UI refresh
          dispatch({
            type: "FORCE_STATE_UPDATE",
          });
        }, 100);
      } else {
        // It's a player - update player score immediately
        dispatch({
          type: "UPDATE_PLAYER_SCORE",
          payload: {
            playerId: winnerId,
            points: challenge.points,
          },
        });
      }

      // Log to confirm scoreboard should be updated now
      console.log(
        `Scoreboard updated with ${challenge.points} points for ${participantType} "${participantName}"`
      );
      return true;
    }
    return false;
  };

  // Move to the next song
  const nextSong = () => {
    // Reset points awarded flag for the next song
    setPointsAwarded(false);

    // If a winner was selected, add to the running tallies
    if (selectedWinnerId) {
      awardPointsToWinner(selectedWinnerId);
    } else if (
      isRevealed &&
      state.gameMode === GameMode.TEAMS &&
      state.teams.length > 0
    ) {
      // In team mode, if no winner was selected but the song was revealed,
      // we need to assign points to a team to ensure points are awarded for every song
      console.log(
        "No winner selected for this song, but ensuring points are awarded in team mode"
      );

      // Get the first team as a default winner if none was selected
      const defaultTeamId = state.teams[0].id;

      // Award points to the default team
      awardPointsToWinner(defaultTeamId);

      // Also set the selected winner ID to show visually who got the points
      setSelectedWinnerId(defaultTeamId);
    }

    if (currentSongIndex < songs.length - 1) {
      setCurrentSongIndex((prevIndex) => prevIndex + 1);
      setIsRevealed(false);
      setPlayTimerProgress(0);
      setHasStarted(false); // Reset hasStarted for the next song
      setSelectedWinnerId(null); // Reset selected winner
    } else {
      // Calculate final scores based on songPoints
      const finalScores: Record<string, number> = {};

      // Convert songPoints into a proper scores object
      Object.values(songPoints).forEach((participantId) => {
        finalScores[participantId] =
          (finalScores[participantId] || 0) + challenge.points;
      });

      // If we're in team mode and no points were awarded for any song,
      // make sure at least one team gets points
      if (
        state.gameMode === GameMode.TEAMS &&
        state.teams.length > 0 &&
        Object.keys(finalScores).length === 0
      ) {
        // Give points to the first team
        const defaultTeamId = state.teams[0].id;
        finalScores[defaultTeamId] = challenge.points;

        // Also award the points in the game state
        awardPointsToWinner(defaultTeamId);
      }

      // Find the winner with the highest score
      let maxScore = 0;
      let winnerId: string | undefined = undefined;

      Object.entries(finalScores).forEach(([id, score]) => {
        if (score > maxScore) {
          maxScore = score;
          winnerId = id;
        }
      });

      // Complete the challenge with scores
      onComplete(true, winnerId, finalScores);
    }
  };

  // Handle winner selection - made even more immediate for team mode
  const handleSelectWinner = (id: string) => {
    // If we already awarded points for this song and it's the same winner, do nothing
    if (pointsAwarded && selectedWinnerId === id) {
      console.log(
        "Points already awarded to this participant for current song"
      );
      return;
    }

    // If we already awarded points but to a different winner, remove points from previous winner
    if (pointsAwarded && selectedWinnerId !== null && selectedWinnerId !== id) {
      // Remove points from previous winner before awarding to new winner
      removePointsFromWinner(selectedWinnerId);
    }

    setSelectedWinnerId(id);

    // Award points to the new winner
    const awarded = awardPointsToWinner(id);

    // Mark that points have been awarded for this song
    if (awarded) {
      setPointsAwarded(true);
    }

    // For teams, use multiple approaches to ensure the UI updates
    const participant = getParticipantById(id, state.players, state.teams);
    if (participant && "teamColor" in participant) {
      // First get the current score to verify
      const currentTeam = state.teams.find((t) => t.id === id);
      const currentScore = currentTeam?.score || 0;

      console.log(
        `BEFORE FORCE UPDATES - Team "${participant.name}" current score: ${currentScore}`
      );

      // Force a much more aggressive update to make sure the UI catches up
      // 1. Direct state manipulation with SAVE_TEAMS_STATE
      const updatedTeams = state.teams.map((team) =>
        team.id === id
          ? { ...team, score: team.score + challenge.points }
          : team
      );

      dispatch({
        type: "SAVE_TEAMS_STATE",
        payload: updatedTeams,
      });

      // 2. Schedule multiple updates to ensure the UI gets refreshed
      for (let i = 0; i < 2; i++) {
        setTimeout(() => {
          console.log(
            `Forcing team score update #${i + 1} for "${participant.name}"`
          );

          // Force a refresh of the team score
          dispatch({
            type: "UPDATE_TEAM_SCORE",
            payload: {
              teamId: id,
              points: 0, // No additional points, just forcing a refresh
            },
          });

          // Also force an overall state update to ensure UI refresh
          dispatch({
            type: "FORCE_STATE_UPDATE",
          });

          // Check the current score to verify updates
          const updatedTeam = state.teams.find((t) => t.id === id);
          console.log(
            `AFTER UPDATE #${i + 1} - Team "${participant.name}" score now: ${
              updatedTeam?.score
            }`
          );
        }, 100 * (i + 1));
      }
    }
  };

  // Remove points from a winner (when changing from correct to incorrect)
  const removePointsFromWinner = (winnerId: string) => {
    // Make sure we have a valid winner ID
    if (!winnerId) return false;

    // Remove the participant from songPoints for this song
    setSongPoints((prev) => {
      const newSongPoints = { ...prev };
      // Find and remove the entry for the current song
      const currentSongId = currentSong?.id || "";
      if (newSongPoints[currentSongId] === winnerId) {
        delete newSongPoints[currentSongId];
      }
      return newSongPoints;
    });

    // Remove points from the selected player/team
    const participant = getParticipantById(
      winnerId,
      state.players,
      state.teams
    );
    if (participant) {
      const isTeam = "teamColor" in participant;
      const participantType = isTeam ? "team" : "player";
      const participantName = participant.name;

      console.log(
        `Removing ${
          challenge.points
        } points from ${participantType} "${participantName}" for song ${
          currentSongIndex + 1
        }`
      );

      if (isTeam) {
        // Get current team score
        const team = state.teams.find((t) => t.id === winnerId);
        const currentScore = team?.score || 0;
        const newScore = Math.max(0, currentScore - challenge.points); // Prevent negative scores

        console.log(
          `Team "${participantName}" score: ${currentScore} -> ${newScore}`
        );

        // Remove points using UPDATE_TEAM_SCORE action with negative points
        dispatch({
          type: "UPDATE_TEAM_SCORE",
          payload: {
            teamId: winnerId,
            points: -challenge.points, // Negative points to remove them
          },
        });

        // Also directly modify the team in state
        const updatedTeams = state.teams.map((team) =>
          team.id === winnerId
            ? { ...team, score: Math.max(0, team.score - challenge.points) }
            : team
        );

        // Force team state update
        dispatch({
          type: "SAVE_TEAMS_STATE",
          payload: updatedTeams,
        });

        // Force a refresh after a short delay
        setTimeout(() => {
          const updatedTeam = state.teams.find((t) => t.id === winnerId);
          console.log(
            `VERIFICATION - Team "${participantName}" score now: ${updatedTeam?.score}`
          );

          // Force one more refresh with no additional points
          dispatch({
            type: "UPDATE_TEAM_SCORE",
            payload: {
              teamId: winnerId,
              points: 0, // No additional points, just forcing a refresh
            },
          });

          // Also force an overall state update to ensure UI refresh
          dispatch({
            type: "FORCE_STATE_UPDATE",
          });
        }, 100);
      } else {
        // It's a player - remove points
        dispatch({
          type: "UPDATE_PLAYER_SCORE",
          payload: {
            playerId: winnerId,
            points: -challenge.points, // Negative points to remove them
          },
        });
      }

      // Log to confirm scoreboard should be updated now
      console.log(
        `Scoreboard updated: removed ${challenge.points} points from ${participantType} "${participantName}"`
      );
      return true;
    }
    return false;
  };

  // Handle marking answer as incorrect (when "Wrong Answer" button is clicked)
  const handleMarkIncorrect = () => {
    // If a participant was previously marked as correct, remove their points
    if (selectedWinnerId !== null) {
      removePointsFromWinner(selectedWinnerId);
    }

    // Reset the winner and points awarded flag
    setSelectedWinnerId(null);
    setPointsAwarded(false);
  };

  // Get the current song
  const currentSong =
    songs.length > 0 && currentSongIndex < songs.length
      ? songs[currentSongIndex]
      : null;

  // Cancel the quiz early
  const handleCancelQuiz = () => {
    // Stop any playing audio
    pauseSong();

    // Notify parent component that the quiz was cancelled
    onComplete(false, undefined, {});
  };

  // Calculate final score summary
  const calculateFinalScore = () => {
    // This function is now simplified since points are awarded immediately after each song
    // It's kept for backward compatibility, but we're now awarding points in real-time
    // as songs are played and winners are selected, ensuring the scoreboard is always up-to-date

    // If no points were awarded, just return
    if (Object.keys(songPoints).length === 0) return;

    console.log(
      "Points have been awarded in real-time after each song. Final scores are reflected in the game scoreboard."
    );
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

  // Get lists of players/teams for winner selection
  const getPlayerOptions = () => {
    // Always prioritize selected participant players when available
    if (selectedParticipantPlayers && selectedParticipantPlayers.length > 0) {
      console.log(
        "Using selected participant players from player reveal:",
        selectedParticipantPlayers.map((p) => p.name)
      );
      return selectedParticipantPlayers.map((player) => ({
        id: player.id,
        name: player.name,
        teamId: player.teamId,
        image: player.image,
      }));
    }

    // In team mode with ONE_ON_ONE challenge, we should still be showing selected players
    // but as a fallback, show players from the current teams
    if (
      state.gameMode === GameMode.TEAMS &&
      challenge.type === ChallengeType.ONE_ON_ONE
    ) {
      console.log(
        "No selected participants found, using first player from each team as fallback"
      );
      const teamPlayers: Player[] = [];

      // Get the first player from each team
      state.teams.slice(0, 2).forEach((team) => {
        const teamPlayerIds = team.playerIds || [];
        const firstTeamPlayer = state.players.find((p) =>
          teamPlayerIds.includes(p.id)
        );
        if (firstTeamPlayer) {
          teamPlayers.push(firstTeamPlayer);
        }
      });

      if (teamPlayers.length > 0) {
        return teamPlayers.map((player) => ({
          id: player.id,
          name: player.name,
          teamId: player.teamId,
          image: player.image,
        }));
      }
    }

    // Default: return all players
    console.log("Using all players for Spotify quiz");
    return state.players.map((player) => ({
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      image: player.image,
    }));
  };

  const getTeamOptions = () => {
    return state.teams.map((team) => ({
      id: team.id,
      name: team.name,
      players: state.players.filter((p) => p.teamId === team.id),
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pastel-purple mb-4"></div>
        <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
          {t("prebuilt.spotifyMusicQuiz.loadingSongs")}
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
          {t("prebuilt.spotifyMusicQuiz.pleaseWait")}
        </p>
      </div>
    );
  }

  if (!currentSong) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-md">
        <h3 className="text-lg font-semibold mb-2">
          {t("prebuilt.spotifyMusicQuiz.noSongs")}
        </h3>
        <p>{t("prebuilt.spotifyMusicQuiz.noSongsMessage")}</p>
        <div className="mt-4">
          <Button variant="danger" onClick={() => onComplete(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Show error message if any, but don't prevent player from working */}
      {error && (
        <div className="w-full mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-6 py-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Audio Notice
          </h3>
          <p className="mb-2">{error}</p>
        </div>
      )}

      {/* Playlist Name - Enhanced visuals */}
      {settings.playlistName && (
        <div className="w-full mb-2 text-center">
          <div className="bg-gradient-to-r from-pastel-blue via-pastel-purple to-pastel-pink p-0.5 rounded-lg inline-block shadow-md">
            <div className="bg-white dark:bg-gray-800 rounded-md px-6 py-2">
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pastel-blue to-pastel-purple">
                <MusicalNoteIcon className="text-gray-800 dark:text-white inline-block h-5 w-5 mr-3 mb-1" />
                {settings.playlistName}
              </h3>
            </div>
          </div>

          {/* Guess prompt - Positioned directly under playlist title */}
          {!isRevealed && (
            <div className="mt-4 mb-4 mx-auto max-w-sm text-center bg-gray-100 dark:bg-gray-800 py-2 rounded-md shadow-inner">
              <p className="text-gray-800 dark:text-gray-200 font-medium">
                {t("prebuilt.spotifyMusicQuiz.guessPrompt")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />

      {/* Progress indicator */}
      <div className="w-full mb-6">
        <div className="flex justify-between mb-1 text-xs text-gray-600 dark:text-gray-400">
          <span>{`${currentSongIndex + 1} / ${songs.length}`}</span>
          {hasStarted && <span>{Math.round(playTimerProgress)}%</span>}
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
                        ],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: i * 0.05,
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
                      style={{
                        height: `${20 + Math.floor(Math.random() * 30)}%`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Question mark or note icon */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={
                isPlaying
                  ? { scale: [1, 1.1, 1], rotate: [0, 5, 0, -5, 0] }
                  : {}
              }
              transition={{
                duration: 2,
                repeat: isPlaying ? Infinity : 0,
                repeatType: "loop",
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
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
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
                leftIcon={<PauseIcon className="h-5 w-5" />}
                onClick={pauseSong}
              >
                {t("prebuilt.spotifyMusicQuiz.pause")}
              </Button>
            ) : (
              <Button
                variant="primary"
                leftIcon={<PlayIcon className="h-5 w-5" />}
                onClick={playSong}
              >
                {hasStarted
                  ? t("prebuilt.spotifyMusicQuiz.playAgain")
                  : t("prebuilt.spotifyMusicQuiz.play")}
              </Button>
            )}

            {hasStarted && (
              <Button
                variant="info"
                leftIcon={<ArrowPathIcon className="h-5 w-5" />}
                onClick={resetSong}
              >
                {t("prebuilt.spotifyMusicQuiz.restart")}
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
            {t("prebuilt.spotifyMusicQuiz.reveal")}
          </Button>
        )}

        {isRevealed && (
          <>
            {isPlaying ? (
              <Button
                variant="secondary"
                leftIcon={<PauseIcon className="h-5 w-5" />}
                onClick={pauseSong}
              >
                {t("prebuilt.spotifyMusicQuiz.pause")}
              </Button>
            ) : (
              <Button
                variant={
                  currentSongIndex === songs.length - 1 ? "success" : "primary"
                }
                leftIcon={<ForwardIcon className="h-5 w-5" />}
                onClick={nextSong}
              >
                {currentSongIndex === songs.length - 1
                  ? t("prebuilt.spotifyMusicQuiz.finish")
                  : t("prebuilt.spotifyMusicQuiz.nextSong")}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Song counter */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t("prebuilt.spotifyMusicQuiz.songCounter", {
          current: currentSongIndex + 1,
          total: songs.length,
        })}
      </div>

      {/* Participant selection */}
      <div className="mt-8 mb-2 w-full max-w-3xl mx-auto">
        <h4 className="text-center text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">
          {isRevealed
            ? challenge.type == ChallengeType.INDIVIDUAL ? 
            t("prebuilt.spotifyMusicQuiz.didPlayerAnswerCorrectly", {
              player: state.players[state.currentTurnIndex]?.name,
            })
            : t("prebuilt.spotifyMusicQuiz.selectWinner")
            : t("prebuilt.spotifyMusicQuiz.participants")}
        </h4>

        {challenge.type === ChallengeType.ONE_ON_ONE ? (
          // ONE_ON_ONE case - always use the selectedParticipantPlayers when available
          <div className="flex flex-wrap justify-center gap-3 mb-2">
            {getPlayerOptions().map((player) => (
              <div
                key={player.id}
                onClick={
                  isRevealed ? () => handleSelectWinner(player.id) : undefined
                }
                className={`${isRevealed ? "cursor-pointer" : ""} border-2 ${
                  selectedWinnerId === player.id
                    ? "border-pastel-green"
                    : "border-transparent"
                } rounded-lg`}
              >
                <PlayerCard
                  player={{
                    id: player.id,
                    name: player.name,
                    score: 0,
                    teamId: player.teamId,
                    image:
                      player.image ||
                      `https://example.com/default-${player.name}.jpg`,
                  }}
                  size="sm"
                  showScore={false}
                  isSelected={selectedWinnerId === player.id}
                />
              </div>
            ))}
          </div>
        ) : challenge.type === ChallengeType.INDIVIDUAL ? (
          // INDIVIDUAL case - show the current player and correct/incorrect buttons when revealed
          isRevealed ? (
            // For individual challenges in award mode, show correct/incorrect buttons
            <div className="flex justify-center gap-4 mb-4">
              <Button
                variant="success"
                onClick={() =>
                  handleSelectWinner(
                    state.players[state.currentTurnIndex]?.id || ""
                  )
                }
                className={`px-6 py-2 ${
                  selectedWinnerId ? "bg-pastel-green text-white" : ""
                }`}
              >
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t("prebuilt.spotifyMusicQuiz.correct", "Correct")}
                </span>
              </Button>
              <Button
                variant="danger"
                onClick={() => handleMarkIncorrect()}
                className={`px-6 py-2 ${
                  selectedWinnerId === null ? "bg-red-500 text-white" : ""
                }`}
              >
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t("prebuilt.spotifyMusicQuiz.incorrect", "Incorrect")}
                </span>
              </Button>
            </div>
          ) : (
            // Show current player in view mode
            <div className="flex justify-center mb-2">
              <div className="border-2 border-transparent rounded-lg">
                <PlayerCard
                  player={state.players[state.currentTurnIndex]}
                  size="sm"
                  showScore={false}
                />
              </div>
            </div>
          )
        ) : state.gameMode === GameMode.TEAMS ? (
          // Only show teams for ALL_VS_ALL challenges in team mode
          <div className="flex flex-wrap justify-center gap-3 mb-2">
            {getTeamOptions().map((team) => (
              <div
                key={team.id}
                onClick={
                  isRevealed ? () => handleSelectWinner(team.id) : undefined
                }
                className={`${isRevealed ? "cursor-pointer" : ""} border-2 ${
                  selectedWinnerId === team.id
                    ? "border-pastel-green"
                    : "border-transparent"
                } rounded-lg`}
              >
                <TeamCard
                  team={{
                    id: team.id,
                    name: team.name,
                    playerIds: team.players.map((p) => p.id),
                    score: 0,
                    color: "pastel-blue",
                  }}
                  players={team.players}
                  size="sm"
                  showScore={false}
                  isSelected={selectedWinnerId === team.id}
                />
              </div>
            ))}
          </div>
        ) : (
          // ALL_VS_ALL challenge type in individual mode - show all players
          <div className="flex flex-wrap justify-center gap-3 mb-2 max-w-3xl mx-auto">
            {getPlayerOptions().map((player) => (
              <div
                key={player.id}
                onClick={
                  isRevealed ? () => handleSelectWinner(player.id) : undefined
                }
                className={`${isRevealed ? "cursor-pointer" : ""} border-2 ${
                  selectedWinnerId === player.id
                    ? "border-pastel-green"
                    : "border-transparent"
                } rounded-lg`}
              >
                <PlayerCard
                  player={{
                    id: player.id,
                    name: player.name,
                    score: 0,
                    teamId: player.teamId,
                    image:
                      player.image ||
                      `https://example.com/default-${player.name}.jpg`,
                  }}
                  size="sm"
                  showScore={false}
                  isSelected={selectedWinnerId === player.id}
                />
              </div>
            ))}
          </div>
        )}

        {isRevealed && selectedWinnerId && (
          <p className="text-sm text-pastel-green font-medium text-center mt-3">
            {t("prebuilt.spotifyMusicQuiz.pointsAwarded", {
              points: challenge.points,
            })}
          </p>
        )}

        {/* Display punishment when revealed, incorrect selected, and punishment exists */}
        {isRevealed && selectedWinnerId === null && challenge.punishment && (
          <div className="mt-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md max-w-lg mx-auto">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center flex items-center justify-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {t("prebuilt.spotifyMusicQuiz.punishment", "Punishment")}:
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 text-center mt-1">
              {challenge.punishment.type === "custom" &&
              challenge.punishment.customDescription
                ? challenge.punishment.customDescription
                : challenge.punishment.type === "sips"
                ? t("prebuilt.spotifyMusicQuiz.sipsPunishment", {
                    count: challenge.punishment.value,
                  })
                : t(
                    "prebuilt.spotifyMusicQuiz.defaultPunishment",
                    "Player must complete a punishment!"
                  )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifyMusicQuizPlayer;
