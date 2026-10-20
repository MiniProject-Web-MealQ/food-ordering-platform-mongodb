import { useState } from "react";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { cx } from "@/lib/cx";
import { mediaUrl } from "@/lib/media";

/**
 * Shows an image from the catalogue API, falling back to the dashed placeholder when the
 * record has no image or the file cannot be loaded. `src` may be any shape the API returns;
 * mediaUrl() resolves it against the API origin when the backend is hosted separately.
 */
export function CatalogImage({ src, label, compact, className, loading = "lazy", fetchPriority }) {
  const [failed, setFailed] = useState(null);
  const url = mediaUrl(src);
  if (!url || failed === url) return <ImagePlaceholder label={label} compact={compact} className={className} />;
  return <img src={url} alt={label} loading={loading} decoding="async" fetchPriority={fetchPriority} onError={() => setFailed(url)} className={cx("object-cover", !compact && "block w-full", className)} />;
}
