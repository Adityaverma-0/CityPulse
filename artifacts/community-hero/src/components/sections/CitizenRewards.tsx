import { motion } from "framer-motion";
import { Trophy, Star, Shield, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const rewards = [
  { id: 1, title: "Community Hero", points: "5,000", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  { id: 2, title: "Green Warrior", points: "2,500", icon: Star, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
  { id: 3, title: "Clean City Champ", points: "1,000", icon: Shield, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
];

const leaders = [
  { name: "Sarah Jenkins", role: "142 verified reports", avatar: "SJ", rank: 1, points: 4500 },
  { name: "Michael Chen", role: "98 verified reports", avatar: "MC", rank: 2, points: 3200 },
  { name: "David Rodriguez", role: "76 verified reports", avatar: "DR", rank: 3, points: 2100 },
];

export function CitizenRewards() {
  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold font-['Plus_Jakarta_Sans'] mb-4 text-white">Gamified Civic Engagement</h2>
          <p className="text-white/60 max-w-2xl mx-auto font-['Inter']">Rewarding citizens who actively participate in maintaining and improving their city's infrastructure.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="grid gap-6">
            {rewards.map((reward, i) => (
              <motion.div 
                key={reward.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-6 p-6 rounded-2xl bg-background border ${reward.border} hover:-translate-y-1 transition-transform`}
              >
                <div className={`w-16 h-16 rounded-full ${reward.bg} ${reward.color} flex items-center justify-center shrink-0`}>
                  <reward.icon className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-1">{reward.title}</h4>
                  <p className="text-sm text-white/50">Unlock at <span className="font-mono text-accent">{reward.points} pts</span></p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-background border border-white/10 rounded-3xl p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400" />
            
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Medal className="text-yellow-400 w-6 h-6" />
                Monthly Leaderboard
              </h3>
              <span className="text-sm text-white/50 bg-white/5 px-3 py-1 rounded-full">August 2023</span>
            </div>

            <div className="space-y-4">
              {leaders.map((leader) => (
                <div key={leader.rank} className="flex items-center justify-between p-4 rounded-xl bg-card border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="font-bold font-['Space_Grotesk'] text-white/30 w-4 text-right">#{leader.rank}</div>
                    <Avatar className="border-2 border-white/10">
                      <AvatarFallback className="bg-primary/20 text-primary">{leader.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-white font-medium">{leader.name}</div>
                      <div className="text-xs text-white/50">{leader.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-accent font-bold font-['Space_Grotesk']">{leader.points}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wide">Points</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
