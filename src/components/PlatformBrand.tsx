import { Film } from "lucide-react";
import { PROJECT_NAME } from '../projectIdentity';

export function PlatformBrand() {
  return (
    <span className="platform-brand">
      <span className="platform-brand-symbol" aria-hidden="true">
        <Film size={23} strokeWidth={1.8} />
      </span>
      <span className="platform-brand-name">
        {PROJECT_NAME}<span className="platform-brand-pro">Personal</span>
      </span>
    </span>
  );
}
