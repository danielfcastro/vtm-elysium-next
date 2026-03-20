#!/usr/bin/env node
/**
 * scripts/update-readme-version.cjs
 *
 * Reads the version from package.json and updates the version badge
 * in README.md. Automatically called via the npm `version` lifecycle
 * hook (see "version" script in package.json) so the badge always
 * matches the package version after `npm version patch|minor|major`.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const readmePath = path.join(root, "README.md");

const { version } = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

let readme = fs.readFileSync(readmePath, "utf8");

// Replace shields.io version badge regardless of the current version value.
// Matches: ![Version](https://img.shields.io/badge/version-X.Y.Z-<colour>)
const badgeRe =
  /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-[^-]+-[^)]+\)/g;

const newBadge = `![Version](https://img.shields.io/badge/version-${version}-crimson)`;

const updated = readme.replace(badgeRe, newBadge);

if (updated === readme) {
  console.log(
    `[update-readme-version] Badge already up to date (v${version}).`,
  );
} else {
  fs.writeFileSync(readmePath, updated, "utf8");
  console.log(`[update-readme-version] Badge updated to v${version}.`);
}
