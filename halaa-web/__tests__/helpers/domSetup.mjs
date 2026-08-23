/**
 * JSDOM Environment Setup Helper for halaa-web runtime tests
 */

import { JSDOM } from "jsdom";

export function setupDom(url = "http://localhost:3000/ar/admin-dash") {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"root\"></div></body></html>", {
    url,
    pretendToBeVisual: true,
  });

  const { window } = dom;

  globalThis.window = window;
  globalThis.document = window.document;
  try {
    Object.defineProperty(globalThis, "navigator", {
      value: window.navigator,
      configurable: true,
      writable: true,
    });
  } catch {
    // fallback if already defined
  }

  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLInputElement = window.HTMLInputElement;
  globalThis.HTMLButtonElement = window.HTMLButtonElement;
  globalThis.Element = window.Element;
  globalThis.Node = window.Node;
  globalThis.Event = window.Event;
  globalThis.MouseEvent = window.MouseEvent;
  globalThis.KeyboardEvent = window.KeyboardEvent;
  globalThis.CustomEvent = window.CustomEvent;

  globalThis.requestAnimationFrame = window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame || ((id) => clearTimeout(id));

  // Mock getBoundingClientRect
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      width: 120,
      height: 40,
      top: 100,
      left: 100,
      bottom: 140,
      right: 220,
      x: 100,
      y: 100,
      toJSON: () => {},
    };
  };

  return dom;
}
