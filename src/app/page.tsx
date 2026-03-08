"use client";

import { FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type ChatSessionSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

type PublicUser = {
  id: string;
  email: string;
  createdAt: string;
};

type AuthMode = "signin" | "signup";

const INITIAL_ASSISTANT_MESSAGE =
  "Please paste your challenge using the starter **'It would be great if I/We...'**. For more information, refer to the **Clarify Step 1** section of the guide.";

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [registrationKey, setRegistrationKey] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: INITIAL_ASSISTANT_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<ChatSessionSummary[]>([]);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const payload = (await response.json()) as { authenticated?: boolean; user?: PublicUser };
        if (response.ok && payload.authenticated && payload.user) {
          setUser(payload.user);
        }
      } finally {
        setIsCheckingAuth(false);
      }
    }

    void loadSession();
  }, []);

  useEffect(() => {
    if (!user) {
      setSavedSessions([]);
      setActiveSessionId(null);
      return;
    }

    void refreshSessions();
  }, [user]);

  async function refreshSessions(): Promise<ChatSessionSummary[]> {
    const response = await fetch("/api/clarify/sessions", { cache: "no-store" });
    const payload = (await response.json()) as { sessions?: ChatSessionSummary[] };
    if (response.ok && Array.isArray(payload.sessions)) {
      setSavedSessions(payload.sessions);
      return payload.sessions;
    }
    return [];
  }

  async function loadChatSession(sessionId: string): Promise<void> {
    if (isLoading || loadingSessionId) return;

    setLoadingSessionId(sessionId);
    setError("");

    try {
      const response = await fetch(`/api/clarify/sessions/${sessionId}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        session?: { id: string; messages: ChatMessage[] };
        error?: string;
      };

      if (!response.ok || !payload.session) {
        throw new Error(payload.error ?? "Unable to load session.");
      }

      setMessages(payload.session.messages);
      setActiveSessionId(payload.session.id);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to load this session.";
      setError(message);
    } finally {
      setLoadingSessionId(null);
    }
  }

  function startNewSession(): void {
    setActiveSessionId(null);
    setMessages([{ role: "assistant", content: INITIAL_ASSISTANT_MESSAGE }]);
    setInput("");
    setError("");
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authLoading) return;

    setAuthError("");
    setAuthLoading(true);

    try {
      const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const body =
        authMode === "signup"
          ? {
              email: authEmail,
              password: authPassword,
              registrationKey,
            }
          : {
              email: authEmail,
              password: authPassword,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as { user?: PublicUser; error?: string };
      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Authentication failed.");
      }

      setUser(payload.user);
      setAuthPassword("");
      setRegistrationKey("");
      startNewSession();
      await refreshSessions();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unexpected authentication error.";
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut(): Promise<void> {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    startNewSession();
    setSavedSessions([]);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || !user) return;

    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/clarify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: nextMessages, sessionId: activeSessionId }),
      });

      const payload = (await response.json()) as { reply?: string; error?: string; sessionId?: string };
      if (!response.ok || !payload.reply) {
        throw new Error(payload.error || "Failed to generate Clarify response.");
      }

      setMessages((current) => [...current, { role: "assistant", content: payload.reply as string }]);
      if (payload.sessionId) {
        setActiveSessionId(payload.sessionId);
      }
      await refreshSessions();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "An unexpected error occurred while contacting Clarify Bot.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#f7eed4_0%,#edf2f4_45%,#eaf4eb_100%)] p-4 sm:p-8">
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl backdrop-blur">
          <p className="text-sm text-muted-foreground">Checking session...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#f7eed4_0%,#edf2f4_45%,#eaf4eb_100%)] p-4 sm:p-8">
      <main className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[280px_1fr]">
        {user ? (
          <aside className="rounded-3xl border border-black/10 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1e2a38]">Sessions</h2>
              <Button type="button" variant="outline" className="h-8" onClick={startNewSession}>
                New
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {savedSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No saved sessions yet.</p>
              ) : (
                savedSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                      activeSessionId === session.id
                        ? "border-[#2f6a4f] bg-[#e9f4ee]"
                        : "border-black/10 bg-white hover:bg-[#f8faf9]"
                    }`}
                    onClick={() => void loadChatSession(session.id)}
                    disabled={loadingSessionId === session.id}
                  >
                    <p className="truncate font-medium text-[#1f2933]">{session.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{new Date(session.updatedAt).toLocaleString()}</p>
                  </button>
                ))
              )}
            </div>
          </aside>
        ) : null}

        <section className="flex flex-col gap-4 rounded-3xl border border-black/10 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-6">
          <header className="rounded-2xl bg-[#1e2a38] p-5 text-[#f8f4e7]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#d4e1eb]">SUNY Buffalo Clarify</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Clarify Bot</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#d9e4eb] sm:text-base">
            Clarify-stage facilitator for challenge framing, context gathering, and focus-question options.
          </p>
          {user ? (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs">
              <span>Signed in as {user.email}</span>
              <Button type="button" variant="secondary" className="h-8" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          ) : null}
          </header>

          {!user ? (
            <section className="rounded-2xl border border-black/10 bg-[#fbfbf9] p-4 sm:p-5">
            <div className="mb-4 flex gap-2">
              <Button
                type="button"
                variant={authMode === "signin" ? "default" : "outline"}
                onClick={() => {
                  setAuthMode("signin");
                  setAuthError("");
                }}
              >
                Sign in
              </Button>
              <Button
                type="button"
                variant={authMode === "signup" ? "default" : "outline"}
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError("");
                }}
              >
                Sign up
              </Button>
            </div>

            <form className="space-y-3" onSubmit={submitAuth}>
              <input
                className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#2f6a4f]"
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                required
              />
              <input
                className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#2f6a4f]"
                type="password"
                placeholder="Password (min 8 characters)"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                required
                minLength={8}
              />
              {authMode === "signup" ? (
                <input
                  className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#2f6a4f]"
                  type="text"
                  placeholder="Registration key"
                  value={registrationKey}
                  onChange={(event) => setRegistrationKey(event.target.value)}
                  required
                />
              ) : null}

              {authError ? <p className="text-sm text-red-700">{authError}</p> : null}

              <Button type="submit" disabled={authLoading}>
                {authLoading ? "Please wait..." : authMode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
            </section>
          ) : (
            <>
              <section className="max-h-[60vh] space-y-3 overflow-y-auto rounded-2xl border border-black/10 bg-[#fbfbf9] p-3 sm:p-4">
              {messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={`rounded-2xl p-3 text-sm leading-relaxed whitespace-pre-wrap sm:p-4 sm:text-[0.95rem] ${
                    message.role === "assistant"
                      ? "bg-[#edf2f7] text-[#1f2933]"
                      : "ml-auto max-w-[95%] bg-[#d7efe2] text-[#1e3a2e]"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        code: ({ children, className }) => {
                          const isBlock = Boolean(className?.includes("language-"));
                          if (isBlock) {
                            return (
                              <code className="block overflow-x-auto rounded-lg bg-[#0f1720] px-3 py-2 text-xs text-[#e8eef5]">
                                {children}
                              </code>
                            );
                          }
                          return <code className="rounded bg-black/10 px-1 py-0.5 text-xs">{children}</code>;
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </article>
              ))}
              {isLoading ? (
                <article className="rounded-2xl bg-[#edf2f7] p-3 text-sm text-[#1f2933] sm:p-4 sm:text-[0.95rem]">
                  Clarify Bot is thinking...
                </article>
              ) : null}
              </section>

              <form className="space-y-2" onSubmit={sendMessage}>
              <textarea
                className="min-h-28 w-full resize-y rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-[#2f6a4f] focus:shadow-[0_0_0_3px_rgba(47,106,79,0.14)] disabled:opacity-60"
                placeholder="Paste your current step response here..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isLoading}
              />
                {error ? <p className="text-sm text-red-700">{error}</p> : null}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Session: {activeSessionId ? "saved" : "new"}</p>
                <Button type="submit" disabled={isLoading || input.trim().length === 0}>
                  {isLoading ? "Sending..." : "Send"}
                </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
