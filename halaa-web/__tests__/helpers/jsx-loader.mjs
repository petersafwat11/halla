import { transform } from "sucrase";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const rootDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const mockImageURL = pathToFileURL(path.join(rootDir, "__tests__/helpers/mocks/image.js")).href;
const mockNavURL = pathToFileURL(path.join(rootDir, "__tests__/helpers/mocks/navigation.js")).href;
const mockLinkURL = pathToFileURL(path.join(rootDir, "__tests__/helpers/mocks/link.js")).href;
const mockToastifyURL = pathToFileURL(path.join(rootDir, "__tests__/helpers/mocks/toastify.js")).href;

export async function resolve(specifier, context, nextResolve) {
  // Handle framework mocks
  if (specifier === "next/image") {
    return {
      url: mockImageURL,
      shortCircuit: true,
    };
  }
  if (specifier === "next/navigation") {
    return {
      url: mockNavURL,
      shortCircuit: true,
    };
  }
  if (specifier === "next/link") {
    return {
      url: mockLinkURL,
      shortCircuit: true,
    };
  }
  if (specifier === "react-toastify") {
    return {
      url: mockToastifyURL,
      shortCircuit: true,
    };
  }

  // Handle @/ alias
  if (specifier.startsWith("@/")) {
    const relativePath = specifier.slice(2);
    const resolvedPath = path.join(rootDir, relativePath);
    // Check direct file or directory index
    const candidates = [
      resolvedPath,
      `${resolvedPath}.js`,
      `${resolvedPath}.jsx`,
      `${resolvedPath}.mjs`,
      `${resolvedPath}.json`,
      path.join(resolvedPath, "index.js"),
      path.join(resolvedPath, "index.jsx"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return {
          url: pathToFileURL(candidate).href,
          shortCircuit: true,
        };
      }
    }
  }

  // Handle relative imports missing extensions (e.g. ./AddHostPopup)
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    if (context.parentURL && context.parentURL.startsWith("file://")) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const targetPath = path.resolve(parentDir, specifier);
      const candidates = [
        targetPath,
        `${targetPath}.js`,
        `${targetPath}.jsx`,
        `${targetPath}.mjs`,
        `${targetPath}.json`,
        path.join(targetPath, "index.js"),
        path.join(targetPath, "index.jsx"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return {
            url: pathToFileURL(candidate).href,
            shortCircuit: true,
          };
        }
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  // Mock CSS / CSS modules
  if (url.endsWith(".css") || url.endsWith(".module.css") || url.endsWith(".scss")) {
    return {
      format: "module",
      shortCircuit: true,
      source: "export default new Proxy({}, { get: (_, prop) => typeof prop === 'string' ? prop : '' });",
    };
  }

  // Mock static asset files
  if (
    url.endsWith(".svg") ||
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".webp")
  ) {
    return {
      format: "module",
      shortCircuit: true,
      source: "export default 'mock-asset-url';",
    };
  }

  if (url.startsWith("file://") && (url.endsWith(".js") || url.endsWith(".jsx"))) {
    if (!url.includes("node_modules")) {
      const filePath = fileURLToPath(url);
      try {
        const code = fs.readFileSync(filePath, "utf8");
        const result = transform(code, {
          transforms: ["jsx"],
          jsxRuntime: "automatic",
          production: true,
        });
        return {
          format: "module",
          shortCircuit: true,
          source: result.code,
        };
      } catch (err) {
        return nextLoad(url, context);
      }
    }
  }

  return nextLoad(url, context);
}
