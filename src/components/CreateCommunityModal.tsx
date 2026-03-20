import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Image, Hash, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const categoryOptions = [
  "Frontend", "Backend", "Mobile", "AI/ML", "Design", "DevOps", "Open Source", "Other"
];

const CreateCommunityModal = ({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated?: () => void }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!user) {
      toast.error("Please sign in to create a community");
      navigate("/auth");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter a community name");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("communities").insert({
      name: name.trim(),
      description: description.trim(),
      category: category || "Other",
      creator_id: user.id,
    });

    if (error) {
      toast.error("Failed to create community");
      console.error(error);
    } else {
      toast.success(`Community "${name}" created successfully!`);
      setName("");
      setDescription("");
      setCategory("");
      onCreated?.();
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 card-shadow"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold text-foreground">Create Community</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Community Name</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. React Builders"
                  maxLength={50}
                  className="w-full h-10 rounded-lg bg-secondary border border-border pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this community about?"
                  maxLength={300}
                  className="w-full rounded-lg bg-secondary border border-border pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      category === cat
                        ? "gradient-bg text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-border"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Community Icon</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={() => setDragOver(false)}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                }`}
              >
                <Image className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop or <span className="text-primary font-medium">browse</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1 border-border text-foreground hover:bg-secondary">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="flex-1 gradient-bg text-primary-foreground hover:opacity-90 transition-opacity">
                <Users className="h-4 w-4 mr-2" /> {loading ? "Creating..." : "Create Community"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateCommunityModal;
