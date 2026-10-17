import { createFullShotGuide } from './full-shot-guide.js';
import { createGolfer } from "./golfer.js";
import * as THREE from "../vendor/three.module.js";
import { GOLF_RADIUS } from "./golf-physics.js";
import { fillDirectionalGuide, directionalGuideSpec, GUIDE_SAMPLES } from './directional-guide.js';
import { terrainAt, terrainHeight } from "./golf-courses.js";
import { nearestPoint, heightAt } from "./courses.js";

export function installGolfPresentation(world) {
  const oldUpdate = world.update.bind(world),
    oldAim = world.setAim.bind(world),
    oldLoad = world.load.bind(world);
  world.renderGround = (x, z) => {
    if (world.hole.mode !== "golf") {
      const p = nearestPoint(world.hole, x, z);
      return (
        heightAt(world.hole, p.t) +
        (world.hole.bridge && p.t > world.hole.bridge[0] && p.t < world.hole.bridge[1] ? 0.19 : 0.055)
      );
    }
    const t = terrainAt(world.hole, x, z),
      base = world.surfaceHeight?.(x, z) ?? t.height;
    return base + 0.006;
  };
  const golfer = createGolfer(world);
  world.golfer = golfer;
  world.swingPose = null;
  world.golferScreen = () => {
    const v = golfer.position
      .clone()
      .add(new THREE.Vector3(0, 2.12, 0))
      .project(world.camera);
    return {
      x: ((v.x + 1) * innerWidth) / 2,
      y: ((1 - v.y) * innerHeight) / 2,
      visible: golfer.visible && v.z < 1 && v.z > -1,
    };
  };
  const celebration = new THREE.Group();
  world.scene.add(celebration);
  celebration.visible = false;
  const sinkBall = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), world.mat("#fff6d9"));
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 1, 48),
    new THREE.MeshBasicMaterial({
      color: "#f2cb63",
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    }),
  );
  pulse.rotation.x = -Math.PI / 2;
  celebration.add(sinkBall, pulse);
  world.celebrate = (cup, color) => {
    const golf = world.hole.mode === "golf",
      radius = golf ? 0.064 : 0.24;
    world.cupMoment = { time: 0, radius };
    celebration.position.set(cup.x, world.renderGround(cup.x, cup.z) + 0.018, cup.z);
    celebration.visible = true;
    sinkBall.visible = true;
    sinkBall.scale.setScalar(radius);
    sinkBall.material = world.ballMesh.material;
    pulse.material.color.set(color);
  };
  const guide = new THREE.Group();
  world.scene.add(guide);
  world.shotGuide = guide;
  const fullGuide = createFullShotGuide(world);
  guide.add(fullGuide.group);
  const positions = new Float32Array(GUIDE_SAMPLES * 3);
  const lineMat = new THREE.MeshBasicMaterial({ color:'#fff2bc', transparent:true, opacity:.82, depthWrite:false });
  const segments = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), lineMat, GUIDE_SAMPLES - 1);
  segments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  segments.frustumCulled = false;
  guide.add(segments);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 10), new THREE.MeshBasicMaterial({ color:'#ffde7c', transparent:true, opacity:.94, depthWrite:false }));
  arrow.frustumCulled = false;
  guide.add(arrow);
  const dummy = new THREE.Object3D(), start = new THREE.Vector3(), end = new THREE.Vector3(), tangent = new THREE.Vector3(), up = new THREE.Vector3(0,1,0);
  // The putter hint follows the nearby ground; the airborne hint deliberately
  // never reads terrain ahead, wind or collision geometry.
  const guideGround = (x,z) => terrainHeight(world.hole,x,z);
  world.load = (h) => {
    oldLoad(h);
    fullGuide.reset();
    world.swingPose = null;
    world.cupMoment = null;
    celebration.visible = false;
    guide.visible = false;
    golfer.visible = false;
  };
  world.setAim = (ball, dir, power, visible) => {
    if (world.hole.mode !== 'golf') {
      guide.visible = false;
      fullGuide.reset();
      oldAim(ball, dir, power, visible);
      return;
    }
    world.aim.visible = world.arrow.visible = false;
    guide.visible = visible;
    world.aimDirection = dir;
    const full = world.settings?.shotGuide !== 'directional';
    fullGuide.setAim(ball, dir, power, visible && full);
    segments.visible = arrow.visible = !full;
    if (!visible || full) return;
    const options = world.shotOptions || {club:world.activeClub};
    const {putting} = directionalGuideSpec(power,options);
    fillDirectionalGuide(positions,ball,dir,power,options,guideGround);
    // Reuse all geometry and matrices. Updating every rendered frame keeps
    // sub-degree changes visible instead of waiting for an 8 Hz prediction.
    const width = putting ? .035 : Math.max(.045,Math.min(.16,(world.zoom || 13)*.0032));
    for(let i=0;i<GUIDE_SAMPLES-1;i++) {
      start.fromArray(positions,i*3); end.fromArray(positions,(i+1)*3);
      tangent.subVectors(end,start);
      dummy.position.copy(start).add(end).multiplyScalar(.5);
      dummy.quaternion.setFromUnitVectors(up,tangent.normalize());
      dummy.scale.set(width*(1-i/(GUIDE_SAMPLES*2)),start.distanceTo(end)+.007,width*(1-i/(GUIDE_SAMPLES*2)));
      dummy.updateMatrix(); segments.setMatrixAt(i,dummy.matrix);
    }
    segments.instanceMatrix.needsUpdate = true;
    arrow.position.copy(end);
    arrow.quaternion.setFromUnitVectors(up,tangent);
    arrow.scale.set(putting ? .16 : Math.max(.25,width*4.8),putting ? .55 : Math.max(.85,width*15),putting ? .16 : Math.max(.25,width*4.8));
    lineMat.color.set(putting?'#c9f1c6':'#fff2bc');
    arrow.material.color.set(putting?'#e2f6cd':'#ffde7c');
  };
  world.update = (dt, ball, physics) => {
    const golf = world.mode === "play" && world.hole.mode === "golf" && ball && !world.waterMoment && !world.pirateMoment;
    world.updateGolfer(dt, ball, physics);
    if(world.waterMoment && !world.pirateMoment){world.cameraHold=world.waterMoment;golfer.visible=false;}
    if(world.pirateMoment){world.cameraHold=world.pirateEffects?.focus||world.cameraHold;golfer.visible=false;}
    if (world.cupMoment) {
      const moment = world.cupMoment;
      moment.time += dt;
      const t = moment.time;
      sinkBall.position.y = moment.radius * (1 - t / 0.3);
      sinkBall.scale.setScalar(moment.radius * Math.max(0, 1 - t / 0.4));
      sinkBall.visible = t < 0.36;
      pulse.position.y = 0.025;
      pulse.scale.setScalar((golf ? 0.28 : 0.65) + t * (golf ? 1.4 : 2.6));
      pulse.material.opacity = Math.max(0, 0.85 - t / 0.95);
      if (t > 1.1) {
        celebration.visible = false;
        world.cupMoment = null;
      }
    }
    const adjusted = ball ? { ...ball } : null;
    if (adjusted && !physics?.sunk) {
      const ground = world.renderGround(ball.x, ball.z);
      if (golf) {
        const visualRadius = Math.max(0.055, Math.min(0.13, world.zoom * 0.0045));
        adjusted.y = Math.max(ball.y, ground + GOLF_RADIUS + 0.008);
        world.visualBallRadius = visualRadius;
      } else adjusted.y = Math.max(ball.y, ground + 0.24 + 0.005);
    }
    oldUpdate(dt, adjusted, physics);
    if (golf) world.club.visible = false;
    if (!golf) guide.visible = false;
  };
}
