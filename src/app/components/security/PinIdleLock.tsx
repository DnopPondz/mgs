"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn, RotateCcw, ShieldCheck } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { setUserPinAction, verifyUserPinAction } from "@/app/actions/auth-security";

const IDLE_LIMIT_MS = 15 * 60 * 1000;
const EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

export default function PinIdleLock() {
  const { data: session, status, update } = useSession();
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastActivityRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const storageKey = useMemo(() => {
    return session?.user?.id ? `mediflow:last-activity:${session.user.id}` : "";
  }, [session?.user?.id]);

  const hasPin = Boolean(session?.user?.hasPin);

  const focusPinInput = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const markActivity = useCallback(() => {
    if (locked || !storageKey) return;
    const now = Date.now();
    lastActivityRef.current = now;
    window.localStorage.setItem(storageKey, String(now));
  }, [locked, storageKey]);

  useEffect(() => {
    if (status !== "authenticated" || !storageKey) return;

    const storedActivity = Number(window.localStorage.getItem(storageKey));
    lastActivityRef.current = Number.isFinite(storedActivity) && storedActivity > 0 ? storedActivity : Date.now();
    window.localStorage.setItem(storageKey, String(lastActivityRef.current));

    const interval = window.setInterval(() => {
      const stored = Number(window.localStorage.getItem(storageKey));
      const lastActivity = Number.isFinite(stored) && stored > 0 ? stored : lastActivityRef.current;
      if (Date.now() - lastActivity >= IDLE_LIMIT_MS) {
        setLocked(true);
      }
    }, 10000);

    EVENTS.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    return () => {
      window.clearInterval(interval);
      EVENTS.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [markActivity, status, storageKey]);

  useEffect(() => {
    if (status === "authenticated" && session?.user && !hasPin) {
      const frame = window.requestAnimationFrame(() => setLocked(true));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [hasPin, session?.user, status]);

  useEffect(() => {
    if (!locked) return;
    const frame = window.requestAnimationFrame(focusPinInput);
    return () => window.cancelAnimationFrame(frame);
  }, [focusPinInput, locked]);

  if (status !== "authenticated" || !session?.user || !locked) return null;

  const submitPin = async () => {
    if (!/^\d{4,6}$/.test(pin)) {
      toast.error("PIN ต้องเป็นตัวเลข 4-6 หลัก");
      return;
    }

    setIsSubmitting(true);
    const action = hasPin ? verifyUserPinAction : setUserPinAction;
    const result = await action({ pin });

    if (result.success) {
      const verifiedAt = "pinVerifiedAt" in result && typeof result.pinVerifiedAt === "number" ? result.pinVerifiedAt : Date.now();
      await update({ pinVerifiedAt: verifiedAt, hasPin: true });
      window.localStorage.setItem(storageKey, String(Date.now()));
      lastActivityRef.current = Date.now();
      setPin("");
      setLocked(false);
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const appendDigit = (digit: string) => {
    setPin((value) => `${value}${digit}`.replace(/\D/g, "").slice(0, 6));
    focusPinInput();
  };

  const removeDigit = () => {
    setPin((value) => value.slice(0, -1));
    focusPinInput();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-900 dark:bg-gray-950">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-950 text-white dark:bg-gray-100 dark:text-gray-950">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-950 dark:text-white">Secure PIN Verification</h2>
          <p className="mt-1 text-sm text-gray-500">
            {hasPin ? "Enter your PIN to refresh this session." : "Create a 4-6 digit PIN for idle session refresh."}
          </p>
        </div>

        <div
          className="mb-4 flex cursor-text justify-center gap-2"
          role="button"
          tabIndex={0}
          onClick={focusPinInput}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") focusPinInput();
          }}
          aria-label="PIN input"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex h-12 w-11 items-center justify-center rounded-lg border border-sky-300 bg-sky-50 text-lg font-semibold text-gray-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-white"
            >
              {pin[index] ? (showPin ? pin[index] : "*") : ""}
            </div>
          ))}
        </div>

        <input
          ref={inputRef}
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          aria-label="Enter PIN"
          maxLength={6}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitPin();
          }}
          className="absolute h-px w-px opacity-0"
        />

        <button
          type="button"
          onClick={() => setShowPin((value) => !value)}
          className="mx-auto mb-4 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showPin ? "Hide PIN" : "Show PIN"}
        </button>

        <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
          Session will stay locked until PIN is verified or you login again.
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2 sm:hidden">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => appendDigit(digit)}
              className="rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-gray-100"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={removeDigit}
            className="rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-gray-100"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => appendDigit("0")}
            className="rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-gray-100"
          >
            0
          </button>
          <button
            type="button"
            onClick={submitPin}
            className="rounded-lg border border-indigo-200 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-900 dark:text-indigo-300"
          >
            OK
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPin("")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            type="button"
            onClick={submitPin}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <LockKeyhole className="h-4 w-4" />
            {isSubmitting ? "Verifying..." : hasPin ? "Verify" : "Set PIN"}
          </button>
        </div>

        <div className="my-5 h-px bg-gray-200 dark:bg-gray-800" />

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mx-auto flex items-center justify-center gap-2 rounded-full border border-gray-200 p-3 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          title="Login again"
        >
          <LogIn className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
