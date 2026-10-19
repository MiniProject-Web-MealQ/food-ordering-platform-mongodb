const test = require("node:test");
const assert = require("node:assert/strict");
const { imageUrl } = require("../src/services/media");

test("new catalogue images use the published version while legacy and uploaded images retain their routes", () => {
  assert.equal(imageUrl({ logo: "/catalogue/20261019-v2/khao-hom/logo.webp" }, "logo", "store"), "/catalogue/20261019-v2/khao-hom/logo.webp?v=20261019-v2-r2");
  assert.equal(imageUrl({ image: "https://example.com/photo.webp" }, "image", "menu"), "https://example.com/photo.webp");
  assert.match(imageUrl({ _id: "123", image: "data:image/png;base64,aGVsbG8=" }, "image", "menu"), /^\/api\/v1\/media\/menu\/123\/image\?v=[a-f0-9]{16}$/);
  assert.equal(imageUrl({ image: null }, "image", "menu"), null);
});
