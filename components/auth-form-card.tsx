"use client";

import { login, register } from "@/lib/services/auth-service";
import { ApiRequestError } from "@/lib/services/api-error";
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

  const handleSubmit = async () => {
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
    <section className="surface-page mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {isLogin ? "Login" : "Register"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {isLogin
          ? "Sign in to access protected workout endpoints."
          : "Create an account to start tracking workouts securely."}
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="auth-username"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Username
          </label>
          <input
            id="auth-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="field"
          />
          {usernameError && <p className="mt-1 text-xs text-red-600">{usernameError}</p>}
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
          />
          {passwordError && <p className="mt-1 text-xs text-red-600">{passwordError}</p>}
        </div>

        <button
          type="button"
          disabled={isSubmitting || !isFormValid}
          onClick={handleSubmit}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? "Please wait..." : isLogin ? "Login" : "Register"}
        </button>
        {!isFormValid && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Username must be at least 3 characters and password at least 6 characters.
          </p>
        )}

        {success && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        )}
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {validationMessages.length > 0 && (
          <ul className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {validationMessages.map((message) => (
              <li key={message}>- {message}</li>
            ))}
          </ul>
        )}

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {isLogin ? "No account yet?" : "Already have an account?"}{" "}
          <Link
            href={isLogin ? "/auth/register" : "/auth/login"}
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            {isLogin ? "Create one" : "Login"}
          </Link>
        </p>
      </div>
    </section>
  );
}
