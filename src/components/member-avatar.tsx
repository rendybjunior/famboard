import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  avatar: string | null;
  displayName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7 text-sm",
  md: "h-9 w-9 text-lg",
  lg: "h-14 w-14 text-3xl",
};

export function MemberAvatar({
  avatar,
  displayName,
  size = "md",
  className,
}: MemberAvatarProps) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center",
        avatar
          ? "bg-purple-100"
          : "bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold",
        sizeClasses[size],
        className,
      )}
    >
      {avatar ?? displayName.charAt(0).toUpperCase()}
    </div>
  );
}
