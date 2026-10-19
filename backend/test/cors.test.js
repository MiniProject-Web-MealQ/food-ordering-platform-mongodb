const assert = require("node:assert/strict");
const test = require("node:test");
const { createCorsOptions } = require("../src/config/cors");

function permits(options, origin) {
  let permitted = false;
  options.origin(origin, (error, allowed) => { permitted = !error && allowed === true; });
  return permitted;
}

test("development accepts Vite on another local port with cookie credentials", () => {
  const options = createCorsOptions("http://localhost:5173", "development");
  assert.equal(options.credentials, true);
  for (const origin of ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5174", "http://[::1]:5174"]) {
    assert.equal(permits(options, origin), true, origin);
  }
});

test("development rejects unrelated and invalid origins", () => {
  const options = createCorsOptions("http://localhost:5173", "development");
  for (const origin of ["https://example.com", "http://localhost.example.com:5174", "http://localhost:5174/path", "null", "invalid"]) {
    assert.equal(permits(options, origin), false, origin);
  }
});

test("production accepts only the configured origins", () => {
  const options = createCorsOptions("https://mealq.example, https://merchant.mealq.example", "production");
  assert.equal(permits(options, "https://mealq.example"), true);
  assert.equal(permits(options, "https://merchant.mealq.example"), true);
  for (const origin of ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174", "https://example.com"]) {
    assert.equal(permits(options, origin), false, origin);
  }
});

test("requests without an Origin header remain supported", () => {
  assert.equal(permits(createCorsOptions("http://localhost:5173", "production"), undefined), true);
});
