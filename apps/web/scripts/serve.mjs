import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = process.env.PORT || "3000";

const child = spawn("npx", ["serve", "dist", "-s", "-l", port], {
  stdio: "inherit",
  cwd: root,
});

child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 0));
