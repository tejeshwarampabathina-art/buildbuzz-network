import ProjectCard from "./ProjectCard";
import project1 from "@/assets/project-1.jpg";
import project2 from "@/assets/project-2.jpg";
import project3 from "@/assets/project-3.jpg";
import project4 from "@/assets/project-4.jpg";
import project5 from "@/assets/project-5.jpg";
import project6 from "@/assets/project-6.jpg";

const projects = [
  { title: "DevDash Analytics", author: "Sarah Chen", image: project1, likes: 234, comments: 42, views: 1200, tags: ["React", "Dashboard"] },
  { title: "FitTrack Mobile", author: "Alex Rivera", image: project2, likes: 189, comments: 31, views: 890, tags: ["Mobile", "Health"] },
  { title: "StyleVault Store", author: "Maya Patel", image: project3, likes: 312, comments: 56, views: 2100, tags: ["E-commerce", "UI/UX"] },
  { title: "SocialPulse", author: "James Wilson", image: project4, likes: 156, comments: 28, views: 750, tags: ["Analytics", "Social"] },
  { title: "ChatGenius AI", author: "Emma Thompson", image: project5, likes: 421, comments: 89, views: 3200, tags: ["AI", "Chatbot"] },
  { title: "WeatherFlow App", author: "David Kim", image: project6, likes: 267, comments: 45, views: 1500, tags: ["Weather", "Mobile"] },
];

const filters = ["All", "Web Apps", "Mobile", "AI/ML", "E-commerce", "Design", "Open Source"];

const ProjectFeed = () => {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-display text-3xl font-bold text-foreground">Trending Projects</h2>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((filter, i) => (
          <button
            key={filter}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
              i === 0
                ? "gradient-bg text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-border"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, index) => (
          <ProjectCard key={project.title} {...project} index={index} />
        ))}
      </div>
    </section>
  );
};

export default ProjectFeed;
