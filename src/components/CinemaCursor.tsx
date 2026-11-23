import { useEffect, useRef } from "react";
import "./CinemaCursor.css";

const interactiveSelector =
  'button:not(:disabled), a[href], summary, [role="button"]:not([aria-disabled="true"]), label[for]';
const textSelector =
  'input, textarea, select, [contenteditable="true"], [role="textbox"]';
const darkSelector =
  '.quiz-hero, .auth-stage, .expert-app .hero, .admin-workspace, [data-view="game"], [data-view="host"]';

export function CinemaCursor() {
  const cursor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = cursor.current!;
    const media = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)",
    );

    function hide() {
      element.dataset.visible = "false";
      delete element.dataset.pressed;
    }

    function move(event: PointerEvent) {
      const target = event.target;
      if (
        !media.matches ||
        event.pointerType !== "mouse" ||
        !(target instanceof Element) ||
        target.closest(textSelector) ||
        target.closest("dialog[open]")
      ) {
        hide();
        return;
      }
      const transform = `translate3d(${event.clientX - 18}px, ${event.clientY - 18}px, 0)`;
      if (element.dataset.visible !== "true") {
        element.style.transition = "none";
        element.style.transform = transform;
        element.dataset.visible = "true";
        requestAnimationFrame(() => element.style.removeProperty("transition"));
      } else {
        element.style.transform = transform;
      }
      element.dataset.interactive = String(
        !!target.closest(interactiveSelector),
      );
      element.dataset.tone = target.closest(darkSelector) ? "light" : "dark";
    }

    function leave(event: PointerEvent) {
      if (!event.relatedTarget) hide();
    }

    function press() {
      element.dataset.pressed = "true";
    }
    function release() {
      delete element.dataset.pressed;
    }

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", leave, { passive: true });
    document.addEventListener("pointerdown", press, { passive: true });
    document.addEventListener("pointerup", release, { passive: true });
    document.addEventListener("pointercancel", hide, { passive: true });
    document.addEventListener("keydown", hide);
    window.addEventListener("blur", hide);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    media.addEventListener("change", hide);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("pointerdown", press);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", hide);
      document.removeEventListener("keydown", hide);
      window.removeEventListener("blur", hide);
      window.removeEventListener("scroll", hide, true);
      media.removeEventListener("change", hide);
    };
  }, []);

  return (
    <div
      ref={cursor}
      className="cinema-cursor"
      aria-hidden="true"
      data-visible="false"
    >
      <span />
    </div>
  );
}
