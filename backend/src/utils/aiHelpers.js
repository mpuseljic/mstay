import fs from "fs";
import path from "path";

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toEthFromWei(value) {
  const n = Number(value || 0);
  return n / 1e18;
}

function moneyToWeiEth(eurValue) {
  return String(Math.round(Number(eurValue || 0) * 1e18));
}

function includesAny(text, words) {
  const normalized = normalizeText(text);
  return words.some((w) => normalized.includes(normalizeText(w)));
}

export {
  readJsonSafe,
  normalizeText,
  toEthFromWei,
  moneyToWeiEth,
  includesAny,
};
