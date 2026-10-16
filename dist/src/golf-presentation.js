import { createGolfer } from "./golfer.js";
import * as THREE from "../vendor/three.module.js";
import { GOLF_RADIUS } from "./golf-physics.js";
import { ShotPreview } from './shot-preview.js';
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
  const lineGeo = new THREE.BufferGeometry(),
    lineMat = new THREE.LineBasicMaterial({
      color: "#fff4c8",
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
  const line = new THREE.Line(lineGeo, lineMat);
  const linePositions = new THREE.BufferAttribute(new Float32Array(526 * 3), 3).setUsage(THREE.DynamicDrawUsage);
  lineGeo.setAttribute('position', linePositions); lineGeo.setDrawRange(0, 0);
  line.frustumCulled = false;
  guide.add(line);
  const stroke = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: "#fff9df", transparent: true, opacity: 0.95, depthWrite: false }),
  );
  stroke.frustumCulled = false;
  guide.add(stroke);
  const beads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshBasicMaterial({ color: "#fff8d9", transparent: true, opacity: 0.9, depthWrite: false }),
    64,
  );
  beads.frustumCulled = false;
  guide.add(beads);
  const landing = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 1, 48),
    new THREE.MeshBasicMaterial({
      color: "#f7cc66",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  landing.rotation.x = -Math.PI / 2;
  guide.add(landing);
  let cached = "",
    lastPreview = -1;
  const dummy = new THREE.Object3D();
  const preview = new ShotPreview((samples, job) => {
    if (world.hole !== job.hole || !guide.visible) return;
    const putt = job.options.club === 'putter', points = [];
    for (let i = 0; i < samples.length; i += 3) {
      const [x, y, z] = samples.subarray(i, i + 3);
      points.push(new THREE.Vector3(x, Math.max(y - GOLF_RADIUS, world.renderGround(x, z)) + .07, z));
    }
    drawGuide(points, putt);
  });
  world.load = (h) => {
    oldLoad(h);
    cached = "";
    lastPreview = -1;
    preview.reset();
    world.swingPose = null;
    world.cupMoment = null;
    celebration.visible = false;
    guide.visible = false;
    golfer.visible = false;
  };
  world.setAim = (ball, dir, power, visible) => {
    if (world.hole.mode !== "golf") {
      guide.visible = false;
      oldAim(ball, dir, power, visible);
      return;
    }
    world.aim.visible = world.arrow.visible = false;
    guide.visible = visible;
    if (!visible) {
      if (cached) {cached = ''; preview.reset();}
      return;
    }
    world.aimDirection = { ...dir };
    const opts = world.shotOptions || { club: world.activeClub },
      key = [
        world.hole.seed,
        ball.x.toFixed(2),
        ball.z.toFixed(2),
        dir.x.toFixed(3),
        dir.z.toFixed(3),
        power.toFixed(3),
        opts.club,
        opts.shape,
        opts.spin,
        opts.gear?.driverYards,
      ].join(":");
    if (key === cached || world.clock - lastPreview < 0.12) return;
    lastPreview = world.clock;
    cached = key;
    preview.request(world.hole, ball, dir, power, opts);
  };
  function drawGuide(points, putt) {
    if (points.length < 2) return;
    const end = points.at(-1);
    points.forEach((p,i) => linePositions.setXYZ(i,p.x,p.y,p.z));
    linePositions.needsUpdate = true;
    lineGeo.setDrawRange(0, points.length);
    lineMat.color.set(putt ? "#c9f1c6" : "#fff4c8");
    lineMat.opacity = putt ? 0.8 : 0.48;
    stroke.visible = !putt;
    const curve = new THREE.CatmullRomCurve3(points);
    if (!putt) {
      stroke.geometry.dispose();
      stroke.geometry = new THREE.TubeGeometry(
      curve,
      Math.min(160, points.length),
      putt ? 0.048 : 0.065,
      5,
      false,
      );
    }
    stroke.material.opacity = putt ? 0.98 : 0.82;
    const length = curve.getLength(),
      count = Math.min(64, Math.max(8, Math.ceil(length / (putt ? 0.65 : 5))));
    beads.count = count;
    for (let i = 0; i < count; i++) {
      const p = curve.getPointAt(i / (count - 1));
      dummy.position.copy(p);
      dummy.scale.setScalar((putt ? 0.035 : 0.085) * (1 - (i / count) * 0.35));
      dummy.updateMatrix();
      beads.setMatrixAt(i, dummy.matrix);
    }
    beads.instanceMatrix.needsUpdate = true;
    landing.position.set(end.x, world.renderGround(end.x, end.z) + 0.035, end.z);
    landing.scale.setScalar(putt ? 0.24 : 1.25);
    landing.material.color.set(putt ? "#fff5c9" : "#f7cc66");
  }
  world.update = (dt, ball, physics) => {
    const golf = world.mode === "play" && world.hole.mode === "golf" && ball && !world.waterMoment;
    world.updateGolfer(dt, ball, physics);
    if(world.waterMoment){world.cameraHold=world.waterMoment;golfer.visible=false;}
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
