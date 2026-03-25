import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProjectFeed from "@/components/ProjectFeed";
import CommunitySection from "@/components/CommunitySection";
import UploadModal from "@/components/UploadModal";
import Footer from "@/components/Footer";
import AIAssistant from "@/components/AIAssistant";
import ChatPanel from "@/components/ChatPanel";

const Index = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [projectRefreshKey, setProjectRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onUploadClick={() => setUploadOpen(true)} />
      <HeroSection onUploadClick={() => setUploadOpen(true)} />
      <div id="explore">
        <ProjectFeed refreshKey={projectRefreshKey} />
      </div>
      <div id="communities">
        <CommunitySection />
      </div>
      <Footer />
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => setProjectRefreshKey((prev) => prev + 1)}
      />
      <AIAssistant />
      <ChatPanel />
    </div>
  );
};

export default Index;
