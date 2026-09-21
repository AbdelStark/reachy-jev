import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { JevPanel } from "../dist/react.js";

test("optional React wrapper renders during SSR without touching browser globals", () => {
  const html = renderToString(createElement(JevPanel, { frame: { gauges: [] }, className: "my-panel" }));
  assert.match(html, /<jev-panel/);
  assert.match(html, /class="my-panel"/);
});
