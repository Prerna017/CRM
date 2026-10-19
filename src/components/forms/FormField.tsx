import React from "react";
import { Label } from "@/components/ui/label";
import { FormError } from "./FormError";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}) => {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label htmlFor={htmlFor} required={required}>
            {label}
          </Label>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      )}
      {children}
      <FormError message={error} />
    </div>
  );
};
