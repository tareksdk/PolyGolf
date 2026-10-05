export const SOCIAL_REWARDS = [
  { id:'instagram', name:'Instagram', action:'Follow Room310', url:'https://www.instagram.com/projectroom310/' },
  { id:'x', name:'X', action:'Follow Room310', url:'https://x.com/ProjectRoom310' },
  { id:'youtube', name:'YouTube', action:'Subscribe to Room310', url:'https://www.youtube.com/@ProjectRoom310' },
  { id:'discord', name:'Discord', action:'Join the Room310 server', url:'https://discord.gg/VCEvxCfF6m' },
];
export function claimSocialReward(progress,id) {
  if(!SOCIAL_REWARDS.some(s=>s.id===id))throw Error('Choose a Room310 community link.');
  const d=progress.data;d.socialRewards??=[];
  if(d.socialRewards.includes(id))return {id,coins:0,duplicate:true};
  d.socialRewards.push(id);progress.award(1000,0);progress.save();return {id,coins:1000};
}
