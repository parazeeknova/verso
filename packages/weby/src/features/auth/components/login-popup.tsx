import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useRateLimitedCallback } from "@tanstack/react-pacer";
import { gsap } from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuthUser, Stats } from "#/shared/types";
import { useAuth, useAuthActions } from "../hooks/use-auth";
import { useBootstrapState } from "../hooks/use-bootstrap-state";

interface LoginPopupProps {
  isDarkMode: boolean;
}

type PopupMode = "loading" | "login" | "bootstrap" | "account";

const validateUsername = (value: string): string | undefined => {
  if (value.length < 1) {
    return "required";
  }
  if (value.length < 3) {
    return "min 3 chars";
  }
  return undefined;
};

const validateEmail = (value: string): string | undefined => {
  if (value.length < 1) {
    return "required";
  }
  if (value.includes("@")) {
    return undefined;
  }
  return "invalid email";
};

const validatePassword = (value: string): string | undefined => {
  if (value.length < 1) {
    return "required";
  }
  if (value.length < 8) {
    return "min 8 chars";
  }
  return undefined;
};

interface BootstrapValues {
  email: string;
  name: string;
  password: string;
  spaceName: string;
  username: string;
  workspaceName: string;
}

interface BootstrapFlowProps {
  isDarkMode: boolean;
  onSubmit: (values: BootstrapValues) => void;
  serverError: string | null;
}

const BootstrapFlow = ({ isDarkMode, onSubmit, serverError }: BootstrapFlowProps) => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
      spaceName: "",
      username: "",
      workspaceName: "",
    } as BootstrapValues,
    onSubmit: ({ value }) => {
      onSubmit(value);
    },
  });

  const handleContinue = () => {
    const u = form.getFieldValue("username");
    const e = form.getFieldValue("email");
    const p = form.getFieldValue("password");
    if (validateUsername(u) || validateEmail(e) || validatePassword(p)) {
      form.validateAllFields("change");
      return false;
    }
    setStep(2);
    return true;
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (step === 1) {
          handleContinue();
        } else {
          form.handleSubmit();
        }
      }}
    >
      {step === 1 && (
        <>
          <form.Field
            name="username"
            validators={{
              onChange: ({ value }) => validateUsername(value),
            }}
          >
            {(field) => (
              <div>
                <input
                  aria-label="Username"
                  className={`w-full border-b py-1.5 text-[13px] lowercase outline-none bg-transparent ${
                    isDarkMode
                      ? "border-border-dark placeholder:text-text-dark/30"
                      : "border-border-light placeholder:text-text-light/30"
                  }`}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="username"
                  value={field.state.value}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className={`mt-1 text-[11px] ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => validateEmail(value),
            }}
          >
            {(field) => (
              <div>
                <input
                  aria-label="Email"
                  className={`w-full border-b py-1.5 text-[13px] lowercase outline-none bg-transparent ${
                    isDarkMode
                      ? "border-border-dark placeholder:text-text-dark/30"
                      : "border-border-light placeholder:text-text-light/30"
                  }`}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="email"
                  type="email"
                  value={field.state.value}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className={`mt-1 text-[11px] ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => validatePassword(value),
            }}
          >
            {(field) => (
              <div>
                <div className="relative">
                  <input
                    aria-label="Password"
                    className={`w-full border-b py-1.5 pr-7 text-[13px] lowercase outline-none bg-transparent ${
                      isDarkMode
                        ? "border-border-dark placeholder:text-text-dark/30"
                        : "border-border-light placeholder:text-text-light/30"
                    }`}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="password"
                    type={showPassword ? "text" : "password"}
                    value={field.state.value}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 ${
                      isDarkMode
                        ? "text-text-dark/30 hover:text-text-dark/60"
                        : "text-text-light/30 hover:text-text-light/60"
                    }`}
                    onClick={() => setShowPassword((s) => !s)}
                    type="button"
                  >
                    {showPassword ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />}
                  </button>
                </div>
                {field.state.meta.errors.length > 0 && (
                  <p className={`mt-1 text-[11px] ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <button
            className={`w-full py-1.5 text-[13px] lowercase ${
              isDarkMode
                ? "text-text-dark/50 hover:text-text-dark/80"
                : "text-text-light/50 hover:text-text-light/80"
            } disabled:opacity-30`}
            type="submit"
          >
            continue
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => (value.length < 1 ? "required" : undefined),
            }}
          >
            {(field) => (
              <div>
                <input
                  aria-label="Name"
                  className={`w-full border-b py-1.5 text-[13px] lowercase outline-none bg-transparent ${
                    isDarkMode
                      ? "border-border-dark placeholder:text-text-dark/30"
                      : "border-border-light placeholder:text-text-light/30"
                  }`}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="your name"
                  value={field.state.value}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className={`mt-1 text-[11px] ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="workspaceName"
            validators={{
              onChange: ({ value }) => (value.length < 1 ? "required" : undefined),
            }}
          >
            {(field) => (
              <div>
                <input
                  aria-label="Workspace name"
                  className={`w-full border-b py-1.5 text-[13px] lowercase outline-none bg-transparent ${
                    isDarkMode
                      ? "border-border-dark placeholder:text-text-dark/30"
                      : "border-border-light placeholder:text-text-light/30"
                  }`}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="workspace name"
                  value={field.state.value}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className={`mt-1 text-[11px] ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="spaceName">
            {(field) => (
              <div>
                <input
                  aria-label="Space name (optional)"
                  className={`w-full border-b py-1.5 text-[13px] lowercase outline-none bg-transparent ${
                    isDarkMode
                      ? "border-border-dark placeholder:text-text-dark/30"
                      : "border-border-light placeholder:text-text-light/30"
                  }`}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="space name (optional)"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          {serverError && (
            <p className={`text-[11px] ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
              {serverError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              className={`flex-1 py-1.5 text-[13px] lowercase ${
                isDarkMode
                  ? "text-text-dark/50 hover:text-text-dark/80"
                  : "text-text-light/50 hover:text-text-light/80"
              }`}
              onClick={() => setStep(1)}
              type="button"
            >
              back
            </button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <button
                  className={`flex-1 py-1.5 text-[13px] lowercase ${
                    isDarkMode
                      ? "text-text-dark/50 hover:text-text-dark/80"
                      : "text-text-light/50 hover:text-text-light/80"
                  } disabled:opacity-30`}
                  disabled={!canSubmit}
                  type="submit"
                >
                  {isSubmitting ? "..." : "create account"}
                </button>
              )}
            </form.Subscribe>
          </div>
        </>
      )}
    </form>
  );
};

interface AccountPanelProps {
  user: Pick<AuthUser, "username" | "email">;
  stats: { pages: number; posts: number; readmes: number } | undefined;
  onLogout: () => void;
  onNavigateConsole: () => void;
  isDarkMode: boolean;
}

const AccountPanel = ({
  user,
  stats,
  onLogout,
  onNavigateConsole,
  isDarkMode,
}: AccountPanelProps) => (
  <div className="space-y-3">
    <div className={`border-b pb-3 ${isDarkMode ? "border-border-dark" : "border-border-light"}`}>
      <p className={`text-[13px] ${isDarkMode ? "text-text-dark" : "text-text-light"}`}>
        @{user.username}
      </p>
      <p
        className={`mt-0.5 text-[11px] ${isDarkMode ? "text-text-dark/50" : "text-text-light/50"}`}
      >
        {user.email}
      </p>
    </div>

    {stats && (
      <div className={`text-[11px] ${isDarkMode ? "text-text-dark/40" : "text-text-light/40"}`}>
        <span className="mr-3">pages {stats.pages}</span>
        <span className="mr-3">posts {stats.posts}</span>
        <span>readmes {stats.readmes}</span>
      </div>
    )}

    <div
      className={`flex gap-0 border-t pt-3 ${isDarkMode ? "border-border-dark" : "border-border-light"}`}
    >
      <button
        className={`flex-1 py-1.5 text-[13px] lowercase ${
          isDarkMode
            ? "text-text-dark/50 hover:text-text-dark/80"
            : "text-text-light/50 hover:text-text-light/80"
        }`}
        onClick={onNavigateConsole}
        type="button"
      >
        console
      </button>
      <button
        className={`flex-1 py-1.5 text-[13px] lowercase ${
          isDarkMode ? "text-red-300/60 hover:text-red-300" : "text-red-600/60 hover:text-red-600"
        }`}
        onClick={onLogout}
        type="button"
      >
        logout
      </button>
    </div>
  </div>
);

export const LoginPopup = ({ isDarkMode }: LoginPopupProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PopupMode>("loading");
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: user } = useAuth();
  const { data: bootstrapState } = useBootstrapState();
  const { login: loginAction, logout } = useAuthActions();
  const navigate = useNavigate();

  const { data: stats } = useQuery<Stats>({
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/stats", { signal });
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      return response.json() as Promise<Stats>;
    },
    queryKey: ["stats"],
    staleTime: 5 * 60 * 1000,
  });

  const isAuthenticated = user !== undefined && user !== null;

  const handleLogin = useRateLimitedCallback(
    async (usernameOrEmail: string, password: string) => {
      setServerError(null);
      try {
        const result = await loginAction(usernameOrEmail, password);
        if (result.mfa_required) {
          setOpen(false);
          void navigate({ to: "/mfa-challenge" });
          return;
        }
        setOpen(false);
        void navigate({ to: "/home" });
      } catch (error) {
        setServerError(error instanceof Error ? error.message : "Login failed");
      }
    },
    { limit: 5, window: 10_000, windowType: "sliding" },
  );

  const loginForm = useForm({
    defaultValues: {
      password: "",
      usernameOrEmail: "",
    },
    onSubmit: async ({ value }) => {
      await handleLogin(value.usernameOrEmail, value.password);
    },
  });

  const handleOpenPopup = useCallback(() => {
    if (isAuthenticated) {
      setMode("account");
      setOpen(true);
      return;
    }
    setServerError(null);
    setMode(bootstrapState?.bootstrapped ? "login" : "bootstrap");
    setOpen(true);
  }, [isAuthenticated, bootstrapState]);

  useEffect(() => {
    if (open && cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, scale: 0.96, y: 12 },
        { duration: 0.2, ease: "power2.out", opacity: 1, scale: 1, y: 0 },
      );
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open]);

  return (
    <>
      <button
        className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6 flex items-center gap-1.5 text-[10px] lowercase select-none border px-2.5 py-1 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-800/10 dark:border-neutral-100/10 text-neutral-800/50 dark:text-neutral-100/50 hover:border-neutral-800/20 dark:hover:border-neutral-100/20 cursor-pointer shadow-sm"
        onClick={() => {
          if (isAuthenticated) {
            handleOpenPopup();
          } else {
            void navigate({ to: "/about" });
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          handleOpenPopup();
        }}
        type="button"
      >
        <img src="/verso.svg" alt="verso" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
        {isAuthenticated ? (
          <span>
            by{" "}
            <span className="font-semibold hover:underline text-neutral-800 dark:text-neutral-100">
              @{user.username}
            </span>
          </span>
        ) : (
          <span>
            by{" "}
            <a
              href="/about"
              className="font-semibold hover:underline text-neutral-800 dark:text-neutral-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void navigate({ to: "/about" });
              }}
            >
              verso
            </a>
          </span>
        )}
      </button>

      {open && (
        <div aria-label="Login" aria-modal="true" className="fixed inset-0 z-50" role="dialog">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div
            ref={cardRef}
            className={`absolute right-4 bottom-16 w-64 border p-4 shadow-xl sm:right-6 sm:bottom-20 ${
              isDarkMode ? "border-border-dark bg-bg-dark" : "border-border-light bg-bg-light"
            }`}
          >
            <p
              className={`mb-4 text-[13px] ${
                isDarkMode ? "text-text-dark/60" : "text-text-light/60"
              }`}
            >
              powered by{" "}
              <a href="/about" className="underline" target="_blank" rel="noopener noreferrer">
                verso
              </a>{" "}
              a personal knowledge base and folio
            </p>

            {mode === "loading" && (
              <p
                className={`text-center text-[13px] ${
                  isDarkMode ? "text-text-dark/50" : "text-text-light/50"
                }`}
              >
                loading...
              </p>
            )}

            {mode === "login" && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  loginForm.handleSubmit();
                }}
              >
                <loginForm.Field
                  name="usernameOrEmail"
                  validators={{
                    onChange: ({ value }) => (value.length < 1 ? "required" : undefined),
                  }}
                >
                  {(field) => (
                    <div>
                      <input
                        aria-label="Username or email"
                        className={`w-full border-b py-1.5 text-[13px] lowercase outline-none bg-transparent ${
                          isDarkMode
                            ? "border-border-dark placeholder:text-text-dark/30"
                            : "border-border-light placeholder:text-text-light/30"
                        }`}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="username or email"
                        value={field.state.value}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p
                          className={`mt-1 text-[11px] ${
                            isDarkMode ? "text-red-300" : "text-red-600"
                          }`}
                        >
                          {field.state.meta.errors.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </loginForm.Field>

                <loginForm.Field
                  name="password"
                  validators={{
                    onChange: ({ value }) => (value.length < 1 ? "required" : undefined),
                  }}
                >
                  {(field) => (
                    <div>
                      <div className="relative">
                        <input
                          aria-label="Password"
                          className={`w-full border-b py-1.5 pr-7 text-[13px] lowercase outline-none bg-transparent ${
                            isDarkMode
                              ? "border-border-dark placeholder:text-text-dark/30"
                              : "border-border-light placeholder:text-text-light/30"
                          }`}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="password"
                          type={showPassword ? "text" : "password"}
                          value={field.state.value}
                        />
                        <button
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className={`absolute right-0 top-1/2 -translate-y-1/2 ${
                            isDarkMode
                              ? "text-text-dark/30 hover:text-text-dark/60"
                              : "text-text-light/30 hover:text-text-light/60"
                          }`}
                          onClick={() => setShowPassword((s) => !s)}
                          type="button"
                        >
                          {showPassword ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />}
                        </button>
                      </div>
                      {field.state.meta.errors.length > 0 && (
                        <p
                          className={`mt-1 text-[11px] ${
                            isDarkMode ? "text-red-300" : "text-red-600"
                          }`}
                        >
                          {field.state.meta.errors.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </loginForm.Field>

                {serverError && (
                  <p className={`text-[11px] ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                    {serverError}
                  </p>
                )}

                <loginForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <button
                      className={`w-full py-1.5 text-[13px] lowercase ${
                        isDarkMode
                          ? "text-text-dark/50 hover:text-text-dark/80"
                          : "text-text-light/50 hover:text-text-light/80"
                      } disabled:opacity-30`}
                      disabled={!canSubmit}
                      type="submit"
                    >
                      {isSubmitting ? "..." : "login"}
                    </button>
                  )}
                </loginForm.Subscribe>
              </form>
            )}

            {mode === "bootstrap" && (
              <BootstrapFlow
                isDarkMode={isDarkMode}
                onSubmit={async (value) => {
                  setServerError(null);
                  try {
                    await loginAction(
                      value.username,
                      value.password,
                      value.email,
                      value.name,
                      value.workspaceName,
                      value.spaceName,
                    );
                    setOpen(false);
                    void navigate({ to: "/home" });
                  } catch (error) {
                    setServerError(error instanceof Error ? error.message : "Bootstrap failed");
                  }
                }}
                serverError={serverError}
              />
            )}

            {mode === "account" && user && (
              <AccountPanel
                isDarkMode={isDarkMode}
                onLogout={() => {
                  logout();
                  setOpen(false);
                }}
                onNavigateConsole={() => {
                  setOpen(false);
                  void navigate({ to: "/home" });
                }}
                stats={stats ?? undefined}
                user={user}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};
