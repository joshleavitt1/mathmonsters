import { clamp } from "./utils.js";

const PROG_URL = new URL("../../data/progression.json", import.meta.url);

export async function loadProgression() {
  const res = await fetch(PROG_URL);
  if (!res.ok) throw new Error(`Failed to fetch progression.json (${res.status})`);
  return res.json();
}

export function getLevelData(prog, heroType, level) {
  const theme = prog?.[heroType];
  if (!theme || !theme.levels) throw new Error(`Missing progression theme: ${heroType}`);

  const keys = Object.keys(theme.levels).map(Number).filter(n => Number.isFinite(n)).sort((a,b)=>a-b);
  if (keys.length === 0) throw new Error(`No levels found for theme: ${heroType}`);

  const max = keys[keys.length - 1];
  const lvl = clamp(Number(level), 1, max);

  const data = theme.levels[String(lvl)];
  if (!data) throw new Error(`Missing level ${lvl} for theme: ${heroType}`);
  return data;
}

export function getRandomMonster(prog, heroType) {
  const theme = prog?.[heroType];
  const monsters = theme?.monsters;
  if (!Array.isArray(monsters) || monsters.length < 1) throw new Error(`Missing monsters for theme: ${heroType}`);

  const idx = Math.floor(Math.random() * monsters.length);
  return monsters[idx];
}
