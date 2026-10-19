const crypto = require("crypto");
function imageUrl(record, field, kind) {
  const value = record[field];
  // A stable new URL bypasses any HTML fallback cached before this catalogue
  // became readable by nginx. The stored catalogue paths remain unchanged.
  if (value?.startsWith("/catalogue/20261019-v2/")) return `${value}?v=20261019-v2-r2`;
  if (!value?.startsWith("data:image/")) return value;
  return `/api/v1/media/${kind}/${record._id}/${field}?v=${crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}
async function serve(req, res) {
  const models = { menu: { model: require("../models/Menu"), fields: ["image"] }, store: { model: require("../models/Store"), fields: ["logo", "cover_image"] } };
  const spec = models[req.params.kind];
  if (!spec || !spec.fields.includes(req.params.field) || !/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(404);
  const row = await spec.model.findById(req.params.id).select(req.params.field);
  const value = row?.[req.params.field];
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value || "");
  if (!match) return res.sendStatus(404);
  res.set({ "Content-Type": match[1], "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" });
  return res.send(Buffer.from(match[2], "base64"));
}
module.exports = { imageUrl, serve };
