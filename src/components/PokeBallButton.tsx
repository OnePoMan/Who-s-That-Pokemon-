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
  red: 'bg-gradient-to-b from-pokemon-red to-pokemon-red-dark text-white border-pokemon-red-dark hover:from-pokemon-red-light hover:to-pokemon-red',
  blue: 'bg-gradient-to-b from-pokemon-blue to-[#2a3aa0] text-white border-[#2a3aa0] hover:from-pokemon-blue-light hover:to-pokemon-blue',
  gray: 'bg-gradient-to-b from-gray-400 to-gray-500 text-white border-gray-600 hover:from-gray-300 hover:to-gray-400',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-base',
  lg: 'px-8 py-3 text-lg',
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
        font-body font-bold
        rounded-xl border-2 border-b-4
        transition-all duration-150
        shadow-md hover:shadow-lg
        active:scale-95 active:border-b-2 active:translate-y-[2px]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:translate-y-0
        ${className}
      `}
    >
      {children}
    </button>
  );
}
