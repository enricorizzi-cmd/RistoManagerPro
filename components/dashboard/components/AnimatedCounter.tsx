// AnimatedCounter Component - Counter with smooth animation
import React, { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 2,
  className = '',
}) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  useEffect(() => {
    if (inView) {
      setShouldAnimate(true);
    }
  }, [inView]);

  return (
    <div ref={ref} className={className}>
      {shouldAnimate ? (
        <CountUp
          start={0}
          end={value}
          duration={duration}
          decimals={decimals}
          prefix={prefix}
          suffix={suffix}
          separator="."
          decimal=","
        />
      ) : (
        <span>
          {prefix}0{suffix}
        </span>
      )}
    </div>
  );
};
