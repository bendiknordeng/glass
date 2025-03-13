import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  ariaLabel?: string;
  activeIcon?: React.ReactNode;
  inactiveIcon?: React.ReactNode;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  ariaLabel,
  activeIcon,
  inactiveIcon
}) => {
  // Default icons
  const ActiveIconComponent = activeIcon || <MoonIcon className="h-4 w-4 text-game-primary" />;
  const InactiveIconComponent = inactiveIcon || <SunIcon className="h-4 w-4 text-yellow-500" />;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`
        relative inline-flex h-8 w-16 items-center rounded-full
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2
        focus:ring-game-primary focus:ring-offset-2
        ${checked ? 'bg-game-primary' : 'bg-gray-200 dark:bg-gray-700'}
      `}
    >
      <span
        className={`
          ${checked ? 'translate-x-9' : 'translate-x-1'}
          inline-flex h-6 w-6 transform items-center justify-center rounded-full
          bg-white shadow-lg transition duration-200 ease-in-out
        `}
      >
        {checked ? ActiveIconComponent : InactiveIconComponent}
      </span>
      {label && (
        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{label}</span>
      )}
    </button>
  );
};

export default Switch; 