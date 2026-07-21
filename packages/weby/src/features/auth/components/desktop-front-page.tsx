// oxlint-disable no-shadow: fak this shi
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useAuth, useAuthActions } from "#/features/auth/hooks/use-auth";
import { useIsBootstrapped, useBootstrapState } from "#/features/auth/hooks/use-bootstrap-state";
import { useTheme } from "#/shared/hooks/use-theme";

interface GradientTextProps {
  as?: "h1" | "h2" | "h3" | "span";
  children: React.ReactNode;
  className?: string;
}

const GradientText = ({ as: Tag = "h1", children, className = "" }: GradientTextProps) => {
  const { isDarkMode } = useTheme();
  const top = isDarkMode ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.95)";
  const mid = isDarkMode ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.55)";
  const bot = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.2)";

  return (
    <Tag
      className={className}
      style={{
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        backgroundImage: `linear-gradient(0deg, ${top} 0%, ${mid} 40%, ${bot} 100%)`,
      }}
    >
      {children}
    </Tag>
  );
};

export const DesktopFrontPage = () => {
  const navigate = useNavigate();
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const { bootstrapped, loading: isBootstrapLoading } = useIsBootstrapped();
  const { data: bootstrapData } = useBootstrapState();
  const { login } = useAuthActions();
  const { isDarkMode, toggleTheme } = useTheme();

  const [expanded, setExpanded] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // For initial setup / bootstrap flow if bootstrapped is false
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is already logged in, automatically navigate to console
  useEffect(() => {
    if (user) {
      void navigate({ replace: true, to: "/home" });
    }
  }, [user, navigate]);

  // Dismiss login dialog on Escape key
  useEffect(() => {
    if (!expanded) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (mfaRequired) {
        const res = await fetch("/api/auth/mfa/verify", {
          body: JSON.stringify({ code: mfaCode }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error || "Invalid MFA code");
        }
        void navigate({ replace: true, to: "/home" });
        return;
      }

      const result = await login(usernameOrEmail, password);
      if (result?.mfa_required) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }
      void navigate({ replace: true, to: "/home" });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
      setLoading(false);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !name) {
      setError("Please complete all required fields.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(username, password, email, name);
      void navigate({ replace: true, to: "/home" });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Setup failed");
      setLoading(false);
    }
  };

  if (isAuthLoading || isBootstrapLoading) {
    return (
      <div
        className={`min-h-screen w-full flex items-center justify-center ${
          isDarkMode ? "bg-bg-dark text-text-dark" : "bg-bg-light text-text-light"
        }`}
      >
        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
      </div>
    );
  }

  const isSetupNeeded = bootstrapData?.bootstrapped === false || bootstrapped === false;

  const renderBootstrapForm = () => (
    <form className="space-y-3 text-left" onSubmit={handleBootstrapSubmit}>
      <div>
        <label className="block text-[11px] lowercase mb-1 opacity-60" htmlFor="setup-username">
          username
        </label>
        <input
          id="setup-username"
          className={`w-full border-b py-1.5 text-xs outline-none bg-transparent ${
            isDarkMode
              ? "border-border-dark focus:border-text-dark"
              : "border-border-light focus:border-text-light"
          }`}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
          required
          type="text"
          value={username}
        />
      </div>
      <div>
        <label className="block text-[11px] lowercase mb-1 opacity-60" htmlFor="setup-name">
          your name
        </label>
        <input
          id="setup-name"
          className={`w-full border-b py-1.5 text-xs outline-none bg-transparent ${
            isDarkMode
              ? "border-border-dark focus:border-text-dark"
              : "border-border-light focus:border-text-light"
          }`}
          onChange={(e) => setName(e.target.value)}
          placeholder="alex"
          required
          type="text"
          value={name}
        />
      </div>
      <div>
        <label className="block text-[11px] lowercase mb-1 opacity-60" htmlFor="setup-email">
          email
        </label>
        <input
          id="setup-email"
          className={`w-full border-b py-1.5 text-xs outline-none bg-transparent ${
            isDarkMode
              ? "border-border-dark focus:border-text-dark"
              : "border-border-light focus:border-text-light"
          }`}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@example.com"
          required
          type="email"
          value={email}
        />
      </div>
      <div>
        <label className="block text-[11px] lowercase mb-1 opacity-60" htmlFor="setup-password">
          password
        </label>
        <div className="relative">
          <input
            id="setup-password"
            className={`w-full border-b py-1.5 pr-8 text-xs outline-none bg-transparent ${
              isDarkMode
                ? "border-border-dark focus:border-text-dark"
                : "border-border-light focus:border-text-light"
            }`}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-0 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            onClick={() => setShowPassword((s) => !s)}
            type="button"
          >
            {showPassword ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />}
          </button>
        </div>
      </div>
      <button
        className={`w-full mt-4 py-2.5 text-xs font-semibold lowercase transition-colors ${
          isDarkMode
            ? "bg-text-dark text-bg-dark hover:bg-text-dark/90"
            : "bg-text-light text-bg-light hover:bg-text-light/90"
        } disabled:opacity-50`}
        disabled={loading}
        type="submit"
      >
        {loading ? "creating account..." : "create account"}
      </button>
    </form>
  );

  const renderMfaForm = () => (
    <form className="space-y-3 text-left" onSubmit={handleLoginSubmit}>
      <div>
        <label className="block text-[11px] lowercase mb-1 opacity-60" htmlFor="login-mfa">
          mfa authentication code
        </label>
        <input
          id="login-mfa"
          className={`w-full border-b py-1.5 text-xs outline-none bg-transparent text-center tracking-widest ${
            isDarkMode
              ? "border-border-dark focus:border-text-dark"
              : "border-border-light focus:border-text-light"
          }`}
          maxLength={6}
          onChange={(e) => setMfaCode(e.target.value)}
          placeholder="000000"
          required
          type="text"
          value={mfaCode}
        />
      </div>
      <button
        className={`w-full mt-4 py-2.5 text-xs font-semibold lowercase transition-colors ${
          isDarkMode
            ? "bg-text-dark text-bg-dark hover:bg-text-dark/90"
            : "bg-text-light text-bg-light hover:bg-text-light/90"
        } disabled:opacity-50`}
        disabled={loading}
        type="submit"
      >
        {loading ? "verifying..." : "verify code"}
      </button>
    </form>
  );

  const renderLoginForm = () => (
    <form className="space-y-3 text-left" onSubmit={handleLoginSubmit}>
      <div>
        <label className="block text-[11px] lowercase mb-1 opacity-60" htmlFor="login-user">
          username or email
        </label>
        <input
          id="login-user"
          className={`w-full border-b py-1.5 text-xs outline-none bg-transparent ${
            isDarkMode
              ? "border-border-dark focus:border-text-dark"
              : "border-border-light focus:border-text-light"
          }`}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          placeholder="username or email"
          required
          type="text"
          value={usernameOrEmail}
        />
      </div>
      <div>
        <label className="block text-[11px] lowercase mb-1 opacity-60" htmlFor="login-pass">
          password
        </label>
        <div className="relative">
          <input
            id="login-pass"
            className={`w-full border-b py-1.5 pr-8 text-xs outline-none bg-transparent ${
              isDarkMode
                ? "border-border-dark focus:border-text-dark"
                : "border-border-light focus:border-text-light"
            }`}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-0 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            onClick={() => setShowPassword((s) => !s)}
            type="button"
          >
            {showPassword ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />}
          </button>
        </div>
      </div>
      <button
        className={`w-full mt-4 py-2.5 text-xs font-semibold lowercase transition-colors ${
          isDarkMode
            ? "bg-text-dark text-bg-dark hover:bg-text-dark/90"
            : "bg-text-light text-bg-light hover:bg-text-light/90"
        } disabled:opacity-50`}
        disabled={loading}
        type="submit"
      >
        {loading ? "logging in..." : "log in"}
      </button>
    </form>
  );

  const renderActiveForm = () => {
    if (isSetupNeeded) {
      return renderBootstrapForm();
    }
    if (mfaRequired) {
      return renderMfaForm();
    }
    return renderLoginForm();
  };

  return (
    <div
      data-theme={isDarkMode ? "dark" : "light"}
      className={`min-h-screen w-full flex flex-col justify-between select-none transition-colors duration-300 ${
        isDarkMode ? "bg-bg-dark text-text-dark" : "bg-bg-light text-text-light"
      }`}
    >
      {/* Top navbar with unboxed theme toggle with icons */}
      <header className="p-4 sm:p-6 flex items-center justify-end w-full">
        <button
          aria-label="Toggle theme"
          className={`flex items-center gap-1.5 text-xs lowercase transition-opacity opacity-50 hover:opacity-100 focus:outline-none ${
            isDarkMode ? "text-text-dark" : "text-text-light"
          }`}
          onClick={toggleTheme}
          type="button"
        >
          {isDarkMode ? <SunIcon size={14} /> : <MoonIcon size={14} />}
          <span>{isDarkMode ? "light" : "dark"}</span>
        </button>
      </header>

      {/* Main middle section with Footer-style About Logo & Text */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center max-w-xl mx-auto w-full">
        <div className="flex flex-col items-center">
          <div className="flex items-end gap-3 sm:gap-5 justify-center">
            <img
              alt="verso"
              className="h-16 sm:h-24 lg:h-28 mb-2 opacity-85 select-none"
              src="/verso.svg"
            />
            <GradientText
              as="h1"
              className="text-7xl sm:text-9xl lg:text-[9.5em] font-bold tracking-tight lowercase select-none"
            >
              verso
            </GradientText>
          </div>
          <a
            className={`mt-2 text-xs sm:text-sm lowercase tracking-wider transition-opacity opacity-40 hover:opacity-90 ${
              isDarkMode ? "text-text-dark" : "text-text-light"
            }`}
            href="https://amemorymachine.cc"
            rel="noopener noreferrer"
            target="_blank"
          >
            amemorymachine.cc
          </a>
        </div>

        {/* Next Button / Unboxed Smooth Expand & Collapse Form Container */}
        <div className="mt-8 sm:mt-10 w-full flex flex-col items-center">
          {/* Unboxed Next Button (fades out when expanded) */}
          <div
            className={`transition-all duration-300 ${
              expanded ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100 h-auto"
            }`}
          >
            <button
              className={`group flex items-center gap-1.5 text-sm font-medium lowercase transition-opacity opacity-60 hover:opacity-100 focus:outline-none py-2 px-3 ${
                isDarkMode ? "text-text-dark" : "text-text-light"
              }`}
              onClick={() => setExpanded(true)}
              type="button"
            >
              <span>next</span>
              <ArrowRightIcon
                className="transition-transform duration-300 group-hover:translate-x-1"
                size={15}
              />
            </button>
          </div>

          {/* Fluent Smooth Expand & Collapse Grid Animation */}
          <div
            className={`grid transition-all duration-500 ease-in-out w-full max-w-sm ${
              expanded
                ? "grid-rows-[1fr] opacity-100 mt-4"
                : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
            }`}
          >
            <div className="overflow-hidden">
              <div className="relative w-full px-6 py-4">
                {/* Dismiss close button */}
                <button
                  aria-label="Dismiss login form"
                  className={`absolute right-2 top-0 p-1 transition-opacity opacity-40 hover:opacity-100 focus:outline-none ${
                    isDarkMode ? "text-text-dark" : "text-text-light"
                  }`}
                  onClick={() => setExpanded(false)}
                  type="button"
                >
                  <XIcon size={14} />
                </button>

                <h2 className="text-xs font-semibold uppercase tracking-widest text-center mb-4 opacity-70">
                  {isSetupNeeded ? "initialize verso" : "welcome back"}
                </h2>

                {error && (
                  <div
                    className={`mb-4 p-2.5 text-xs rounded border text-center ${
                      isDarkMode
                        ? "border-red-900/50 bg-red-950/30 text-red-300"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {error}
                  </div>
                )}

                {renderActiveForm()}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[10px] lowercase opacity-40">
        &copy; {new Date().getFullYear()} verso. open source &middot; MIT &middot; yours.
      </footer>
    </div>
  );
};
