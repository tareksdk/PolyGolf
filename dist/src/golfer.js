import * as THREE from "../vendor/three.module.js";
import { buildClub, mountClub, trimClubCache } from "./club-models.js";

// Local -Z faces the ball. The target line runs along local -X.
export function createGolfer(w) {
  const root = new THREE.Group(),
    torso = new THREE.Group(),
    rig = new THREE.Group();
  root.add(torso, rig);
  w.scene.add(root);
  root.visible = false;
  const part = (shape, color, x, y, z, sx, sy, sz, parent = root) =>
    w.mesh(shape, color, x, y, z, sx, sy, sz, parent);
  torso.position.y = 0.91;
  part("box", "#e5ba60", 0, 0.23, 0, 0.46, 0.46, 0.27, torso);
  part("box", "#f6ecd4", 0, 0.45, -0.03, 0.19, 0.055, 0.27, torso);
  part("box", "#dfb88f", 0, 0.67, -0.025, 0.3, 0.32, 0.28, torso);
  part("box", "#365749", 0, 0.86, -0.025, 0.34, 0.085, 0.32, torso);
  part("box", "#365749", 0, 0.81, -0.23, 0.33, 0.045, 0.18, torso);
  part("box", "#263c33", 0, 0.03, 0, 0.45, 0.11, 0.28, torso);
  for (const x of [-0.18, 0.18]) {
    const leg = part("box", "#d8d0b4", x, 0.48, 0.035, 0.18, 0.73, 0.22);
    leg.rotation.z = x * 0.16;
    part("box", "#f0ecdd", x, 0.085, -0.1, 0.23, 0.15, 0.39);
    part("box", "#33483e", x, 0.021, -0.1, 0.23, 0.025, 0.39);
  }
  rig.position.set(0, 1.23, -0.09);
  const grip = new THREE.Vector3(0, -0.39, -0.34),
    headPoint = new THREE.Vector3(0, -1.165, -0.69),
    up = new THREE.Vector3(0, 1, 0);
  // The equipped putter or driver model is held in the hands; irons use a clean steel blade.
  const head = new THREE.Object3D();
  head.name = "club-impact-head";
  head.position.copy(headPoint);
  rig.add(head);
  const clubMount = new THREE.Group(),
    clubModels = new Map();
  rig.add(clubMount);
  mountClub(clubMount, headPoint, grip, headPoint.distanceTo(grip) / 2.2);
  let clubKey = null;
  const showClub = (kind) => {
    const id = kind === "iron" ? "iron" : w.equipment?.[kind === "putter" ? "club" : "driver"],
      key = kind + ":" + id + ':' + (w.equipment?.patterns?.[id] ?? '');
    if (key === clubKey) return;
    clubKey = key;
    clubMount.clear();
    if (!clubModels.has(key)) {
      const holder = new THREE.Group(),
        item =
          kind === "iron"
            ? { id: "iron", category: "driver", shape: "iron", color: "#5f7466" }
            : w.items?.find((i) => i.id === id) || { id: key, category: kind === "putter" ? "club" : "driver", color: "#435c52" };
      buildClub(w, item, holder, { lie: -0.42, gameplay: true });
      clubModels.set(key, holder);
      trimClubCache(clubModels);
    }
    clubMount.add(clubModels.get(key));
  };
  const palms = part("box", "#f8f3df", ...grip.toArray(), 0.17, 0.12, 0.14, rig);
  const arms = [-1, 1].map((side) => ({
    side,
    upper: part("box", "#e6c298", 0, 0, 0, 0.12, 1, 0.13),
    lower: part("box", "#e6c298", 0, 0, 0, 0.105, 1, 0.11),
  }));
  const line = (mesh, a, b) => {
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    const d = b.clone().sub(a);
    mesh.scale.y = d.length();
    mesh.quaternion.setFromUnitVectors(up, d.normalize());
  };
  const smooth = (t) => {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  };
  w.beginSwing = (ball, dir, club) => {
    w.emotePose = null;
    w.swingPose = { time: 0, ball: { ...ball }, dir: { ...dir }, club };
  };
  w.updateGolfer = (dt, ball, physics) => {
    const emote = w.emotePose;
    if (emote && !w.presentationPaused) { emote.time += dt; if (emote.time > 2.8 || physics?.active) w.emotePose = null; }
    const pose = w.swingPose;
    if (pose && !w.presentationPaused) {
      pose.time += dt;
      if (pose.time > 1.6) w.swingPose = null;
    }
    const putt = (pose?.club || w.activeClub) === "putter",
      impact = putt ? 0.36 : 0.56;
    w.cameraHold = pose && pose.time < impact + 0.16 ? pose.ball : null;
    root.visible =
      !!ball &&
      w.mode === "play" &&
      w.hole.mode === "golf" &&
      (!physics?.active || !!w.swingPose) &&
      !physics?.sunk;
    if (!root.visible) return;
    const p = pose?.ball || ball,
      d = pose?.dir || w.aimDirection || { x: 0, z: -1 },
      side = { x: -d.z, z: d.x };
    root.position.set(
      p.x - side.x * 0.78,
      w.renderGround(p.x - side.x * 0.78, p.z - side.z * 0.78) + 0.012,
      p.z - side.z * 0.78,
    );
    root.rotation.y = Math.atan2(-d.x, -d.z) - Math.PI / 2;
    const t = pose?.time || 0,
      top = putt ? 0.22 : 0.36,
      back = putt ? 0.2 : 2.05,
      follow = putt ? 0.27 : 2.18;
    let angle = 0;
    if (pose) {
      if (t < top) angle = back * smooth(t / top);
      else if (t < impact) angle = back * (1 - ((t - top) / (impact - top)) ** 2);
      else if (t < impact + 0.32)
        angle = -follow * Math.sin((Math.min(1, (t - impact) / 0.32) * Math.PI) / 2);
      else angle = -follow * (1 - 0.1 * smooth((t - impact - 0.32) / 0.6));
    }
    rig.rotation.z = angle;
    torso.rotation.y = putt ? 0 : -angle * 0.19;
    torso.rotation.z = putt ? 0 : -Math.sin(angle) * 0.06;
    rig.visible = !emote;
    if (emote) {
      torso.rotation.y = Math.sin(emote.time*5)*(emote.kind==='dance'?.3:.07);
      torso.rotation.z = Math.sin(emote.time*5)*.045;
      root.position.y += emote.kind==='cheer'?Math.max(0,Math.sin(emote.time*7))*.12:0;
    }
    root.updateMatrixWorld(true);
    const hands = grip
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), angle)
      .add(rig.position);
    for (const a of arms) {
      const shoulder = new THREE.Vector3(a.side * 0.245, 1.28, 0).applyAxisAngle(up, torso.rotation.y),
        hand = hands.clone().add(new THREE.Vector3(a.side * 0.025, 0, 0)),
        elbow = shoulder.clone().lerp(hand, 0.54);
      elbow.x += a.side * 0.075;
      elbow.z += 0.07;
      if (emote) {
        const t=emote.time, ramp=Math.min(1,t*5,(2.8-t)*5);
        const target=emote.kind==='love'?new THREE.Vector3(a.side*.08,1.3,-.36):emote.kind==='cheer'?new THREE.Vector3(a.side*(.38+Math.sin(t*8)*.08),1.95,-.05):emote.kind==='dance'?new THREE.Vector3(a.side*.65,1.25+Math.sin(t*6+a.side)*.25,-.15):new THREE.Vector3(a.side===1?.5+Math.sin(t*10)*.13:-.4,a.side===1?1.92:.92,-.12);
        hand.lerp(target,Math.max(0,ramp));elbow.copy(shoulder).lerp(hand,.52);elbow.x+=a.side*.1;elbow.z+=.08;
      }
      line(a.upper, shoulder, elbow);
      line(a.lower, elbow, hand);
    }
    const active = pose?.club || w.activeClub;
    showClub(putt ? "putter" : ["driver", "3w", "5w"].includes(active) ? "driver" : "iron");
  };
  return root;
}
