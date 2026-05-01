/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface RadarSweepProps {
  size: number;
}

export const RadarSweep: React.FC<RadarSweepProps> = ({ size }) => {
  return (
    <motion.div
      className="absolute top-0 left-0 pointer-events-none origin-center"
      style={{
        width: size,
        height: size,
        background: 'conic-gradient(from 0deg, transparent 0deg, rgba(63, 179, 127, 0.2) 60deg, transparent 65deg)',
      }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
};
