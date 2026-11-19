// Small static cover illustrations based on catalog colors and golf equipment silhouettes.
// Each image is assembled once, then decoded by the browser as a normal image.
const PAPER = "#fff4d7";
const INK = "#101b2f";
const urls = new Map();

const THEMES = [
  [/porcelain/, "#284f9e", "#688ee0", "#a5d1fc", "tiles"],
  [/oxford/, "#31237b", "#6261cb", "#f3c782", "tiles"],
  [/pistachio/, "#14684c", "#48ac70", "#c8ef92", "grove"],
  [/oxblood|burgundy/, "#771c58", "#bc4a83", "#ffbbaf", "arch"],
  [/stardust|moonstone|night/, "#44217e", "#8159ce", "#c6a4fc", "stars"],
  [/terracotta|persimmon|baguette|le long drive/, "#a73926", "#ea7450", "#ffd193", "dunes"],
  [/crystal|alpine/, "#145885", "#479fc7", "#b3f4f8", "peaks"],
  [/copper|forge/, "#553460", "#a66391", "#ffc28a", "forge"],
  [/evergreen|leaf|field notes|fairway|short game/, "#0e5149", "#348b65", "#c5e981", "grove"],
  [/cherrywood/, "#6e243b", "#a74964", "#fabe7d", "grove"],
  [/azalea/, "#8d226e", "#cd52a1", "#ffd0cd", "bloom"],
  [/tidal|long game/, "#115475", "#149fb1", "#9debe6", "waves"],
  [/horizon/, "#3b3b94", "#658add", "#ffc1ae", "peaks"],
  [/slapshot/, "#194474", "#4a8bc9", "#b5e4f8", "rink"],
  [/slate/, "#194474", "#4a8bc9", "#b5e4f8", "forge"],
  [/clean sweep|citrus|sunroom|tour locker/, "#8d571b", "#d89729", "#ffe89b", "dunes"],
  [/firecrest|oddities/, "#8d282a", "#d85630", "#ffd389", "forge"],
  [/workshop/, "#31435a", "#546e89", "#a5ddc1", "forge"],
  [/showtime/, "#612576", "#ab53bc", "#ffc0e9", "stars"],
  [/champions/, "#1d335e", "#3e5596", "#ffdc8a", "arch"],
];
const COLOR_THEMES = [
  ["#653575", "#a166c3", "#f6bc93", "arch"],
  ["#135e58", "#3e9771", "#c4df8b", "grove"],
  ["#243c7a", "#557cc4", "#b6daff", "peaks"],
];

const hex = (value, fallback) => typeof value === "string" && /^#[a-f0-9]{6}$/i.test(value) ? value : fallback;
const rgb = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
function mix(first, second, amount) {
  const target = rgb(second);
  return "#" + rgb(first).map((c, i) => Math.round(c + (target[i] - c) * amount).toString(16).padStart(2, "0")).join("");
}
function shade(color, amount) {
  return mix(color, amount >= 0 ? PAPER : INK, Math.abs(amount));
}
function stamp(value) {
  let hash = 2166136261;
  for (const letter of value) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return hash >>> 0;
}
const polygon = (points, fill, attrs = "") => `<polygon points="${points}" fill="${fill}"${attrs}/>`;
const path = (d, fill, attrs = "") => `<path d="${d}" fill="${fill}"${attrs}/>`;
const ellipse = (x, y, rx, ry, fill, attrs = "") => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"${attrs}/>`;
const circle = (x, y, r, fill, attrs = "") => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"${attrs}/>`;
const rect = (x, y, width, height, fill, attrs = "") => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"${attrs}/>`;
const group = (body, transform, attrs = "") => `<g transform="${transform}"${attrs}>${body}</g>`;
const spark = (x, y, size, color) => group(path("M0-10 2.5-2.5 10 0 2.5 2.5 0 10-2.5 2.5-10 0-2.5-2.5Z", color), `translate(${x} ${y}) scale(${size / 10})`);
const diamond = (x, y, size, color) => group(polygon("0,-7 4,0 0,7 -4,0", color), `translate(${x} ${y}) scale(${size / 7})`);
const shadow = (width = 112, y = 286) =>
  ellipse(240, y, width, 17, INK, ' opacity=".21"') + ellipse(240, y - 1, width * .72, 9, INK, ' opacity=".13"');

function pine(x, y, size, color) {
  return group(
    rect(-4, -12, 8, 15, shade(color, -.3)) +
    polygon("-26,-10 -13,-34 -18,-34 0,-65 18,-34 13,-34 26,-10", color) +
    polygon("0,-65 18,-34 13,-34 26,-10 1,-10", shade(color, -.16)),
    `translate(${x} ${y}) scale(${size})`
  );
}

function backdrop(item, seed) {
  const named = THEMES.find(([name]) => name.test(item.name?.toLowerCase()));
  const colors = rgb(hex(item.color, "#758daf"));
  const fallback = COLOR_THEMES[colors.indexOf(Math.max(...colors))];
  const [base, middle, light, scene] = named ? named.slice(1) : fallback;
  let detail = "";
  if (scene === "grove") {
    detail = polygon("0,216 72,151 125,165 206,118 273,174 382,138 480,183 480,360 0,360", shade(middle, -.17));
    detail += [[42,253,1.6], [90,235,.9], [133,229,.72], [371,232,.98], [432,251,1.57]].map(([x, y, scale]) => pine(x, y, scale, shade(base, .08))).join("");
  } else if (scene === "peaks") {
    detail = polygon("0,219 76,100 119,167 165,121 231,216 313,132 361,161 424,78 480,156 480,360 0,360", shade(middle, -.15));
    detail += polygon("41,156 76,100 110,150 79,140 63,157 58,143", light, ' opacity=".74"') + polygon("389,125 424,78 458,125 430,117 419,133 409,114", light, ' opacity=".74"');
    detail += polygon("76,100 119,167 93,190 60,207", shade(base, .18)) + polygon("424,78 480,156 480,209 436,182", shade(base, .18));
  } else if (scene === "waves") {
    detail = path("M0 195q78-64 159-7T322 177t158-8v191H0Z", shade(middle, -.13)) +
      path("M0 224q78-64 159-7t163-10 158-8", "none", ` stroke="${light}" stroke-width="3" opacity=".5"`) +
      path("M0 254q78-64 159-7t163-10 158-8", "none", ` stroke="${light}" stroke-width="10" opacity=".28"`);
  } else if (scene === "dunes") {
    detail = circle(342, 107, 54, light, ' opacity=".6"') +
      polygon("0,224 71,157 121,170 167,152 239,205 335,169 421,195 480,170 480,360 0,360", shade(middle, -.12)) +
      polygon("0,246 105,197 175,231 299,212 391,185 480,221 480,360 0,360", shade(base, .16));
  } else if (scene === "bloom") {
    detail = polygon("0,255 110,208 177,234 304,217 402,202 480,234 480,360 0,360", shade(middle, -.21)) +
      path("M18 253q34-61 83-76M63 215 44 179M454 246q-21-57-77-79m57 47 17-49", "none", ` stroke="${shade(base, -.1)}" stroke-width="7"`) +
      [[44,177,10],[96,177,18],[69,202,11],[455,165,16],[376,165,17],[410,192,11]].map(([x,y,size]) =>
        group(polygon("-18,-6 -13,-15 -3,-13 6,-19 17,-13 17,-3 25,6 15,14 5,13 -2,20 -14,14 -13,6 -21,3", light) +
          polygon("-9,7 0,-8 13,0 6,13", shade(middle, .34)), `translate(${x} ${y}) scale(${size/18})`)).join("");
  } else if (scene === "rink") {
    detail = polygon("0,243 99,192 384,185 480,226 480,360 0,360", shade(middle, .31)) +
      ellipse(243, 231, 126, 50, "none", ` stroke="${base}" stroke-width="3" opacity=".38"`) +
      path("M229 190 294 288M246 188 311 289M0 250l159 47m171-97 150 28", "none", ` stroke="${base}" stroke-width="3" opacity=".28"`);
  } else if (scene === "stars") {
    detail = path("M-40 211Q230 46 520 90M-40 265Q230 100 520 144", "none", ` stroke="${light}" stroke-width="2" opacity=".35"`) +
      [[50,84,10],[400,74,17],[366,169,7],[110,159,9],[424,228,8],[141,68,6],[313,60,9]].map(([x, y, size]) => spark(x, y, size, light)).join("");
  } else if (scene === "tiles") {
    detail = `<g opacity=".23" fill="none" stroke="${light}" stroke-width="3">${[[69,105],[407,109],[18,154],[456,159],[76,205],[404,211]].map(([x, y]) => `<path d="M${x} ${y-27}l27 27-27 27-27-27Z"/>`).join("")}</g>`;
    detail += path("M-20 255 120 204 220 209 355 203l145 53v104H-20Z", shade(base, .16));
  } else if (scene === "forge") {
    detail = polygon("0,104 105,0 205,0 0,214", light, ' opacity=".15"') +
      polygon("480,39 480,144 265,360 163,360", light, ' opacity=".19"') +
      polygon("480,195 480,252 371,360 313,360", light, ' opacity=".43"') +
      path("M36 237 126 147M371 166l73-73", "none", ` stroke="${light}" stroke-width="3" opacity=".6"`);
  } else {
    detail = path("M55 315V162a185 185 0 0 1 370 0v153M76 306V162a164 164 0 0 1 328 0v144", "none", ` stroke="${light}" stroke-width="2.5" opacity=".42"`) +
      polygon("0,289 112,240 226,262 356,220 480,245 480,360 0,360", shade(base, .1));
  }
  return rect(0, 0, 480, 360, base) +
    polygon("70,0 406,0 480,80 480,360 0,360 0,75", middle) +
    polygon("160,0 314,0 480,163 480,360 0,360 0,163", shade(middle, .16), ' opacity=".55"') +
    detail +
    polygon("0,322 137,281 311,288 480,257 480,360 0,360", shade(base, -.24), ' opacity=".45"') +
    [[74,115,8],[383,106,13],[120,76,4],[373,252,6],[94,242,5]].map(([x, y, s], i) => spark(x + ((seed >>> (i * 5)) % 19) - 9, y, s, mix(light, PAPER, .28))).join("");
}

// Project a simple lit hemisphere from polygonal latitude bands into SVG facets.
function polyBall(x, y, radius, color, accent, design = 0, patterned = false) {
  const rings = [0, .3, .6, .84, 1].map((r, band) => Array.from({ length: 12 }, (_, i) => {
    const angle = (i + (band % 2 ? .5 : 0)) * Math.PI / 6;
    return [Math.cos(angle) * r, Math.sin(angle) * r, Math.sqrt(1 - r * r)];
  }));
  function facet(vertices, face) {
    const normal = vertices.map((_, i) => vertices.reduce((sum, v) => sum + v[i], 0) / 3);
    const light = Math.max(-.55, Math.min(.52, .64 * (-normal[0] - normal[1] + normal[2] * .65) - .15 + (face % 3 - 1) * .026));
    const points = vertices.map(([a, b]) => `${Math.round(a * 100)} ${Math.round(b * 100)}`).join(" ");
    const fill = shade(color, light);
    return polygon(points, fill, ` stroke="${fill}" stroke-width=".7" stroke-linejoin="round"`);
  }
  let faces = "";
  for (let band = 1; band < rings.length; band++) {
    for (let i = 0; i < 12; i++) {
      const next = (i + 1) % 12;
      const a = rings[band - 1][i], b = rings[band - 1][next], c = rings[band][i], d = rings[band][next];
      faces += facet([a, c, d], i);
      if (band > 1) faces += facet([a, b, d], i + 1);
    }
  }
  const rotation = [-20, 16, -20, 10, -40, 9, -28, 38][design % 8] ?? 0;
  let marking = "";
  if (patterned) {
    const stripe = path("M-93-15Q-35 41 56 33L83 18Q20 40-86-25Z", accent, ' opacity=".89"');
    if (design === 2 || design === 6) {
      marking = [[-50,-49],[-18,-66],[20,-59],[51,-35],[61,4],[31,28],[-8,39],[-44,27],[-63,-8]].map(([a, b], i) => diamond(a, b, [5,8,6][i % 3], accent)).join("");
    } else {
      marking = stripe;
      if (design === 3) marking += path("M-83 30Q-32 74 52 58L66 48Q-20 66-89 19Z", accent, ' opacity=".76"');
      if ([1,4,7].includes(design)) marking += path("M-29-87Q13-63 27 9T17 89L28 85Q46 44 32 2T-18-90Z", accent, ' opacity=".7"');
      if (design === 5) marking += path("M-37-44H-26L-12-5 4-44H16L-9 8H-16Z", accent);
    }
  }
  return group(faces + group(marking, `rotate(${rotation})`), `translate(${x} ${y}) scale(${radius / 100})`);
}

function ballArt(item, color, accent) {
  return shadow(95) +
    polygon("198,251 282,251 260,261 248,283 227,283 220,263", shade(PAPER, -.26)) +
    polygon("198,251 218,241 270,241 282,251 260,261 219,261", PAPER) +
    polygon("198,251 219,261 260,261 282,251 281,258 260,268 219,268 198,258", shade(PAPER, -.18)) +
    polyBall(240, 161, 98, color, accent, item.design, Boolean(item.pattern));
}

function shaft(color, grip, accent) {
  return polygon("231,62 241,62 244,229 230,233", color) +
    polygon("238,62 241,62 244,229 237,229", shade(color, -.3)) +
    polygon("224,55 229,47 244,47 249,53 245,113 226,113", grip) +
    polygon("224,55 229,47 244,47 239,55 236,112 226,113", shade(grip, .2)) +
    [62,72,82,92,102].map(y => path(`M226 ${y}l20-3`, "none", ` stroke="${accent}" stroke-width="2.4"`)).join("");
}

function clubArt(item, color, accent) {
  let drawing;
  if (item.shape === "hockey") {
    drawing = polygon("219,62 238,58 253,227 271,242 312,245 325,252 324,269 298,276 260,271 238,253 232,232", color) +
      polygon("238,58 244,63 258,226 275,238 316,241 325,252 312,245 271,242 253,227", shade(color, .38)) +
      polygon("260,257 326,253 324,269 298,276 260,271", shade(color, -.29)) +
      polygon("218,61 237,58 241,96 222,98", accent) +
      [267,278,289,300,311].map((x, i) => polygon(`${x},${243+i%3} ${x+5},244 ${x+6},${272+i%3} ${x},${272+i%3}`, i % 2 ? accent : shade(accent, .18))).join("");
  } else if (item.shape === "baguette") {
    drawing = shaft("#cb9763", "#63442c", accent) +
      polygon("181,251 196,233 221,229 277,230 314,241 325,257 316,273 288,283 223,282 191,274 181,265", shade(color, -.16)) +
      polygon("181,251 196,233 221,229 277,230 314,241 325,257 299,270 224,268 191,260", shade(color, .24)) +
      polygon("181,251 191,260 224,268 299,270 325,257 316,273 288,283 223,282 191,274 181,265", shade(color, -.3)) +
      [208,231,255,279].map((x, i) => path(`M${x} ${260-i%2*2}l14-6 13-14-13 4Z`, accent)).join("");
  } else if (item.shape === "broom") {
    drawing = shaft(shade(accent, .15), accent, shade(color, .14)) +
      polygon("221,221 248,223 268,236 290,272 273,281 224,282 191,273 211,238", color) +
      polygon("221,221 236,224 225,270 191,273 211,238", shade(color, .31)) +
      polygon("225,270 273,269 290,272 273,281 224,282 191,273", shade(color, -.18)) +
      polygon("212,236 270,236 274,245 206,246", accent) +
      [200,213,227,241,255,269,280].map((x, i) => path(`M${216+i*8} 247 ${x} 273`, "none", ` stroke="${shade(color, -.24)}" stroke-width="1.7"`)).join("");
  } else {
    const crystal = item.id === "club-crystal";
    const body = item.category === "driver" ?
      polygon("205,226 232,211 278,212 316,233 317,258 296,277 222,278 198,260", shade(color, -.43)) +
      polygon("205,226 232,211 278,212 316,233 295,245 224,243", shade(color, .34)) +
      polygon("224,244 295,245 315,237 311,257 293,269 224,269", "#aebbc6") +
      polygon("239,214 253,214 277,241 263,242", accent) +
      [249,254,259,264].map(y => path(`M232 ${y}l62 1`, "none", ' stroke="#4b5f70" stroke-width="2"')).join("") :
      polygon("199,236 220,221 285,221 308,236 307,259 288,269 200,267", shade(color, -.44)) +
      polygon("199,236 220,221 285,221 308,236 282,242 200,242", shade(color, .32)) +
      polygon("200,242 282,242 307,236 306,255 286,262 200,259", color) +
      polygon("209,246 277,246 277,255 209,255", accent) +
      path(item.design % 4 === 1 ? "M226 223h7v16h-7zm45 0h7v16h-7z" : "M247 224h5v15h-5Z", shade(PAPER, .05));
    drawing = shaft(crystal ? "#b5edf4" : "#c0ccda", shade(color, -.54), accent) + body;
    if (crystal) drawing += polygon("199,236 220,221 248,221 226,241", "#ddfcff") + polygon("248,221 286,221 278,241", "#66becd") + polygon("201,242 226,242 214,259 201,259", "#ebfdff") + spark(298, 230, 14, "#e9ffff");
  }
  return shadow(115) + group(drawing, "translate(-3 0) rotate(-48 240 170)");
}

function trailArt(item, color, accent) {
  const stardust = /sparkles|stars/.test(item.id);
  const tidal = /tidal/i.test(item.name);
  const tail = path("M63 248Q132 250 182 203Q236 154 317 159L338 128Q254 124 210 157Q132 237 63 248Z", shade(color, -.26)) +
    path("M75 243Q141 229 199 182Q259 131 319 143L316 161Q261 160 215 187Q149 233 75 243Z", color) +
    path("M112 232Q164 207 205 176Q261 125 321 138L322 147Q263 140 211 182Q170 212 112 232Z", accent);
  const particles = [[98,200,10],[141,252,13],[170,172,9],[209,223,16],[245,128,11],[283,194,13],[317,102,9],[353,159,11]];
  return shadow(117) + tail +
    particles.map(([x, y, r], i) => stardust ? spark(x, y, r, i % 2 ? accent : color) : diamond(x, y, r, i % 2 ? accent : shade(color, .26))).join("") +
    (tidal ? path("M114 259Q180 259 215 225M151 266Q202 262 235 233", "none", ` stroke="${accent}" stroke-width="3" opacity=".8"`) : "") +
    polyBall(327, 135, 41, "#f6f4e8", accent);
}

function saluteArt(item, color, accent) {
  let emblem;
  const d = item.design % 4;
  if (d === 0 || /love/.test(item.id)) {
    emblem = path("M240 214 199 180Q179 161 192 144Q211 124 240 148Q267 124 287 144Q299 161 281 180Z", color) +
      path("M240 214 199 180Q179 161 192 144Q195 160 240 195L280 168 281 180Z", shade(color, -.2));
  } else if (d === 1 || /cheer/.test(item.id)) {
    emblem = polygon("240,124 252,151 283,155 260,177 264,207 240,192 214,207 219,177 197,155 228,151", color) +
      polygon("240,124 240,192 214,207 219,177 197,155 228,151", shade(color, .22));
  } else if (d === 2 || /wave/.test(item.id)) {
    emblem = rect(214, 128, 6, 76, shade(color, -.35)) + path("M219 129q26-9 53 0v32q-26-9-53 0Z", color);
  } else {
    emblem = [-37,0,37].map((dx, i) => {
      const c = i === 1 ? color : accent;
      return diamond(240 + dx, 166 + i%2*5, i%2 ? 27 : 20, shade(c, -.17)) + spark(238 + dx, 163 + i%2*5, i%2 ? 24 : 17, c);
    }).join("");
  }
  return shadow(110) +
    group(path("M136 126l14-15h180l18 14v84l-18 20h-97l-47 34 10-34h-48l-18-18v-68Z", shade(accent, -.46)) +
    path("M130 126l19-18h177l17 14v80l-18 18h-98l-43 35 10-35h-45l-19-17Z", PAPER) +
    path("M143 130l14-12h164l10 9v12l-11-10H156l-13 14Z", shade(PAPER, .3)) +
    path("M149 199h177l-10 11H224l-25 17 5-17h-45Z", shade(accent, .36)) + emblem, "rotate(-9 240 177)") +
    spark(122, 159, 13, accent) + spark(358, 119, 10, PAPER);
}

function plateArt(item, color, accent) {
  const alpine = /alpine/i.test(item.name);
  const moon = /moonstone/i.test(item.name);
  const citrus = /citrus/i.test(item.name);
  const emblem = alpine ? polygon("153,177 171,143 186,164 194,152 210,177", color) :
    moon ? path("M190 142a21 21 0 1 0 10 33 17 17 0 0 1-10-33Z", color) :
    citrus ? circle(181, 164, 15, color) + path("M169 175l23-22m-11-5v31m-15-15h30", "none", ` stroke="${accent}" stroke-width="1.5"`) :
    spark(181, 165, 17, color);
  return shadow(123) + group(
    polygon("111,133 125,116 354,116 374,134 374,212 356,231 126,231 104,213 104,142", shade(color, -.52)) +
    polygon("111,133 125,116 351,116 367,129 367,208 352,221 124,221 104,206 104,141", color) +
    polygon("111,133 125,116 351,116 367,129 353,138 128,138 104,141", shade(color, .27)) +
    polygon("124,145 142,133 338,133 355,143 355,197 340,208 132,208 116,195 116,153", accent) +
    polygon("131,151 145,141 333,141 346,151 346,190 335,200 139,200 125,189 125,157", shade(accent, .63)) +
    polygon("155,150 180,143 208,150 206,175 197,188 180,198 164,188 155,174", shade(color, -.39)) +
    polygon("157,150 180,144 205,151 204,174 195,183 180,191 164,181 157,173", accent) +
    emblem +
    polygon("226,155 316,155 311,164 226,164", shade(color, -.1)) +
    polygon("226,176 289,176 284,182 226,182", shade(color, .24)) +
    [124,344].map(x => circle(x, 127, 3.6, accent) + circle(x, 210, 3.6, accent)).join(""),
    "rotate(-8 240 170)") + spark(349, 134, 13, "#fff8e7");
}

function leaf(x, y, color, rotation, size) {
  return group(polygon("0,-12 8,-3 5,7 0,12 -5,7 -8,-3", color) +
    path("M0-9 0 10", "none", ` stroke="${shade(color, -.29)}" stroke-width="1"`),
  `translate(${x} ${y}) rotate(${rotation}) scale(${size})`);
}

function finishArt(item, color, accent) {
  const leaves = item.id === "hole-leaves";
  const positions = [[140,195,-48],[156,159,20],[176,120,-30],[199,186,35],[211,96,-16],[236,142,5],[259,104,13],[276,179,39],[289,135,8],[319,153,45],[330,193,65],[302,213,33]];
  const confetti = positions.map(([x, y, dir], i) => {
    const fill = leaves ? ["#eec944","#ed8a36","#aacf55","#ed6036"][i % 4] : [color, accent, PAPER][i % 3];
    return leaves ? leaf(x, y, fill, dir, i % 2 ? .85 : 1.1) :
      (i % 3 === 1 ? spark(x, y, i % 2 ? 8 : 12, fill) : group(polygon("-6,-6 6,-6 5,6 -5,7", fill), `translate(${x} ${y}) rotate(${dir})`));
  }).join("");
  return shadow(111, 268) +
    polygon("124,232 157,207 220,193 285,199 342,223 357,244 331,264 267,276 190,273 144,257", "#206a50") +
    polygon("124,223 158,197 220,184 284,192 341,214 357,234 329,253 268,266 189,262 144,247", "#7dcd76") +
    polygon("124,223 158,197 220,184 182,219 144,247", "#a1e78b") +
    polygon("182,219 220,184 284,192 262,223 189,262 144,247", "#90d983") +
    polygon("284,192 341,214 357,234 329,253 262,223", "#63bb70") +
    ellipse(241, 226, 34, 12, "#f1f8dd") + ellipse(241, 226, 25, 8, "#204033") +
    polygon("240,88 245,88 244,225 240,226", "#fff5d5") +
    polygon("245,90 295,101 275,122 245,117", color) +
    confetti;
}

function lockerArt(locker, color, trim) {
  const gem = hex(locker.gem, "#b5edfe");
  return shadow(123) +
    polygon("133,149 168,103 289,87 335,107 354,139 354,237 312,267 129,259 112,240 112,176", shade(color, -.55)) +
    polygon("112,174 139,128 278,112 311,147 311,251 129,247 112,231", color) +
    polygon("112,174 139,128 174,108 287,92 331,109 311,147 278,112 139,128", shade(color, .4)) +
    polygon("311,147 331,109 349,134 349,225 311,251", shade(color, -.34)) +
    polygon("111,171 137,168 307,172 350,141 350,154 310,184 111,184", trim) +
    polygon("112,227 129,239 311,245 350,218 350,232 312,258 129,253 112,238", shade(trim, -.23)) +
    [145,263].map(x =>
      polygon(`${x},127 ${x+21},124 ${x+20},239 ${x},238`, trim) +
      polygon(`${x+15},126 ${x+21},124 ${x+20},239 ${x+15},238`, shade(trim, -.25)) +
      [153,218].map(y => circle(x+8, y, 3, shade(trim, -.38))).join("")).join("") +
    polygon("192,161 228,161 244,175 244,208 231,220 193,220 179,208 179,174", shade(trim, -.32)) +
    polygon("192,159 228,159 242,173 241,202 229,214 193,214 181,202 181,174", shade(trim, .22)) +
    polygon("211,165 231,183 211,203 192,183", gem) +
    polygon("211,165 211,183 192,183", shade(gem, .55)) +
    polygon("211,183 231,183 211,203", shade(gem, -.25)) +
    spark(218, 173, 12, PAPER);
}

function itemArt(item, color, accent) {
  if (item.category === "ball") return ballArt(item, color, accent);
  if (item.category === "driver" || item.category === "club") return clubArt(item, color, accent);
  if (item.category === "trail") return trailArt(item, color, accent);
  if (item.category === "emote") return saluteArt(item, color, accent);
  if (item.category === "nameplate") return plateArt(item, color, accent);
  return finishArt(item, color, accent);
}

function cover(item, render) {
  const key = JSON.stringify([item.id, item.name, item.category, item.color, item.pattern, item.design, item.shape, item.gem]);
  if (urls.has(key)) return urls.get(key);
  const color = hex(item.color, "#83a3a3"), accent = hex(item.pattern, "#f5dfaa");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">${backdrop(item, stamp(key))}${render(item, color, accent)}</svg>`;
  const url = "data:image/svg+xml," + encodeURIComponent(svg);
  if (urls.size >= 180) urls.delete(urls.keys().next().value);
  urls.set(key, url);
  return url;
}

export function shopCover(item) {
  return cover(item, itemArt);
}

export function shopLockerCover(locker) {
  return cover(locker, lockerArt);
}

export function shopBundleCover(bundle) {
  const ball = bundle.items.find(item => item.category === "ball");
  const driver = bundle.items.find(item => item.category === "driver");
  const plate = bundle.items.find(item => item.category === "nameplate");
  return cover({ ...bundle, color: ball?.color, pattern: ball?.pattern }, (_, color, accent) =>
    shadow(152) +
    (driver ? group(clubArt(driver, color, accent), "translate(-41 -10) scale(.83)") : "") +
    (plate ? group(plateArt(plate, color, accent), "translate(157 37) scale(.61)") : "") +
    (ball ? group(ballArt(ball, color, accent), "translate(111 103) scale(.65)") : "")
  );
}
