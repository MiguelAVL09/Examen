import React from 'react';
import { OptionShape } from '../types/quiz';

interface ShapeProps {
  shape: OptionShape;
  className?: string;
  size?: number;
}

export const KahootShapeIcon: React.FC<ShapeProps> = ({ shape, className = '', size = 28 }) => {
  switch (shape) {
    case 'triangle':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
        >
          <path d="M12 2L1 21h22L12 2z" />
        </svg>
      );
    case 'diamond':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
        >
          <path d="M12 1L23 12L12 23L1 12Z" />
        </svg>
      );
    case 'circle':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
    case 'square':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
        >
          <rect x="2" y="2" width="20" height="20" rx="3" />
        </svg>
      );
    default:
      return null;
  }
};
