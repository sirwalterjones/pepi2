"use client";

import { useState, useEffect } from "react";
import AgentForm from "./AgentForm";
import { Agent } from "@/types/schema";

interface AgentFormWrapperProps {
  agent?: Agent;
  onSuccessUrl?: string;
  onCancelUrl?: string;
}

export default function AgentFormWrapper({
  agent,
  onSuccessUrl,
  onCancelUrl,
}: AgentFormWrapperProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Handle hash-based navigation for dialogs
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#success") {
        // Clear the hash and handle success
        window.history.pushState(
          "",
          document.title,
          window.location.pathname + window.location.search,
        );
        // You can add any success handling here
        if (window.parent) {
          try {
            // Try to communicate with parent window if in an iframe
            window.parent.postMessage({ type: "agent-form-success" }, "*");
          } catch (e) {
            console.error("Error posting message to parent", e);
          }
        }
      } else if (hash === "#cancel") {
        // Clear the hash and handle cancel
        window.history.pushState(
          "",
          document.title,
          window.location.pathname + window.location.search,
        );
        // You can add any cancel handling here
        if (window.parent) {
          try {
            // Try to communicate with parent window if in an iframe
            window.parent.postMessage({ type: "agent-form-cancel" }, "*");
          } catch (e) {
            console.error("Error posting message to parent", e);
          }
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <AgentForm
      agent={agent}
      onSuccessUrl={onSuccessUrl}
      onCancelUrl={onCancelUrl}
    />
  );
}
