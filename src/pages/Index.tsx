import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProjectFeed from "@/components/ProjectFeed";
import CommunitySection from "@/components/CommunitySection";
import UploadModal from "@/components/UploadModal";
import Footer from "@/components/Footer";
import ChatPanel from "@/components/ChatPanel";
import AIAssistant from "@/components/AIAssistant";

const Index = () => {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onUploadClick={() => setUploadOpen(true)} />
      <HeroSection onUploadClick={() => setUploadOpen(true)} />
      <div id="explore">
        <ProjectFeed />
      </div>
      <div id="communities">
        <CommunitySection />
      </div>
      <Footer />
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ChatPanel />
      <AIAssistant />
    </div>
  );
};

export default Index;
