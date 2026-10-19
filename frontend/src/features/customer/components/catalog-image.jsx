import { useState } from "react";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { cx } from "@/lib/cx";

export function CatalogImage({ src, label, compact, className, loading = "lazy", fetchPriority }) {
  const [failed, setFailed] = useState(null);
  if (!src || failed === src) return <ImagePlaceholder label={label} compact={compact} className={className} />;
  return <img src={src} alt={label} loading={loading} fetchPriority={fetchPriority} onError={() => setFailed(src)} className={cx("object-cover", !compact && "block w-full", className)} />;
}
