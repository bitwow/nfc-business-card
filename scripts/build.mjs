import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfig } from "../data/site.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src");
const output = path.join(root, "dist");
const requestedUrl = process.env.PUBLIC_URL || siteConfig.publicUrl || "http://localhost:4173/";
const publicUrl = requestedUrl.endsWith("/") ? requestedUrl : `${requestedUrl}/`;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function build() {
  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, "assets"), { recursive: true });

  const template = await readFile(path.join(source, "index.template.html"), "utf8");
  const replacements = {
    "{{TITLE}}": siteConfig.seo.title,
    "{{DESCRIPTION}}": siteConfig.seo.description,
    "{{NAME}}": siteConfig.person.displayName,
    "{{FIRST_NAME}}": siteConfig.person.firstName,
    "{{LAST_NAME}}": siteConfig.person.lastName,
    "{{THEME_DARK}}": siteConfig.seo.themeColorDark,
    "{{PUBLIC_URL}}": publicUrl,
    "{{OG_IMAGE_URL}}": new URL("assets/og-card.jpg", publicUrl).href
  };

  const html = Object.entries(replacements).reduce(
    (result, [token, value]) => result.replaceAll(token, escapeHtml(value)),
    template
  );

  await writeFile(path.join(output, "index.html"), html);
  await cp(path.join(source, "assets"), path.join(output, "assets"), { recursive: true });
  await cp(path.join(source, "site.webmanifest"), path.join(output, "site.webmanifest"));
  await cp(path.join(source, "robots.txt"), path.join(output, "robots.txt"));
  await writeFile(
    path.join(output, "assets", "config.js"),
    `export const siteConfig = ${JSON.stringify({ ...siteConfig, publicUrl }, null, 2)};\n`
  );
  await writeFile(path.join(output, ".nojekyll"), "");
  console.log(`Built ${output} for ${publicUrl}`);
}

await build();

if (process.argv.includes("--watch")) {
  let timer;
  const watcher = watch(root, { recursive: true }, (_event, filename) => {
    if (!filename || filename.startsWith("dist/") || filename.includes("node_modules")) return;
    clearTimeout(timer);
    timer = setTimeout(() => build().catch(console.error), 120);
  });
  process.on("SIGINT", () => watcher.close());
  console.log("Watching source files…");
}
