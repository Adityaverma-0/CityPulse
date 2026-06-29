import { motion } from "framer-motion";
import { 
  Wind, Droplets, VolumeX, Trash2, 
  HeartPulse, Zap, Waves, Construction
} from "lucide-react";

const gridItems = [
  { title: "Air Quality", value: "42 AQI", status: "good", icon: Wind, trend: "+2%" },
  { title: "Water Quality", value: "98% Purity", status: "good", icon: Droplets, trend: "Stable" },
  { title: "Noise Level", value: "72 dB", status: "warning", icon: VolumeX, trend: "-5%" },
  { title: "Waste Collection", value: "92% Done", status: "good", icon: Trash2, trend: "+12%" },
  { title: "Community Health", value: "8 Alerts", status: "critical", icon: HeartPulse, trend: "+3" },
  { title: "Electricity", value: "99.9% Up", status: "good", icon: Zap, trend: "Stable" },
  { title: "Water Supply", value: "1.2M L", status: "good", icon: Waves, trend: "-2%" },
  { title: "Gov Projects", value: "14 Active", status: "warning", icon: Construction, trend: "On Track" },
];

const statusConfig = {
  good: { color: "text-green-400", border: "border-green-500/20", bg: "bg-green-500/10" },
  warning: { color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/10" },
  critical: { color: "text-red-400", border: "border-red-500/20", bg: "bg-red-500/10" },
};

export function SmartCommunityGrid() {
  return (
    <section id="departments" className="py-24 bg-card relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background bg-[#f0f0f53d]" />
      <div className="container mx-auto px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold font-['Plus_Jakarta_Sans'] mb-4 text-white">City Health Matrix</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {gridItems.map((item, i) => {
            const status = statusConfig[item.status as keyof typeof statusConfig];
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group p-6 rounded-2xl bg-background border border-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(37,99,235,0.1)] hover:-translate-y-1 relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform ${status.color}`}>
                  <item.icon className="w-24 h-24" />
                </div>
                
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl ${status.bg} border ${status.border}`}>
                    <item.icon className={`w-6 h-6 ${status.color}`} />
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${status.bg} ${status.color} border ${status.border} uppercase tracking-wider`}>
                    {item.status}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-white/60 font-medium mb-1 font-['Inter']">{item.title}</h4>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-bold text-white font-['Space_Grotesk']">{item.value}</div>
                    <div className="text-sm text-white/40 mb-1">{item.trend}</div>
                  </div>
                </div>

                {/* Mock Sparkline */}
                <div className="mt-6 flex items-end h-8 gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                  {[...Array(12)].map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`flex-1 rounded-t-sm ${idx > 8 ? status.color.replace('text-', 'bg-') : 'bg-white/20'}`}
                      style={{ height: `${Math.max(20, Math.random() * 100)}%` }}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
