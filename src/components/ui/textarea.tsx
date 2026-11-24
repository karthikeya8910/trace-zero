import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-lg border border-input bg-elevated/60 px-3.5 py-3 text-base leading-relaxed transition-[border-color,box-shadow] duration-200 hover:border-border-strong placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-amber focus-visible:ring-3 focus-visible:ring-amber-soft aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
