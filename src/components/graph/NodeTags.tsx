import React, { useEffect, useRef, useState } from 'react';
import { Unlink } from 'lucide-react';
import { getOwnerInitials } from '../../utils/owner.ts';

// Tags on the circle of a node. Each one explains itself: the tooltip appears once the pointer has stayed on it for 2 seconds.
const TOOLTIP_DELAY_MS = 2000;

interface TagProps {
  tooltip: string;
  ariaLabel: string;
  // Positioning of the tag inside the node (absolute corner or flex item)
  wrapperClassName?: string;
  className: string;
  children: React.ReactNode;
}

const Tag: React.FC<TagProps> = ({ tooltip, ariaLabel, wrapperClassName = '', className, children }) => {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const enter = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), TOOLTIP_DELAY_MS);
  };
  const leave = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <div className={wrapperClassName || 'relative'} onMouseEnter={enter} onMouseLeave={leave}>
      <div aria-label={ariaLabel} className={className}>
        {children}
      </div>
      {open && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none whitespace-nowrap rounded-md bg-slate-900/95 px-2 py-1 text-[10px] font-medium text-white shadow-xl"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
};

// Shared look of the pills; each tag sets its own text and border colour
const PILL = 'h-4 min-w-4 px-1 rounded-full text-[8px] font-bold flex items-center justify-center border shadow-xs whitespace-nowrap';

// Points on the rim of a node's circle, at 45° (top right) and 225° (bottom left), whatever the circle's size
const RIM_TOP_RIGHT = 'absolute left-[85.4%] top-[14.6%] -translate-x-1/2 -translate-y-1/2';
const RIM_BOTTOM_LEFT = 'absolute left-[14.6%] top-[85.4%] -translate-x-1/2 -translate-y-1/2';
// Rim point just under the bottom-right corner, where a WiP's priority sits below its completion
const RIM_BOTTOM_RIGHT_LOW = 'absolute left-[62.9%] top-[98.3%] -translate-x-1/2 -translate-y-1/2';

// Full name for the tooltip: an email ("mario.rossi@example.com") becomes "Mario Rossi"
function ownerFullName(owner: string): string {
  if (!owner.includes('@')) return owner;
  return owner
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || owner;
}

// Owner initials, bottom left. The full name is in the tooltip.
export const OwnerTag: React.FC<{ owner?: string }> = ({ owner }) => {
  if (!owner || !owner.trim()) return null;
  return (
    <Tag
      tooltip={`Owner: ${ownerFullName(owner.trim())}`}
      ariaLabel={`Owner ${owner}`}
      wrapperClassName={RIM_BOTTOM_LEFT}
      className={`${PILL} bg-white text-slate-900 border-black`}
    >
      {getOwnerInitials(owner)}
    </Tag>
  );
};

// Priority of a Need or WiP (1 = highest), bottom right
export const PriorityTag: React.FC<{ priority?: number | null; onRim?: boolean }> = ({ priority, onRim = false }) => {
  if (priority == null) return null;
  return (
    <Tag
      tooltip={`Priority P-${priority} (1 is the highest)`}
      ariaLabel={`Priority ${priority}`}
      wrapperClassName={onRim ? RIM_BOTTOM_RIGHT_LOW : undefined}
      className={`${PILL} bg-slate-800 text-white border-white`}
    >
      P-{priority}
    </Tag>
  );
};

// Completion of a WiP (orange) or efficiency of a Tool's activity (green), in %, next to the priority
export const PercentTag: React.FC<{ value?: number | null; tone: 'orange' | 'green'; label: string }> = ({ value, tone, label }) => {
  if (value == null) return null;
  const color = tone === 'orange' ? 'bg-orange-500' : 'bg-emerald-600';
  return (
    <Tag tooltip={`${label}: ${value}%`} ariaLabel={`${label} ${value}%`} className={`${PILL} ${color} text-white border-white`}>
      {value}%
    </Tag>
  );
};

// Shown on a Tool or WiP that is not linked to any solution of the portal, top right
export const UnlinkTag: React.FC = () => (
  <Tag
    tooltip="Not linked to any application on the portal"
    ariaLabel="Not linked to the portal"
    wrapperClassName={RIM_TOP_RIGHT}
    className="h-4 w-4 rounded-full bg-orange-700 text-white flex items-center justify-center border border-white shadow-xs"
  >
    <Unlink className="w-2.5 h-2.5" />
  </Tag>
);
