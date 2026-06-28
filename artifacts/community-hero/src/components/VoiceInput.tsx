import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccessibility } from "@/lib/accessibility-context";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "हिंदी (Hindi)" },
  { code: "mr-IN", label: "मराठी (Marathi)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "or-IN", label: "ଓଡ଼ିଆ (Odia)" },
];

interface Props {
  onTranscript: (text: string) => void;
  className?: string;
}

// Web Speech API types (not in standard TS DOM lib for all targets)
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export function VoiceInput({ onTranscript, className }: Props) {
  const { settings, update } = useAccessibility();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const recogRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = settings.language;
    r.onresult = (e) => {
      let fin = "", int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t;
        else int += t;
      }
      if (fin) onTranscript(fin);
      setInterim(int);
    };
    r.onend = () => { setListening(false); setInterim(""); };
    r.onerror = () => { setListening(false); setInterim(""); };
    recogRef.current = r;
    return () => { r.abort(); };
  }, [settings.language, onTranscript]);

  function toggle() {
    const r = recogRef.current;
    if (!r) return;
    if (listening) { r.stop(); setListening(false); }
    else { r.start(); setListening(true); }
  }

  if (!supported) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={settings.language} onValueChange={(v) => update({ language: v })}>
        <SelectTrigger className="h-8 text-xs w-44 bg-slate-800 border-slate-700">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map(l => (
            <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        size="sm"
        variant={listening ? "destructive" : "outline"}
        className={cn("gap-1.5 text-xs", listening && "animate-pulse")}
        onClick={toggle}
        aria-label={listening ? "Stop voice input" : "Start voice input"}
        title={listening ? "Stop recording" : "Speak your complaint"}
      >
        {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        {listening ? "Stop" : "Voice"}
      </Button>

      {listening && interim && (
        <span className="text-xs text-slate-400 italic truncate max-w-40 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          {interim}
        </span>
      )}
    </div>
  );
}
