// Original seasonal finishes. Locker items and course discovery rewards are separate.
export const HALLOWEEN_ITEMS = [
  ['ball','candle','Candlelight','Uncommon','#e9cb8d','#8f6535',0],
  ['club','harvest','Harvest Putter','Uncommon','#704c2e','#c58a43',0],
  ['driver','midnight','Midnight Drive','Rare','#242c40','#9299b2',3],
  ['ball','ghost','Ghost Ball','Rare','#e8e6d8','#28383f',0,'ghost'],
  ['nameplate','moon','Moonlit Fairway','Rare','#293a52','#d2cbb0',0],
  ['trail','ember','Ember Trail','Rare','#ce7838','#e9b262',0],
  ['club','witch','Witch’s Broom','Epic','#755235','#b9965b',0,null,'broom'],
  ['ball','lantern','Jack-o’-Lantern','Epic','#ce772d','#292d26',0,'pumpkin'],
  ['driver','copper','Copper Moon Driver','Epic','#a06a3c','#26383a',3],
  ['nameplate','haunted','Haunted Links','Epic','#382c48','#d4a66d',0],
  ['driver','spectre','Spectre Driver','Legendary','#35434a','#b5d4b4',5],
  ['club','moonkeeper','Moonkeeper','Legendary','#373448','#dfc27b',1],
  ['ball','eclipse','Eclipse Ball','Black Market','#20232d','#d6a24e',3],
].map(([category,key,name,rarity,color,pattern,design,motif,shape])=>({
  id:`${category}-halloween-${key}`,category,name,rarity,color,pattern,design,
  ...(motif?{motif}:{}),...(shape?{shape}:{}),source:'pack',crate:'halloween',exclusive:true,price:0,
  flavor:'A finish from the Halloween Locker.'
}));
export const DISCOVERY_ITEMS = [
  {id:'ball-pumpkin-find',category:'ball',name:'Lost Pumpkin',rarity:'Legendary',color:'#d88131',pattern:'#26332b',motif:'pumpkin',flavor:'Found beneath an Autumn Pines tree.'},
  {id:'nameplate-pumpkin-find',category:'nameplate',name:'Pumpkin Hunter',rarity:'Legendary',color:'#352d36',pattern:'#eba65d',motif:'pumpkin'},
].map(i=>({...i,design:0,source:'achievement',exclusive:true,price:0}));
export const SPECIAL_PLATES = [
  {id:'nameplate-og',name:'OG',source:'founder',color:'#283d38',pattern:'#e2c276',flavor:'One of the first 100 PolyGolf accounts.'},
  {id:'nameplate-developer',name:'Developer',source:'code',color:'#273d55',pattern:'#aacbe4',flavor:'An exclusive developer gift-code nameplate.'},
  {id:'nameplate-staff',name:'Staff',source:'code',color:'#354a38',pattern:'#c7d6a2',flavor:'An exclusive staff gift-code nameplate.'},
].map(i=>({...i,category:'nameplate',rarity:'Legendary',design:0,exclusive:true,price:0}));
