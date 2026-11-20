import * as THREE from '../vendor/three.module.js';

const TOP = 1.01;
const CENTER_Z = 8.6;

function slab(width, depth, height) {
  const x = width / 2, z = depth / 2, clip = .25;
  const outline = new THREE.Shape();
  outline.moveTo(-x + clip, -z);
  for (const [a, b] of [[x - clip, -z], [x, -z + clip], [x, z - clip], [x - clip, z],
    [-x + clip, z], [-x, z - clip], [-x, -z + clip]]) outline.lineTo(a, b);
  outline.closePath();
  return new THREE.ExtrudeGeometry(outline, {
    depth: height, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 1, steps: 1,
  }).rotateX(-Math.PI / 2);
}

function skyDome(scene) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(115, 30, 14), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      horizon: { value: new THREE.Color('#f6dfa6') },
      zenith: { value: new THREE.Color('#79baba') },
      skyWarmth: { value: new THREE.Color('#ffedc6') },
    },
    vertexShader: `
      varying vec3 dir;
      void main() {
        dir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 horizon, zenith, skyWarmth;
      varying vec3 dir;
      void main() {
        vec3 ray = normalize(dir);
        float up = smoothstep(-0.08, 0.50, ray.y);
        vec3 color = mix(horizon, zenith, up);
        float sun = max(0.0, dot(ray, normalize(vec3(-0.45, 0.27, -1.0))));
        color = mix(color, skyWarmth, min(0.92, pow(sun, 24.0) * .38 + smoothstep(.996, .998, sun) * .8));
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  dome.position.z = CENTER_Z;
  dome.renderOrder = -10;
  scene.add(dome);
}

export function createCaddieStage(world) {
  const scene = new THREE.Scene();
  scene.name = 'caddie-overlook';
  const box = world.geometries.box;
  const mesh = (geometry, color, x, y, z, sx = 1, sy = 1, sz = 1, options) => {
    const item = world.mesh(geometry, color, x, y, z, sx, sy, sz, scene, options);
    item.castShadow = false;
    item.receiveShadow = false;
    return item;
  };
  const dummy = new THREE.Object3D(), shade = new THREE.Color();
  const scatter = (geometry, placements) => {
    const batch = new THREE.InstancedMesh(geometry, world.mat('#ffffff', { flatShading: true }), placements.length);
    placements.forEach(([x, y, z, sx, sy, sz, color], i) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix);
      batch.setColorAt(i, shade.set(color));
    });
    scene.add(batch);
    return batch;
  };

  skyDome(scene);
  scene.add(new THREE.HemisphereLight('#e8f5e8', '#a9a366', 1.75));
  const sun = new THREE.DirectionalLight('#ffe0ac', 2.75);
  sun.position.set(-4.8, 9.5, 12);
  sun.target.position.set(0, 0, CENTER_Z);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .2, far: 22 });
  sun.shadow.normalBias = .015;
  sun.shadow.bias = -.0006;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight('#aee5e0', .8);
  rim.position.set(4, 5, 4);
  scene.add(rim);

  const hills = new THREE.IcosahedronGeometry(1, 0);
  scatter(hills, [
    [-26, 0, -48, 18, 10, 16, '#5c8f8b'], [-10, -1, -55, 13, 15, 17, '#7eaaa1'],
    [8, -2, -52, 15, 12, 14, '#73a39b'], [24, -1, -51, 14, 16, 16, '#518980'],
    [-15, -1.8, -30, 13, 6.2, 9, '#588e6e'], [16, -2, -27, 15, 5.5, 10, '#5b8a61'],
  ]);
  mesh(box, '#7da55d', 0, -1.8, -10, 125, 1, 76);
  const pond = new THREE.CircleGeometry(1, 56).rotateX(-Math.PI / 2);
  mesh(pond, '#abc58e', 2.4, -1.27, -7.8, 13, 1, 7.2);
  mesh(pond, '#65a99d', 2.2, -1.25, -7.6, 12.2, 1, 6.6, { roughness: .5 });
  const reflections = scatter(box, Array.from({ length: 16 }, (_, i) => [
    1.4 + Math.cos(i * 2.39) * (2.4 + i % 5), -1.239, -7.5 + Math.sin(i * 1.9) * 4.2,
    1 + i % 4 * .8, .003, .045 + i % 3 * .025, i % 3 === 0 ? '#a9d8ba' : '#86bbb0',
  ]));
  const fairway = mesh(pond, '#a6c771', -7.3, -1.24, -.8, 4.3, 1, 4.6);
  fairway.rotation.y = -.2;
  mesh(pond, '#bfd893', -5.2, -1.22, -.7, 1.5, 1, 1.7);
  mesh('cylinder', '#fbf3ce', -5.13, -.29, -.6, .033, 1.85, .033);
  const flag = mesh(new THREE.PlaneGeometry(.54, .3), '#ca6142', -4.86, .43, -.6, 1, 1, 1, { side: THREE.DoubleSide });

  const pines = Array.from({ length: 46 }, (_, i) => {
    const band = i < 24 ? -1 : 1;
    const x = band * (3.9 + i % 11 * 1.08) + Math.sin(i * 2.1) * 2;
    const z = -17 + Math.cos(i * 2.8) * 8 - (i % 3) * 2.5;
    return { x, z, height: 1.9 + (i * 13 % 19) * .14 };
  });
  scatter(new THREE.CylinderGeometry(.08, .12, 1, 5), pines.map(({ x, z, height }) =>
    [x, -1.22 + height * .3, z, 1, height * .65, 1, '#694f38']));
  scatter(new THREE.ConeGeometry(1, 1, 6), pines.flatMap(({ x, z, height }, i) => [
    [x, -1.22 + height * .67, z, height * .26, height * .69, height * .25, i % 2 ? '#306852' : '#386d4e'],
    [x, -1.22 + height * .97, z, height * .19, height * .61, height * .19, i % 2 ? '#468263' : '#578f59'],
  ]));

  // The viewing deck and display share the same warm brass and dark jade trim.
  const deck = mesh(box, '#54684d', 0, -.15, 10.1, 21, .3, 10.6);
  deck.receiveShadow = true;
  scatter(box, Array.from({ length: 21 }, (_, i) =>
    [i - 10, .006, 10.1, .055, .01, 10.6, i % 3 ? '#47614b' : '#607552']));
  const rail = Array.from({ length: 10 }, (_, i) => [(i - 4.5) * 2.22, .44, 4.85, .14, 1.02, .15, '#426553']);
  scatter(box, [...rail, [0, .89, 4.85, 21.2, .11, .13, '#d3c293'], [0, .4, 4.85, 21.2, .08, .095, '#607855']]);
  mesh(slab(4.92, 2.79, .15), '#1c473a', 0, .05, CENTER_Z);
  mesh(slab(4.57, 2.54, .59), '#2d6250', 0, .20, CENTER_Z);
  mesh(slab(4.62, 2.59, .047), '#c6a466', 0, .79, CENTER_Z, 1, 1, 1, { metalness: .24, roughness: .52 });
  const platform = mesh(slab(4.51, 2.48, .138), '#ced2a5', 0, .837, CENTER_Z);
  platform.name = 'caddie-display-platform';
  platform.receiveShadow = true;
  mesh(slab(4.27, 2.24, .015), '#a9bc7f', 0, .955, CENTER_Z).receiveShadow = true;
  mesh(box, '#b6a06c', 0, .49, CENTER_Z + 1.277, 1.17, .13, .025, { roughness: .72 });
  scatter(box, [[-.29, .49, CENTER_Z + 1.294, .17, .024, .009, '#2a5c48'],
    [0, .49, CENTER_Z + 1.294, .17, .024, .009, '#2a5c48'], [.29, .49, CENTER_Z + 1.294, .17, .024, .009, '#2a5c48']]);

  const bounds = new THREE.Box3();
  const previousBallRotation = new THREE.Euler(), previousClubRotation = new THREE.Euler();
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let posedModel, clubY = TOP, previousFov;
  return {
    scene,
    attach() {
      previousBallRotation.copy(world.ball.rotation);
      previousClubRotation.copy(world.club.rotation);
      previousFov = world.camera.fov;
      scene.add(world.ball, world.club);
    },
    detach() {
      world.ball.rotation.copy(previousBallRotation);
      world.club.rotation.copy(previousClubRotation);
      if (world.mode !== 'play' && world.camera.fov === 39 && previousFov !== 39) {
        world.camera.fov = previousFov;
        world.camera.updateProjectionMatrix();
      }
      world.scene.add(world.ball, world.club);
    },
    update(aspect, position, target) {
      const still = world.settings?.reducedMotion || reducedMotion?.matches;
      const t = still ? 0 : world.clock;
      reflections.position.x = Math.sin(t * .34) * .42;
      flag.rotation.y = Math.sin(t * 1.2) * .24;

      world.ball.scale.setScalar(2.73);
      world.ball.position.set(1.04, TOP + .24 * 2.73, CENTER_Z + .28);
      world.ball.rotation.set(.08, t * .29, -.12);
      const club = world.club;
      club.scale.setScalar(1.52);
      club.rotation.set(.14, -2.48, -.28);
      club.position.set(-1.08, 0, CENTER_Z - .12);
      if (posedModel !== world.clubModelId) {
        clubY = TOP - bounds.setFromObject(club).min.y;
        posedModel = world.clubModelId;
      }
      club.position.y = clubY;

      const fit = Math.max(.88, 1.02 / aspect);
      position.set(3.3 * fit, 4.6 + fit * .6, CENTER_Z + 8.2 * fit);
      target.set(0, 1.86, CENTER_Z - .23);
    },
  };
}
