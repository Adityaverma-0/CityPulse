import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onReportClick?: () => void;
}

const panels = [
  {
    image: "/images/taj-mahal.jpg",
    label: "Taj Mahal",
    location: "Agra, Uttar Pradesh",
    tag: "World Heritage",
    accent: "from-sky-500/20 to-sky-900/80",
    dot: "bg-sky-400",
  },
  {
    image: "/images/pangong-lake.jpg",
    label: "Pangong Lake",
    location: "Leh, Ladakh",
    tag: "Adventure",
    accent: "from-blue-500/20 to-blue-900/80",
    dot: "bg-blue-400",
  },
  {
    image: "/images/hawa-mahal.jpg",
    label: "Hawa Mahal",
    location: "Jaipur, Rajasthan",
    tag: "Culture",
    accent: "from-orange-500/20 to-orange-900/80",
    dot: "bg-orange-400",
  },
  {
    image: "/images/kerala.jpg",
    label: "Kerala Backwaters",
    location: "Kerala, India",
    tag: "Nature",
    accent: "from-green-500/20 to-green-900/80",
    dot: "bg-green-400",
  },
  {
    image: "/images/spiti-valley.jpg",
    label: "Spiti Valley",
    location: "Himachal Pradesh",
    tag: "Mountains",
    accent: "from-slate-500/20 to-slate-900/80",
    dot: "bg-slate-300",
  },
];

export function HeroSection({ onReportClick }: HeroSectionProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [autoIndex, setAutoIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scaleOut = useTransform(scrollYProgress, [0, 0.6], [1, 1.08]);

  useEffect(() => {
    if (hovered !== null) return;
    const id = setInterval(() => {
      setAutoIndex((p) => (p + 1) % panels.length);
    }, 2800);
    return () => clearInterval(id);
  }, [hovered]);

  const active = hovered !== null ? hovered : autoIndex;

  return (
    <section
      ref={sectionRef}
      className="relative h-screen flex overflow-hidden"
    >
      {/* ── Image Panels ── */}
      {panels.map((panel, i) => {
        const isActive = i === active;
        return (
          <motion.div
            key={i}
            className="relative overflow-hidden cursor-pointer select-none"
            animate={{ flex: isActive ? 5 : 1 }}
            transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
            onHoverStart={() => setHovered(i)}
            onHoverEnd={() => setHovered(null)}
          >
            {/* Parallax image */}
            <motion.div className="absolute inset-0" style={{ scale: scaleOut }}>
              <img
                src={panel.image}
                className="absolute inset-0 w-full h-full object-cover"
                alt={panel.label}
                draggable={false}
              />
            </motion.div>

            {/* Colour-tinted gradient */}
            <div
              className={`absolute inset-0 bg-gradient-to-t ${panel.accent} transition-opacity duration-700`}
              style={{ opacity: isActive ? 1 : 0.55 }}
            />

            {/* Dark vignette for readability */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Panel label — bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
              <motion.div
                className="h-px bg-white/20 mb-4 origin-left"
                animate={{ scaleX: isActive ? 1 : 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
              <motion.span
                className="text-[10px] font-semibold uppercase tracking-widest mb-1 block text-white"
                animate={{ opacity: isActive ? 0.6 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {panel.tag}
              </motion.span>
              <motion.h3
                className="font-bold text-white leading-tight"
                animate={{
                  fontSize: isActive ? "1.25rem" : "0.75rem",
                  opacity: isActive ? 1 : 0.4,
                }}
                transition={{ duration: 0.45 }}
              >
                {panel.label}
              </motion.h3>
              <motion.div
                className="flex items-center gap-1 mt-1"
                animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 8 }}
                transition={{ duration: 0.35, delay: 0.05 }}
              >
                <MapPin className="w-3 h-3 text-white/60" />
                <span className="text-white/60 text-xs">{panel.location}</span>
              </motion.div>
            </div>

            {/* Active dot */}
            <motion.div
              className={`absolute top-5 right-5 w-2 h-2 rounded-full ${panel.dot} z-20`}
              animate={{ scale: isActive ? [1, 1.4, 1] : 0.6, opacity: isActive ? 1 : 0.3 }}
              transition={{ duration: 0.6, repeat: isActive ? Infinity : 0, repeatDelay: 1.5 }}
            />
          </motion.div>
        );
      })}

      {/* ── Centered CTA overlay — sits above all panels ── */}
      <motion.div
        className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
        style={{ y: textY, opacity: textOpacity }}
      >
        {/* Frosted-glass card */}
        <motion.div
          className="flex flex-col items-center text-center px-10 py-10 rounded-2xl pointer-events-auto"
          style={{
            background: "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 100%)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-white/45 mb-5">
            <span className="w-6 h-px bg-white/25" />
            Smart City Platform
            <span className="w-6 h-px bg-white/25" />
          </span>

          <h1 className="text-5xl xl:text-6xl font-extrabold font-['Plus_Jakarta_Sans'] leading-[1.1] text-white mb-5 drop-shadow-xl">
            Report. Verify.<br />
            <span className="text-primary">Resolve.</span>
          </h1>


          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={onReportClick}
              className="bg-primary text-white hover:bg-primary/90 shadow-[0_0_28px_rgba(37,99,235,0.55)] gap-2 px-6"
            >
              Report an Issue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Scroll hint ── */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2"
        style={{ opacity: textOpacity }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-[10px] uppercase tracking-widest text-white/25">Scroll</span>
        <motion.div
          className="w-px h-8 bg-white/20"
          animate={{ scaleY: [0, 1, 0], originY: 0 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* ── Panel progress dots ── */}
      <div className="absolute bottom-8 right-8 z-30 flex gap-2">
        {panels.map((_, i) => (
          <button
            key={i}
            onClick={() => { setHovered(i); setTimeout(() => setHovered(null), 2400); }}
            className="focus:outline-none"
          >
            <motion.div
              className="h-1 rounded-full bg-white"
              animate={{ width: i === active ? 24 : 8, opacity: i === active ? 1 : 0.3 }}
              transition={{ duration: 0.4 }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
