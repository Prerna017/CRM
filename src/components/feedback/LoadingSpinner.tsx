import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  text,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-6 gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <p className="text-xs text-muted-foreground animate-pulse">{text}</p>}
    </div>
  );
};
