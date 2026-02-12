import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  ArrowRight, 
  Search, 
  Mail, 
  Sparkles,
  FlaskConical,
  BookOpen,
  Users
} from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center transition-transform group-hover:scale-105">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">Profectorus</span>
        </Link>
        <Link to="/app">
          <Button variant="outline" size="sm" className="gap-2">
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in">
              <Sparkles className="h-4 w-4" />
              AI-Powered Research Outreach
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-tight animate-slide-up">
              Land Your Dream{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
                Research Position
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Automatically find professors, analyze their research, and generate personalized cold emails — all in three simple steps.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Link to="/app">
                <Button size="lg" className="gap-2 text-base px-8 py-6 rounded-xl shadow-elevated">
                  Start Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="max-w-4xl mx-auto mt-20 grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                title: "Find Professors",
                description: "Search any university's faculty directory and discover research-active professors in your field.",
                step: "Step 1",
              },
              {
                icon: FlaskConical,
                title: "Analyze Research",
                description: "AI extracts each professor's research interests so you can find the perfect match.",
                step: "Step 2",
              },
              {
                icon: Mail,
                title: "Generate Emails",
                description: "Get personalized cold emails with your resume auto-attached as Gmail drafts.",
                step: "Step 3",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="glass-card rounded-2xl p-6 space-y-4 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {feature.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Profectorus — Helping students find research opportunities
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
