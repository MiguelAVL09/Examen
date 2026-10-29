import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { soundEffects } from '../utils/soundEffects';

interface KahootTimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  isPaused?: boolean;
}

export const KahootTimer: React.FC<KahootTimerProps> = ({
  initialSeconds,
  onTimeUp,
  isPaused = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  // Calculate percentage
  const percentage = Math.max(0, (timeLeft / initialSeconds) * 100);

  // Determine color theme based on urgency
  const isUrgent = timeLeft <= 5 && timeLeft > 0;
  const isCritical = timeLeft <= 3 && timeLeft > 0;

  let strokeColor = '#26890c'; // Green
  if (timeLeft <= 5) {
    strokeColor = '#e21b3c'; // Red
  } else if (timeLeft <= initialSeconds / 2) {
    strokeColor = '#ffa602'; // Yellow
  }

  useEffect(() => {
    setTimeLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (isPaused) return;

    if (timeLeft <= 0) {
      soundEffects.playTimesUp();
      onTimeUpRef.current();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        // Sound tick effect
        if (next >= 0) {
          const pitch = next <= 5 ? 1.5 + (5 - next) * 0.2 : 1.0;
          soundEffects.playTick(pitch);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isPaused]);

  // SVG Circle parameters
  const size = 110;
  const strokeWidth = 9;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center select-none">
      <motion.div
        animate={isCritical ? { scale: [1, 1.12, 1] } : isUrgent ? { scale: [1, 1.06, 1] } : {}}
        transition={{ repeat: Infinity, duration: isCritical ? 0.4 : 0.8 }}
        className="relative"
      >
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={strokeWidth}
            fill="rgba(19, 4, 45, 0.75)"
          />
          {/* Animated depletion circle */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            transition={{ duration: 0.95, ease: 'linear' }}
          />
        </svg>

        {/* Center Timer Number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-3xl font-black tracking-tight ${
              isCritical
                ? 'text-kahoot-red animate-pulse'
                : isUrgent
                ? 'text-kahoot-yellow'
                : 'text-white'
            }`}
          >
            {Math.max(0, timeLeft)}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-white/60 -mt-1">
            SEG
          </span>
        </div>
      </motion.div>
    </div>
  );
};
