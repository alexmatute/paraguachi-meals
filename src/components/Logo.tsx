import logoSrc from "@/assets/logo-paraguachi.png";

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo = ({ className = "", size = 28 }: LogoProps) => (
  <img src={logoSrc} alt="Paraguachi" className={className} style={{ width: size, height: size, objectFit: "contain" }} />
);

export default Logo;
