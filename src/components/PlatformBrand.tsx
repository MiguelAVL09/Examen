import { Film } from "lucide-react";

export function PlatformBrand() {
  return (
    <span className="platform-brand">
      <span className="platform-brand-symbol" aria-hidden="true">
        <Film size={23} strokeWidth={1.8} />
      </span>
      <span className="platform-brand-name">
        Cinépolis<span className="platform-brand-pro">PRO</span>
      </span>
    </span>
  );
}
