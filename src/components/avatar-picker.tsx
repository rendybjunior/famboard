import { AVATAR_OPTIONS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  value: string | null;
  onChange: (avatar: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {AVATAR_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={cn(
            "h-12 w-12 rounded-xl text-2xl flex items-center justify-center transition-all hover:scale-110",
            value === emoji
              ? "bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-purple-500 ring-offset-2 shadow-md"
              : "bg-purple-50 hover:bg-purple-100",
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
