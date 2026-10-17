import { normalizeUsername, usernameChangeCost } from './usernames.js';
import { button, coins, esc } from './views.js';

export function usernameConfirmation(draft) {
  return `<section class="username-confirm"><small>ACCOUNT USERNAME</small><h2>Change to ${esc(draft.username)}?</h2><p>Use <strong>${esc(draft.username)}</strong> to sign in after this change. Your password, items, friends and scores stay with your account.</p><div class="rename-cost"><span>This change</span>${draft.expectedCost ? coins(draft.expectedCost) : '<strong>Free</strong>'}</div><p class="small-note">First change free. Second: 10,000 coins. Third: 100,000 coins. Every later change: 1,000,000 coins.</p><p id="username-error" role="alert" class="form-error"></p><div class="row">${button('Cancel','close-modal','','button secondary')}${button(draft.expectedCost ? 'Pay '+draft.expectedCost.toLocaleString()+' coins' : 'Confirm free change','confirm-username','','button yellow')}</div></section>`;
}

export async function usernameAction(ui, action) {
  if (!['save-name','confirm-username'].includes(action) || !ui.cloud.session) return false;
  if (ui.renaming) return true;
  if (ui.cloud.isGuest) throw Error('Create an account to choose your account username.');
  if (ui.cloud.room || ui.game.state !== 'menu') throw Error('Leave your round or multiplayer room before changing your username.');
  const actor = ui.cloud.session.user.id;
  if (action === 'save-name') {
    const username = normalizeUsername(document.getElementById('player-name').value);
    if (username === ui.cloud.username) { ui.toast('That is already your username. No coins spent.'); return true; }
    const expectedCost = usernameChangeCost(ui.cloud.usernameChanges ?? 0);
    if (ui.progress.data.coins < expectedCost) throw Error('You need '+expectedCost.toLocaleString()+' coins for your next username change.');
    // Keep the request ID across retries after a lost network response.
    if (ui.usernameDraft?.actor !== actor || ui.usernameDraft.username !== username || ui.usernameDraft.expectedCost !== expectedCost)
      ui.usernameDraft = { actor, username, expectedCost, requestId: crypto.randomUUID() };
    ui.modal(usernameConfirmation(ui.usernameDraft));
    return true;
  }
  const draft = ui.usernameDraft;
  if (!draft || draft.actor !== actor) throw Error('Choose your new username again.');
  ui.renaming = true;
  const confirm = document.querySelector('[data-action="confirm-username"]');
  if (confirm) { confirm.disabled = true; confirm.textContent = 'Saving…'; }
  try {
    const result = await ui.cloud.call('change_username', { username: draft.username, expectedCost: draft.expectedCost, requestId: draft.requestId });
    if (ui.cloud.session?.user.id !== actor) return true;
    ui.usernameDraft = null;
    ui.closeModal(); ui.render(); ui.audio.play('reward');
    ui.toast('Username saved. Sign in as '+result.username+'.');
  } catch (error) {
    if (ui.cloud.session?.user.id !== actor) return true;
    const message = document.getElementById('username-error');
    if (message) message.textContent = error.message;
    else ui.toast(error.message);
    if (confirm?.isConnected) { confirm.disabled = false; confirm.textContent = 'Try again'; }
    // A second browser tab may have completed a rename or changed the balance.
    await ui.cloud.call('me').catch(() => {});
  } finally { ui.renaming = false; }
  return true;
}
