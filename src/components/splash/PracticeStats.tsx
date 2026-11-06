import React, { useEffect, useState } from 'react';
import { Layers, Network, Wrench, Lightbulb, Target } from 'lucide-react';

interface Counts {
  phases: number;
  tools: number;
  wips: number;
  needs: number;
}

interface PracticeStatsProps {
  practiceCount: number;
  // Counts are read for this practice (the one highlighted in the splash)
  practiceId: string | null;
}

// Summary strip of the splash: how many practices, and what the highlighted practice holds
export const PracticeStats: React.FC<PracticeStatsProps> = ({ practiceCount, practiceId }) => {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    if (!practiceId) return;
    let cancelled = false;
    setCounts(null);
    const query = `?practice=${encodeURIComponent(practiceId)}`;
    Promise.all([fetch(`/api/phases${query}`), fetch(`/api/items${query}`)])
      .then(async ([phasesRes, itemsRes]) => {
        if (!phasesRes.ok || !itemsRes.ok) return;
        const phases: unknown[] = await phasesRes.json();
        const items: { type: string }[] = await itemsRes.json();
        if (cancelled) return;
        setCounts({
          phases: phases.length,
          tools: items.filter(i => i.type === 'TOOL').length,
          wips: items.filter(i => i.type === 'IDEA').length,
          needs: items.filter(i => i.type === 'NEED').length,
        });
      })
      .catch(() => {
        // Stats are a convenience: the splash works without them
      });
    return () => {
      cancelled = true;
    };
  }, [practiceId]);

  const cells: { label: string; value: number | string; Icon: React.FC<{ className?: string }> }[] = [
    { label: 'Practices', value: practiceCount, Icon: Layers },
    { label: 'Process phases', value: counts?.phases ?? '–', Icon: Network },
    { label: 'Tools', value: counts?.tools ?? '–', Icon: Wrench },
    { label: 'WiPs', value: counts?.wips ?? '–', Icon: Lightbulb },
    { label: 'Open needs', value: counts?.needs ?? '–', Icon: Target },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {cells.map(({ label, value, Icon }) => (
        <div key={label} className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-purple-700 ring-1 ring-slate-200">
            <Icon className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="text-base font-extrabold text-slate-900">{value}</div>
            <div className="text-[11px] text-slate-500">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
