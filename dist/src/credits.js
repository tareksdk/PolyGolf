import { button, esc } from "./views.js";
export const TEAM_CREDITS = [
  ["Tarek G. Sidki", "Co-Founder / CEO"],
  ["Jake Aleo", "Co-Founder / COO"],
  ["Ethan DeSwert", "Co-Founder / Developer"],
  ["Oliver Sadler", "CFO / Head of AI"],
  ["Shea O'neil", "Head of Game Development"],
  ["Leo Garcia", "Head of Merchandise"],
  ["Samuel Visser", "Game Development"],
  ["Edison Welch", "Developer"],
  ["Shalev Cammy", "Media / Playtester"],
  ["Bumbo", "Playtester"],
  ["TJ Dixon", "Playtester"],
  ["Levi Morin", "Great Idea"],
];
export function creditsDialog() {
  return `<section class="credits-panel"><div class="credits-mark" aria-hidden="true">310<span>×</span>OS</div><span class="eyebrow">THE PEOPLE BEHIND POLYGOLF</span><h2>Room310 <span>×</span><br>OneShotStudios</h2><div class="credits-team">${TEAM_CREDITS.map(([name, role]) => `<div><strong>${esc(name)}</strong><span>${esc(role)}</span></div>`).join("")}</div><div class="credits-support"><h3>With our thanks</h3><strong>Northampton High School</strong><p>Community Support</p><p class="credits-finkel">Thank you to Mr. Finkel for always believing in us.</p></div><p class="credits-note">To our dev team and everyone who has played, tested, shared, or cheered us on: thank you for helping us build something we’re proud of. Your time, encouragement, and honest feedback keep this team moving. PolyGolf is better because of you, and we’re grateful to have you with us.</p><div class="modal-actions">${button("Back to settings", "settings", "", "button secondary")}${button("Back to the game", "close-modal", "", "button yellow")}</div></section>`;
}
