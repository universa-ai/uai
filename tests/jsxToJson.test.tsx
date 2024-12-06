import { expect, test } from "bun:test";
import { jsxToJson } from "../src/uai-dev";

test.only("jsxToJson - basic conversion", () => {
  const jsx = "<a>x<b>zz</b>y</a>";
  const expectedJson = { a: "x<b>zz</b>y", b: "zz" };
  expect(jsxToJson(jsx)).toEqual(expectedJson);
});
