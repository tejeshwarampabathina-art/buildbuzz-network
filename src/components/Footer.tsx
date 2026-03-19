const Footer = () => (
  <footer className="border-t border-border bg-card/50 mt-16">
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="gradient-bg h-7 w-7 rounded-lg flex items-center justify-center font-display font-bold text-primary-foreground text-xs">PH</div>
          <span className="font-display font-bold text-foreground">ProjectHub</span>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          {["About", "Blog", "Careers", "Privacy", "Terms"].map((item) => (
            <a key={item} href="#" className="hover:text-foreground transition-colors">{item}</a>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">© 2026 ProjectHub</p>
      </div>
    </div>
  </footer>
);

export default Footer;
