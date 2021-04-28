import { existsSync } from "./deps/exists.ts";
import { join } from "./deps/path.ts";

const testFiles: string[] = [];

interface StressOptions {
  root: string;
}
function read(path: string): void {
  try {
    if (!existsSync(path)) return;
    const stats = Deno.statSync(path);
    if (stats.isFile && !testFiles.includes(path)) {
      testFiles.push(path);
    }
    if (stats.isDirectory) {
      const dir = Deno.readDirSync(path);
      for (const dirEntry of dir) {
        const { name } = dirEntry;
        const subpath = join(path, name);
        if (name.match(/((_|\.)test\.(js|ts))$/i)) {
          read(subpath);
        } else {
          const stats = Deno.statSync(subpath);
          if (stats.isDirectory) {
            read(subpath);
          }
        }
      }
    }
  } catch(err) {
    console.error(err);
    throw new Error('[Susano] exit');
  }
}
async function runTests() {
  console.warn("[Susano]\trunning.");
  if (testFiles.length === 0) {
    console.warn('[Susano]\tno test found')
  }
  if (testFiles.length > 1) {
    Deno.run({
      cmd: ["deno", "test", "--unstable", "-A"],
    });
  } else {
    testFiles.forEach((path) => {
      Deno.run({
        cmd: ["deno", "test", "--failfast", "--unstable", "-A", path],
      });
    });
  }
}
export async function stressMode(opts: StressOptions) {
  const readPermission = await Deno.permissions.query({ name: "read" });
  const runPermission = await Deno.permissions.query({ name: "run" });
  if (readPermission.state !== "granted") {
    console.error("[Susano]\t read permission isn't granted");
    Deno.exit(0);
  }
  if (runPermission.state !== "granted") {
    console.error("[Susano]\t run permission isn't granted");
    Deno.exit(0);
  }
  if (existsSync(opts.root)) {
    const stress = Deno.watchFs(Deno.cwd());
    console.warn(`[Susano]\tStress mode enabled: using ${opts.root}`);
    read(opts.root);
    runTests();
    for await (const event of stress) {
      const { kind } = event;
      if (kind === "access") {
        read(opts.root);
        runTests();
      }
    }
  } else {
    console.error(
      `[Susano]\t${opts.root} is not a file or directory. please specify in options a existing file or directory.`,
    );
  }
}