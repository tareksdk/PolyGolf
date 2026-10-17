// These five original badges are awarded together by their server-side gift code.
export const CODE_NAMEPLATES = [
  {id:'nameplate-midnight-ace',name:'Midnight Ace',color:'#172b47',pattern:'#b9d6ff',badge:'moon',shine:'silver',flavor:'A silver crescent above the midnight fairway.'},
  {id:'nameplate-solar-crown',name:'Solar Crown',color:'#412717',pattern:'#ffd27a',badge:'crown',shine:'gold',flavor:'A sunlit crown for your next winning round.'},
  {id:'nameplate-lucky-clover',name:'Lucky Clover',color:'#173e32',pattern:'#a8e2aa',badge:'clover',shine:'silver',flavor:'Four leaves. One perfect bounce.'},
  {id:'nameplate-neon-comet',name:'Neon Comet',color:'#302148',pattern:'#e6a6ff',badge:'comet',shine:'prismatic',flavor:'Leave a little starlight on the scoreboard.'},
  {id:'nameplate-royal-flush',name:'Royal Flush',color:'#421d2a',pattern:'#f2c79d',badge:'cards',shine:'gold',flavor:'A full hand of fairway luck.'},
].map(item=>({...item,category:'nameplate',rarity:'Legendary',design:0,source:'code',exclusive:true,price:0}));
