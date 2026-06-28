import { motion } from "framer-motion";
import { Search, Filter, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const markers = [
  { id: 1, top: "20%", left: "30%", color: "bg-red-500", shadow: "shadow-red-500/50", label: "Critical" },
  { id: 2, top: "45%", left: "60%", color: "bg-yellow-500", shadow: "shadow-yellow-500/50", label: "In Progress" },
  { id: 3, top: "60%", left: "25%", color: "bg-green-500", shadow: "shadow-green-500/50", label: "Resolved" },
  { id: 4, top: "35%", left: "75%", color: "bg-blue-500", shadow: "shadow-blue-500/50", label: "New" },
  { id: 5, top: "70%", left: "55%", color: "bg-red-500", shadow: "shadow-red-500/50", label: "Critical" },
  { id: 6, top: "15%", left: "50%", color: "bg-green-500", shadow: "shadow-green-500/50", label: "Resolved" },
];

export function CityMapSection() {
  return (
    <section id="solutions" className="py-24 bg-background">
      <div className="container mx-auto px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold font-['Plus_Jakarta_Sans'] mb-4 text-white">Live Incident Map</h2>
          <p className="text-white/60 max-w-2xl mx-auto font-['Inter']">Geospatial intelligence that tracks every reported issue in real-time, helping dispatchers route the closest available workers.</p>
        </div>

        <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0f1d]">
          {/* Mock Dark Map CSS Pattern */}
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
          
          {/* Decorative map elements */}
          <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
            <path d="M0,200 Q200,300 400,100 T800,400 T1200,200" fill="none" stroke="rgba(37,99,235,0.5)" strokeWidth="8" className="path-animation" />
            <path d="M0,400 Q300,500 600,200 T1000,600 T1200,500" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="4" />
          </svg>

          {/* Markers */}
          {markers.map((marker) => (
            <div key={marker.id} className="absolute group cursor-pointer" style={{ top: marker.top, left: marker.left }}>
              <div className={`w-4 h-4 rounded-full ${marker.color} ${marker.shadow} shadow-[0_0_15px] relative z-10`}>
                <div className={`absolute inset-0 rounded-full ${marker.color} animate-ping opacity-75`} />
              </div>
              
              {/* Hover Card */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-card/90 backdrop-blur-md border border-white/10 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${marker.color}`} />
                  <span className="text-xs font-bold text-white">{marker.label}</span>
                </div>
                <div className="text-xs text-white/70 mb-1">Location: Ward 14, Main St.</div>
                <div className="text-[10px] text-white/40">Reported: 10 mins ago</div>
              </div>
            </div>
          ))}

          {/* UI Overlays */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
            <div className="bg-background/80 backdrop-blur-md border border-white/10 rounded-xl p-2 flex gap-2 pointer-events-auto">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <input type="text" placeholder="Search ward or street..." className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary w-64" />
              </div>
              <Button variant="outline" size="icon" className="bg-white/5 border-white/10 text-white">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            <div className="bg-background/80 backdrop-blur-md border border-white/10 rounded-xl p-4 w-48 pointer-events-auto">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent" />
                Live Status
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-white/80"><span>Critical</span><span className="text-red-400 font-bold">12</span></div>
                <div className="flex justify-between text-white/80"><span>In Progress</span><span className="text-yellow-400 font-bold">84</span></div>
                <div className="flex justify-between text-white/80"><span>New</span><span className="text-blue-400 font-bold">29</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
