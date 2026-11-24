import React from 'react';
import {
  ArrowLeftRight,
  Briefcase,
  Car,
  Coffee,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Package,
  ShoppingBag,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';

// Calm, harmonious tonal accents per category (never jarring/oversaturated)
export const CATEGORY_ACCENTS: Record<string, string> = {
  'cat-makanan': '#E59866',
  'cat-pendidikan': '#7D8CE0',
  'cat-kebutuhan': '#63B8C8',
  'cat-transport': '#6BA4E8',
  'cat-kesehatan': '#DF7A7A',
  'cat-hiburan': '#A98AD8',
  'cat-belanja': '#D97B93',
  'cat-lainnya-exp': '#8E8E93',
  'cat-gaji': '#4CC38A',
  'cat-kiriman': '#56B8A8',
  'cat-bonus': '#6BA4E8',
  'cat-lainnya-inc': '#4CC38A',
};

export const CategoryIcon: React.FC<{
  categoryId?: string;
  isTransfer?: boolean;
  className?: string;
}> = ({ categoryId, isTransfer, className = 'w-[18px] h-[18px]' }) => {
  if (isTransfer) return <ArrowLeftRight className={className} />;
  switch (categoryId) {
    case 'cat-makanan':
      return <Coffee className={className} />;
    case 'cat-pendidikan':
      return <GraduationCap className={className} />;
    case 'cat-kebutuhan':
      return <Zap className={className} />;
    case 'cat-transport':
      return <Car className={className} />;
    case 'cat-kesehatan':
      return <HeartPulse className={className} />;
    case 'cat-hiburan':
      return <Gamepad2 className={className} />;
    case 'cat-belanja':
      return <ShoppingBag className={className} />;
    case 'cat-kiriman':
      return <Wallet className={className} />;
    case 'cat-gaji':
      return <Briefcase className={className} />;
    case 'cat-bonus':
      return <Gift className={className} />;
    case 'cat-lainnya-inc':
      return <Sparkles className={className} />;
    default:
      return <Package className={className} />;
  }
};

export const CategoryBadge: React.FC<{
  categoryId?: string;
  type?: 'income' | 'expense' | 'transfer';
  size?: 'sm' | 'md';
}> = ({ categoryId, type = 'expense', size = 'md' }) => {
  const dim = size === 'sm' ? 'w-8 h-8 rounded-full' : 'w-10 h-10 rounded-full';
  const iconCls = size === 'sm' ? 'w-[15px] h-[15px]' : 'w-[18px] h-[18px]';
  const accent =
    type === 'transfer'
      ? '#0A84FF'
      : (categoryId && CATEGORY_ACCENTS[categoryId]) || '#8E8E93';

  return (
    <div
      className={`${dim} flex items-center justify-center shrink-0`}
      style={{
        backgroundColor: `${accent}20`,
        color: accent,
      }}
    >
      <CategoryIcon
        categoryId={categoryId}
        isTransfer={type === 'transfer'}
        className={iconCls}
      />
    </div>
  );
};
