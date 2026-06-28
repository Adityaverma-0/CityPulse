import { Navbar } from "@/components/sections/Navbar";
import { HeroSection } from "@/components/sections/HeroSection";
import { WorkflowSection } from "@/components/sections/WorkflowSection";
import { SmartCommunityGrid } from "@/components/sections/SmartCommunityGrid";
import { CityMapSection } from "@/components/sections/CityMapSection";
import { AnalyticsSection } from "@/components/sections/AnalyticsSection";
import { AIDetectionSection } from "@/components/sections/AIDetectionSection";
import { CitizenRewards } from "@/components/sections/CitizenRewards";
import { Footer } from "@/components/sections/Footer";
import { ReportModal } from "@/components/ReportModal";
import { TrackIssueModal } from "@/components/TrackIssueModal";
import { useEffect, useState } from "react";

export default function Home() {
  const [reportOpen, setReportOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar onTrackClick={() => setTrackOpen(true)} />
      <main>
        <HeroSection onReportClick={() => setReportOpen(true)} />
        <WorkflowSection />
        <SmartCommunityGrid />
        <CityMapSection />
        <AIDetectionSection />
        <AnalyticsSection />
        <CitizenRewards />
      </main>
      <Footer />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
      <TrackIssueModal open={trackOpen} onClose={() => setTrackOpen(false)} />
    </div>
  );
}
