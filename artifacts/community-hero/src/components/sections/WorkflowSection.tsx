import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  User, Camera, BrainCircuit, Building2,
  MapPin, CheckCircle2, ShieldCheck, Cpu,
  Briefcase
} from "lucide-react";

const steps = [
  {
    id: 1, title: "Citizen Reports", desc: "A resident spots a pothole, flooding, or broken streetlight and snaps a photo.",
    icon: User, color: "text-blue-400", glow: "rgba(96,165,250,0.35)", ring: "border-blue-500/40", bg: "from-blue-500/10 to-blue-900/5"
  },
  {
    id: 2, title: "AI Vision", desc: "Computer vision instantly analyses the image to detect the issue type and severity.",
    icon: Camera, color: "text-cyan-400", glow: "rgba(34,211,238,0.35)", ring: "border-cyan-500/40", bg: "from-cyan-500/10 to-cyan-900/5"
  },
  {
    id: 3, title: "AI Classification", desc: "NLP and ML models tag urgency, assign priority level, and extract location metadata.",
    icon: BrainCircuit, color: "text-purple-400", glow: "rgba(168,85,247,0.35)", ring: "border-purple-500/40", bg: "from-purple-500/10 to-purple-900/5"
  },
  {
    id: 4, title: "Department Assigned", desc: "The right city department is selected automatically from AI-matched skill profiles.",
    icon: Building2, color: "text-orange-400", glow: "rgba(251,146,60,0.35)", ring: "border-orange-500/40", bg: "from-orange-500/10 to-orange-900/5"
  },
  {
    id: 5, title: "Nearest Worker", desc: "The closest available field officer is dispatched using real-time GPS routing.",
    icon: Briefcase, color: "text-yellow-400", glow: "rgba(250,204,21,0.35)", ring: "border-yellow-500/40", bg: "from-yellow-500/10 to-yellow-900/5"
  },
  {
    id: 6, title: "Navigation", desc: "Turn-by-turn routing guides the worker directly to the reported location.",
    icon: MapPin, color: "text-blue-500", glow: "rgba(59,130,246,0.35)", ring: "border-blue-400/40", bg: "from-blue-600/10 to-blue-900/5"
  },
  {
    id: 7, title: "Issue Resolved", desc: "Worker uploads a 'before & after' photo confirming the fix is complete.",
    icon: CheckCircle2, color: "text-green-500", glow: "rgba(34,197,94,0.35)", ring: "border-green-500/40", bg: "from-green-500/10 to-green-900/5"
  },
  {
    id: 8, title: "Citizen Verified", desc: "The reporter confirms resolution via a one-tap rating and feedback form.",
    icon: ShieldCheck, color: "text-emerald-400", glow: "rgba(52,211,153,0.35)", ring: "border-emerald-500/40", bg: "from-emerald-500/10 to-emerald-900/5"
  },
  {
    id: 9, title: "AI Learns", desc: "Outcome data feeds back into the model, improving future triage accuracy.",
    icon: Cpu, color: "text-indigo-400", glow: "rgba(129,140,248,0.35)", ring: "border-indigo-500/40", bg: "from-indigo-500/10 to-indigo-900/5"
  },
];

export function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const lineWidth = useTransform(scrollYProgress, [0.1, 0.7], ["0%", "100%"]);

  return (
    <section
      id="workflow"
      ref={sectionRef}
      className="min-h-screen py-32 relative overflow-hidden flex flex-col justify-center bg-[#f0f0f53d]"
    >
      {/* Ambient background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px]" />
      </div>
      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-24"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-4xl lg:text-6xl font-extrabold font-['Plus_Jakarta_Sans'] mb-6 text-white leading-tight">
            Intelligent Issue<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Resolution</span>
          </h2>
        </motion.div>

        {/* Steps grid */}
        <div className="relative">
          {/* Animated connector line */}
          <div className="absolute top-[52px] left-[8%] right-[8%] h-px bg-white/5 hidden lg:block" />
          <motion.div
            className="absolute top-[52px] left-[8%] h-px bg-gradient-to-r from-primary via-accent to-primary hidden lg:block"
            style={{ width: lineWidth }}
          />

          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-y-12 gap-x-4 lg:gap-x-0 relative z-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                className="flex flex-col items-center group cursor-pointer px-2"
              >
                {/* Step number */}
                <span className="text-[10px] font-bold font-['Space_Grotesk'] text-white/25 mb-3 tracking-widest">
                  {String(step.id).padStart(2, "0")}
                </span>

                {/* Icon circle */}
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${step.bg} border ${step.ring} flex items-center justify-center mb-5 relative
                    transition-all duration-500
                    group-hover:-translate-y-3
                    group-hover:shadow-[0_0_40px_var(--glow)]
                    group-hover:scale-110`}
                  style={{ "--glow": step.glow } as React.CSSProperties}
                >
                  {/* Pulse ring */}
                  <motion.div
                    className={`absolute inset-0 rounded-full border ${step.ring} opacity-0 group-hover:opacity-100`}
                    animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                  <step.icon className={`w-9 h-9 ${step.color} relative z-10`} />
                </div>

                {/* Label + desc */}
                <div className="text-center">
                  <h4 className="text-sm font-bold text-white/80 font-['Inter'] group-hover:text-white transition-colors leading-snug mb-2">
                    {step.title}
                  </h4>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
