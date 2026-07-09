const http = require("http");
const fs = require("fs");
const path = require("path");

const port = 3000;
const host = "0.0.0.0";
const root = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg"
};

function sendFile(request, response, filePath, stats) {
  const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
  const headers = {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Accept-Ranges": "bytes"
  };
  const range = request.headers.range;

  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);

    if (!match) {
      response.writeHead(416, {
        ...headers,
        "Content-Range": `bytes */${stats.size}`
      });
      response.end();
      return;
    }

    const requestedStart = match[1] === "" ? null : Number(match[1]);
    const requestedEnd = match[2] === "" ? null : Number(match[2]);
    const start = requestedStart === null
      ? Math.max(stats.size - (requestedEnd || 0), 0)
      : requestedStart;
    const end = requestedEnd === null ? stats.size - 1 : Math.min(requestedEnd, stats.size - 1);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= stats.size) {
      response.writeHead(416, {
        ...headers,
        "Content-Range": `bytes */${stats.size}`
      });
      response.end();
      return;
    }

    response.writeHead(206, {
      ...headers,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${stats.size}`
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    fs.createReadStream(filePath, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, {
    ...headers,
    "Content-Length": stats.size
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const safePath = path.normalize(decodeURIComponent(requestUrl.pathname)).replace(/^(\.\.[/\\])+/, "");
  const routePath =
    safePath === "/"
      ? "index.html"
      : safePath === "/contact" || safePath === "/contact/"
        ? "contact.html"
        : safePath === "/unibank" || safePath === "/unibank/"
          ? "unibank.html"
          : safePath === "/bmmb" || safePath === "/bmmb/"
            ? "bmmb.html"
            : safePath === "/orkestra" || safePath === "/orkestra/"
              ? "orkestra.html"
              : safePath === "/aerosure" || safePath === "/aerosure/"
                ? "aerosure.html"
                : safePath === "/straudo" || safePath === "/straudo/"
                  ? "straudo.html"
                  : safePath === "/pedalchi" || safePath === "/pedalchi/"
                    ? "pedalchi.html"
                    : safePath === "/manaw" || safePath === "/manaw/"
                      ? "manaw.html"
                      : safePath === "/talktocanada" || safePath === "/talktocanada/"
                        ? "talktocanada.html"
                      : safePath;
  const filePath = path.join(root, routePath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    const isFile = !statError && stats.isFile();
    const fallbackPath = path.join(root, "index.html");
    const hasExtension = Boolean(path.extname(routePath));
    const finalPath = isFile ? filePath : !hasExtension ? fallbackPath : null;

    if (!finalPath) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    fs.stat(finalPath, (finalStatError, finalStats) => {
      if (finalStatError || !finalStats.isFile()) {
        response.writeHead(finalStatError?.code === "ENOENT" ? 404 : 500);
        response.end(finalStatError?.code === "ENOENT" ? "Not found" : "Server error");
        return;
      }

      sendFile(request, response, finalPath, finalStats);
    });
  });
});

server.listen(port, host, () => {
  console.log(`Portfolio site running at http://localhost:${port}`);
});
