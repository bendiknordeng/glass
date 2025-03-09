import { Variants } from 'framer-motion';

/**
 * Fade in animation
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.5 
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: 0.2 
    }
  }
};

/**
 * Scale up animation
 */
export const scaleUp: Variants = {
  hidden: { 
    scale: 0.8,
    opacity: 0 
  },
  visible: { 
    scale: 1,
    opacity: 1,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 20
    }
  },
  exit: { 
    scale: 0.8,
    opacity: 0,
    transition: { 
      duration: 0.3 
    }
  }
};

/**
 * Slide in from left animation
 */
export const slideInLeft: Variants = {
  hidden: { 
    x: -100,
    opacity: 0 
  },
  visible: { 
    x: 0,
    opacity: 1,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    x: -100,
    opacity: 0,
    transition: { 
      duration: 0.3 
    }
  }
};

/**
 * Slide in from right animation
 */
export const slideInRight: Variants = {
  hidden: { 
    x: 100,
    opacity: 0 
  },
  visible: { 
    x: 0,
    opacity: 1,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    x: 100,
    opacity: 0,
    transition: { 
      duration: 0.3 
    }
  }
};

/**
 * Bounce animation
 */
export const bounce: Variants = {
  hidden: { 
    y: 50,
    opacity: 0 
  },
  visible: { 
    y: 0,
    opacity: 1,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 10
    }
  },
  exit: { 
    y: 50,
    opacity: 0,
    transition: { 
      duration: 0.3 
    }
  }
};

/**
 * Rotate in animation
 */
export const rotateIn: Variants = {
  hidden: { 
    rotate: -10,
    scale: 0.8,
    opacity: 0 
  },
  visible: { 
    rotate: 0,
    scale: 1,
    opacity: 1,
    transition: { 
      type: 'spring',
      stiffness: 200,
      damping: 15
    }
  },
  exit: { 
    rotate: 10,
    scale: 0.8,
    opacity: 0,
    transition: { 
      duration: 0.3 
    }
  }
};

/**
 * Staggered children animation container
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

/**
 * Flip card animation
 */
export const flipCard: Variants = {
  hidden: { 
    rotateY: 180,
    opacity: 0 
  },
  visible: { 
    rotateY: 0,
    opacity: 1,
    transition: { 
      duration: 0.6,
      ease: 'easeOut' 
    }
  },
  exit: { 
    rotateY: -180,
    opacity: 0,
    transition: { 
      duration: 0.4 
    }
  }
};

/**
 * Pulse animation
 */
export const pulse: Variants = {
  hidden: { 
    scale: 0.9,
    opacity: 0.8 
  },
  visible: { 
    scale: [1, 1.05, 1],
    opacity: 1,
    transition: { 
      repeat: Infinity,
      repeatType: 'reverse',
      duration: 1.5
    }
  }
};

/**
 * Highlight animation for selected player/team
 */
export const highlight: Variants = {
  hidden: { 
    boxShadow: '0 0 0 rgba(255, 215, 0, 0)' 
  },
  visible: { 
    boxShadow: [
      '0 0 0 rgba(255, 215, 0, 0)',
      '0 0 20px rgba(255, 215, 0, 0.8)',
      '0 0 0 rgba(255, 215, 0, 0)'
    ],
    transition: { 
      repeat: 3,
      duration: 1.5
    }
  }
};

/**
 * Shake animation for incorrect answers or lost challenges
 */
export const shake: Variants = {
  hidden: { x: 0 },
  visible: { 
    x: [-10, 10, -10, 10, -5, 5, -2, 2, 0],
    transition: { 
      duration: 0.8,
      ease: 'easeInOut'
    }
  }
};

/**
 * Confetti animation for winners
 */
export const confetti: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { 
    opacity: [0, 1, 1, 0],
    scale: [0, 1, 1.1, 0],
    transition: { 
      times: [0, 0.1, 0.9, 1],
      duration: 4
    }
  }
};