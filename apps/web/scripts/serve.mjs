/**
 * Production server: serve built files from dist/ on 0.0.0.0:PORT.
 * Do not use Vite dev server in production.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve dist: same dir as this script (apps/web) or cwd (if Railway runs from apps/web)
const distCandidates = [
  path.resolve(__dirname, "..", "dist"),
  path.resolve(process.cwd(), "dist"),
];
const dist = distCandidates.find((d) => {
  try {
    return fs.existsSync(path.join(d, "index.html"));
  } catch {
    return false;
  }
});

if (!dist) {
  console.error("ERROR: dist/ with index.html not found. Tried:", distCandidates);
  console.error("cwd:", process.cwd());
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

console.log("Serving from:", dist);
console.log("PORT:", port, "HOST:", host);

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
  try {
    // Health check for Railway / load balancers
    const rawPath = req.url?.split("?")[0] || "/";
    if (rawPath === "/health" || rawPath === "/health/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "baupilot-web" }));
      return;
    }

    let p = rawPath === "/" ? "/index.html" : rawPath;
    // Prevent path traversal
    if (p.includes("..")) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }
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
  } catch (err) {
    console.error("Request error:", err);
    res.writeHead(500);
    res.end("Internal error");
  }
});

server.listen(port, host, () => {
  console.log(`BauPilot web: http://${host}:${port}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
