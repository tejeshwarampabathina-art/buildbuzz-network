import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = ({ onUploadClick }: { onUploadClick: () => void }) => {
  return (
    <section className="relative overflow-hidden pt-16">
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      <div className="container relative mx-auto px-4 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm text-accent mb-6 border border-border">
            <Sparkles className="h-4 w-4" />
            Where creators share, review & grow together
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Build. Share.{" "}
            <span className="gradient-text">Get Reviewed.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your projects, get expert feedback, discover solutions, and join vibrant communities of builders — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={onUploadClick}
              className="gradient-bg text-primary-foreground font-semibold text-base px-8 hover:opacity-90 transition-opacity"
            >
              Start Sharing <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-secondary font-semibold text-base px-8"
            >
              Explore Projects
            </Button>
          </div>

        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
