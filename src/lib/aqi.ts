
export const getAQILevel = (pm25: number) => {
  if (pm25 <= 12) return { 
    label: 'Good', 
    emoji: '😊',
    color: '#10B981', // emerald-500
    text: 'text-emerald-500', 
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
  };
  if (pm25 <= 35) return { 
    label: 'Moderate', 
    emoji: '😐',
    color: '#FBBF24', // amber-400
    text: 'text-amber-400', 
    glow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' 
  };
  if (pm25 <= 55) return { 
    label: 'Sensitive Groups', 
    emoji: '😷',
    color: '#F97316', // orange-500
    text: 'text-orange-500', 
    glow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
  };
  if (pm25 <= 150) return { 
    label: 'Unhealthy', 
    emoji: '🤢',
    color: '#E11D48', // rose-600
    text: 'text-rose-600', 
    glow: 'shadow-[0_0_15px_rgba(225,29,72,0.3)]' 
  };
  if (pm25 <= 250) return {
    label: 'Very Unhealthy',
    emoji: '🤮',
    color: '#9333EA', // purple-600
    text: 'text-purple-600',
    glow: 'shadow-[0_0_15px_rgba(147,51,234,0.4)]'
  };
  return { 
    label: 'Hazardous', 
    emoji: '💀',
    color: '#0F172A', // slate-900
    text: 'text-slate-900', 
    glow: 'shadow-[0_0_15px_rgba(15,23,42,0.4)]' 
  };
};
