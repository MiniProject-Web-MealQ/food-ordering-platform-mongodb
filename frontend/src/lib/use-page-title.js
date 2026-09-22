import { useEffect } from "react";

export const SITE_TITLE = "MealQ — สั่งก่อน ไม่ต้องต่อคิว";

/** Sets document.title as "<title> · MealQ", or the site title when omitted. */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · MealQ` : SITE_TITLE;
  }, [title]);
}
