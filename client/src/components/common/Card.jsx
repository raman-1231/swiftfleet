import React from 'react';

export const Card = ({
  children,
  className = '',
  title = null,
  subtitle = null,
  action = null,
  noPadding = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-ink-200 rounded-xl shadow-card transition-shadow ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div>
            {title && <h3 className="text-base font-semibold text-ink-900 leading-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
};
