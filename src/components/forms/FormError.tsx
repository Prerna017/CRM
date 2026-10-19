import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormErrorProps {
  message?: string;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ message, className }) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn("flex items-center gap-1.5 text-xs text-rose-400 mt-1.5", className)}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
