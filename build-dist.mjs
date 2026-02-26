/**
 * Distribution build script
 * Produces an obfuscated, production-ready tarball.
 *
 * Usage: node build-dist.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from "fs";
import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STAGE = join(__dirname, "_dist_stage");
const OUT = join(STAGE, "claude-wps-plugin");
const TARBALL_OUT = join(__dirname, "..", "wps-ai-landing", "public", "claude-wps-plugin.tar.gz");

function log(msg) {
  console.log(`  [build] ${msg}`);
}

// ── Step 0: Clean ────────────────────────────────────────────
if (existsSync(STAGE)) rmSync(STAGE, { recursive: true });
mkdirSync(OUT, { recursive: true });

// ── Step 1: Bundle skills + commands into a single encoded blob ──
log("Encoding skills and commands...");

function readAllMd(dir) {
  const result = {};
  if (!existsSync(dir)) return result;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const mdFile = join(dir, entry.name, "SKILL.md");
      if (existsSync(mdFile)) {
        result[entry.name] = Buffer.from(readFileSync(mdFile, "utf-8")).toString("base64");
      }
    } else if (entry.name.endsWith(".md")) {
      result[entry.name.replace(/\.md$/, "")] = Buffer.from(readFileSync(join(dir, entry.name), "utf-8")).toString("base64");
    }
  }
  return result;
}

const bundledData = {
  skills: readAllMd(join(__dirname, "skills", "bundled")),
  commands: readAllMd(join(__dirname, "commands")),
};

const dataLiteral = JSON.stringify(JSON.stringify(bundledData));

// ── Step 2: Patch proxy-server.js to use embedded data ──────
log("Patching proxy-server.js with embedded data...");

let serverSrc = readFileSync(join(__dirname, "proxy-server.js"), "utf-8");

const embeddedLoaderCode = `
const __BD = JSON.parse(${dataLiteral});
function loadSkills() {
  const s = new Map();
  for (const [k, v] of Object.entries(__BD.skills)) {
    const raw = Buffer.from(v, "base64").toString("utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    s.set(k, { ...frontmatter, body, name: frontmatter.name || k });
  }
  return s;
}
function loadCommands() {
  const c = [];
  for (const [id, v] of Object.entries(__BD.commands)) {
    const raw = Buffer.from(v, "base64").toString("utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    c.push({ id, icon: frontmatter.icon || "📌", label: frontmatter.label || id, description: frontmatter.description || "", scope: frontmatter.scope || "general", prompt: body.trim() });
  }
  return c;
}
`;

serverSrc = serverSrc.replace(
  /function loadSkills\(\)[\s\S]*?^}/m,
  "/* replaced by embedded loader */"
);
serverSrc = serverSrc.replace(
  /function loadCommands\(\)[\s\S]*?^}/m,
  "/* replaced by embedded loader */"
);

const insertPoint = "const SESSION_ID_RE";
serverSrc = serverSrc.replace(
  insertPoint,
  embeddedLoaderCode + "\n" + insertPoint
);

serverSrc = serverSrc.replace(
  /import\s*{\s*readFileSync[\s\S]*?}\s*from\s*["']fs["'];?/,
  (m) => m
);

writeFileSync(join(OUT, "proxy-server.js"), serverSrc, "utf-8");

// ── Step 3: Copy necessary files ────────────────────────────
log("Copying distribution files...");

cpSync(join(__dirname, "dist"), join(OUT, "dist"), { recursive: true });
cpSync(join(__dirname, "wps-addon"), join(OUT, "wps-addon"), { recursive: true });
cpSync(join(__dirname, "package.json"), join(OUT, "package.json"));
cpSync(join(__dirname, ".env.example"), join(OUT, ".env.example"));

mkdirSync(join(OUT, "skills", "bundled"), { recursive: true });
mkdirSync(join(OUT, "skills", "managed"), { recursive: true });
mkdirSync(join(OUT, "skills", "workspace"), { recursive: true });
mkdirSync(join(OUT, "commands"), { recursive: true });

// ── Step 4: Minify JS files with terser ─────────────────────
log("Minifying proxy-server.js...");
execSync(
  `npx terser "${join(OUT, "proxy-server.js")}" ` +
  `--module --compress passes=2,drop_console=false --mangle toplevel ` +
  `--output "${join(OUT, "proxy-server.js")}"`,
  { stdio: "inherit" }
);

log("Minifying wps-addon/main.js (preserve top-level names for WPS ribbon)...");
execSync(
  `npx terser "${join(OUT, "wps-addon", "main.js")}" ` +
  `--compress passes=2 --mangle ` +
  `--output "${join(OUT, "wps-addon", "main.js")}"`,
  { stdio: "inherit" }
);

if (existsSync(join(OUT, "dist", "main.js"))) {
  log("Minifying dist/main.js (preserve top-level names for WPS ribbon)...");
  execSync(
    `npx terser "${join(OUT, "dist", "main.js")}" ` +
    `--compress passes=2 --mangle ` +
    `--output "${join(OUT, "dist", "main.js")}"`,
    { stdio: "inherit" }
  );
}

// ── Step 5: Create tarball ──────────────────────────────────
log("Creating tarball...");
execSync(
  `cd "${STAGE}" && tar -czf "${TARBALL_OUT}" claude-wps-plugin/`,
  { stdio: "inherit" }
);

const size = (readFileSync(TARBALL_OUT).length / 1024).toFixed(0);
log(`Tarball created: ${TARBALL_OUT} (${size} KB)`);

// ── Step 6: Compute SHA256 ──────────────────────────────────
const sha = execSync(`shasum -a 256 "${TARBALL_OUT}"`)
  .toString()
  .split(" ")[0]
  .trim();
log(`SHA256: ${sha}`);

// ── Cleanup ─────────────────────────────────────────────────
rmSync(STAGE, { recursive: true });
log("Done. Update install script SHA256 to: " + sha);
