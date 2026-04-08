import { useSiteSetting } from "@/hooks/use-site-setting";
import fallbackLogo from "@/assets/logo-paraguachi.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo = ({ className = "", size = 28 }: LogoProps) => {
  const { value: logoUrl } = useSiteSetting("logo_url");

  return (
    <img
      src={logoUrl || fallbackLogo}
      alt="Paraguachi"
      className={cn("shrink-0", className)}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
};

export default Logo;
