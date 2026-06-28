import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type ColorBlindMode = "none" | "protanopia" | "deuteranopia" | "tritanopia";
export type FontSize = 100 | 115 | 130 | 150;

export interface A11ySettings {
  highContrast: boolean;
  largeText: FontSize;
  dyslexiaFont: boolean;
  reducedMotion: boolean;
  colorBlindMode: ColorBlindMode;
  simplifiedUI: boolean;
  ttsEnabled: boolean;
  ttsRate: number;
  ttsVolume: number;
  language: string;
  focusIndicators: boolean;
}

const DEFAULTS: A11ySettings = {
  highContrast: false,
  largeText: 100,
  dyslexiaFont: false,
  reducedMotion: false,
  colorBlindMode: "none",
  simplifiedUI: false,
  ttsEnabled: false,
  ttsRate: 1,
  ttsVolume: 1,
  language: "en-IN",
  focusIndicators: true,
};

const STORAGE_KEY = "ch_a11y";

function load(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function save(s: A11ySettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

interface A11yCtx {
  settings: A11ySettings;
  update: (patch: Partial<A11ySettings>) => void;
  reset: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

const Ctx = createContext<A11yCtx | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(load);

  const update = useCallback((patch: Partial<A11ySettings>) => {
    setSettings(prev => { const next = { ...prev, ...patch }; save(next); return next; });
  }, []);

  const reset = useCallback(() => { save(DEFAULTS); setSettings({ ...DEFAULTS }); }, []);

  const speak = useCallback((text: string) => {
    if (!settings.ttsEnabled) return;
    window.speechSynthesis?.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = settings.ttsRate;
    utt.volume = settings.ttsVolume;
    utt.lang = settings.language;
    window.speechSynthesis?.speak(utt);
  }, [settings.ttsEnabled, settings.ttsRate, settings.ttsVolume, settings.language]);

  const stopSpeaking = useCallback(() => { window.speechSynthesis?.cancel(); }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("a11y-high-contrast", settings.highContrast);
    html.classList.toggle("a11y-dyslexia", settings.dyslexiaFont);
    html.classList.toggle("a11y-reduced-motion", settings.reducedMotion);
    html.classList.toggle("a11y-simplified", settings.simplifiedUI);
    html.classList.toggle("a11y-focus", settings.focusIndicators);
    html.classList.remove("a11y-cb-protanopia", "a11y-cb-deuteranopia", "a11y-cb-tritanopia");
    if (settings.colorBlindMode !== "none") html.classList.add(`a11y-cb-${settings.colorBlindMode}`);
    html.style.setProperty("--a11y-font-scale", `${settings.largeText / 100}`);
  }, [settings]);

  return <Ctx.Provider value={{ settings, update, reset, speak, stopSpeaking }}>{children}</Ctx.Provider>;
}

export function useAccessibility() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccessibility must be inside AccessibilityProvider");
  return ctx;
}
