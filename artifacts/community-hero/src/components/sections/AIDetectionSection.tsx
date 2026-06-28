import { motion } from "framer-motion";
import { CheckCircle2, Clock, Wrench, AlertCircle, PlayCircle } from "lucide-react";
import potholeImg from "@assets/images/pothole.png"; // Fallback if image path needs public mapping
import { Button } from "@/components/ui/button";

export function AIDetectionSection() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Decorative AI nodes */}
      <div className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden border-2 border-white/10 relative group">
              <img 
                src="/images/pothole.png" 
                alt="AI detecting pothole" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              
              {/* AI Bounding Box */}
              <motion.div 
                initial={{ opacity: 0, scale: 1.1 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-accent bg-accent/10 rounded-lg pointer-events-none flex flex-col justify-end p-2 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
              >
                <div className="absolute -top-3 -right-3 w-3 h-3 bg-accent" />
                <div className="absolute -bottom-3 -left-3 w-3 h-3 bg-accent" />
                <span className="text-[10px] font-mono bg-accent text-accent-foreground px-2 py-0.5 rounded inline-block w-max font-bold">OBJ_POTHOLE_0.98</span>
              </motion.div>

              {/* Scanning Line */}
              <motion.div 
                className="absolute left-0 right-0 h-1 bg-primary/50 shadow-[0_0_20px_rgba(37,99,235,1)]"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 4, ease: "linear", repeat: Infinity }}
              />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6">
              <PlayCircle className="w-4 h-4" />
              Live AI Analysis
            </div>
            
            <h2 className="text-3xl lg:text-5xl font-bold font-['Plus_Jakarta_Sans'] mb-6 text-white leading-tight">
              Enterprise Vision <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Intelligence</span>
            </h2>
            
            <p className="text-white/60 mb-8 font-['Inter'] text-lg">
              Our computer vision models automatically classify citizen uploads, detect severity, and instantly format a work order for the correct department.
            </p>

            <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h4 className="text-white font-bold text-lg">Pothole Detected</h4>
                  <div className="text-sm text-white/50 font-mono">Confidence: 98.4%</div>
                </div>
                <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> Priority: HIGH
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Department</span>
                  <div className="text-white text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Public Works
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Est. Time</span>
                  <div className="text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" /> 45 Mins
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Required Assets</span>
                  <div className="text-white text-sm flex items-center gap-2 bg-white/5 p-2 rounded">
                    <Wrench className="w-4 h-4 text-white/50" /> 
                    <span>Asphalt Patch Kit, Tamper, Warning Cones</span>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                Dispatch Nearest Unit
              </Button>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

import { Building2 } from "lucide-react"; // Import added for Building2
