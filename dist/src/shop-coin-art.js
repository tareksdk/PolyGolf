const coin = (x, y, angle) => `<g transform="translate(${x} ${y}) rotate(${angle})" stroke-linejoin="round">
  <ellipse cy="3" rx="8" ry="5" fill="#b86b20"/>
  <ellipse rx="8" ry="5" fill="#ffd85a" stroke="#f8ad34" stroke-width="1.2"/>
  <path d="M-4 0h8" stroke="#ffefac" stroke-width="1.2"/>
</g>`;

export function coinChest({ full = false, extra = false } = {}) {
  return `<ellipse cx="82" cy="98" rx="64" ry="8" fill="#24180e" opacity=".32"/>
  <path d="m31 65 2-27 18-13 77 13 7 15-18 21Z" fill="#774025" stroke="#502a23" stroke-width="3"/>
  <path d="m33 38 18-13 77 13-16 10Z" fill="#d17c3d"/>
  <path d="m42 40 16-12 12 2-16 12m46 8 16-14 12 2-16 14" fill="#fac35c"/>
  <path d="m43 51 70 11 18-12-3 12-18 14-77-11Z" fill="#482b20"/>
  ${[[45,59,8],[60,56,-14],[75,61,5],[90,58,-12],[103,64,19],[116,59,-20],[66,65,14],[83,68,3]].map(c => coin(...c)).join("")}
  ${full ? [[59,48,-17],[74,53,10],[89,49,-6],[102,55,14]].map(c => coin(...c)).join("") : ""}
  <path d="m28 64 83 12 25-16-4 24-23 15-77-11Z" fill="#ae5c30" stroke="#572e23" stroke-width="3"/>
  <path d="m111 76 25-16-4 24-23 15Z" fill="#713b28"/>
  <path d="m28 64 83 12 25-16-1 6-24 17-82-13m14 2 8 2 2 17-8-1Zm49 7 8 2-1 16-8-1Z" fill="#f6af42"/>
  <path d="m70 78 15 3-1 10-14-2Z" fill="#ffd35c"/>
  <path d="m77 82 0 4" stroke="#9d5725" stroke-width="2" stroke-linecap="round"/>
  ${[[27,93,-8],[52,101,12],[130,97,-9]].map(c => coin(...c)).join("")}
  ${extra ? [[12,86,15],[139,92,-26],[147,101,8],[112,104,12]].map(c => coin(...c)).join("") : ""}
  <path d="m156 29 2 6 6 2-6 2-2 6-2-6-6-2 6-2ZM18 45l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#fff1b2"/>`;
}

export function coinChestArt(size = 1) {
  return `<svg class="store-chest" viewBox="0 0 168 112" aria-hidden="true" focusable="false">${coinChest({ full: size > 1, extra: size > 2 })}</svg>`;
}
