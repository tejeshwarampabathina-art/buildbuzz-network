import { useState } from "react";
import { motion } from "framer-motion";
import { Users, ArrowRight, Plus, Code2, Palette, Brain, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateCommunityModal from "./CreateCommunityModal";

const communities = [
  { name: "Frontend Devs", members: "3.2K", icon: Code2, description: "React, Vue, Angular & more" },
  { name: "UI/UX Designers", members: "2.8K", icon: Palette, description: "Design systems & prototyping" },
  { name: "AI Builders", members: "1.9K", icon: Brain, description: "ML models & AI applications" },
  { name: "Open Source", members: "4.1K", icon: Globe, description: "Contribute & collaborate" },
];

const CommunitySection = () => {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">Join a Community</h2>
          <p className="text-muted-foreground">Connect with like-minded builders and grow together</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)} className="gradient-bg text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4 mr-2" /> Create
          </Button>
          <Button variant="ghost" className="text-primary hover:text-primary/80">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {communities.map((community, index) => (
          <motion.div
            key={community.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="group rounded-xl bg-card border border-border p-6 hover:border-primary/50 hover:card-glow transition-all duration-300 cursor-pointer"
          >
            <div className="gradient-bg h-12 w-12 rounded-xl flex items-center justify-center mb-4">
              <community.icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-1">{community.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{community.description}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {community.members} members
            </div>
          </motion.div>
        ))}
      </div>

      <CreateCommunityModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </section>
  );
};

export default CommunitySection;
