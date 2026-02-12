#!/usr/bin/env node

/**
 * Lists every open Arc tab (across all windows/spaces) with its URL.
 *
 * Uses Apple's JavaScript for Automation (JXA) bridge to query Arc
 * via `osascript -l JavaScript`. Requires:
 *   - macOS
 *   - Arc browser installed and running
 *   - Terminal (or the invoking shell) allowed under
 *     System Settings > Privacy & Security > Automation > Arc
 */

import { spawnSync } from "node:child_process";
import process from "node:process";

if (process.platform !== "darwin") {
  console.error(
    "This script only works on macOS because it talks to Arc via AppleScript.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const options = {
  json: false,
  urlsOnly: false,
};

for (const arg of args) {
  if (arg === "--json") {
    options.json = true;
  } else if (arg === "--urls-only") {
    options.urlsOnly = true;
  } else if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  } else {
    console.error(`Unknown option: ${arg}`);
    printHelp();
    process.exit(1);
  }
}

if (options.json && options.urlsOnly) {
  console.error("Choose either --json or --urls-only, not both.");
  process.exit(1);
}

const jxaSource = String.raw`function run() {
  const arc = Application("Arc");
  if (!arc.running()) {
    throw new Error("Arc is not running");
  }

  const result = [];
  const windows = arc.windows;
  const windowCount = windows.length;

  for (let wi = 0; wi < windowCount; wi++) {
    const win = windows[wi];
    const windowName = win.name();
    const spaces = win.spaces;
    const spaceCount = spaces.length;

    for (let si = 0; si < spaceCount; si++) {
      const space = spaces[si];
      const spaceTitle = space.title();
      const tabs = space.tabs;
      const tabCount = tabs.length;

      for (let ti = 0; ti < tabCount; ti++) {
        const tab = tabs[ti];
        const url = tab.url();
        if (!url) {
          continue;
        }

        result.push({
          windowIndex: wi + 1,
          windowName: windowName || "",
          spaceIndex: si + 1,
          spaceTitle: spaceTitle || "",
          tabIndex: ti + 1,
          tabTitle: tab.title() || "",
          location: tab.location() || "",
          url: url,
        });
      }
    }
  }

  return JSON.stringify(result);
}`;

const { stdout, stderr, status, error } = spawnSync(
  "osascript",
  ["-l", "JavaScript", "-e", jxaSource],
  { encoding: "utf8" },
);

if (status !== 0) {
  const message =
    stderr?.trim() || error?.message || "Unknown error running osascript.";
  console.error(`Failed to query Arc via osascript: ${message}`);
  process.exit(status || 1);
}

let tabs;
try {
  tabs = JSON.parse(stdout.trim() || "[]");
} catch (parseError) {
  console.error("Could not parse osascript output as JSON.");
  console.error(stdout);
  process.exit(1);
}

if (options.json) {
  console.log(JSON.stringify(tabs, null, 2));
  process.exit(0);
}

if (options.urlsOnly) {
  tabs.forEach((tab) => console.log(tab.url));
  process.exit(0);
}

if (tabs.length === 0) {
  console.log("No Arc tabs are currently open.");
  process.exit(0);
}

const pad = (num) => num.toString().padStart(2, "0");

tabs.forEach((tab, index) => {
  const header = `${pad(index + 1)}. ${tab.url}`;
  const metaParts = [
    `Window ${tab.windowIndex}${tab.windowName ? ` ("${tab.windowName}")` : ""}`,
    `Space ${tab.spaceIndex}${tab.spaceTitle ? ` ("${tab.spaceTitle}")` : ""}`,
    `Tab ${tab.tabIndex}${tab.tabTitle ? ` ("${tab.tabTitle}")` : ""}`,
  ];

  if (tab.location) {
    metaParts.push(`Location: ${tab.location}`);
  }

  console.log(header);
  console.log(`    ${metaParts.join(" . ")}`);
});

function printHelp() {
  console.log(`Usage: node arc_tabs.js [--json | --urls-only]

Options:
  --json        Output structured JSON (full metadata for each tab)
  --urls-only   Print only the tab URLs, one per line
  -h, --help    Show this message
`);
}
