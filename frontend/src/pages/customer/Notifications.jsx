import { Link, useNavigate } from "react-router";
import { buttonClasses, textLinkClass } from "@/components/ui/styles";
import { formatWhen } from "@/features/customer/format";
import { useCustomer } from "@/features/customer/store";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const KIND_ICON = {
  ready: { emoji: "🔔", className: "bg-brand" },
  preparing: { emoji: "👩‍🍳", className: "bg-haze" },
  paid: { emoji: "✓", className: "bg-mint text-ink" },
  promo: { emoji: "🎟️", className: "bg-mint" },
};

function destination(notification) {
  if (notification.orderId) return `/customer/orders/${notification.orderId}`;
  if (notification.restaurantId) return `/customer/restaurants/${notification.restaurantId}`;
  return null;
}

function Notifications() {
  usePageTitle("การแจ้งเตือน");
  const navigate = useNavigate();
  const { state, dispatch } = useCustomer();
  const notifications = state.notifications.toSorted((a, b) => b.at - a.at);
  const unread = notifications.filter((n) => !n.read).length;

  function open(notification) {
    dispatch({ type: "notifications/read", id: notification.id });
    const to = destination(notification);
    if (to) navigate(to);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-6 pb-8 sm:px-6 lg:space-y-6 lg:px-8 lg:pt-10 lg:pb-16">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink lg:text-4xl">การแจ้งเตือน</h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => dispatch({ type: "notifications/readAll" })}
            className={`${textLinkClass} text-sm`}
          >
            อ่านทั้งหมด
          </button>
        )}
      </header>

      {notifications.length === 0 ? (
        <p className="rounded-3xl bg-cream p-6 text-center text-muted">ยังไม่มีการแจ้งเตือน</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const icon = KIND_ICON[notification.kind];
            const highlight = notification.kind === "ready" && !notification.read;
            return (
              <li
                key={notification.id}
                className={cx(
                  "relative rounded-3xl p-4",
                  highlight ? "bg-mint/50 ring-2 ring-mint" : "bg-cream",
                  notification.read && "opacity-80",
                )}
              >
                <div className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className={cx("grid size-11 shrink-0 place-items-center rounded-full text-lg", icon.className)}
                  >
                    {icon.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">
                      <button
                        type="button"
                        onClick={() => open(notification)}
                        className="text-left after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink"
                      >
                        {notification.title}
                        {!notification.read && <span className="sr-only"> (ยังไม่อ่าน)</span>}
                      </button>
                    </p>
                    <p className="text-sm text-muted">
                      {notification.body} · {formatWhen(notification.at)}
                    </p>
                    {highlight && (
                      <Link
                        to={`/customer/orders/${notification.orderId}`}
                        onClick={() => dispatch({ type: "notifications/read", id: notification.id })}
                        className={cx(buttonClasses({ variant: "primary", size: "sm" }), "relative mt-3")}
                      >
                        ดูออเดอร์
                      </Link>
                    )}
                  </div>
                  {!notification.read && (
                    <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Notifications;
