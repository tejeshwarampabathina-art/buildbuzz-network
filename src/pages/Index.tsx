import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProjectFeed from "@/components/ProjectFeed";
import CommunitySection from "@/components/CommunitySection";
import UploadModal from "@/components/UploadModal";
import Footer from "@/components/Footer";

const Index = () => {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onUploadClick={() => setUploadOpen(true)} />
      <HeroSection onUploadClick={() => setUploadOpen(true)} />
      <ProjectFeed />
      <CommunitySection />
      <Footer />
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
};

export default Index;
