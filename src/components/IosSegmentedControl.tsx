import React from 'react';
import { motion } from 'framer-motion';
import { playLiquidTickSfx } from '../utils/sfx';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
}

interface IosSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  layoutId: string;
}

export function IosSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
}: IosSegmentedControlProps<T>) {
  return (
    <div
      className="relative flex items-center p-[3px] rounded-[11px] select-none"
      style={{ backgroundColor: 'var(--ios-fill)' }}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) {
                if (navigator.vibrate) navigator.vibrate(5);
                playLiquidTickSfx('release');
                onChange(opt.id);
              }
            }}
            className={`relative flex-1 py-[6px] px-1 text-[12.5px] font-semibold tracking-[-0.01em] rounded-[8.5px] transition-colors duration-150 cursor-pointer ${
              active
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {active && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                className="absolute inset-0 rounded-[8.5px] shadow-[0_1px_3px_rgba(0,0,0,0.22)]"
                style={{ backgroundColor: 'var(--ios-card-elevated)' }}
              />
            )}
            <span className="relative z-10 truncate block">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
