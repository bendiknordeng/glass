import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useTheme } from "@/contexts/ThemeContext";
import Button from "@/components/common/Button";
import { ConfirmModal } from "@/components/common/Modal";

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { theme, setTheme, isDarkMode } = useTheme();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Check if there's a game in progress
  const hasGameInProgress =
    state.players.length > 0 && state.gameStarted && !state.gameFinished;

  // Handle start new game
  const handleNewGame = () => {
    if (hasGameInProgress) {
      setShowResetConfirm(true);
    } else {
      dispatch({ type: "RESET_GAME" });
      navigate("/setup");
    }
  };

  // Handle continue game
  const handleContinueGame = () => {
    if (hasGameInProgress) {
      navigate("/game");
    }
  };

  // Handle edit game setup
  const handleEditSetup = () => {
    navigate("/setup");
  };

  // Handle reset and start new game
  const handleResetAndStart = () => {
    dispatch({ type: "RESET_GAME" });
    navigate("/setup");
  };

  // Toggle theme
  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  // Update the main container to prevent scrolling and ensure content fits
  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.img
            src="/assets/images/glass.png"
            alt={t("app.name")}
            className="mx-auto mb-2 w-40 h-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.h1
            className="text-4xl font-bold mb-1 text-game-primary"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: 4,
            }}
          >
            {t("app.name")}
          </motion.h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {t("app.tagline")}
          </p>
        </motion.div>

        <motion.div
          className="card-glass p-6 w-full max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              isFullWidth
              onClick={handleNewGame}
              className="text-lg"
            >
              {t("home.newGame")}
            </Button>

            {hasGameInProgress && (
              <div className="relative">
                <Button
                  variant="secondary"
                  size="lg"
                  isFullWidth
                  onClick={handleContinueGame}
                  className="text-lg"
                >
                  {t("home.continueGame")}
                </Button>
                <button
                  onClick={handleEditSetup}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title={t("home.editSetup")}
                  aria-label={t("home.editSetup")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          className="mt-6 text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1 }}
        >
          {t("app.creator")}
        </motion.div>
      </div>

      {/* Reset game confirmation */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetAndStart}
        title={t("home.startNewGame")}
        message={t("home.startNewGameWarning")}
        confirmText={t("home.startNew")}
        cancelText={t("common.cancel")}
      />
    </div>
  );
};

export default Home;
