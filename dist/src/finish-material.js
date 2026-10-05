import { FINISHES, validSeed } from './finishes.js';

// Object-space colour on the existing mesh: no floating decals, extra geometry,
// UV seams or texture downloads. One small shader is shared by all 1,000 seeds.
const shader = `
varying vec3 vFinishPosition;
uniform float finishSeed;
uniform float finishKind;
float fh(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7))) * 43758.5453); }
float fn(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(fh(i),fh(i+vec3(1,0,0)),f.x),mix(fh(i+vec3(0,1,0)),fh(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(fh(i+vec3(0,0,1)),fh(i+vec3(1,0,1)),f.x),mix(fh(i+vec3(0,1,1)),fh(i+vec3(1,1,1)),f.x),f.y),f.z);
}
vec3 golfFinish(vec3 p) {
  p = p*3.0 + vec3(finishSeed*.071,finishSeed*.037,finishSeed*.093);
  float n=fn(p)*.66+fn(p*2.13)*.24+fn(p*4.37)*.10;
  if(finishKind>4.5) {
    float coverage=finishSeed/999.0;
    float heat=clamp((n-.5)*1.25+coverage,0.0,1.0);
    if(finishSeed<10.0) heat=0.04;
    if(finishSeed>=990.0) heat=.97;
    vec3 gold=mix(vec3(.43,.24,.066),vec3(.77,.56,.21),n);
    vec3 violet=vec3(.29,.22,.44);
    vec3 blue=mix(vec3(.025,.13,.33),vec3(.065,.41,.72),n);
    return mix(mix(gold,violet,smoothstep(.35,.49,heat)),blue,smoothstep(.48,.64,heat));
  }
  if(finishKind>3.5) return .24+.22*cos(vec3(.3,2.1,4.5)+n*9.0);
  if(finishKind>2.5) {float fold=.5+.5*sin((p.x+p.z*.55+n*1.7)*24.0);return mix(vec3(.13,.21,.25),vec3(.51,.62,.64),smoothstep(.35,.7,fold));}
  if(finishKind>1.5) {float seam=fract((p.x+p.y*.7)*2.4+n*.55);return mix(vec3(.14,.30,.37),vec3(.68,.77,.76),step(.47,seam));}
  if(finishKind>.5) {float stripe=sin(p.x*9.0+n*13.0);return mix(vec3(.06,.09,.075),vec3(.61,.34,.12),smoothstep(-.2,.15,stripe));}
  return n<.4?vec3(.085,.13,.095):n<.54?vec3(.23,.30,.18):vec3(.48,.47,.31);
}`;

export function applyFinish(mesh, item) {
  if (!item?.finish || !mesh?.material) return;
  if (mesh.userData.finishMaterial) mesh.material.dispose();
  const material = mesh.material.clone();
  material.color.set('#ffffff');
  material.emissive?.set('#000000');
  material.metalness = item.finish === 'case-hardened' ? 0.38 : 0.18;
  material.roughness = 0.55;
  const kind = FINISHES.findIndex(f => f.key === item.finish), seed = validSeed(item.seed) ? item.seed : 500;
  material.onBeforeCompile = program => {
    program.uniforms.finishSeed = { value: seed };
    program.uniforms.finishKind = { value: kind };
    program.vertexShader = 'varying vec3 vFinishPosition;\n' + program.vertexShader;
    program.vertexShader = program.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFinishPosition = position;');
    program.fragmentShader = shader + '\n' + program.fragmentShader;
    program.fragmentShader = program.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= golfFinish(vFinishPosition);');
  };
  material.customProgramCacheKey = () => 'polygolf-original-finishes-v1';
  mesh.material = material;
  mesh.userData.ownedMaterial = true;
  mesh.userData.finishMaterial = true;
}
