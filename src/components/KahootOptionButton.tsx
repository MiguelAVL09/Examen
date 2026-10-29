import React from 'react';
import { motion } from 'framer-motion';
import { QuestionOption } from '../types/quiz';
import { KahootShapeIcon } from './KahootShapes';
import { Check, X } from 'lucide-react';

interface OptionButtonProps {
  option: QuestionOption;
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  revealResult: boolean;
  onSelect: (optionId: string) => void;
}

export const KahootOptionButton: React.FC<OptionButtonProps> = ({
  option,
  index,
  isSelected,
  isDisabled,
  revealResult,
  onSelect,
}) => {
  // Color mappings
  const colorClasses = {
    red: 'kahoot-btn-red text-white',
    blue: 'kahoot-btn-blue text-white',
    yellow: 'kahoot-btn-yellow text-white',
    green: 'kahoot-btn-green text-white',
  }[option.color];

  // Reveal styling logic
  let opacityClass = 'opacity-100';
  let borderClass = 'border-2 border-white/20';

  if (revealResult) {
    if (option.isCorrect) {
      borderClass = 'border-4 border-white ring-4 ring-green-400 scale-[1.02] shadow-2xl';
    } else if (isSelected && !option.isCorrect) {
      borderClass = 'border-4 border-red-300 ring-4 ring-red-500';
    } else {
      opacityClass = 'opacity-30 filter grayscale-[50%]';
    }
  } else if (isSelected) {
    borderClass = 'border-4 border-white ring-4 ring-white/50 scale-[1.01]';
  }

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.015 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      onClick={() => !isDisabled && onSelect(option.id)}
      disabled={isDisabled}
      className={`relative w-full min-h-[64px] sm:min-h-[82px] md:min-h-[100px] p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl flex items-center justify-between transition-all duration-200 select-none ${colorClasses} ${opacityClass} ${borderClass} cursor-pointer disabled:cursor-not-allowed`}
    >
      <div className="flex items-center gap-2.5 sm:gap-4 md:gap-5 flex-1 text-left min-w-0">
        {/* Shape Icon */}
        <div className="flex-shrink-0 p-1.5 sm:p-2 md:p-2.5 bg-black/20 rounded-xl flex items-center justify-center">
          <KahootShapeIcon shape={option.shape} size={26} />
        </div>

        {/* Option Text */}
        <span className="text-sm sm:text-base md:text-xl lg:text-2xl font-extrabold tracking-wide drop-shadow-sm leading-snug break-words">
          {option.text}
        </span>
      </div>

      {/* Right Indicator: Keybind Hint or Reveal Status */}
      <div className="flex-shrink-0 ml-2 sm:ml-3">
        {revealResult ? (
          option.isCorrect ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white text-green-700 rounded-full flex items-center justify-center shadow-lg"
            >
              <Check className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 stroke-[3.5]" />
            </motion.div>
          ) : isSelected ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white text-red-600 rounded-full flex items-center justify-center shadow-lg"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 stroke-[3.5]" />
            </motion.div>
          ) : null
        ) : (
          <span className="hidden md:inline-block px-2.5 py-1 bg-black/25 text-white/80 rounded-lg text-xs font-black tracking-wider uppercase">
            tecla {index + 1}
          </span>
        )}
      </div>
    </motion.button>
  );
};
