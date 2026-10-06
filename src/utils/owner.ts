// Initials for the owner badge on graph nodes and in the item drawer. Names keep
// the original rule ("Marco Rossi" → "MR"); SSO usernames are often emails, so the
// local part is split on . _ - ("mario.rossi@example.com" → "MR").
// No owner and the forms' default "Team T&A" both → "TA".
export function getOwnerInitials(owner?: string): string {
  if (!owner || owner.trim() === 'Team T&A') return 'TA';
  const parts = owner.includes('@') ? owner.split('@')[0].split(/[._-]/) : owner.split(' ');
  return parts.map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
