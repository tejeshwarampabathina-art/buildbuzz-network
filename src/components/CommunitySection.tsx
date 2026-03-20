import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, ArrowRight, Plus, Code2, Palette, Brain, Globe, Cpu, Server, GitBranch, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import CreateCommunityModal from "./CreateCommunityModal";

const categoryIcons: Record<string, React.ElementType> = {
  Frontend: Code2,
  Backend: Server,
  Mobile: Cpu,
  "AI/ML": Brain,
  Design: Palette,
  DevOps: GitBranch,
  "Open Source": Globe,
  Other: Layers,
};

interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  member_count: number;
}

const CommunitySection = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommunities = async () => {
    const { data, error } = await supabase
      .from("communities")
      .select("id, name, description, category, member_count")
      .order("created_at", { ascending: false })
      .limit(8);

    if (!error && data) {
      setCommunities(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const formatMembers = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-6 animate-pulse">
              <div className="h-12 w-12 rounded-xl bg-secondary mb-4" />
              <div className="h-4 w-24 bg-secondary rounded mb-2" />
              <div className="h-3 w-full bg-secondary rounded mb-3" />
              <div className="h-3 w-16 bg-secondary rounded" />
            </div>
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-border">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No communities yet. Be the first to create one!</p>
          <Button onClick={() => setCreateOpen(true)} className="gradient-bg text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" /> Create Community
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {communities.map((community, index) => {
            const Icon = categoryIcons[community.category] || Layers;
            return (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="group rounded-xl bg-card border border-border p-6 hover:border-primary/50 hover:card-glow transition-all duration-300 cursor-pointer"
              >
                <div className="gradient-bg h-12 w-12 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">{community.name}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{community.description}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {formatMembers(community.member_count)} members
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <CreateCommunityModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchCommunities} />
    </section>
  );
};

export default CommunitySection;
