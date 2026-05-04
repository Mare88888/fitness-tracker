"use client";

import { login, register } from "@/lib/services/auth-service";
import { ApiRequestError } from "@/lib/services/api-error";
import { APP_NAME } from "@/lib/constants";
import type { AuthRequest } from "@/types/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type AuthFormCardProps = {
  mode: "login" | "register";
};

export function AuthFormCard({ mode }: AuthFormCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const isLogin = mode === "login";
  const isFormValid = username.trim().length >= 3 && password.trim().length >= 6;

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError(null);
    setSuccess(null);
    setUsernameError(null);
    setPasswordError(null);
    setValidationMessages([]);

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    const payload: AuthRequest = { username: username.trim(), password };
    setIsSubmitting(true);
    try {
      const authResponse = isLogin ? await login(payload) : await register(payload);
      setSuccess(`Welcome, ${authResponse.username}. Redirecting...`);
      toast.success(`Welcome, ${authResponse.username}`);
      router.push("/workouts/start");
    } catch (authError) {
      if (authError instanceof ApiRequestError) {
        const usernameValidation = authError.validationErrors.find((errorItem) => errorItem.field === "username");
        const passwordValidation = authError.validationErrors.find((errorItem) => errorItem.field === "password");
        setUsernameError(usernameValidation?.message ?? null);
        setPasswordError(passwordValidation?.message ?? null);
        setValidationMessages(authError.validationErrors.map((errorItem) => errorItem.message));
      }
      const message = authError instanceof Error ? authError.message : "Authentication failed.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md rounded-xl border border-zinc-700/60 bg-zinc-900/40 p-5 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">{APP_NAME}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
        {isLogin ? "Login" : "Register"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        {isLogin
          ? "Sign in to access protected workout endpoints."
          : "Create an account to start tracking workouts securely."}
      </p>

      <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div>
          <label
            htmlFor="auth-username"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Username
          </label>
          <input
            id="auth-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="field"
            autoComplete="username"
          />
          {usernameError && <p className="mt-1 text-xs text-rose-300">{usernameError}</p>}
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
          {passwordError && <p className="mt-1 text-xs text-rose-300">{passwordError}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? "Please wait..." : isLogin ? "Login" : "Register"}
        </button>
        {!isFormValid && (
          <p className="text-xs text-zinc-500">
            Username must be at least 3 characters and password at least 6 characters.
          </p>
        )}

        {success && (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-950/25 px-3 py-2 text-sm text-emerald-100">
            {success}
          </p>
        )}
        {error && (
          <p className="rounded-md border border-rose-500/40 bg-rose-950/25 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}
        {validationMessages.length > 0 && (
          <ul className="rounded-md border border-rose-500/40 bg-rose-950/25 px-3 py-2 text-sm text-rose-100">
            {validationMessages.map((message) => (
              <li key={message}>- {message}</li>
            ))}
          </ul>
        )}

        <p className="text-sm text-zinc-400">
          {isLogin ? "No account yet?" : "Already have an account?"}{" "}
          <Link
            href={isLogin ? "/auth/register" : "/auth/login"}
            className="font-medium text-zinc-100 underline-offset-4 hover:underline"
          >
            {isLogin ? "Create one" : "Login"}
          </Link>
        </p>
      </form>
    </section>
  );
}
