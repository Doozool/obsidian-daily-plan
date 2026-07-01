import esbuild from "esbuild";
import process from "process";
import { copyFileSync, mkdirSync, existsSync } from "fs";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "ES2022",
  platform: "browser",
  outfile: "main.js",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  logLevel: "info",
});

async function build() {
  await context.rebuild();
  // Copy distribution files to dist/
  if (!existsSync("dist")) mkdirSync("dist");
  copyFileSync("main.js", "dist/main.js");
  copyFileSync("manifest.json", "dist/manifest.json");
  copyFileSync("styles.css", "dist/styles.css");
}

if (prod) {
  await build();
  process.exit(0);
} else {
  await context.watch();
}
