import { buildMap } from "./maps.js";
import { keepMiniSceneryClear } from "./course-detail.js";
import * as THREE from "../vendor/three.module.js";
import { getGolfHole } from "./golf-courses.js";
import { getHole } from "./courses.js";
import { coursePreview } from "./landscape.js";
import { halloweenActive } from './season.js';
const PREVIEW_PREFIX = "polygolf.preview.v28."+(halloweenActive()?'october.':'standard.');
function prunePreviewCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if ((k?.startsWith("little-links.preview.") || k?.startsWith("polygolf.preview.")) && !k.startsWith(PREVIEW_PREFIX)) localStorage.removeItem(k);
    }
  } catch {}
}

export function encodeCoursePreview(canvas) {
  // Encoding a full-size thumbnail synchronously can block the first camera pan.
  // toBlob snapshots the rendered frame now and encodes it asynchronously.
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob) return reject(Error('Could not encode course preview'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || Error('Could not read course preview'));
    reader.readAsDataURL(blob);
  }, 'image/webp', .88));
}

export function releasePreviewStudio(studio) {
  if (!studio) return;
  // Course geometry and owned turf/sky materials belong to this studio; the
  // reusable primitive geometry and cached materials still belong to the game.
  studio.clear();
  studio.sun.shadow.dispose();
  studio.renderer.dispose();
  if (!studio.renderer.getContext?.().isContextLost()) studio.renderer.forceContextLoss();
  studio.canvas.width = studio.canvas.height = 1;
}

export function installCoursePreviews(world) {
  prunePreviewCache();
  const queue = [],
    pending = new Set(),
    placeholders = new Map();
  let processing = false,
    studio = null;
  world.thumbnail = (index, mode = "mini") => {
    const key = mode + ":" + index;
    if (world.thumbCache.has(key)) return world.thumbCache.get(key);
    try {
      const saved = localStorage.getItem(PREVIEW_PREFIX + key);
      if (saved) {
        world.thumbCache.set(key, saved);
        return saved;
      }
    } catch {}
    if (!pending.has(key)) {
      pending.add(key);
      queue.push({ index, mode, key });
      schedule();
    }
    if (!placeholders.has(key)) placeholders.set(key, coursePreview(index, mode));
    return placeholders.get(key);
  };
  world.mapThumbnail = (map, id) => {
    const key = "custom:" + id;
    if (world.thumbCache.has(key)) return world.thumbCache.get(key);
    if (!pending.has(key)) {
      // Only the newest editor draft preview is worth rendering.
      if (key.startsWith("custom:draft-"))
        for (let i = queue.length - 1; i >= 0; i--)
          if (queue[i].key.startsWith("custom:draft-")) pending.delete(queue.splice(i, 1)[0].key);
      pending.add(key);
      queue.push({ mode: map.mode || "mini", index: map.theme, key, custom: map });
      schedule();
    }
    if (map.mode === "golf") {
      const len = -map.points.at(-1)[1],
        path = buildMap(map)
          .route.map(([x, z], i) => `${i ? "L" : "M"}${(40 + (-z / len) * 360).toFixed(1)},${(130 + x * 0.8).toFixed(1)}`)
          .join(" ");
      return (
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 260"><rect width="440" height="260" fill="#c7d9b0"/><path d="${path}" fill="none" stroke="#8fb465" stroke-width="${map.width * 0.9}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="400" cy="${130 + map.points.at(-1)[0] * 0.8}" r="10" fill="#d3e89c"/></svg>`,
        )
      );
    }
    const h = buildMap(map),
      path = h.samples.map((p, i) => `${i ? "L" : "M"}${220 + p.x * 7},${130 + p.z * 7}`).join(" ");
    return (
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 260"><rect width="440" height="260" fill="#d3e3be"/><path d="${path}" fill="none" stroke="#779b58" stroke-width="${map.width * 7}" stroke-linecap="round"/></svg>`,
      )
    );
  };
  function schedule() {
    if (processing) return;
    processing = true;
    defer(200);
  }
  function defer(delay) {
    setTimeout(() => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(renderNext, {timeout:1000});
      else void renderNext();
    }, delay);
  }
  function release() {
    releasePreviewStudio(studio);
    studio = null;
  }
  async function renderNext() {
    if (!queue.length) {
      processing = false;
      release();
      return;
    }
    if (document.hidden || world.mode === "play") {
      release();
      defer(1000);
      return;
    }
    const { index, mode, key, custom } = queue.shift();
    const images = () => [...document.querySelectorAll('img[data-course-preview]')].filter(el => el.dataset.coursePreview === key);
    // A navigation may have replaced the cards while this job was waiting.
    if (!images().length) {
      pending.delete(key);
      defer(0);
      return;
    }
    try {
      if (!studio) {
        const canvas = document.createElement("canvas"),
          renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
        renderer.setSize(720, 440, false);
        renderer.setPixelRatio(1.5);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        studio = Object.create(Object.getPrototypeOf(world));
        Object.assign(studio, {
          canvas,
          renderer,
          scene: new THREE.Scene(),
          camera: new THREE.PerspectiveCamera(40, 720 / 440, 0.1, 1800),
          materials: world.materials,
          geometries: world.geometries,
          ball: new THREE.Group(),
          sun: new THREE.DirectionalLight("#ffedd0", 2.3),
        });
        studio.sun.castShadow = true;
        studio.sun.shadow.mapSize.set(1024, 1024);
        studio.sun.shadow.bias = -0.0005;
        studio.sun.shadow.normalBias = 0.08;
        studio.scene.add(studio.sun, new THREE.HemisphereLight("#e6f4ff", "#6b8457", 1.4));
        studio.hemi = studio.scene.children.at(-1);
        keepMiniSceneryClear(studio);
      }
      const h = custom ? buildMap(custom) : (mode === "golf" ? getGolfHole : getHole)(index, 0);
      studio.load(h);
      studio.scene.fog = null;
      studio.renderer.toneMappingExposure = mode === "golf" ? 1 : 1.15;
      if (mode === "golf") {
        studio.camera.position.set(index === 1 ? 205 : 110, h.length * 0.55, 65);
        studio.camera.lookAt(0, 0, -h.length * 0.42);
      } else {
        studio.camera.position.set(33, 30, 39);
        studio.camera.lookAt(0, -1, 0);
      }
      studio.camera.aspect = 720 / 440;
      studio.camera.updateProjectionMatrix();
      if (studio.renderer.getContext().isContextLost()) throw Error('Preview graphics context was lost');
      studio.renderer.render(studio.scene, studio.camera);
      const image = await encodeCoursePreview(studio.canvas);
      world.thumbCache.set(key, image);
      // Only official course previews are cached on the device; draft and community
      // previews stay in memory so they never crowd out saves.
      if (!custom)
        try {
          localStorage.setItem(PREVIEW_PREFIX + key, image);
        } catch {}
      images().forEach((el) => {
        el.src = image;
        el.classList.add("preview-ready");
      });
    } catch (e) {
      console.warn("Course preview unavailable", e);
    } finally {
      pending.delete(key);
    }
    defer(250);
  }
}
