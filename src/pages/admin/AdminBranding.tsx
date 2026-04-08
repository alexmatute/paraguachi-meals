import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Upload, Trash2, Image } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const AdminBranding = () => {
  const { t } = useI18n();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(48);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const sizeTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("value").eq("key", "logo_url").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "logo_size").maybeSingle(),
    ]).then(([urlRes, sizeRes]) => {
      setLogoUrl(urlRes.data?.value ?? null);
      if (sizeRes.data?.value) setLogoSize(Number(sizeRes.data.value));
      setLoading(false);
    });
  }, []);

  const handleSizeChange = (val: number[]) => {
    const size = val[0];
    setLogoSize(size);
    clearTimeout(sizeTimeout.current);
    sizeTimeout.current = setTimeout(async () => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "logo_size", value: String(size), updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) toast.error("Error guardando tamaño");
      else toast.success("Tamaño actualizado");
    }, 500);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo imágenes permitidas");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `logo.${ext}`;

    await supabase.storage.from("branding").remove([path]);

    const { error: uploadErr } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast.error("Error subiendo: " + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + "?v=" + Date.now();

    const { error: settErr } = await supabase
      .from("site_settings")
      .upsert({ key: "logo_url", value: publicUrl, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (settErr) {
      toast.error("Error guardando: " + settErr.message);
    } else {
      setLogoUrl(publicUrl);
      toast.success(t("admin.logoUpdated"));
    }
    setUploading(false);
  };

  const handleRemove = async () => {
    setUploading(true);
    await supabase.storage.from("branding").remove(["logo.png", "logo.jpg", "logo.jpeg", "logo.webp", "logo.svg"]);
    await supabase.from("site_settings").delete().eq("key", "logo_url");
    setLogoUrl(null);
    toast.success(t("admin.logoRemoved"));
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">{t("admin.branding")}</h1>

      <div className="max-w-md rounded-xl border border-border bg-card p-6 space-y-6">
        <div>
          <p className="text-sm font-medium mb-3">{t("admin.currentLogo")}</p>
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-background p-8">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: logoSize, width: logoSize, objectFit: "contain" }} />
            ) : (
              <div className="text-center text-muted-foreground">
                <Image className="mx-auto h-10 w-10 mb-2 opacity-40" />
                <p className="text-xs">{t("admin.noLogo")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Logo size slider */}
        <div>
          <p className="text-sm font-medium mb-2">Tamaño del logo: {logoSize}px</p>
          <Slider
            value={[logoSize]}
            onValueChange={handleSizeChange}
            min={150}
            max={400}
            step={10}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>150px</span>
            <span>400px</span>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {t("admin.uploadLogo")}
          </Button>
          {logoUrl && (
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={uploading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBranding;
