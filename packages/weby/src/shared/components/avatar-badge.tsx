import { useQuery } from "@tanstack/react-query";

interface AvatarBadgeProps {
  className?: string;
  icon?: string | null;
  initialsClass?: string;
  name: string;
}

const getInitials = (name: string) => {
  const cleanName = name.trim();
  if (!cleanName) {
    return "?";
  }
  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleanName.slice(0, 2).toUpperCase();
};

const avatarImageQueryKey = (icon: string) => ["avatar-image", icon] as const;

const loadAvatarImage = async (icon: string) => {
  const image = new Image();
  image.decoding = "async";
  image.src = icon;
  await image.decode();
  return icon;
};

export const AvatarBadge = ({ className = "", icon, initialsClass, name }: AvatarBadgeProps) => {
  const baseClassName = `shrink-0 rounded-full object-cover ${className}`.trim();
  const imageQuery = useQuery({
    enabled: Boolean(icon),
    gcTime: 1000 * 60 * 60 * 24,
    queryFn: () => loadAvatarImage(icon ?? ""),
    queryKey: icon ? avatarImageQueryKey(icon) : ["avatar-image", "empty"],
    retry: false,
    staleTime: Infinity,
  });
  const altText = `${name.trim() || "avatar"} avatar`;
  const initialsFontClass = initialsClass ?? "text-[0.4rem]";

  if (icon && imageQuery.data) {
    return <img alt={altText} className={baseClassName} src={imageQuery.data} />;
  }

  return (
    <span
      aria-label={altText}
      className={`${baseClassName} inline-grid place-items-center ${initialsFontClass} font-medium leading-none tracking-tight`.trim()}
      role="img"
    >
      {getInitials(name)}
    </span>
  );
};
