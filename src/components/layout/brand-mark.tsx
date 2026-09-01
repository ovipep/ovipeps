import { cn } from "@/lib/utils";

interface BrandMarkProps {
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: {
    icon: "h-6 w-6",
    text: "text-xl",
  },
  md: {
    icon: "h-7 w-7",
    text: "text-2xl",
  },
  lg: {
    icon: "h-9 w-9",
    text: "text-3xl",
  },
} as const;

export function BrandMark({
  theme = "light",
  size = "md",
  showTagline = false,
  className,
}: BrandMarkProps) {
  const styles = sizeStyles[size];
  const isDark = theme === "dark";

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "shrink-0 bg-[url('/images/brand/icon-blue.png')] bg-[length:640%_320%] bg-center bg-no-repeat",
          styles.icon
        )}
        aria-hidden
      />

      <span className="flex flex-col">
        <span
          className={cn(
            "leading-none tracking-[-0.045em]",
            styles.text,
            isDark ? "text-white" : "text-navy-deep"
          )}
        >
          <span className="font-black">OVI</span>
          <span
            className={cn(
              "font-light",
              isDark ? "text-cyan-bright" : "text-sky"
            )}
          >
            peps
          </span>
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 text-[8px] font-bold uppercase tracking-[0.24em]",
              isDark ? "text-white/45" : "text-muted-foreground"
            )}
          >
            Research compounds
          </span>
        )}
      </span>
    </span>
  );
}
