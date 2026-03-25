import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Image, Link, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: () => void;
}

const UploadModal = ({ isOpen, onClose, onUploaded }: UploadModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setProjectUrl("");
    setCoverImageUrl("");
    setTagsInput("");
    setIsPublished(true);
  };

  const handlePublish = async () => {
    if (!user) {
      toast.error("Please sign in to upload a project.");
      navigate("/auth");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a project name.");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a project description.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const { error } = await supabase.from("projects").insert({
        creator_id: user.id,
        title: title.trim(),
        description: description.trim(),
        project_url: projectUrl.trim() || null,
        cover_image_url: coverImageUrl.trim() || null,
        published: isPublished,
        tags,
      });

      if (error) {
        throw error;
      }

      toast.success("Project uploaded successfully.");
      resetForm();
      onUploaded?.();
      onClose();
    } catch (error) {
      console.error("Error uploading project:", error);
      toast.error("Could not upload project.");
    } finally {
      setLoading(false);
    }
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
            <h2 className="font-display text-xl font-bold text-foreground">Upload Project</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Project Name</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="My Awesome Project"
                className="w-full h-10 rounded-lg bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell us about your project..."
                className="w-full rounded-lg bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Project URL (Optional)</label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  value={projectUrl}
                  onChange={(event) => setProjectUrl(event.target.value)}
                  placeholder="https://github.com/... (optional)"
                  className="w-full h-10 rounded-lg bg-secondary border border-border pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Cover Image URL</label>
              <div className="relative">
                <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(event) => setCoverImageUrl(event.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full h-10 rounded-lg bg-secondary border border-border pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tags</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="React, TypeScript, AI..."
                  className="w-full h-10 rounded-lg bg-secondary border border-border pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Visibility</label>
              <select
                value={isPublished ? "published" : "draft"}
                onChange={(event) => setIsPublished(event.target.value === "published")}
                className="w-full h-10 rounded-lg bg-secondary border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="published">Publish now</option>
                <option value="draft">Save as draft</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1 border-border text-foreground hover:bg-secondary">
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={loading}
                className="flex-1 gradient-bg text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Upload className="h-4 w-4 mr-2" /> {loading ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UploadModal;
