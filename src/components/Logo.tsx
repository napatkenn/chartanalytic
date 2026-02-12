import Image from "next/image";

const LOGO_PATH = "/images/logo.svg";

export function Logo({
  size = 24,
  className = "",
  invert = false,
  priority = false,
}: {
  size?: number;
  className?: string;
  invert?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={LOGO_PATH}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 opacity-90 ${invert ? "invert" : ""} ${className}`.trim()}
      aria-hidden
      priority={priority}
    />
  );
}
