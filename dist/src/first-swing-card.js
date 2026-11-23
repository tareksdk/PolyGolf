// The illustrated guide uses the same four stages for both lessons.
const flag = '<path d="M156 36V9" stroke="#f5e6bd" stroke-width="2"/><path d="M157 9l16 4-16 6z" fill="#ffb58a"/>';
const green = '<path d="M-8 47Q33 22 82 34T202 24V58H-8Z" fill="#3c7960"/><path d="M-8 54Q47 27 92 39T202 30" fill="none" stroke="#75aa7b" stroke-width="2"/>';
function diagram(phase, drive, targetPower) {
  let detail;
  if (phase === 'power' || phase === 'strike') {
    const power = phase === 'power', mark = 14 + 1.6 * targetPower;
    detail = `<rect x="12" y="20" width="164" height="14" rx="7" fill="#1c483b"/>
      ${power ? `<rect class="swing-fill" x="14" y="22" width="${mark-12}" height="10" rx="5" fill="#acd88f"/><path d="M${mark} 14v26" stroke="#ffe0a3" stroke-width="3"/>`
      : '<rect x="84" y="20" width="20" height="14" fill="#8ac382"/><path class="swing-needle" d="M94 14v25" stroke="#ffe6a5" stroke-width="4"/>'}`;
  } else if (phase === 'setup' && !drive) {
    detail = green + flag + '<ellipse cx="90" cy="35" rx="40" ry="9" fill="none" stroke="#f4d38d" stroke-dasharray="4 3"/><path d="m123 24 9 9-12 2" fill="none" stroke="#ffe3a8" stroke-width="2"/><circle cx="90" cy="32" r="5" fill="#fff5d9"/>';
  } else {
    const path = drive ? 'M26 41Q92 -14 151 36' : 'M26 41Q86 38 151 36';
    detail = green + flag + `<ellipse cx="155" cy="37" rx="5" ry="1.7" fill="#1a4436"/><path d="${path}" fill="none" stroke="#f9dfa5" stroke-width="1.6" stroke-dasharray="4 4"/><circle cx="26" cy="39" r="4.5" fill="#fff5d9"/>`;
  }
  return `<svg class="swing-diagram" viewBox="0 0 188 54" aria-hidden="true">${detail}</svg>`;
}

function mobileCard({phase, drive, targetPower, signIn}) {
  const titles = {
    setup: drive ? 'Choose your driver' : 'Look around the green',
    aim: drive ? 'Aim down the range' : 'Aim at the flag',
    power: 'Choose your power',
    strike: 'Time the direction',
    flight: drive ? 'Watch the landing' : 'Follow the ball'
  };
  let body;
  if (phase === 'setup' && !drive) {
    body = `<ul class="lesson-camera">
      <li data-tried="orbit"><i aria-hidden="true"></i><span>Put two fingers on the grass. Slide both sideways together to turn the camera.</span></li>
      <li data-tried="zoom"><i aria-hidden="true"></i><span>Spread them to zoom in. Pinch to zoom out.</span></li>
    </ul><button class="lesson-next" data-action="tutorial-next">Aim my putt</button>
    ${signIn ? '<button class="lesson-signin" data-action="tutorial-signin">Sign in</button>' : ''}`;
  } else if (phase === 'setup') {
    body = '<p>Tap the club name and pick Driver.</p><div class="lesson-club-slot"></div>';
  } else if (phase === 'aim' || phase === 'power') {
    const aim = phase === 'aim' ? 'Drag one finger left or right to aim. ' : '';
    body = `<p>${aim}<span class="lesson-timed">Hold the yellow button, then lift near <b>${targetPower}%</b>.</span><span class="lesson-preset">Slide to <b>${targetPower}%</b>, then tap Swing.</span></p>`;
  } else if (phase === 'strike') {
    body = '<p>Tap Swing when the white line reaches the green center.</p>';
  } else {
    body = '';
  }
  return `<header class="lesson-head"><h2>${titles[phase]}</h2><button data-action="tutorial-skip" aria-label="Skip tutorial">Skip</button></header>${body}`;
}

export function firstSwingCard({phase, drive, targetPower, touch, signIn}) {
  if (touch) return mobileCard({phase, drive, targetPower, signIn});
  const stages = [drive ? 'Club' : 'Camera', 'Aim', 'Power', 'Strike'];
  const stage = {setup:0, aim:1, power:2, strike:3, flight:3}[phase];
  const title = {
    setup:drive ? 'Switch to the driver' : 'Look around the tee',
    aim:drive ? 'Aim down the range' : 'Line up the putt',
    power:'Hold to build power',
    strike:'Catch the green centre',
    flight:drive ? 'Watch where it lands' : 'Follow your putt',
  }[phase];
  let body = '', next = '';
  if (phase === 'setup' && drive) {
    body = '<p>Carry the ball downrange. Press <kbd>C</kbd>, use the arrows, or open the club switcher and pick <b>Driver</b>.</p><div class="lesson-club-slot"></div>';
  } else if (phase === 'setup') {
    body = '<ul class="lesson-camera"><li data-tried="orbit"><i></i><span><b>Look around</b>Right-drag with a mouse, or two-finger click and drag on a trackpad.</span></li><li data-tried="zoom"><i></i><span><b>Zoom in or out</b>Scroll the wheel or swipe up or down with two fingers on a trackpad.</span></li></ul>';
    next = 'Aim my putt';
  } else if (phase === 'aim') {
    body = `<p>Move the pointer over the course. Use <kbd>←</kbd> <kbd>→</kbd> for small adjustments. ${drive ? 'Follow the arc to the landing spot.' : 'Point the guide through the cup.'}</p>`;
    next = 'Set power';
  } else if (phase === 'power') {
    body = `<p>Hold the left mouse button or <kbd>Space</kbd>. Release near <b>${targetPower}%</b>${targetPower<40?' for a gentle tap':''}.</p>`;
  } else if (phase === 'strike') {
    body = `<p>Click the course or press <kbd>Space</kbd> as the white marker crosses the green centre. A centred strike travels straight.</p>`;
  } else {
    body = drive ? '<p>The range measures your distance after the ball stops.</p>' : '<p>If it rolls past the flag, use less power on the next putt.</p>';
  }
  return `<header class="lesson-head"><span>${drive ? 'Meadowcrest Range' : 'Willow Practice Green'}</span><button data-action="tutorial-skip">Skip tutorial</button></header>
    <ol class="lesson-stages" aria-label="Lesson progress">${stages.map((s,i)=>`<li ${i===stage?'aria-current="step"':''} class="${i<stage?'done':''}">${s}</li>`).join('')}</ol>
    <div class="lesson-hero">${diagram(phase, drive, targetPower)}<h2>${title}</h2></div>${body}
    ${next ? `<button class="lesson-next" data-action="tutorial-next">${next}<span aria-hidden="true"> →</span></button>` : ''}
    ${signIn && phase==='setup' && !drive ? '<button class="lesson-signin" data-action="tutorial-signin">Already play? Sign in</button>' : ''}`;
}
