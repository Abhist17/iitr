import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Upload, ScanSearch } from "lucide-react";

export function AppHeader() {
  const location = useLocation();

  const links = [
    { to: "/upload", label: "Upload / अपलोड", icon: Upload },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/ai-verify", label: "AI Verify / AI सत्यापन", icon: ScanSearch },
  ];

  return (
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center gap-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
          <img src="/logo.svg" alt="DigiPramaan Logo" className="h-8 w-auto" />
          <span className="text-lg tracking-wide">DigiPramaan</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
