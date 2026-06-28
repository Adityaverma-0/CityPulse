import { Shield, Mail, Twitter, Linkedin, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer id="contact" className="bg-[#02040a] border-t border-white/5 pt-20 pb-10">
      <div className="container mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-white">Community Hero</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              Empowering local governments with AI-driven citizen reporting and real-time infrastructure management.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-primary hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-primary hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-primary hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Platform</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li><a href="#" className="hover:text-primary transition-colors">AI Detection Engine</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Department Dashboard</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Citizen Mobile App</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Documentation</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Government Partnerships</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Case Studies</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Security & Compliance</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Stay Updated</h4>
            <p className="text-sm text-white/50 mb-4">Get the latest features and urban tech news.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter email" 
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary flex-1"
              />
              <Button size="icon" className="bg-primary hover:bg-primary/90 text-white shrink-0">
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-sm font-bold text-white/40 grayscale">
            <span>Smart City Init</span>
            <span>Digital Gov</span>
            <span>Civic Tech Alliance</span>
          </div>
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Community Hero Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
