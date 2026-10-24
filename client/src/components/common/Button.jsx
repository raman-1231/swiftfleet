import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success'
  size = 'md',        // 'sm' | 'md' | 'lg'
  isLoading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  type = 'button',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5'
  };

  const variantStyles = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-subtle focus:ring-brand-500 active:bg-brand-700',
    secondary: 'bg-ink-100 hover:bg-ink-200 text-ink-800 focus:ring-ink-300 active:bg-ink-300',
    outline: 'border border-ink-200 hover:bg-ink-50 text-ink-700 focus:ring-ink-300 bg-white active:bg-ink-100',
    danger: 'bg-ops-danger hover:bg-red-700 text-white focus:ring-ops-danger active:bg-red-800',
    success: 'bg-ops-success hover:bg-emerald-700 text-white focus:ring-ops-success active:bg-emerald-800',
    ghost: 'hover:bg-ink-100 text-ink-600 hover:text-ink-900 focus:ring-ink-200'
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};
