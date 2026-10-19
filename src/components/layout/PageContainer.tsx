import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  actions,
  children,
  className,
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
          <div>
            {title && (
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight font-heading text-slate-100">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
