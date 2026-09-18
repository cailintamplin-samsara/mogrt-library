/**
 * Shared MOGRT filename conventions.
 *
 * Going forward files are:  mogrt-name_V#.mogrt
 *   - hyphens in the name → spaces in the UI title
 *   - "--" in the name   → " - " in the UI title (e.g. Copy-Text--Simple_V7)
 *   - version is only shown in the subtitle (v#)
 */
function stripExt(fileName) {
  return String(fileName || "").replace(/\.mogrt$/i, "");
}

function slugify(fileName) {
  return stripExt(fileName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * @returns {{ base: string, namePart: string, version: string, displayName: string, id: string }}
 */
function parseMogrtFilename(fileName) {
  const base = stripExt(fileName).trim();
  let namePart = base;
  let version = "1.0";

  // Preferred: Name_V12 or Name_v12
  const preferred = base.match(/^(.*)_V(\d+(?:\.\d+)*)$/i);
  if (preferred && preferred[1]) {
    namePart = preferred[1];
    version = preferred[2];
  } else {
    // Legacy fallbacks: "… V10", "… Version 8", "…-V4", trailing V#
    const versionWord = base.match(/^(.*?)[\s_-]*version\s*(\d+(?:\.\d+)*)$/i);
    const spacedV = base.match(/^(.*?)[\s_-]+V(\d+(?:\.\d+)*)$/i);
    const trailingV = base.match(/^(.*?)V(\d+(?:\.\d+)*)$/i);
    const hit = versionWord || spacedV || trailingV;
    if (hit && hit[1]) {
      namePart = hit[1].replace(/[\s_-]+$/g, "");
      version = hit[2];
    }
  }

  const displayName = namePart
    .replace(/--/g, "\u0000")
    .replace(/[_-]+/g, " ")
    .replace(/\u0000/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    base: base,
    namePart: namePart,
    version: String(version),
    displayName: displayName || base,
    id: slugify(base),
  };
}

function displayName(fileName) {
  return parseMogrtFilename(fileName).displayName;
}

function extractVersion(fileName) {
  return parseMogrtFilename(fileName).version;
}

module.exports = {
  slugify: slugify,
  displayName: displayName,
  extractVersion: extractVersion,
  extractVersionHint: extractVersion,
  parseMogrtFilename: parseMogrtFilename,
};
