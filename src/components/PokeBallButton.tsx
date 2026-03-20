'use client';

interface PokeBallButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'red' | 'blue' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

const variantStyles = {
  red: 'bg-pokemon-red hover:bg-pokemon-red-dark text-white',
  blue: 'bg-pokemon-blue hover:bg-pokemon-blue-light text-white',
  gray: 'bg-pokemon-gray hover:bg-pokemon-dark text-white',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export default function PokeBallButton({
  onClick,
  children,
  variant = 'red',
  size = 'md',
  disabled = false,
  className = '',
}: PokeBallButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        rounded-full font-bold
        transition-all duration-200
        shadow-lg hover:shadow-xl
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${className}
      `}
    >
      {children}
    </button>
  );
}
