import { cx } from "@/lib/cx";
import { buttonClasses } from "./styles";

export function Button({ variant, size, fullWidth, className, type = "button", ...props }) {
  return (
    <button
      type={type}
      className={cx(buttonClasses({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}
