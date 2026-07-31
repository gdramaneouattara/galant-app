import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeatureHighlightProps {
  id: string;
  children: React.ReactNode;
  active?: boolean;
  type?: 'ROSE' | 'GOLD';
}

const FeatureHighlight: React.FC<FeatureHighlightProps> = ({ id, children, active = true, type = 'ROSE' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const storageKey = `galant_seen_feature_${id}`;

  useEffect(() => {
    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen && active) {
      setIsVisible(true);
    }
  }, [id, active, storageKey]);

  const handleClick = () => {
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
  };

  const glowColor = type === 'ROSE' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)';
  const borderColor = type === 'ROSE' ? 'border-primary/30' : 'border-amber-500/30';

  return (
    <div className="relative inline-block w-full" onClick={handleClick}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className={`absolute -inset-1.5 rounded-[2rem] border-2 ${borderColor} pointer-events-none z-0`}
            style={{
              boxShadow: `0 0 20px ${glowColor}`,
            }}
          >
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.02, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-[1.8rem] bg-gradient-to-tr from-current to-transparent opacity-10"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default FeatureHighlight;
