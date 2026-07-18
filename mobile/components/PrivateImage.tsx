import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
export function PrivateImage({
  path,
  className = "h-28 w-28 rounded-2xl",
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
      <View className={`${className} items-center justify-center bg-stone-200`}>
        <Text className="text-xs text-brown">无法预览</Text>
      </View>
    );
  if (!url)
    return (
      <View className={`${className} items-center justify-center bg-white`}>
        <ActivityIndicator color="#71866d" />
      </View>
    );
  return (
    <Image source={{ uri: url }} resizeMode="cover" className={className} />
  );
}
