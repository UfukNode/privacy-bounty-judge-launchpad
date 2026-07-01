const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const DEFAULT_PORT = 5173;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function resolveRequestPath(rootDir, requestUrl) {
  const rawPath = String(requestUrl || "/").split("?")[0].split("#")[0] || "/";
  let pathname;

  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  const segments = pathname.split("/").filter(Boolean);

  if (segments.some((segment) => segment === ".." || segment.includes("\0"))) {
    return null;
  }

  const fileSegments = segments.length === 0 ? ["index.html"] : segments;
  const absolutePath = path.join(rootDir, ...fileSegments);

  if (absolutePath !== rootDir && !absolutePath.startsWith(`${rootDir}${path.sep}`)) {
    return null;
  }

  return absolutePath;
}

function createStaticServer({ rootDir = __dirname } = {}) {
  const resolvedRoot = path.resolve(rootDir);

  return http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method not allowed");
      return;
    }

    const filePath = resolveRequestPath(resolvedRoot, req.url || "/");
    if (!filePath) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(err.code === "ENOENT" ? 404 : 500, {
          "Content-Type": "text/plain; charset=utf-8"
        });
        res.end(err.code === "ENOENT" ? "Not found" : "Server error");
        return;
      }

      res.writeHead(200, {
        "Content-Type": getContentType(filePath),
        "Cache-Control": "no-store"
      });

      if (req.method === "HEAD") {
        res.end();
        return;
      }

      res.end(data);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const server = createStaticServer();

  server.listen(port, "0.0.0.0", () => {
    console.log(`Privacy Bounty Judge Study Guide running at http://localhost:${port}`);
  });
}

module.exports = {
  createStaticServer,
  getContentType,
  resolveRequestPath
};
