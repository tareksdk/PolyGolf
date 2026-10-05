// Clear the default framebuffer before every frame. Shadows and transparent
// effects must not leave a write mask or a menu scissor window behind.
export function renderFrame(renderer, scene, camera, width, height, stage = null) {
  renderer.setRenderTarget(null);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.state.buffers.color.setMask(true);
  renderer.state.buffers.depth.setMask(true);
  renderer.state.buffers.stencil.setMask(0xffffffff);
  const background = scene.background;
  if (background?.isColor) renderer.setClearColor(background);
  renderer.clear(true, true, true);
  const clipped = stage?.width > 0 && stage?.height > 0;
  if (clipped) {
    renderer.setViewport(stage.left, height - stage.bottom, stage.width, stage.height);
    renderer.setScissor(Math.max(0, stage.left), Math.max(0, height - stage.bottom),
      Math.max(0, Math.min(width, stage.right) - Math.max(0, stage.left)),
      Math.max(0, Math.min(height, stage.bottom) - Math.max(0, stage.top)));
    renderer.setScissorTest(true);
  }
  try {
    // Three also forces a clear for a Color background, even with autoClear off.
    // Its colour is already installed above; avoid a second clear inside a stage.
    if (background?.isColor) scene.background = null;
    renderer.render(scene, camera);
  } finally {
    scene.background = background;
    if (clipped) {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
    }
  }
}
