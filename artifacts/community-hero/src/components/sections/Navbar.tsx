import { motion } from "framer-motion";
import { Shield, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onTrackClick?: () => void;
}

export function Navbar({ onTrackClick }: NavbarProps) {
  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 backdrop-blur-md bg-background/50 border-b border-white/5"
    >
      <div className="flex items-center gap-2">
        <Shield className="w-8 h-8 text-primary" />
        <span className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-white">Community Hero</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
        <a href="#home" className="hover:text-white transition-colors">Home</a>
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
        <a href="#departments" className="hover:text-white transition-colors">Departments</a>
        <a href="#analytics" className="hover:text-white transition-colors">Analytics</a>
        <a href="#contact" className="hover:text-white transition-colors">Contact</a>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={onTrackClick}
          data-testid="button-track-issue-nav"
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/20 gap-2 text-sm"
        >
          <Search size={14} />
          Track Issue
        </Button>
        <a href="/login">
          <Button variant="ghost" className="text-white hover:bg-white/10">Log In</Button>
        </a>
        <a href="/login">
          <Button className="bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(37,99,235,0.5)]">Sign Up</Button>
        </a>
      </div>
    </motion.nav>
  );
}
