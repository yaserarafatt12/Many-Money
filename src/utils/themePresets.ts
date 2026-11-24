import { BgPresetId } from '../types';

export interface BgPresetConfig {
  id: BgPresetId;
  name: string;
  mode: 'dark' | 'light';
  color: string;
}

// Pure Black & White iOS native canvas presets
export const BG_PRESETS: BgPresetConfig[] = [
  { id: 'obsidian', name: 'Hitam (OLED)', mode: 'dark', color: '#000000' },
  { id: 'cloud', name: 'Putih (iOS)', mode: 'light', color: '#F2F2F7' },
];

export function getCanvasColor(presetId: BgPresetId): string {
  return presetId === 'cloud' ? '#F2F2F7' : '#000000';
}
