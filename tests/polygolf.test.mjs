import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as THREE from "../dist/vendor/three.module.js";
import { ITEMS, ITEM_BY_ID, shopRotation, shopAvailable } from "../dist/src/catalog.js";
import { LOCKERS, lockerPool, lockerContents, openLocker } from "../dist/src/pro-shop.js";
import { MINI_EFFECTS, miniStats } from "../dist/src/equipment.js";
import { buildClub, CLUB_SHAPES, clubShape } from "../dist/src/club-models.js";
import { validateMap, buildMap } from "../dist/src/maps.js";
import { encodeMap, decodeMap } from "../dist/src/map-share.js";
import { defaultSave, ProgressionManager } from "../dist/src/save.js";

// The editor modules touch document/localStorage when constructed; importing only needs stubs.
globalThis.document ??= { addEventListener() {} };
globalThis.localStorage ??= { getItem: () => null, setItem() {} };
const { GOLF_TEMPLATES } = await import("../dist/src/golf-editor.js");
const { MINI_TEMPLATES } = await import("../dist/src/editor.js");

test('catalog identifiers are stable while shop prices increase modestly',async()=>{
 const original=JSON.parse(await readFile(new URL('./fixtures/catalog-v5.json',import.meta.url),'utf8'));
 for(const old of original){const next=ITEM_BY_ID[old.id];assert.ok(next,old.id);assert.equal(next.name,old.name);assert.equal(next.source,old.source);assert.equal(next.price,old.price?Math.ceil(old.price*1.3/100)*100:0);}
});

test("novelty clubs are usable, equippable and obtainable", () => {
  const novelty = ITEMS.filter((i) => i.shape && i.id !== "club-candy");
  assert.ok(novelty.length >= 12);
  for (const item of [...novelty, ITEM_BY_ID["club-candy"]]) {
    assert.ok(CLUB_SHAPES.includes(item.shape), item.id);
    assert.ok(["club", "driver"].includes(item.category));
    if (item.source === "permanent") assert.ok(shopAvailable(item.id) && item.price > 0);
    if (item.source === "pack") assert.ok(lockerPool(item.rarity, item.crate || "fairway").includes(item));
  }
  for (const item of novelty.filter((i) => i.category === "club")) assert.ok(MINI_EFFECTS[item.id], item.id);
  const p = new ProgressionManager({ load: () => defaultSave(), save: () => true });
  p.data.coins = 100000;
  const slapshot = shopRotation().permanent.find((i) => i.id === "driver-hockey");
  assert.equal(p.buy(slapshot.id).ok, true);
  assert.equal(p.equip(slapshot.id), true);
  assert.equal(p.data.equipment.driver, "driver-hockey");
  assert.ok(miniStats({ ball: "ball-classic", club: "club-pan" }).power > 1);
});

test("every locker lists complete odds and themed lockers never leak their items", () => {
  for (const pack of LOCKERS) {
    const rows = lockerContents(pack.id);
    assert.ok(Math.abs(rows.reduce((s, r) => s + r.weight, 0) - 100) < 1e-9, pack.id);
    for (const r of rows) assert.ok(r.items.length && r.items.every((i) => i.source === "pack"), pack.id + r.rarity);
    if (!pack.crate) assert.ok(rows.every((r) => r.items.every((i) => !i.crate)));
  }
  const p = new ProgressionManager({ load: () => defaultSave(), save: () => true });
  p.data.coins = 5000;
  const receipt = openLocker(p, "oddities", "oddities-opening-1234", () => 0.5);
  assert.equal(ITEM_BY_ID[receipt.item].crate, "oddities");
  assert.equal(p.data.coins, 1800);
});

test("club models build for every shape without errors", () => {
  const geometries = { box: new THREE.BoxGeometry(), sphere: new THREE.IcosahedronGeometry(1, 1), round: new THREE.SphereGeometry(), cylinder: new THREE.CylinderGeometry(), cone: new THREE.ConeGeometry() },
    material = new THREE.MeshBasicMaterial(),
    w = {
      geometries,
      mat: () => material,
      mesh(geo, color, x, y, z, sx, sy, sz, parent) {
        const m = new THREE.Mesh(typeof geo === "string" ? geometries[geo] : geo, material);
        m.position.set(x, y, z);
        m.scale.set(sx, sy, sz);
        parent.add(m);
        return m;
      },
    };
  for (const shape of CLUB_SHAPES) {
    const parent = new THREE.Group(),
      root = buildClub(w, { id: "t-" + shape, category: shape === "driver" ? "driver" : "club", shape, color: "#888888", pattern: "#eeeeee" }, parent, { lie: -0.42 });
    let meshes = 0;
    root.traverse((o) => o.isMesh && meshes++);
    assert.ok(meshes >= 3, shape);
  }
  assert.equal(clubShape({ category: "driver" }), "driver");
});

test("editor templates are valid maps and share codes round-trip safely", async () => {
  for (const t of [...GOLF_TEMPLATES, ...MINI_TEMPLATES]) {
    const map = validateMap(t.map);
    buildMap(map);
    assert.deepEqual(await decodeMap(await encodeMap(map)), map);
  }
  await assert.rejects(decodeMap("not a code"), /share code/);
  await assert.rejects(decodeMap("PG1.AAAA"), /incomplete|damaged/);
  const tampered = "PG0." + Buffer.from(JSON.stringify({ ...MINI_TEMPLATES[0].map, par: 99 })).toString("base64url");
  await assert.rejects(decodeMap(tampered), /par/i);
});

test("every course prop placed in the browser exists in the Blender kit", async () => {
  const kit = JSON.parse(await readFile(new URL("../dist/assets/course-kit.json", import.meta.url), "utf8")),
    source = await readFile(new URL("../dist/src/course-assets.js", import.meta.url), "utf8"),
    referenced = new Set([...source.matchAll(/"([a-z]+(?:-[a-z]+)*)"/g)].map((m) => m[1]).filter((n) => kit.assets[n] || /-(low|post|tree|hut|pile|log|well|arch|pads|rocks|grass|cart|washer|marker|sign)$/.test(n)));
  assert.equal(kit.version, 8);
  for (const name of referenced) assert.ok(kit.assets[name], "missing kit asset " + name);
  for (const [name, a] of Object.entries(kit.assets)) {
    assert.equal(a.p.length, a.c.length * 9, name);
    assert.ok(a.c.every((c) => kit.palette[c]), name);
  }
});
