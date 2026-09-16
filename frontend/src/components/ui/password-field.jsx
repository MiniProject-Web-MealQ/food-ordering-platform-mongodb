import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { TextField } from "./text-field";

export function PasswordField(props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          aria-pressed={visible}
          className="grid size-10 place-items-center rounded-full text-muted hover:bg-butter hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      }
    />
  );
}
