
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ColorTheme = "light" | "purple" | "blue" | "green" | "dark";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ColorTheme>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("color-theme") as ColorTheme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const toggleTheme = (newTheme: ColorTheme) => {
    setTheme(newTheme);
    localStorage.setItem("color-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Button 
        variant="outline" 
        size="sm" 
        className={`px-3 ${theme === 'light' ? 'bg-primary text-primary-foreground' : ''}`}
        onClick={() => toggleTheme("light")}
      >
        <Sun className="h-4 w-4 mr-1" />
        Light
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className={`px-3 ${theme === 'purple' ? 'bg-primary text-primary-foreground' : ''}`}
        onClick={() => toggleTheme("purple")}
      >
        Purple
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className={`px-3 ${theme === 'blue' ? 'bg-primary text-primary-foreground' : ''}`}
        onClick={() => toggleTheme("blue")}
      >
        Blue
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className={`px-3 ${theme === 'green' ? 'bg-primary text-primary-foreground' : ''}`}
        onClick={() => toggleTheme("green")}
      >
        Green
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className={`px-3 ${theme === 'dark' ? 'bg-primary text-primary-foreground' : ''}`}
        onClick={() => toggleTheme("dark")}
      >
        <Moon className="h-4 w-4 mr-1" />
        Dark
      </Button>
    </div>
  );
}
