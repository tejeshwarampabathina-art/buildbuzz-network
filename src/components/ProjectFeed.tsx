import { useEffect, useMemo, useState } from "react";
import ProjectCard from "./ProjectCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Project {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  project_url: string | null;
  cover_image_url: string | null;
  published: boolean;
  tags: string[];
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
}

interface Profile {
  id: string;
  username: string | null;
}

interface ProjectFeedProps {
  refreshKey?: number;
}

const PLACEHOLDER_IMAGE = "/placeholder.svg";

const ProjectFeed = ({ refreshKey = 0 }: ProjectFeedProps) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const { data: projectRows, error: projectsError } = await supabase
          .from("projects")
          .select(
            "id, creator_id, title, description, project_url, cover_image_url, tags, likes_count, comments_count, views_count, created_at",
          )
          .eq("published", true)
          .order("created_at", { ascending: false });

        if (projectsError) {
          throw projectsError;
        }

        const rows = (projectRows ?? []) as Project[];
        setProjects(rows);

        const creatorIds = Array.from(new Set(rows.map((project) => project.creator_id)));
        if (creatorIds.length === 0) {
          setProfiles([]);
          return;
        }

        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", creatorIds);

        if (profilesError) {
          throw profilesError;
        }

        setProfiles((profileRows ?? []) as Profile[]);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [refreshKey]);

  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile.username || "User"])),
    [profiles],
  );

  const deleteProject = async (projectId: string) => {
    if (!user?.id) {
      toast.error("Please sign in.");
      return;
    }

    const project = projects.find((item) => item.id === projectId);
    if (!project || project.creator_id !== user.id) {
      toast.error("Only the project creator can delete this post.");
      return;
    }

    const confirmed = window.confirm("Delete this project permanently?");
    if (!confirmed) return;

    setDeletingProjectId(projectId);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("creator_id", user.id);

      if (error) {
        throw error;
      }

      setProjects((prev) => prev.filter((item) => item.id !== projectId));
      toast.success("Project deleted.");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project.");
    } finally {
      setDeletingProjectId(null);
    }
  };

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-display text-3xl font-bold text-foreground">Projects</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-[360px] rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">No projects yet</h3>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Upload your first project and it will be saved in the database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              index={index}
              title={project.title}
              author={profileMap.get(project.creator_id) || "User"}
              image={project.cover_image_url || PLACEHOLDER_IMAGE}
              projectUrl={project.project_url}
              likes={project.likes_count}
              comments={project.comments_count}
              views={project.views_count}
              tags={project.tags?.length ? project.tags : ["project"]}
              canDelete={project.creator_id === user?.id}
              isDeleting={deletingProjectId === project.id}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProjectFeed;
