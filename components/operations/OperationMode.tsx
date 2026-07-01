"use client";

import { useEffect } from "react";

export function OperationMode({ active }: { active: boolean }) {
  useEffect(() => {
    const sidebarSelectors = ["aside", "[data-sidebar]", ".sidebar"];
    const headerSelectors = ["header", "[data-header]", ".branch-header"];

    const sidebars = sidebarSelectors.flatMap((selector) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector))
    );

    const headers = headerSelectors.flatMap((selector) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector))
    );

    if (active) {
      sidebars.forEach((element) => {
        element.dataset.previousDisplay = element.style.display;
        element.style.display = "none";
      });

      headers.forEach((element) => {
        element.dataset.previousDisplay = element.style.display;
        element.style.display = "none";
      });

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      sidebars.forEach((element) => {
        element.style.display = element.dataset.previousDisplay || "";
      });

      headers.forEach((element) => {
        element.style.display = element.dataset.previousDisplay || "";
      });

      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      sidebars.forEach((element) => {
        element.style.display = element.dataset.previousDisplay || "";
      });

      headers.forEach((element) => {
        element.style.display = element.dataset.previousDisplay || "";
      });

      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [active]);

  return null;
}