#!/usr/bin/env node
// scripts/generate-iso6392.mjs
// Produces: lib/iso6392-map.ts with shape:
// export const ISO_639_2_TO_NAME: { [key: string]: string } = { ... };
// export function getLanguageName(code: string): string { ... }
//
// Usage:
//   node ./scripts/generate-iso6392.mjs
//
// Requirements: Node 18+ (global fetch, top-level await)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, "..", "src", "lib");
const outPath = path.join(outDir, "language-utils.ts");

// Source URLs (best-effort)
const LOC_639_2 = "https://www.loc.gov/standards/iso639-2/ISO-639-2_utf-8.txt";
const IANA_REGISTRY =
  "https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry";
// SIL ISO-639-3 tab (official public download)
const SIL_639_3_TAB =
  "https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab";
// CLDR (try raw github, then unpkg, then local node_modules)
const CLDR_RAW =
  "https://raw.githubusercontent.com/unicode-cldr/cldr-localenames-full/master/main/en/languages.json";
const CLDR_UNPKG =
  "https://unpkg.com/cldr-localenames-full@latest/main/en/languages.json";

async function fetchText(url, note = "") {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.text();
  } catch (err) {
    throw new Error(
      `Fetch ${url} failed${note ? " (" + note + ")" : ""}: ${err.message}`,
    );
  }
}

function parseLOC(text) {
  // LOC format: bibliographic|terminologic|alpha2|English name|French name
  const map = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split("|");
    const [biblio = "", termino = "", alpha2 = "", eng = ""] = parts;
    const name = (eng || "").split(";")[0].trim();
    if (!name) continue;
    if (biblio) map[biblio.toLowerCase()] = name;
    if (termino) map[termino.toLowerCase()] = name;
    if (alpha2) map[alpha2.toLowerCase()] = name;
  }
  return map;
}

function parseIANARegistry(text) {
  // registry blocks separated by "%%"
  const aliases = {};
  const blocks = text.split(/%%\r?\n/);
  for (const blk of blocks) {
    const lines = blk.split(/\r?\n/);
    let type = null;
    let subtag = null;
    let tag = null;
    let pref = null;
    let descriptions = [];
    for (const l of lines) {
      const line = l.trim();
      if (!line) continue;
      const [field, ...rest] = line.split(":");
      if (!field) continue;
      const value = rest.join(":").trim();
      if (field === "Type") type = value;
      else if (field === "Subtag") subtag = value;
      else if (field === "Tag") tag = value;
      else if (field === "Preferred-Value") pref = value;
      else if (field === "Description") descriptions.push(value);
    }
    const key = (subtag || tag || "").toLowerCase();
    if (!key) continue;
    // prefer Preferred-Value mapping (deprecated -> preferred)
    if (pref) {
      aliases[key] = pref.toLowerCase();
    } else if (descriptions.length) {
      // use the first description as a fallback display label
      aliases[key] = descriptions.join("; ");
    } else {
      aliases[key] = key;
    }
  }
  return aliases;
}

function parseSILTab(text) {
  // ISO-639-3 tab header example columns: Id  Part2B  Part2T  Part1  Scope  Language_Type  Ref_Name  Comment
  // We'll parse header to find indices (robust)
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split("\t").map((h) => h.trim());
  const idx = (name) => header.indexOf(name);
  const idI = idx("Id");
  const p2bI = idx("Part2B");
  const p2tI = idx("Part2T");
  const p1I = idx("Part1");
  const refI = idx("Ref_Name");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length <= idI) continue;
    const id = (cols[idI] || "").trim();
    const p2b = p2bI >= 0 ? (cols[p2bI] || "").trim() : "";
    const p2t = p2tI >= 0 ? (cols[p2tI] || "").trim() : "";
    const p1 = p1I >= 0 ? (cols[p1I] || "").trim() : "";
    const name = (refI >= 0 ? (cols[refI] || "").trim() : "") || "";
    if (!id) continue;
    rows.push({ id, p2b, p2t, p1, name });
  }
  return rows;
}

function isValidIdentifier(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

function formatKeyForOutput(k) {
  if (isValidIdentifier(k)) return k;
  return JSON.stringify(k);
}

function addIfAbsent(map, key, value, precedence) {
  // precedence: lower number = higher priority (0 = top)
  // map holds {value, priority}
  const lk = key.toLowerCase();
  if (!lk) return;
  const entry = map[lk];
  if (!entry || precedence < entry.p) {
    map[lk] = { v: value, p: precedence };
  }
}

(async function build() {
  try {
    console.log("Fetching sources...");

    // Fetch sources concurrently where possible, but handle CLDR via fallbacks
    const [locText, ianaText, silText] = await Promise.all([
      (async () => {
        try {
          return await fetchText(LOC_639_2);
        } catch (e) {
          console.warn("LOC fetch failed:", e.message);
          return "";
        }
      })(),
      (async () => {
        try {
          return await fetchText(IANA_REGISTRY);
        } catch (e) {
          console.warn("IANA fetch failed:", e.message);
          return "";
        }
      })(),
      (async () => {
        try {
          return await fetchText(SIL_639_3_TAB);
        } catch (e) {
          console.warn("SIL fetch failed:", e.message);
          return "";
        }
      })(),
    ]);

    // CLDR: try raw, then unpkg, then local node_modules
    let cldrJson = null;
    try {
      const txt = await fetchText(CLDR_RAW);
      cldrJson = JSON.parse(txt);
      console.log("Loaded CLDR from raw GitHub");
    } catch (errRaw) {
      try {
        const txt = await fetchText(CLDR_UNPKG);
        cldrJson = JSON.parse(txt);
        console.log("Loaded CLDR from unpkg");
      } catch (errUnpkg) {
        // try local
        try {
          const localPath = require.resolve(
            "cldr-localenames-full/main/en/languages.json",
          );
          cldrJson = JSON.parse(fs.readFileSync(localPath, "utf8"));
          console.log("Loaded CLDR from node_modules");
        } catch (errLocal) {
          console.warn(
            "CLDR load failed (raw/unpkg/local):",
            errRaw.message,
            errUnpkg?.message || "",
            errLocal?.message || "",
          );
          cldrJson = null;
        }
      }
    }

    // Parse sources
    const locMap = locText ? parseLOC(locText) : {};
    const ianaMap = ianaText ? parseIANARegistry(ianaText) : {};
    const silRows = silText ? parseSILTab(silText) : [];

    // Build final map with precedence for display name:
    // precedence 0: CLDR (preferred display)
    // precedence 1: SIL Ref_Name
    // precedence 2: LOC English name
    // precedence 3: IANA description / preferred-value fallback
    const final = {}; // key -> {v: name, p: precedence}

    // 0) Add CLDR names (these are display names keyed by subtags: 'en', 'zh', 'zh_Hant', etc.)
    if (
      cldrJson &&
      cldrJson.main &&
      cldrJson.main.en &&
      cldrJson.main.en.languages
    ) {
      const cldrLangs = cldrJson.main.en.languages;
      for (const [k, v] of Object.entries(cldrLangs)) {
        const key = k.toLowerCase().replace(/_/g, "-"); // cldr uses underscores sometimes
        addIfAbsent(final, key, v, 0);
      }
    }

    // 1) Add SIL rows (ISO-639-3). Add keys: id (3-letter), Part2B, Part2T, Part1
    for (const r of silRows) {
      const name = r.name || "";
      if (!name) continue;
      addIfAbsent(final, r.id, name, 1);
      if (r.p2b) addIfAbsent(final, r.p2b, name, 1);
      if (r.p2t) addIfAbsent(final, r.p2t, name, 1);
      if (r.p1) addIfAbsent(final, r.p1, name, 1);
    }

    // 2) Add LOC entries (ISO-639-2 B/T). They may duplicate above, but allow LOC as fallback
    for (const [k, v] of Object.entries(locMap)) {
      addIfAbsent(final, k, v, 2);
    }

    // 3) Add IANA registry entries as fallback; if value is a preferred-value token, resolve to name if we already have it.
    for (const [k, v] of Object.entries(ianaMap)) {
      const lowerV = (v || "").toLowerCase();
      if (lowerV && final[lowerV]) {
        // map deprecated => preferred's display name
        addIfAbsent(final, k, final[lowerV].v, 3);
      } else {
        // use IANA description text if no better name
        addIfAbsent(final, k, v, 3);
      }
    }

    // Flatten final map into simple key->name, sorting keys
    const entries = Object.entries(final)
      .map(([k, obj]) => [k, obj.v])
      .sort((a, b) => a[0].localeCompare(b[0]));

    // Ensure output directory exists
    fs.mkdirSync(outDir, { recursive: true });

    // Format keys: unquoted when safe identifiers (like your original style) else JSON-quoted
    const lines = entries
      .map(([k, v]) => {
        const keyOut = formatKeyForOutput(k);
        return `  ${keyOut}: ${JSON.stringify(v)},`;
      })
      .join("\n");

    const out = `export const ISO_639_2_TO_NAME: Record<string, string>= {\n${lines}\n};\n\nexport function getLanguageName(code: string): string {\n  return ISO_639_2_TO_NAME[code.toLowerCase()] ?? code;\n}\n`;

    fs.writeFileSync(outPath, out, "utf8");
    console.log("Wrote", outPath, "with", entries.length, "entries");
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();
