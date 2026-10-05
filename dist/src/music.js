// Three original, lightweight scores. MIDI pitches, no external audio downloads.
export const MUSIC_STYLES = ['majestic','upbeat','calm'];
export const musicStyle = value => MUSIC_STYLES.includes(value) ? value : 'calm';
export const musicInterval = style => 60 / ({majestic:76,upbeat:112,calm:64}[musicStyle(style)]) / 2;
const frequency = midi => 440 * 2 ** ((midi-69)/12);
export function musicStep(style,step) {
  style=musicStyle(style);
  const beat=step%32,bar=Math.floor(beat/8),i=beat%8,notes=[];
  const add=(midi,duration,volume,type='sine',attack=.025)=>notes.push({frequency:frequency(midi),duration,volume,type,attack});
  if(style==='majestic'){
    const chords=[[50,57,62,66],[47,54,59,62],[43,50,55,59],[45,52,57,61]];
    if(i===0){chords[bar].forEach(n=>add(n,3.4,.085,'triangle',.6));add(chords[bar][0]-12,3.2,.13,'sine',.4);}
    const melody=[[74,78,81,78],[74,78,83,81],[79,78,74,71],[73,76,78,81]][bar];
    if(i%2===0)add(melody[i/2],1.5,.2,'triangle',.17);
  }else if(style==='upbeat'){
    const chord=[[60,64,67],[57,60,64],[53,57,60],[55,59,62]][bar];
    if(i%2===0)add(chord[0]-12,.3,.25,'sine',.015);
    if(i===2||i===6)chord.forEach(n=>add(n,.17,.10,'triangle',.012));
    const melody=[[72,76,79,76,74,76,79,83],[81,76,72,76,79,76,72,71],[72,77,81,77,76,77,81,84],[83,79,74,79,81,79,76,74]][bar];
    add(melody[i],.24,.17,'triangle',.009);
    if(i%2===1)add(96,.055,.018,'sine',.004);
  }else{
    const chord=[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]][bar];
    if(i===0)chord.forEach(n=>add(n,4.3,.075,'sine',.8));
    const melody=[[72,76,79,76],[72,69,76,72],[77,76,72,69],[71,74,79,74]][bar];
    if(i%2===0){const n=melody[i/2];add(n,2,.18,'sine',.018);add(n+12,1.1,.025,'sine',.025);}
  }
  return notes;
}
