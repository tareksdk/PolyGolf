import { COURSES } from "./courses.js";
// Replace this repository with an authenticated HTTP service for live rankings.
export class LocalLeaderboardRepository {
  async list(metric, courseIndex, save) {
    const names = [
      "moss & putt",
      "BirdieBean",
      "CloudCaddie",
      "peachputt",
      "Fern Friend",
      "LowPolyPro",
      "Sunday Club",
      "Minty Swing",
      "TinyTee",
      "Golden Goose",
    ];
    let rows = names.map((name, i) => ({
      name,
      level: 28 - i * 2,
      score: -14 + i * 2 + (courseIndex % 3),
      time: 195 + i * 23,
      aces: 124 - i * 11,
      isYou: false,
    }));
    const best = save.bests[String(courseIndex)];
    if (metric === "level" || metric === "aces" || best) {
      rows.push({
        name: save.name,
        level: 0,
        score: best?.score ?? null,
        time: best?.time ?? null,
        aces: save.stats.aces,
        isYou: true,
      });
      let xp = save.xp,
        level = 1;
      while (xp >= 500 + (level - 1) * 125) {
        xp -= 500 + (level - 1) * 125;
        level++;
      }
      rows[rows.length - 1].level = level;
    }
    return rows
      .sort((a, b) =>
        metric === "level" || metric === "aces" ? b[metric] - a[metric] : a[metric] - b[metric],
      )
      .map((r, i) => ({ ...r, rank: i + 1, course: COURSES[courseIndex].name }));
  }
}
