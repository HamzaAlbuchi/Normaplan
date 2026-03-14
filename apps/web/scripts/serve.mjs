/**
 * Production server: serve built files from dist/ on 0.0.0.0:PORT.
 * Do not use Vite dev server in production.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "..", "dist");
const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  let p = req.url?.split("?")[0] || "/";
  if (p === "/") p = "/index.html";
  const filePath = path.join(dist, p);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT" && !path.extname(p)) {
        fs.readFile(path.join(dist, "index.html"), (e2, indexData) => {
          if (e2) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(indexData);
        });
        return;
      }
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(p);
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`BauPilot web serving at http://${host}:${port} (production build from dist/)`);
});

server.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
