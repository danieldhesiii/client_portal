"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Minimal theme toggle. Dark is the default; toggling adds/removes `.light`
 * on <html>. An inline script in the layout applies the stored preference
 * before paint to avoid a flash.
 */
export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("vx-theme", next ? "light" : "dark");
    } catch {}
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {light ? <Moon size={16} /> : <Sun size={16} />}
    </Button>
  );
}

/** Inline, render-blocking theme bootstrap to prevent a flash of wrong theme. */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('vx-theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
