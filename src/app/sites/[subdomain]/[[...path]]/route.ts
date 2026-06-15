import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string; path?: string[] } }
) {
  const { subdomain } = params;
  const pathSegments = params.path || [];

  // Reconstruct file path from path segments
  let relativeFilePath = pathSegments.join("/");

  // Directory routing logic: if the route has no file extension or is empty,
  // we look for the index.html file inside that directory structure.
  if (relativeFilePath === "" || !relativeFilePath.includes(".")) {
    relativeFilePath = path.join(relativeFilePath, "index.html");
  }

  // Define target absolute path inside Next.js public directory
  const absoluteFilePath = path.join(
    process.cwd(),
    "public",
    "public-sites",
    subdomain,
    relativeFilePath
  );

  // Fallback check if the compiled file is missing
  if (!fs.existsSync(absoluteFilePath)) {
    return new NextResponse("Static website file not found.", { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(absoluteFilePath);
    
    // Resolve correct MIME header for static assets
    const ext = path.extname(absoluteFilePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".xml": "application/xml",
      ".txt": "text/plain; charset=utf-8",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".otf": "font/otf",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  } catch (error) {
    console.error(`Error serving compiled site file at ${absoluteFilePath}:`, error);
    return new NextResponse("Failed to read static file.", { status: 500 });
  }
}
