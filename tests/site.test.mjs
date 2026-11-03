import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { siteConfig } from "../data/site.js";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");

test("built page has no unresolved template tokens", async () => {
  const html = await readFile(path.join(dist, "index.html"), "utf8");
  assert.doesNotMatch(html, /\{\{[^}]+\}\}/);
  assert.match(html, /<main id="top">/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<meta property="og:image"/);
});

test("all local page assets exist", async () => {
  const html = await readFile(path.join(dist, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="(?!https?:|#|mailto:|tel:)([^"?]+)"/g)].map((match) => match[1]);
  await Promise.all(refs.map((ref) => access(path.join(dist, ref))));
});

test("configured contacts use safe URI schemes", () => {
  for (const contact of Object.values(siteConfig.contacts)) {
    if (!contact) continue;
    assert.match(contact.url, /^(https:\/\/|mailto:|tel:)/);
  }
});

test("optional contacts may be omitted", () => {
  assert.equal(siteConfig.contacts.github, null);
});

test("CV download is present and uses the edited PDF", async () => {
  const html = await readFile(path.join(dist, "index.html"), "utf8");
  assert.match(html, /id="download-cv"/);
  assert.match(html, /download="Dmitry-Vasilyev-CV-2026\.pdf"/);
  await access(path.join(dist, siteConfig.cv.url));
});
