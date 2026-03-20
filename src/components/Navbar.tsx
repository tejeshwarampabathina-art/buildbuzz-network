import { useState } from "react";
import { Search, Upload, Bell, Menu, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

const Navbar = ({ onUploadClick }: { onUploadClick: () => void }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Smart Hub" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-display text-xl font-bold text-foreground">Smart Hub</span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {[
            { label: "Explore", href: "#explore" },
            { label: "Communities", href: "#communities" },
            { label: "Trending", href: "#explore" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              className="h-9 w-64 rounded-lg bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
          </Button>
          <Button onClick={onUploadClick} className="gradient-bg font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border bg-background overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {[
                { label: "Explore", href: "#explore" },
                { label: "Communities", href: "#communities" },
                { label: "Trending", href: "#explore" },
              ].map((item) => (
                <a key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary rounded-lg">
                  {item.label}
                </a>
              ))}
              <Button onClick={onUploadClick} className="w-full gradient-bg text-primary-foreground">
                <Upload className="h-4 w-4 mr-2" /> Upload Project
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
