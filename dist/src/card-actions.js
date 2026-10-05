// Card backgrounds forward to an existing, keyboard-accessible primary button.
// Direct links, inputs and secondary buttons retain their own behaviour.
export function cardActionTarget(target) {
  const direct = target.closest('[data-action]');
  if (direct) return direct;
  if (target.closest('button,a,input,select,textarea,label,[contenteditable]')) return null;
  return target.closest('[data-card]')?.querySelector('[data-card-primary]') || null;
}
