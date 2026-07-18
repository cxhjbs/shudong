"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
export function PrivateImage({
  path,
  className = "h-28 w-28 rounded-xl",
}: {
  path: string;
  className?: string;
}) {
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    supabase.storage
      .from("diary-images")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) setFailed(true);
        else setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);
  if (failed)
    return (
      <div
        className={`${className} grid place-items-center bg-stone-100 text-xs text-stone-400`}
      >
        无法预览
      </div>
    );
  if (!url)
    return <div className={`${className} animate-pulse bg-stone-100`} />;
  return (
    <img
      src={url}
      alt="日记照片"
      loading="lazy"
      className={`${className} object-cover`}
    />
  );
}
