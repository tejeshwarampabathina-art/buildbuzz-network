import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CommunitySection from "@/components/CommunitySection";
import UploadModal from "@/components/UploadModal";
import Footer from "@/components/Footer";
import AIAssistant from "@/components/AIAssistant";
import ChatPanel from "@/components/ChatPanel";

const Index = () => {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onUploadClick={() => setUploadOpen(true)} />
      <HeroSection onUploadClick={() => setUploadOpen(true)} />
      <div id="communities">
        <CommunitySection />
      </div>
      <Footer />
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <AIAssistant />
      <ChatPanel />
    </div>
  );
};

export default Index;
