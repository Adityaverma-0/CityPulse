import { useState } from "react";
import {
  Accessibility, X, Sun, Moon, Eye, Type, Brain,
  Zap, Volume2, VolumeX, Mic, RotateCcw, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAccessibility, type ColorBlindMode, type FontSize } from "@/lib/accessibility-context";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "हिंदी" },
  { code: "mr-IN", label: "मराठी" },
  { code: "ta-IN", label: "தமிழ்" },
  { code: "te-IN", label: "తెలుగు" },
  { code: "kn-IN", label: "ಕನ್ನಡ" },
  { code: "ml-IN", label: "മലയാളം" },
  { code: "bn-IN", label: "বাংলা" },
  { code: "gu-IN", label: "ગુજરાતી" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ" },
];

const CB_MODES: { value: ColorBlindMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "protanopia", label: "Protanopia (red-blind)" },
  { value: "deuteranopia", label: "Deuteranopia (green-blind)" },
  { value: "tritanopia", label: "Tritanopia (blue-blind)" },
];

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 100, label: "Normal (100%)" },
  { value: 115, label: "Large (115%)" },
  { value: 130, label: "X-Large (130%)" },
  { value: 150, label: "XX-Large (150%)" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function Row({ id, label, icon, checked, onChange }: { id: string; label: string; icon: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm cursor-pointer text-slate-300 select-none">
        <span className="text-slate-400">{icon}</span>
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function AccessibilityWidget() {
  const { settings, update, reset } = useAccessibility();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {open && (
          <div
            role="dialog"
            aria-label="Accessibility settings"
            className="w-80 max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <Accessibility className="h-4 w-4 text-blue-400" />
                <span className="font-semibold text-sm">Accessibility</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={reset}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                  aria-label="Reset to defaults"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-5">
              <Section title="Vision">
                <Row id="high-contrast" label="High Contrast" icon={<Sun className="h-4 w-4" />} checked={settings.highContrast} onChange={v => update({ highContrast: v })} />
                <Row id="dyslexia" label="Dyslexia-Friendly Font" icon={<Brain className="h-4 w-4" />} checked={settings.dyslexiaFont} onChange={v => update({ dyslexiaFont: v })} />
                <Row id="simplified" label="Simplified Interface" icon={<Eye className="h-4 w-4" />} checked={settings.simplifiedUI} onChange={v => update({ simplifiedUI: v })} />
                <Row id="focus" label="Enhanced Focus Indicators" icon={<Zap className="h-4 w-4" />} checked={settings.focusIndicators} onChange={v => update({ focusIndicators: v })} />

                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-300 flex items-center gap-2">
                    <Type className="h-4 w-4 text-slate-400" /> Font Size
                  </Label>
                  <Select value={String(settings.largeText)} onValueChange={v => update({ largeText: Number(v) as FontSize })}>
                    <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SIZES.map(f => (
                        <SelectItem key={f.value} value={String(f.value)}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-300">Color Blind Mode</Label>
                  <Select value={settings.colorBlindMode} onValueChange={v => update({ colorBlindMode: v as ColorBlindMode })}>
                    <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CB_MODES.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Section>

              <Separator className="bg-slate-800" />

              <Section title="Motion & Interaction">
                <Row id="reduced-motion" label="Reduce Motion" icon={<Zap className="h-4 w-4" />} checked={settings.reducedMotion} onChange={v => update({ reducedMotion: v })} />
              </Section>

              <Separator className="bg-slate-800" />

              <Section title="Voice & Language">
                <Row id="tts" label="Text-to-Speech" icon={<Volume2 className="h-4 w-4" />} checked={settings.ttsEnabled} onChange={v => update({ ttsEnabled: v })} />

                {settings.ttsEnabled && (
                  <div className="space-y-3 pl-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-400">Speed: {settings.ttsRate.toFixed(1)}×</Label>
                      <Slider
                        min={0.5} max={2} step={0.1}
                        value={[settings.ttsRate]}
                        onValueChange={([v]) => update({ ttsRate: v })}
                        aria-label="Speech rate"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-400">Volume: {Math.round(settings.ttsVolume * 100)}%</Label>
                      <Slider
                        min={0} max={1} step={0.05}
                        value={[settings.ttsVolume]}
                        onValueChange={([v]) => update({ ttsVolume: v })}
                        aria-label="Speech volume"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-300 flex items-center gap-2">
                    <Mic className="h-4 w-4 text-slate-400" /> Voice Language
                  </Label>
                  <Select value={settings.language} onValueChange={v => update({ language: v })}>
                    <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Section>

              <div className="pt-1 text-center">
                <p className="text-[10px] text-slate-600">Settings saved automatically · WCAG 2.2 AA</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all",
            "bg-blue-600 hover:bg-blue-500 text-white",
            open && "bg-blue-500 ring-2 ring-blue-300"
          )}
          aria-label="Open accessibility settings"
          aria-expanded={open}
          title="Accessibility settings"
        >
          <Accessibility className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
