export function registerTools(ui) {
  const context = document.modelContext || navigator.modelContext;
  if (!context?.registerTool) return;
  const lifetime = new AbortController();
  const register = (tool) => {
    try {
      Promise.resolve(context.registerTool(tool, { signal: lifetime.signal })).catch(() => {});
    } catch {}
  };
  register({
    name: "polygolf_status",
    description: "Read local golfer progress and current round status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => ({
      player: ui.progress.data.name,
      level: ui.progress.level.level,
      coins: ui.progress.data.coins,
      screen: ui.screen,
      mode: ui.mode,
      online: !!ui.cloud?.session,
      metrics: {
        drawCalls: ui.world.drawCalls,
        medianFrameMs: [...(ui.world.frameTimes || [])].sort((a, b) => a - b)[
          Math.floor((ui.world.frameTimes || []).length * 0.5)
        ],
        p95FrameMs: [...(ui.world.frameTimes || [])].sort((a, b) => a - b)[
          Math.floor((ui.world.frameTimes || []).length * 0.95)
        ],
      },
      round: ui.game.round
        ? {
            course: ui.game.round.courseIndex,
            hole: ui.game.index + 1,
            strokes: ui.game.strokes,
            state: ui.game.state,
          }
        : null,
    }),
  });
  register({
    name: "polygolf_open_menu",
    description: "Open a PolyGolf menu when no round is active. Does not buy, equip, or begin a round.",
    inputSchema: {
      type: "object",
      properties: {
        menu: { type: "string", enum: ["home", "courses", "garage", "shop", "profile", "leaderboards"] },
      },
      required: ["menu"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async (input) => {
      if (!input || !["home", "courses", "garage", "shop", "profile", "leaderboards"].includes(input.menu))
        return { error: "Choose a valid menu." };
      if (ui.game.state !== "menu") return { error: "Finish or exit the current round first." };
      ui.navigate(input.menu);
      return { screen: ui.screen };
    },
  });
  window.addEventListener("pagehide", () => lifetime.abort(), { once: true });
}
