export const ACCOLADES = [
  {id:'player',name:'Player accolade',icon:'heart',color:'#e9adad',cost:1000000,desc:'A personal thank-you from another golfer. Costs the giver 1,000,000 coins.'},
  {id:'staff',name:'Staff accolade',icon:'staff',color:'#bcd3ec',plate:'nameplate-staff',cost:0,desc:'Recognition from a golfer who owns the Staff nameplate.'},
  {id:'room310',name:'Room310 accolade',icon:'door',color:'#efce78',plate:'nameplate-room310',cost:0,desc:'Recognition from a golfer who owns the Room310 nameplate.'},
  {id:'oneshotstudios',name:'OneShotStudios accolade',icon:'target',color:'#bce1de',plate:'nameplate-oneshotstudios',cost:0,desc:'Recognition from a golfer who owns the OneShotStudios nameplate.'},
  {id:'studios',name:'Room310 X OneShotStudios accolade',icon:'studios',color:'#d8c4f4',plate:'nameplate-studio-collab',cost:0,desc:'Recognition from a golfer who owns the Room310 X OneShotStudios nameplate.'},
];
export const MEDALS = [
  {id:'willow',name:'Willow Park',icon:'tree',color:'#adc893',desc:'Complete a verified three-hole round at Willow Park without picking up the ball.'},
  {id:'saltwind',name:'Saltwind Links',icon:'wave',color:'#94cbd4',desc:'Complete a verified three-hole round at Saltwind Links without picking up the ball.'},
  {id:'autumn',name:'Autumn Pines',icon:'leaf',color:'#e8b07a',desc:'Complete a verified three-hole round at Autumn Pines without picking up the ball.'},
  {id:'long-willow',name:'The Long Way',icon:'flag',color:'#c4cc9c',desc:'Finish the nine-hole Willow Park course without picking up the ball.'},
  {id:'mini',name:'Mini Master',icon:'target',color:'#a7d7bf',desc:'Complete a verified nine-hole mini-golf course without picking up the ball.'},
  {id:'halloween',name:'Haunted Fairways',icon:'pumpkin',color:'#e6ab72',desc:'Finish the seasonal Halloween course. This medal stays with you after the event ends.'},
  {id:'under-par',name:'Under Par',icon:'bird',color:'#d9c6a0',desc:'Finish a verified course with a total score under par.'},
  {id:'elite',name:'Elite',icon:'crown',color:'#cebef3',desc:'Reach 1,900 Elo in competitive. You keep the medal if your rating later falls.'},
  {id:'daily-champion',name:'Daily Champion',icon:'sun',color:'#f4d587',desc:'Finish first on Hole of the Day when its UTC rotation closes. Lowest score wins, then fastest time, then the leaderboard tie order.'},
  {id:'weekly-champion',name:'Weekly Champion',icon:'trophy',color:'#f5cf76',desc:'Finish first on Map of the Week when its UTC rotation closes. Lowest score wins, then fastest time, then the leaderboard tie order.'},
  {id:'six-under',name:'Six Under',icon:'wings',color:'#d9b59b',desc:'Finish a verified three-hole classic course at six under par or better.'},
  {id:'classic-crown',name:'Classic Crown',icon:'crown',color:'#aacda5',desc:'Finish Willow Park, Saltwind Links and Autumn Pines at three under par or better on each three-hole course.'},
  {id:'nine-under',name:'Nine Under',icon:'mountain',color:'#a9c8d6',desc:'Finish the nine-hole Willow Park course at nine under par or better.'},
  {id:'mini-sharpshooter',name:'Mini Sharpshooter',icon:'target',color:'#c3b4de',desc:'Finish a verified nine-hole mini-golf course in 18 strokes or fewer.'},
  {id:'centurion',name:'Centurion',icon:'hundred',color:'#c5cd9b',desc:'Complete 100 verified rounds of at least three holes without picking up the ball.'},
  {id:'marathon',name:'The Long Game',icon:'infinity',color:'#a9c7bc',desc:'Complete 500 verified rounds of at least three holes without picking up the ball.'},
  {id:'ranked-veteran',name:'Ranked Veteran',icon:'swords',color:'#d4baa3',desc:'Win 50 competitive matches.'},
  {id:'apex',name:'Apex',icon:'summit',color:'#b9b6de',desc:'Reach 2,400 Elo after playing competitive. Keep the medal even if your rating later falls.'},
  {id:'daily-dynasty',name:'Daily Dynasty',icon:'sun',color:'#d8c588',desc:'Win Hole of the Day on five different completed UTC rotations.'},
  {id:'weekly-dynasty',name:'Weekly Dynasty',icon:'trophy',color:'#d8b69a',desc:'Win Map of the Week on three different completed UTC rotations.'},
];
export const honorDefinition = (type,id) => (type==='accolade'?ACCOLADES:MEDALS).find(a=>a.id===id);

// Kept separate from the UI so account changes and deferred notifications can be tested.
export class AccoladeQueue {
  constructor(){this.reset(null);}
  reset(actor){this.actor=actor;this.awards=[];this.dismissed=new Set();this.pendingAck=new Set();}
  ingest(actor,awards){if(actor!==this.actor)return;for(const a of awards||[])if(ACCOLADES.some(d=>d.id===a.kind)&&!this.dismissed.has(a.id)&&!this.awards.some(b=>a.id===b.id))this.awards.push(a);}
  next({state,modal,hidden,roomPlaying=false}){return state==='menu'&&!modal&&!hidden&&!roomPlaying?this.awards[0]:null;}
  dismiss(id){this.awards=this.awards.filter(a=>a.id!==id);this.dismissed.add(id);this.pendingAck.add(id);}
}
