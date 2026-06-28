import { useState, useEffect } from "react";
import { Volume2, VolumeX, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccessibility } from "@/lib/accessibility-context";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  label?: string;
  className?: string;
  size?: "sm" | "xs";
}

export function TextToSpeechButton({ text, label = "Listen", className, size = "sm" }: Props) {
  const { settings } = useAccessibility();
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  if (!settings.ttsEnabled) return null;

  function handlePlay() {
    if (speaking && !paused) {
      window.speechSynthesis?.pause();
      setPaused(true);
      return;
    }
    if (paused) {
      window.speechSynthesis?.resume();
      setPaused(false);
      return;
    }
    window.speechSynthesis?.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = settings.ttsRate;
    utt.volume = settings.ttsVolume;
    utt.lang = settings.language;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => { setSpeaking(false); setPaused(false); };
    utt.onerror = () => { setSpeaking(false); setPaused(false); };
    window.speechSynthesis?.speak(utt);
  }

  function handleStop() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
  }

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Button
        type="button"
        size={size === "xs" ? "sm" : "sm"}
        variant="ghost"
        className={cn("gap-1.5 text-xs h-7 px-2 text-slate-400 hover:text-blue-400", speaking && !paused && "text-blue-400")}
        onClick={handlePlay}
        aria-label={speaking && !paused ? "Pause reading" : paused ? "Resume reading" : label}
      >
        {speaking && !paused ? <Pause className="h-3 w-3" /> : paused ? <Play className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
        {speaking && !paused ? "Pause" : paused ? "Resume" : label}
      </Button>
      {speaking && (
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500 hover:text-red-400" onClick={handleStop} aria-label="Stop reading">
          <VolumeX className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
