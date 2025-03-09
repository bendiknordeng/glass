import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isFullWidth?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isFullWidth = false,
  isLoading = false,
  isDisabled = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  // Variant styles
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-game-primary hover:bg-game-primary/90 text-white',
    secondary: 'bg-game-secondary hover:bg-game-secondary/90 text-white',
    success: 'bg-pastel-green hover:bg-pastel-green/90 text-gray-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-pastel-yellow hover:bg-pastel-yellow/90 text-gray-800',
    info: 'bg-pastel-blue hover:bg-pastel-blue/90 text-gray-800'
  };
  
  // Size styles
  const sizeStyles: Record<ButtonSize, string> = {
    xs: 'text-xs py-1 px-2',
    sm: 'text-sm py-1.5 px-3',
    md: 'text-base py-2 px-4',
    lg: 'text-lg py-2.5 px-5',
    xl: 'text-xl py-3 px-6'
  };
  
  return (
    <motion.button
      className={`
        rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50
        focus:ring-${variant === 'primary' ? 'game-primary' : variant === 'secondary' ? 'game-secondary' : variant}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${isFullWidth ? 'w-full' : ''}
        ${isDisabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={isDisabled || isLoading}
      whileHover={!isDisabled && !isLoading ? { scale: 1.03 } : {}}
      whileTap={!isDisabled && !isLoading ? { scale: 0.97 } : {}}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center">
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </div>
      )}
    </motion.button>
  );
};

export default Button;