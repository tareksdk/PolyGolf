import * as THREE from "../vendor/three.module.js";
export function installGhosts(world) {
  const ghosts = new Map();
  world.setGhosts = (positions) => {
    const ids = new Set(positions.map((p) => p.user_id));
    for (const [id, g] of ghosts)
      if (!ids.has(id)) {
        world.scene.remove(g);
        ghosts.delete(id);
      }
    for (const p of positions) {
      let g = ghosts.get(p.user_id);
      if (!g) {
        g = new THREE.Mesh(world.geometries.round, world.mat("#efa689", { transparent: true, opacity: 0.6 }));
        g.scale.setScalar(world.hole.mode === "golf" ? 0.06 : 0.24);
        world.scene.add(g);
        ghosts.set(p.user_id, g);
        g.position.set(
          p.x,
          Math.max(
            p.y + 0.06,
            (world.renderGround?.(p.x, p.z) ?? 0) + (world.hole.mode === "golf" ? 0.075 : 0.255),
          ),
          p.z,
        );
      }
      g.userData.target = new THREE.Vector3(
        p.x,
        Math.max(
          p.y + 0.06,
          (world.renderGround?.(p.x, p.z) ?? 0) + (world.hole.mode === "golf" ? 0.075 : 0.255),
        ),
        p.z,
      );
    }
  };
  const update = world.update.bind(world);
  world.update = (dt, ...args) => {
    for (const g of ghosts.values()) g.position.lerp(g.userData.target, 1 - Math.exp(-dt * 7));
    update(dt, ...args);
  };
}
