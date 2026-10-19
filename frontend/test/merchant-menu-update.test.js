import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { menuToApi, menuUpdateToApi } from "../src/features/merchant/adapters.js";

const require = createRequire(import.meta.url);
const { menuChanges } = require("../../backend/src/services/menu-validation.js");
const ingredientId = "0123456789abcdef01234567";
const catalogueImage = "/catalogue/menu/thai-basil-chicken.webp";

test("recipe edits keep an unchanged catalogue image without resubmitting a rejected image value", () => {
  const ingredient = Object.freeze({ ingredient_id: ingredientId, quantity: 2, unit: "piece" });
  const fields = Object.freeze({ name: "Basil chicken", image: catalogueImage, ingredients: Object.freeze([ingredient]) });
  const current = Object.freeze({ _id: "menu-1", image: catalogueImage });
  assert.throws(() => menuChanges(menuToApi(fields)), { code: "VALIDATION_ERROR" });

  const body = menuUpdateToApi(fields, current);
  assert.equal(Object.hasOwn(body, "image"), false);
  assert.deepEqual(menuChanges(body), { name: "Basil chicken", ingredients: [{ ingredient_id: ingredientId, quantity: 2, unit: "piece" }] });
  assert.equal(fields.image, catalogueImage);
  assert.equal(current.image, catalogueImage);
  assert.strictEqual(fields.ingredients[0], ingredient);
  assert.notStrictEqual(body.ingredients[0], ingredient);
});

test("unchanged uploaded media images also stay on the server during a partial edit", () => {
  const image = "/api/v1/media/menu/0123456789abcdef01234567/image?v=0123456789abcdef";
  const body = menuUpdateToApi({ image, is_available: false }, { image });
  assert.deepEqual(body, { isAvailable: false });
  assert.deepEqual(menuChanges(body), { is_available: false });
});

test("changed images and explicit removal still reach the backend image validator", () => {
  for (const image of ["data:image/png;base64,aGVsbG8=", "https://example.com/meal.webp", null, ""]) {
    const body = menuUpdateToApi({ image }, { image: catalogueImage });
    assert.equal(Object.hasOwn(body, "image"), true);
    assert.strictEqual(body.image, image);
    assert.strictEqual(menuChanges(body).image, image === "" ? null : image);
  }
});

test("changing to a different unsupported local image remains a validation error", () => {
  const changedImage = "/catalogue/menu/different-meal.webp";
  const body = menuUpdateToApi({ image: changedImage }, { image: catalogueImage });
  assert.equal(body.image, changedImage);
  assert.throws(() => menuChanges(body), { code: "VALIDATION_ERROR" });
});

test("missing baseline never drops an unsupported image or bypasses validation", () => {
  for (const current of [undefined, null, { _id: "menu-1" }]) {
    const body = menuUpdateToApi({ image: catalogueImage }, current);
    assert.equal(body.image, catalogueImage);
    assert.throws(() => menuChanges(body), { code: "VALIDATION_ERROR" });
  }
});

test("partial updates retain their field mapping without adding image or recipe defaults", () => {
  assert.deepEqual(menuUpdateToApi({ cook_time: 8, is_available: false }, { image: catalogueImage }), { cookTime: 8, isAvailable: false });
  assert.deepEqual(menuUpdateToApi({ ingredients: [] }, { image: catalogueImage }), { ingredients: [] });
});

test("create payloads continue to submit images and use the existing validation", () => {
  const image = "https://example.com/new-meal.webp";
  const ingredients = [{ ingredient_id: ingredientId, quantity: 1, unit: "piece" }];
  assert.deepEqual(menuChanges(menuToApi({ name: "New meal", price: 50, image, ingredients }), true).image, image);
  assert.equal(menuToApi({ image: catalogueImage }).image, catalogueImage);
  assert.throws(() => menuChanges(menuToApi({ name: "New meal", price: 50, image: catalogueImage, ingredients }), true), { code: "VALIDATION_ERROR" });
});
