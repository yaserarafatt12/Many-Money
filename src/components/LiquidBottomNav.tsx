import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  NotebookPen,
  PieChart,
  Plus,
  ReceiptText,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { MainTab } from '../types';
import { playLiquidTickSfx } from '../utils/sfx';
import { STRINGS } from '../utils/i18n';

interface LiquidBottomNavProps {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
  onPrimaryAction: () => void;
  onLongPressPrimary?: () => void;
  showPrimaryAction?: boolean;
  primaryActionKind?: 'transaction' | 'memo';
  isLight: boolean;
  language?: 'id' | 'en';
}

const NAV_ITEMS: {
  id: MainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'transaksi', label: 'Transaksi', icon: ReceiptText },
  { id: 'statistik', label: 'Statistik', icon: PieChart },
  { id: 'aset', label: 'Aset', icon: Wallet },
  { id: 'lainnya', label: 'Menu', icon: SlidersHorizontal },
];

export const LiquidBottomNav: React.FC<LiquidBottomNavProps> = ({
  activeTab,
  onChange,
  onPrimaryAction,
  onLongPressPrimary,
  showPrimaryAction = true,
  primaryActionKind = 'transaction',
  isLight,
  language = 'id',
}) => {
  const t = STRINGS[language];
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const lastHapticIndexRef = useRef<number>(-1);
  const activePointerIdRef = useRef<number | null>(null);

  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => item.id === activeTab)
  );
  const itemCount = NAV_ITEMS.length;
  const slotWidth = trackWidth > 0 ? trackWidth / itemCount : 0;
  const PAD_X = 7;

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
  }, []);

  useEffect(() => {
    if (!isHolding && slotWidth > 0) {
      const targetCenter = PAD_X + activeIndex * slotWidth + slotWidth / 2;
      rawCenterX.set(targetCenter);
      prevXRef.current = targetCenter;
    }
  }, [activeIndex, slotWidth, isHolding, rawCenterX]);

  const commitTabByIndex = useCallback(
    (idx: number) => {
      const item = NAV_ITEMS[idx];
      if (!item) return;
      if (item.id !== activeTab) {
        if (navigator.vibrate) navigator.vibrate(8);
        playLiquidTickSfx('release');
        onChange(item.id);
      }
    },
    [activeTab, onChange]
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

  const restingWidth = Math.max(58, slotWidth - 2);
  const holdingWidth = Math.max(74, slotWidth + 14);
  const bubbleWidth = isHolding ? holdingWidth : restingWidth;
  const bubbleLeft = useTransform(smoothCenterX, (cx) => cx - bubbleWidth / 2);

  const displayActiveIndex = isHolding && hoverIndex !== null ? hoverIndex : activeIndex;

  return (
    <>
      {/* Subtle soft bottom fade so scrolled rows dissolve gently without darkening the dock */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none"
        style={{
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maskImage: 'linear-gradient(to top, black 25%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 25%, transparent 100%)',
        }}
      />

      {/* Paired iOS 26 Floating Dock: Liquid Glass 4-Tab Pill + Detached Circular Action Orb */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-28px)] max-w-[404px] flex items-center gap-2.5 pointer-events-none">
        <nav
          aria-label="Navigasi Utama"
          className={`relative flex-1 h-[60px] rounded-full overflow-visible pointer-events-auto transition-transform duration-300 ${
            isHolding ? 'scale-[1.015]' : 'scale-100'
          }`}
        >
          {/* Clipped Crystal-Clear Liquid Glass Base Pill */}
          <div
            className={`absolute inset-0 rounded-full overflow-hidden border pointer-events-none ${
              isLight
                ? 'border-white/90 shadow-[0_12px_32px_rgba(15,23,42,0.10)]'
                : 'border-white/24 shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
            }`}
          >
            <div
              className="absolute inset-0 z-0 rounded-full"
              style={{
                backdropFilter: 'blur(24px) saturate(200%)',
                WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              }}
            />
            <div
              className="absolute inset-0 z-10 rounded-full"
              style={{
                background: isLight
                  ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.28) 100%)'
                  : 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)',
              }}
            />
            <div
              className="absolute inset-0 z-20 rounded-full"
              style={{
                boxShadow: isLight
                  ? 'inset 0 1.5px 1px rgba(255, 255, 255, 1), inset 0 -1px 1px rgba(15, 23, 42, 0.05)'
                  : 'inset 0 1.5px 1px rgba(255, 255, 255, 0.38), inset 0 -1px 1px rgba(255, 255, 255, 0.08)',
              }}
            />
          </div>

          {/* Interactive Hold & Scrub Track */}
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => finishInteraction(e, true)}
            onPointerCancel={(e) => finishInteraction(e, false)}
            className="relative z-30 flex items-center justify-around h-full w-full px-[7px] touch-none select-none cursor-pointer"
          >
            {/* Blooming Refractive Liquid Lens Bubble */}
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
                  height: isHolding ? 70 : 48,
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
                      ? 'blur(12px) saturate(180%) brightness(1.18)'
                      : 'blur(12px) saturate(130%)',
                    WebkitBackdropFilter: isHolding
                      ? 'blur(12px) saturate(180%) brightness(1.18)'
                      : 'blur(12px) saturate(130%)',
                    background: isHolding
                      ? isLight
                        ? 'radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.84) 0%, rgba(226,232,240,0.4) 65%, rgba(203,213,225,0.28) 100%)'
                        : 'radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.32) 0%, rgba(226,232,240,0.14) 55%, rgba(255,255,255,0.06) 100%)'
                      : isLight
                        ? 'rgba(11, 15, 23, 0.085)'
                        : 'rgba(255, 255, 255, 0.16)',
                    boxShadow: isHolding
                      ? isLight
                        ? 'inset 0 2px 3px rgba(255,255,255,1), inset 0 -2px 4px rgba(15,23,42,0.12), 0 8px 24px rgba(15,23,42,0.16), 0 0 0 1px rgba(255,255,255,0.9)'
                        : 'inset 0 2px 3px rgba(255,255,255,0.8), inset 0 -2px 5px rgba(255,255,255,0.25), 0 10px 28px rgba(0,0,0,0.52), 0 0 0 1px rgba(255,255,255,0.4)'
                      : isLight
                        ? 'inset 0 1px 1px rgba(255,255,255,0.8)'
                        : 'inset 0 1px 1px rgba(255,255,255,0.28)',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-200"
                    style={{
                      opacity: isHolding ? 0.92 : 0,
                      background:
                        'radial-gradient(100% 70% at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 100%)',
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* Tab Buttons */}
            {NAV_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              const isActive = displayActiveIndex === idx;
              const isBeingHeld = isHolding && hoverIndex === idx;
              const label =
                item.id === 'transaksi'
                  ? t.navTransactions
                  : item.id === 'statistik'
                    ? t.navStats
                    : item.id === 'aset'
                      ? t.navAssets
                      : t.navMenu;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  onClick={() => commitTabByIndex(idx)}
                  className="relative z-20 flex flex-col items-center justify-center flex-1 h-[50px] cursor-pointer select-none focus:outline-none"
                >
                  <motion.div
                    className={`flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
                      isActive
                        ? isLight
                          ? 'text-[#0b0f17]'
                          : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                        : isLight
                          ? 'text-[#0b0f17]/45'
                          : 'text-white/45'
                    }`}
                    animate={{
                      scale: isBeingHeld ? 1.16 : isActive ? 1.04 : 0.96,
                    }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span className="text-[9.5px] font-bold tracking-tight leading-none">
                      {label}
                    </span>
                  </motion.div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Detached Circular Action Orb — Tap = Add, Hold = Instant Voice Input */}
        {showPrimaryAction && (
          <motion.button
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onPointerDown={() => {
              longPressFiredRef.current = false;
              if (onLongPressPrimary && primaryActionKind === 'transaction') {
                longPressTimerRef.current = window.setTimeout(() => {
                  longPressFiredRef.current = true;
                  if (navigator.vibrate) navigator.vibrate([12, 30, 12]);
                  playLiquidTickSfx('grab');
                  onLongPressPrimary();
                }, 420);
              }
            }}
            onPointerUp={() => {
              if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
              }
            }}
            onPointerCancel={() => {
              if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
              }
            }}
            onClick={() => {
              if (longPressFiredRef.current) {
                longPressFiredRef.current = false;
                return;
              }
              if (navigator.vibrate) navigator.vibrate(8);
              playLiquidTickSfx('release');
              onPrimaryAction();
            }}
            aria-label={primaryActionKind === 'memo' ? 'Tambah catatan' : 'Tambah transaksi (tahan untuk suara)'}
            title={primaryActionKind === 'memo' ? 'Tambah catatan' : 'Ketuk: Tambah · Tahan: Suara'}
            className={`pointer-events-auto w-[60px] h-[60px] rounded-full flex items-center justify-center shrink-0 border transition ${
              isLight
                ? 'bg-[#0b0f17] text-white border-black/20 shadow-[0_12px_28px_rgba(11,15,23,0.28)]'
                : 'bg-gradient-to-b from-white to-slate-200 text-[#090b0f] border-white/80 shadow-[0_14px_34px_rgba(0,0,0,0.55),inset_0_2px_2px_rgba(255,255,255,1)]'
            }`}
          >
            {primaryActionKind === 'memo' ? (
              <NotebookPen className="w-[21px] h-[21px]" />
            ) : (
              <Plus className="w-6 h-6 stroke-[2.75]" />
            )}
          </motion.button>
        )}
      </div>
    </>
  );
};
