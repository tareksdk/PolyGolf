// Visual-only finishes. IDs are shared by the shop, inventory and server rewards.
export const NEW_HOLE_EFFECTS = [
  ['fireworks','Fairway Fireworks','Legendary','#ffb94e','#ec67c9','Four rising rockets burst into colourful, trailing starbursts.'],
  ['glitch','Green Glitch','Epic','#63f3d2','#d88cff','Neon scanlines split the green into shifting holographic tiles.'],
  ['portal','Cosmic Portal','Legendary','#a78aff','#66dfed','A spiral of stars falls through a spinning portal above the cup.'],
  ['solar','Solar Flare','Legendary','#ffce64','#ff8145','A miniature sun rises with orbiting rays and expanding coronas.'],
  ['aurora','Northern Lights','Epic','#66e7b1','#a898ff','Silky ribbons of green and violet drift above the green.'],
  ['tidal','Tidal Surge','Epic','#59cbe7','#d3f9f5','A curling water crown collapses into concentric waves.'],
  ['meteor','Meteor Shower','Legendary','#ff9575','#fce5b1','Three fiery comets streak down and send ripples across the cup.'],
  ['bloom','Sakura Bloom','Epic','#f5a7c8','#fff0c7','A blossom opens into a swirling shower of soft petals.'],
  ['storm','Thunderstruck','Legendary','#9dbfff','#e7f4ff','A storm cloud gathers and sends a branching bolt into the hole.'],
  ['crown','Royal Arrival','Legendary','#efc85d','#9b8ef2','A golden crown rises over the cup with a ring of floating jewels.'],
].map(([effect,name,rarity,color,pattern,flavor])=>({
  id:'hole-fx-'+effect, category:'hole', effect, name, rarity, color, pattern, flavor,
  source:'pack', price:0, exclusive:true, design:0,
}));
export const NEW_HOLE_EFFECT_IDS = NEW_HOLE_EFFECTS.map(item=>item.id);
export function holeEffectDuration(item, settings={}) {
  return settings.reducedMotion || settings.particles===false ? 1.15 : item?.effect ? 3.6 : 1.15;
}
