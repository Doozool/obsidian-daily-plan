import esbuild from "esbuild";
import process from "process";

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

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
