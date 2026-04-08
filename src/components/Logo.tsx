import logoSrc from "@/assets/logo-paraguachi.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo = ({ className = "", size = 28 }: LogoProps) => (
  <img
    src={logoSrc}
    alt="Paraguachi"
    className={cn("shrink-0", className)}
    style={{ width: size, height: size, objectFit: "contain" }}
  />
);

export default Logo;
