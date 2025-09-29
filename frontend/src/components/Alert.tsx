import type { ReactNode } from 'react';

interface AlertProps {
  type?: 'error' | 'warning' | 'success' | 'info';
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

function Alert({ type = 'info', children, className = '', onClose }: AlertProps) {
  const baseStyle = {
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
    lineHeight: '1.5',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px'
  };

  const typeStyles = {
    error: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      color: '#dc2626'
    },
    warning: {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      color: '#d97706'
    },
    success: {
      backgroundColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      color: '#16a34a'
    },
    info: {
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
      color: '#2563eb'
    }
  };

  const alertStyle = {
    ...baseStyle,
    ...typeStyles[type]
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: 'inherit',
    marginLeft: 'auto',
    padding: '0',
    lineHeight: '1'
  };

  return (
    <div 
      style={alertStyle} 
      className={className}
      role="alert"
      aria-live="polite"
    >
      <div style={{ flex: 1 }}>
        {children}
      </div>
      {onClose && (
        <button 
          style={closeButtonStyle}
          onClick={onClose}
          aria-label="Close alert"
          title="Close"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default Alert;
