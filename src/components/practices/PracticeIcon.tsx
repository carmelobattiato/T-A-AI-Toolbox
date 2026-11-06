import React from 'react';
import { Layers } from 'lucide-react';
import { ICON_OPTIONS } from '../../utils/icons.tsx';
import { isIconKey } from '../../utils/iconKeys.ts';

// Icon used when a practice has none chosen
export const DEFAULT_PRACTICE_ICON = 'layers';

// The practice icon, one of the icons offered in the forms (see ICON_OPTIONS)
export const PracticeIcon: React.FC<{ icon?: string | null; className?: string }> = ({ icon, className = 'h-5 w-5' }) => {
  const key = isIconKey(icon) ? icon : DEFAULT_PRACTICE_ICON;
  const Icon = ICON_OPTIONS.find(o => o.key === key)?.Icon ?? Layers;
  return <Icon className={className} />;
};
