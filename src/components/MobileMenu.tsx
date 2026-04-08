import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileMenuItem {
  label: string;
  to: string;
  element?: React.ReactNode;
}

interface MobileMenuProps {
  items: MobileMenuItem[];
  extra?: React.ReactNode;
}

const MobileMenu = ({ items, extra }: MobileMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-end p-4">
            <button
              onClick={() => setOpen(false)}
              className="p-2 text-black hover:text-black/70 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex flex-1 flex-col items-center justify-center gap-6">
            {items.map((item, i) =>
              item.element ? (
                <div key={i} onClick={() => setOpen(false)}>
                  {item.element}
                </div>
              ) : (
                <Link
                  key={i}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="text-xl font-semibold text-black hover:text-black/70 transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
            {extra && (
              <div className="mt-4" onClick={() => setOpen(false)}>
                {extra}
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
};

export default MobileMenu;
