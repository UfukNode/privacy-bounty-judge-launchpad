const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const DEFAULT_PORT = 5173;
const MAX_BODY_BYTES = 3 * 1024 * 1024;

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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function compileSolidity({ aiJudgeSource, precompileConsumerSource, contractName = "AIJudge" }) {
  let solc;
  try {
    solc = require("solc");
  } catch {
    throw new Error("Solidity compiler is not installed. Run npm install, then npm start again.");
  }

  if (!String(aiJudgeSource || "").trim()) {
    throw new Error("Paste AIJudge.sol source before compiling");
  }

  if (!new RegExp(`contract\\s+${contractName}\\b`).test(String(aiJudgeSource))) {
    throw new Error(`${contractName}.sol source must contain 'contract ${contractName}'. Do not paste PrecompileConsumer.sol into the AIJudge box.`);
  }

  const sources = {
    "contracts/AIJudge.sol": { content: String(aiJudgeSource) },
    "contracts/utils/PrecompileConsumer.sol": {
      content: String(precompileConsumerSource || "")
    }
  };

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors || [];
  const fatalErrors = errors.filter((item) => item.severity === "error");

  if (fatalErrors.length > 0) {
    return {
      ok: false,
      errors: fatalErrors.map((item) => item.formattedMessage || item.message)
    };
  }

  const contracts = output.contracts || {};
  let selected;
  let selectedPath;
  let selectedName;

  for (const [sourcePath, sourceContracts] of Object.entries(contracts)) {
    for (const [name, artifact] of Object.entries(sourceContracts)) {
      const object = artifact.evm?.bytecode?.object || "";
      if (name === contractName && object) {
        selected = artifact;
        selectedPath = sourcePath;
        selectedName = name;
      }
    }
  }

  if (!selected) {
    for (const [sourcePath, sourceContracts] of Object.entries(contracts)) {
      for (const [name, artifact] of Object.entries(sourceContracts)) {
        const object = artifact.evm?.bytecode?.object || "";
        if (object) {
          selected = artifact;
          selectedPath = sourcePath;
          selectedName = name;
          break;
        }
      }
      if (selected) break;
    }
  }

  if (!selected) {
    throw new Error("No deployable contract bytecode found. Check your contract name and source.");
  }

  const bytecodeObject = selected.evm.bytecode.object;
  const deployedBytecodeObject = selected.evm.deployedBytecode?.object || "";
  const artifact = {
    contractName: selectedName,
    sourceName: selectedPath,
    abi: selected.abi,
    bytecode: `0x${bytecodeObject}`,
    deployedBytecode: `0x${deployedBytecodeObject}`
  };

  return {
    ok: true,
    contractName: selectedName,
    sourceName: selectedPath,
    bytecode: artifact.bytecode,
    artifact,
    warnings: errors
      .filter((item) => item.severity !== "error")
      .map((item) => item.formattedMessage || item.message)
  };
}

function createStaticServer({ rootDir = __dirname } = {}) {
  const resolvedRoot = path.resolve(rootDir);

  return http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url?.startsWith("/api/compile")) {
      try {
        const body = await readJsonBody(req);
        const result = compileSolidity(body);
        sendJson(res, result.ok ? 200 : 400, result);
      } catch (err) {
        sendJson(res, 400, { ok: false, errors: [err.message] });
      }
      return;
    }

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
    console.log(`Ritual Bounty Operator running at http://localhost:${port}`);
  });
}

module.exports = {
  compileSolidity,
  createStaticServer,
  getContentType,
  resolveRequestPath
};
