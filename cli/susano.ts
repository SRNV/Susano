import { stressMode } from '../mod.ts';

if (import.meta.main) {
  const [cmd, option] = Deno.args;
  if (cmd === "stress") {
    if (option) {
      stressMode({
        root: option,
      });
    } else {
      console.error(
        "Stress Mode: no root specified. usage: ... stress <path-to-tests>",
      );
    }
  }
}