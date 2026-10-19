import { useState } from "react";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { cx } from "@/lib/cx";

export function CatalogImage({ src, label, compact, className }) {
  const [failed, setFailed] = useState(null);
  if (!src || failed === src) return <ImagePlaceholder label={label} compact={compact} className={className} />;
  return <img src={src} alt={label} loading="lazy" onError={() => setFailed(src)} className={cx("object-cover", className)} />;
}
