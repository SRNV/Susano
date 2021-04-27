import { existsSync } from "./deps/exists.ts";
import { join } from "./deps/path.ts";

const stressMap: string[] = [];

interface StressOptions {
  root: string;
}
function read(path: string): void {
  if (!existsSync(path)) return;
  if (Deno.build.os !== "windows") {
    Deno.chmodSync(path, 0o777);
  }
  const stats = Deno.statSync(path);
  if (stats.isFile) {
    console.warn(`Stress mode: ${path}`);
    stressMap.push(path);
  }
  if (stats.isDirectory) {
    if (Deno.build.os !== "windows") {
      Deno.chmodSync(path, 0o777);
    }
    const dir = Deno.readDirSync(path);
    for (const dirEntry of dir) {
      const { name } = dirEntry;
      const subpath = join(path, name);
      if (name.match(/((_|.)test.(js|ts))$/i)) {
        read(subpath);
      } else {
        if (Deno.build.os !== "windows") {
          Deno.chmodSync(subpath, 0o777);
        }
        const stats = Deno.statSync(subpath);
        if (stats.isDirectory) {
          read(subpath);
        }
      }
    }
  }
}
async function runTests() {
  console.warn("[Susano] Stress mode: running.");
  if (stressMap.length > 1) {
    Deno.run({
      cmd: ["deno", "test", "--failfast", "--unstable", "-A"],
    });
  } else {
    stressMap.forEach((path) => {
      Deno.run({
        cmd: ["deno", "test", "--failfast", "--unstable", "-A", path],
      });
    });
  }
}
export async function stressMode(opts: StressOptions) {
  const status = await Deno.permissions.query({ name: "read" });
  if (status.state !== "granted") {
    console.error("[Susano] need read permission");
    Deno.exit(0);
  }
  if (existsSync(opts.root)) {
    const stress = Deno.watchFs(Deno.cwd());
    console.warn(`[Susano] Stress mode enabled: using ${opts.root}`);
    read(opts.root);
    runTests();
    for await (const event of stress) {
      const { kind } = event;
      if (kind === "access") {
        console.log("[Susano] Stress mode: ", ...event.paths);
        runTests();
      }
    }
  } else {
    console.error(
      `[Susano] ${opts.root} is not a file or directory. please specify in options a existing file or directory.`,
    );
  }
}