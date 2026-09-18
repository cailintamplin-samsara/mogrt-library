#!/usr/bin/env node
/**
 * Build library/manifest.json for the public GitHub MOGRT library.
 * Used locally and by .github/workflows/build-manifest.yml
 *
 * Usage:
 *   node scripts/build-manifest.js [--owner ORG] [--repo NAME] [--branch main]
 * Env:
 *   GITHUB_REPOSITORY=owner/repo
 *   GITHUB_REF_NAME=main
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const {
  slugify,
  displayName,
  extractVersionHint,
} = require("./mogrt-naming");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const THUMBS_DIR = path.join(ROOT, "thumbnails");
const OUT_FILE = path.join(ROOT, "manifest.json");
const VERSIONS_FILE = path.join(ROOT, ".versions.json");

function parseArgs(argv) {
  const out = { owner: "", repo: "", branch: "main" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--owner") out.owner = argv[++i];
    else if (argv[i] === "--repo") out.repo = argv[++i];
    else if (argv[i] === "--branch") out.branch = argv[++i];
  }
  if (process.env.GITHUB_REPOSITORY) {
    const parts = process.env.GITHUB_REPOSITORY.split("/");
    if (!out.owner) out.owner = parts[0];
    if (!out.repo) out.repo = parts[1];
  }
  if (process.env.GITHUB_REF_NAME) {
    out.branch = process.env.GITHUB_REF_NAME;
  }
  return out;
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function readMogrtFrameSize(mogrtPath) {
  try {
    const raw = execFileSync("unzip", ["-p", mogrtPath, "definition.json"], {
      maxBuffer: 20 * 1024 * 1024,
    });
    const def = JSON.parse(String(raw));
    const locales = def.sourceInfoLocalized || {};
    const info = locales.en_US || Object.values(locales)[0] || {};
    const size = info.framesize && info.framesize.size;
    if (size && size.x && size.y) {
      return { width: Number(size.x), height: Number(size.y) };
    }
  } catch (_) {
    /* ignore */
  }
  return { width: 3840, height: 2160 };
}

function loadVersions() {
  try {
    return JSON.parse(fs.readFileSync(VERSIONS_FILE, "utf8"));
  } catch (_) {
    return {};
  }
}

function bumpVersion(prev, hint) {
  if (!prev) return String(hint || "1.0");
  // If filename hint is "newer" major-ish, prefer hint when hash changed
  const prevNum = parseFloat(prev);
  const hintNum = parseFloat(hint);
  if (!Number.isNaN(hintNum) && !Number.isNaN(prevNum) && hintNum > prevNum) {
    return String(hint);
  }
  if (/^\d+$/.test(String(prev))) {
    return String(Number(prev) + 1);
  }
  const parts = String(prev).split(".");
  const last = Number(parts[parts.length - 1]);
  if (!Number.isNaN(last)) {
    parts[parts.length - 1] = String(last + 1);
    return parts.join(".");
  }
  return String(prev) + ".1";
}

function rawUrl(owner, repo, branch, relPath) {
  const encoded = relPath
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encoded}`;
}

function main() {
  const { owner, repo, branch } = parseArgs(process.argv);
  if (!owner || !repo) {
    console.error(
      "Missing owner/repo. Pass --owner and --repo, or set GITHUB_REPOSITORY."
    );
    process.exit(1);
  }

  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error("Missing templates/");
    process.exit(1);
  }

  const versions = loadVersions();
  const files = fs
    .readdirSync(TEMPLATES_DIR)
    .filter((f) => f.toLowerCase().endsWith(".mogrt"))
    .sort((a, b) => a.localeCompare(b));

  const templates = files.map((fileName) => {
    const abs = path.join(TEMPLATES_DIR, fileName);
    const id = slugify(fileName);
    const sha = sha256File(abs);
    const hint = extractVersionHint(fileName);
    const prev = versions[id];
    let version = hint;
    if (prev && prev.sha256 === sha) {
      version = prev.version || hint;
    } else if (prev && prev.sha256 !== sha) {
      version = bumpVersion(prev.version || hint, hint);
    }

    versions[id] = { version, sha256: sha, file: fileName };

    const thumbName = `${id}.png`;
    const thumbPath = path.join(THUMBS_DIR, thumbName);
    const hasThumb = fs.existsSync(thumbPath);
    const frame = readMogrtFrameSize(abs);
    const fileRel = `templates/${fileName}`;

    const framesDir = path.join(ROOT, "previews", id, "frames");
    let frames = [];
    if (fs.existsSync(framesDir)) {
      frames = fs
        .readdirSync(framesDir)
        .filter((f) => f.endsWith(".png"))
        .sort()
        .map((f) => rawUrl(owner, repo, branch, `previews/${id}/frames/${f}`));
    }

    return {
      id,
      name: displayName(fileName),
      version: String(version),
      mogrtId: `${id}-v${version}`,
      file: fileRel,
      downloadUrl: rawUrl(owner, repo, branch, fileRel),
      thumbnailUrl: hasThumb
        ? rawUrl(owner, repo, branch, `thumbnails/${thumbName}`)
        : "",
      width: frame.width,
      height: frame.height,
      frameCount: frames.length,
      frames,
      sha256: sha,
    };
  });

  const manifest = {
    generated: new Date().toISOString(),
    source: "github",
    repository: `${owner}/${repo}`,
    branch,
    templates,
  };

  fs.writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2) + "\n");
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `Wrote ${templates.length} templates → manifest.json (${owner}/${repo}@${branch})`
  );
}

main();
