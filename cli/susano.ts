import { stressMode, lintMode } from '../mod.ts';

if (import.meta.main) {
  const [cmd, option] = Deno.args;
  switch (cmd) {
    case 'stress':
      if (option) {
        stressMode({
          root: option,
        });
      } else {
        console.error(
          "Stress Mode: no root specified. usage: ... stress <path-to-tests>",
        );
      }
      break;
    case 'lint':
      lintMode();
      break;
  }
}