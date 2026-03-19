import { motion } from "framer-motion";
import { Heart, MessageCircle, Eye, ArrowUpRight } from "lucide-react";
import { useState } from "react";

interface ProjectCardProps {
  title: string;
  author: string;
  image: string;
  likes: number;
  comments: number;
  views: number;
  tags: string[];
  index: number;
}

const ProjectCard = ({ title, author, image, likes, comments, views, tags, index }: ProjectCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group rounded-xl bg-card border border-border overflow-hidden card-shadow hover:card-glow transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
          <button className="gradient-bg text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1 hover:opacity-90 transition-opacity">
            View Project <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-sm text-muted-foreground">by {author}</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-3 flex-wrap">
          {tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 text-muted-foreground text-sm">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition-colors ${liked ? "text-primary" : "hover:text-primary"}`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-primary" : ""}`} />
            {likeCount}
          </button>
          <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
            <MessageCircle className="h-4 w-4" /> {comments}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" /> {views}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
