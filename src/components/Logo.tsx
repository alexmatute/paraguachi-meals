import { useSiteSetting } from "@/hooks/use-site-setting";
import fallbackLogo from "@/assets/logo-paraguachi.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo = ({ className = "", size }: LogoProps) => {
  const { value: logoUrl } = useSiteSetting("logo_url");
  const { value: savedSize } = useSiteSetting("logo_size");

  const finalSize = size ?? (savedSize ? Number(savedSize) : 48);

  return (
    <img
      src={logoUrl || fallbackLogo}
      alt="Meal Prep"
      className={cn("shrink-0", className)}
      style={{ width: finalSize, height: finalSize, objectFit: "contain" }}
    />
  );
};

export default Logo;
