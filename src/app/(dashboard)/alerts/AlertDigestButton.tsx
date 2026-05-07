"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import toast from "react-hot-toast";
import { sendAlertDigestAction } from "@/app/actions/enterprise";

export default function AlertDigestButton() {
  const [isSending, setIsSending] = useState(false);

  const sendDigest = async () => {
    setIsSending(true);
    const result = await sendAlertDigestAction();
    result.success ? toast.success(result.message) : toast.error(result.message);
    setIsSending(false);
  };

  return (
    <button
      type="button"
      onClick={sendDigest}
      disabled={isSending}
      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
    >
      <Send className="h-4 w-4" />
      {isSending ? "Sending..." : "Send Digest"}
    </button>
  );
}
