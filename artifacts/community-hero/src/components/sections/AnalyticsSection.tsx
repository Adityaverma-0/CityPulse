import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadialBarChart, RadialBar, Legend
} from 'recharts';

const trendData = [
  { name: 'Mon', issues: 120, resolved: 110 },
  { name: 'Tue', issues: 150, resolved: 130 },
  { name: 'Wed', issues: 180, resolved: 170 },
  { name: 'Thu', issues: 140, resolved: 145 },
  { name: 'Fri', issues: 160, resolved: 150 },
  { name: 'Sat', issues: 90, resolved: 100 },
  { name: 'Sun', issues: 80, resolved: 90 },
];

const perfData = [
  { name: 'Water', avg_time: 4, label: '4h' },
  { name: 'Roads', avg_time: 12, label: '12h' },
  { name: 'Power', avg_time: 2, label: '2h' },
  { name: 'Waste', avg_time: 8, label: '8h' },
];

const efficiencyData = [
  { name: 'Target', uv: 100, fill: '#111827' },
  { name: 'Current', uv: 87, fill: '#2563EB' },
];

export function AnalyticsSection() {
  return (
    <section id="analytics" className="py-24 bg-card border-t border-b border-white/5">
      <div className="container mx-auto px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold font-['Plus_Jakarta_Sans'] mb-4 text-white">Command Center Analytics</h2>
            <p className="text-white/60 max-w-xl font-['Inter']">Deep dive into operational metrics. Make data-driven decisions to allocate resources efficiently.</p>
          </div>
          <div className="flex gap-4 mt-6 md:mt-0">
            <select className="bg-background border border-white/10 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-primary">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Year</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 bg-background border border-white/5 rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-6 font-['Plus_Jakarta_Sans']">Resolution vs Reports</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="issues" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="resolved" stroke="#22C55E" strokeWidth={3} dot={{ r: 4, fill: '#22C55E', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Secondary Charts */}
          <div className="space-y-6 lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-background border border-white/5 rounded-2xl p-6 h-[calc(50%-12px)]"
            >
              <h3 className="text-sm font-bold text-white mb-4 font-['Plus_Jakarta_Sans']">Avg Resolution Time (Hours)</h3>
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perfData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} width={50} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '4px' }}/>
                    <Bar dataKey="avg_time" fill="#22D3EE" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-background border border-white/5 rounded-2xl p-6 h-[calc(50%-12px)] flex flex-col justify-center items-center relative"
            >
              <h3 className="text-sm font-bold text-white absolute top-6 left-6 font-['Plus_Jakarta_Sans']">Overall Efficiency</h3>
              <div className="h-[140px] w-full relative mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={efficiencyData} startAngle={90} endAngle={-270}>
                    <RadialBar background={{ fill: '#111827' }} cornerRadius={10} dataKey="uv" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-white font-['Space_Grotesk']">87%</span>
                  <span className="text-xs text-white/50">Target: 95%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
