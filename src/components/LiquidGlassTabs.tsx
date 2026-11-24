import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { playLiquidTickSfx } from '../utils/sfx';

export interface LiquidGlassTabOption<T extends string | number> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface LiquidGlassTabsProps<T extends string | number> {
  options: LiquidGlassTabOption<T>[];
  value: T;
  onChange: (val: T) => void;
  isLight?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function LiquidGlassTabs<T extends string | number>({
  options,
  value,
  onChange,
  isLight = false,
  size = 'sm',
  className = '',
}: LiquidGlassTabsProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const lastHapticIndexRef = useRef<number>(-1);
  const activePointerIdRef = useRef<number | null>(null);
  const lastCommittedRef = useRef<T>(value);

  useEffect(() => {
    lastCommittedRef.current = value;
  }, [value]);

  const activeIndex = Math.max(
    0,
    options.findIndex((item) => item.id === value)
  );
  const itemCount = Math.max(1, options.length);
  const slotWidth = trackWidth > 0 ? trackWidth / itemCount : 0;
  const PAD_X = 4;

  const rawCenterX = useMotionValue(0);
  const smoothCenterX = useSpring(rawCenterX, {
    stiffness: 420,
    damping: 32,
    mass: 0.72,
  });

  const stretchScaleX = useSpring(1, { stiffness: 360, damping: 26 });
  const prevXRef = useRef(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const innerW = Math.max(0, el.clientWidth - PAD_X * 2);
      setTrackWidth(innerW);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [options.length]);

  useEffect(() => {
    if (!isHolding && slotWidth > 0) {
      const targetCenter = PAD_X + activeIndex * slotWidth + slotWidth / 2;
      rawCenterX.set(targetCenter);
      prevXRef.current = targetCenter;
    }
  }, [activeIndex, slotWidth, isHolding, rawCenterX]);

  const commitTabByIndex = useCallback(
    (idx: number) => {
      const item = options[idx];
      if (!item) return;
      if (item.id !== lastCommittedRef.current) {
        lastCommittedRef.current = item.id;
        if (navigator.vibrate) navigator.vibrate(8);
        playLiquidTickSfx('release');
        onChange(item.id);
      }
    },
    [options, onChange]
  );

  const getIndexFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || slotWidth <= 0) return { idx: activeIndex, clampedX: 0 };
      const rect = el.getBoundingClientRect();
      const relX = clientX - rect.left - PAD_X;
      const minCenter = PAD_X + slotWidth / 2;
      const maxCenter = PAD_X + trackWidth - slotWidth / 2;
      const clampedX = Math.max(minCenter, Math.min(maxCenter, clientX - rect.left));
      const idx = Math.max(0, Math.min(itemCount - 1, Math.floor(relX / slotWidth)));
      return { idx, clampedX };
    },
    [activeIndex, itemCount, slotWidth, trackWidth]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const { idx, clampedX } = getIndexFromClientX(e.clientX);
    setIsHolding(true);
    setHoverIndex(idx);
    lastHapticIndexRef.current = idx;
    rawCenterX.set(clampedX);
    prevXRef.current = clampedX;
    if (navigator.vibrate) navigator.vibrate(5);
    playLiquidTickSfx('grab');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHolding || activePointerIdRef.current !== e.pointerId) return;
    const { idx, clampedX } = getIndexFromClientX(e.clientX);

    const velocity = Math.abs(clampedX - prevXRef.current);
    prevXRef.current = clampedX;
    stretchScaleX.set(1 + Math.min(0.14, velocity * 0.006));

    rawCenterX.set(clampedX);
    if (idx !== lastHapticIndexRef.current) {
      lastHapticIndexRef.current = idx;
      setHoverIndex(idx);
      if (navigator.vibrate) navigator.vibrate(4);
      playLiquidTickSfx('scrub');
    }
  };

  const finishInteraction = (e: React.PointerEvent<HTMLDivElement>, shouldCommit: boolean) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    activePointerIdRef.current = null;

    const finalIdx = hoverIndex ?? activeIndex;
    setIsHolding(false);
    setHoverIndex(null);
    stretchScaleX.set(1);

    if (shouldCommit) {
      commitTabByIndex(finalIdx);
    }
    if (slotWidth > 0) {
      const snapCenter =
        PAD_X + (shouldCommit ? finalIdx : activeIndex) * slotWidth + slotWidth / 2;
      rawCenterX.set(snapCenter);
      prevXRef.current = snapCenter;
    }
  };

  const barHeightClass = size === 'sm' ? 'h-[42px]' : 'h-[46px]';
  const restingHeight = size === 'sm' ? 34 : 38;
  const holdingHeight = size === 'sm' ? 48 : 54;
  const restingWidth = Math.max(36, slotWidth);
  const holdingWidth = Math.max(52, slotWidth + 12);
  const bubbleWidth = isHolding ? holdingWidth : restingWidth;
  const bubbleLeft = useTransform(smoothCenterX, (cx) => cx - bubbleWidth / 2);

  const displayActiveIndex = isHolding && hoverIndex !== null ? hoverIndex : activeIndex;

  return (
    <div
      className={`relative w-full ${barHeightClass} rounded-full overflow-visible select-none transition-transform duration-300 ${
        isHolding ? 'scale-[1.012]' : 'scale-100'
      } ${className}`}
    >
      {/* Clipped Crystal-Clear Transparent Liquid Glass Shell */}
      <div
        className={`absolute inset-0 rounded-full overflow-hidden border pointer-events-none ${
          isLight
            ? 'border-white/85 shadow-[0_8px_22px_rgba(15,23,42,0.06)]'
            : 'border-white/22 shadow-[0_10px_28px_rgba(0,0,0,0.22)]'
        }`}
      >
        <div
          className="absolute inset-0 z-0 rounded-full"
          style={{
            backdropFilter: 'blur(20px) saturate(190%)',
            WebkitBackdropFilter: 'blur(20px) saturate(190%)',
          }}
        />
        <div
          className="absolute inset-0 z-10 rounded-full"
          style={{
            background: isLight
              ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.52) 0%, rgba(255, 255, 255, 0.24) 100%)'
              : 'linear-gradient(180deg, rgba(255, 255, 255, 0.085) 0%, rgba(255, 255, 255, 0.025) 100%)',
          }}
        />
        <div
          className="absolute inset-0 z-20 rounded-full"
          style={{
            boxShadow: isLight
              ? 'inset 0 1.5px 1px rgba(255, 255, 255, 0.95), inset 0 -1px 1px rgba(15, 23, 42, 0.04)'
              : 'inset 0 1.5px 1px rgba(255, 255, 255, 0.32), inset 0 -1px 1px rgba(255, 255, 255, 0.06)',
          }}
        />
      </div>

      {/* Interactive Scrub Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishInteraction(e, true)}
        onPointerCancel={(e) => finishInteraction(e, false)}
        className="relative z-30 flex items-center justify-around h-full w-full px-[4px] touch-none select-none cursor-pointer"
      >
        {/* Blooming Refractive Lens Bubble */}
        {slotWidth > 0 && (
          <motion.div
            aria-hidden="true"
            style={{
              left: bubbleLeft,
              scaleX: stretchScaleX,
              top: '50%',
              y: '-50%',
            }}
            animate={{
              width: bubbleWidth,
              height: isHolding ? holdingHeight : restingHeight,
            }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 30,
              mass: 0.7,
            }}
            className="absolute rounded-full pointer-events-none z-10 overflow-hidden"
          >
            <div
              className="w-full h-full rounded-full relative transition-all duration-200"
              style={{
                backdropFilter: isHolding
                  ? 'blur(12px) saturate(170%) brightness(1.15)'
                  : 'blur(12px) saturate(120%)',
                WebkitBackdropFilter: isHolding
                  ? 'blur(12px) saturate(170%) brightness(1.15)'
                  : 'blur(12px) saturate(120%)',
                background: isHolding
                  ? isLight
                    ? 'radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.88) 0%, rgba(226,232,240,0.45) 65%, rgba(203,213,225,0.28) 100%)'
                    : 'radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.34) 0%, rgba(226,232,240,0.16) 55%, rgba(255,255,255,0.08) 100%)'
                  : isLight
                    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.72) 100%)'
                    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.10) 100%)',
                boxShadow: isHolding
                  ? isLight
                    ? 'inset 0 2px 3px rgba(255,255,255,1), 0 8px 20px rgba(15,23,42,0.14), 0 0 0 1px rgba(255,255,255,0.95)'
                    : 'inset 0 2px 3px rgba(255,255,255,0.85), 0 10px 26px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.45)'
                  : isLight
                    ? 'inset 0 1.5px 1px rgba(255,255,255,1), 0 4px 12px rgba(15,23,42,0.08), 0 0 0 1px rgba(255,255,255,0.9)'
                    : 'inset 0 1.5px 1px rgba(255,255,255,0.42), 0 4px 14px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.16)',
              }}
            />
          </motion.div>
        )}

        {/* Tab Option Buttons */}
        {options.map((opt, idx) => {
          const isActive = displayActiveIndex === idx;
          const isBeingHeld = isHolding && hoverIndex === idx;
          return (
            <button
              key={String(opt.id)}
              type="button"
              onClick={() => commitTabByIndex(idx)}
              className={`relative z-20 flex-1 h-full flex items-center justify-center gap-1 px-1.5 rounded-full cursor-pointer select-none focus:outline-none ${
                size === 'sm' ? 'text-[11.5px]' : 'text-[12.5px]'
              } font-medium tracking-tight transition-colors duration-200 ${
                isActive
                  ? isLight
                    ? 'text-[#0b1120] font-semibold'
                    : 'text-white font-semibold'
                  : isLight
                    ? 'text-[#0b1120]/55 hover:text-[#0b1120]'
                    : 'text-white/55 hover:text-white/90'
              }`}
            >
              <motion.span
                className="inline-flex items-center justify-center gap-1 truncate"
                animate={{
                  scale: isBeingHeld ? 1.07 : isActive ? 1.02 : 0.98,
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                {opt.icon && <span className="shrink-0 flex items-center">{opt.icon}</span>}
                <span className="truncate">{opt.label}</span>
              </motion.span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
