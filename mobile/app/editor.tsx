import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import Markdown from "react-native-markdown-display";
import { supabase } from "@/lib/supabase";
import { PrivateImage } from "@/components/PrivateImage";
import type { Mood, Weather } from "@/lib/types";

const moods: Record<Mood, string> = {
  happy: "😊 开心",
  sad: "😔 难过",
  calm: "🌿 平静",
  angry: "😠 生气",
  tired: "😴 疲惫",
  excited: "✨ 兴奋",
};
const weathers: Record<Weather, string> = {
  sunny: "☀️ 晴",
  cloudy: "☁️ 阴",
  rainy: "🌧️ 雨",
  snowy: "❄️ 雪",
  windy: "🌬️ 风",
};
const DRAFT = "shudong-mobile-draft";
const empty = () => ({
  title: "",
  content: "",
  mood: "calm" as Mood,
  weather: null as Weather | null,
  diary_date: new Date().toISOString().slice(0, 10),
  image_paths: [] as string[],
});
const count = (text: string) => text.replace(/\s/g, "").length;

export default function Editor() {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    [form, setForm] = useState<any>(empty()),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    async function initialize() {
      if (id) {
        const { data } = await supabase
          .from("diaries")
          .select("*")
          .eq("id", id)
          .single();
        if (data) setForm(data);
      } else {
        const draft = await AsyncStorage.getItem(DRAFT);
        if (draft) setForm(JSON.parse(draft));
      }
      setReady(true);
    }
    void initialize();
  }, [id]);
  useEffect(() => {
    if (ready && !id) void AsyncStorage.setItem(DRAFT, JSON.stringify(form));
  }, [form, id, ready]);
  async function addImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
      allowsMultipleSelection: true,
    });
    if (result.canceled) return;
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return Alert.alert("登录已过期", "请重新登录后上传图片。");
    }
    const paths = [...form.image_paths],
      errors: string[] = [];
    for (const asset of result.assets) {
      try {
        const rawExt = (
            asset.fileName?.split(".").pop() ||
            asset.mimeType?.split("/").pop() ||
            "jpg"
          ).toLowerCase(),
          ext = rawExt === "jpeg" ? "jpg" : rawExt,
          path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          }),
          { error } = await supabase.storage
            .from("diary-images")
            .upload(path, decode(base64), {
              contentType:
                asset.mimeType || `image/${ext === "jpg" ? "jpeg" : ext}`,
              upsert: false,
            });
        if (error) errors.push(error.message);
        else paths.push(path);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "读取图片失败");
      }
    }
    setForm({ ...form, image_paths: paths });
    setBusy(false);
    if (errors.length)
      Alert.alert(
        "部分图片上传失败",
        `${errors.length} 张未上传。\n${errors[0] || ""}`,
      );
  }
  async function save() {
    if (!form.content.trim()) return Alert.alert("请先写点什么");
    setBusy(true);
    const {
        data: { user },
      } = await supabase.auth.getUser(),
      payload = { ...form, user_id: user!.id };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    const { error } = id
      ? await supabase.from("diaries").update(payload).eq("id", id)
      : await supabase.from("diaries").insert(payload);
    setBusy(false);
    if (error) Alert.alert("保存失败", error.message);
    else {
      await AsyncStorage.removeItem(DRAFT);
      router.back();
    }
  }
  function remove() {
    Alert.alert("删除日记", "此操作无法撤销", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          await supabase.from("diaries").delete().eq("id", id!);
          if (form.image_paths.length)
            await supabase.storage
              .from("diary-images")
              .remove(form.image_paths);
          router.back();
        },
      },
    ]);
  }
  if (!ready)
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <Text className="text-brown">正在打开编辑器...</Text>
      </View>
    );
  const words = count(form.content);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
      className="flex-1 bg-cream"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 16 }}
      >
        <View>
          <Text className="text-xs text-brown">
            {id ? "编辑日记" : "写下此刻"}
          </Text>
          <TextInput
            value={form.title}
            onChangeText={(title) => setForm({ ...form, title })}
            placeholder="给今天起一个名字"
            className="mt-1 border-b border-stone-300 py-3 text-2xl font-bold text-ink"
          />
        </View>
        <View className="rounded-3xl bg-white p-4">
          <Text className="mb-2 text-xs text-brown">日期</Text>
          <TextInput
            value={form.diary_date}
            onChangeText={(diary_date) => setForm({ ...form, diary_date })}
            placeholder="YYYY-MM-DD"
            className="text-base text-ink"
          />
        </View>
        <Text className="font-bold text-ink">今天感觉怎么样？</Text>
        <View className="flex-row flex-wrap">
          {Object.entries(moods).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setForm({ ...form, mood: key })}
              className={`mb-2 mr-2 rounded-full px-3 py-2 ${form.mood === key ? "bg-sage" : "bg-white"}`}
            >
              <Text className={form.mood === key ? "text-white" : "text-ink"}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text className="font-bold text-ink">窗外的天气</Text>
        <View className="flex-row flex-wrap">
          {Object.entries(weathers).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() =>
                setForm({ ...form, weather: form.weather === key ? null : key })
              }
              className={`mb-2 mr-2 rounded-full px-3 py-2 ${form.weather === key ? "bg-sage" : "bg-white"}`}
            >
              <Text
                className={form.weather === key ? "text-white" : "text-ink"}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row items-center border-b border-stone-300">
          <Pressable
            onPress={() => setPreview(false)}
            className={`mr-4 border-b-2 px-2 py-3 ${!preview ? "border-sage" : "border-transparent"}`}
          >
            <Text className={!preview ? "font-bold text-sage" : "text-brown"}>
              编辑
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPreview(true)}
            className={`border-b-2 px-2 py-3 ${preview ? "border-sage" : "border-transparent"}`}
          >
            <Text className={preview ? "font-bold text-sage" : "text-brown"}>
              预览
            </Text>
          </Pressable>
          <Text className="ml-auto text-xs text-brown">
            {words} 字 · 约 {Math.max(1, Math.ceil(words / 400))} 分钟
          </Text>
        </View>
        {preview ? (
          <View className="min-h-80 rounded-3xl bg-white p-5">
            <Markdown>{form.content || "*还没有内容*"}</Markdown>
          </View>
        ) : (
          <TextInput
            multiline
            textAlignVertical="top"
            value={form.content}
            onChangeText={(content) => setForm({ ...form, content })}
            placeholder="写下此刻的想法……支持 Markdown"
            className="min-h-80 rounded-3xl bg-white p-5 text-base leading-7 text-ink"
          />
        )}
        <Pressable
          disabled={busy}
          onPress={addImage}
          className="rounded-2xl bg-white p-4"
        >
          <Text className="text-ink">
            📷 {busy ? "正在处理照片..." : `添加照片（已选 ${form.image_paths.length} 张）`}
          </Text>
        </Pressable>
        {form.image_paths.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {form.image_paths.map((path: string, index: number) => (
              <View key={path} className="mr-3"><PrivateImage path={path} /><Pressable
                onPress={() =>
                  setForm({
                    ...form,
                    image_paths: form.image_paths.filter(
                      (_: string, i: number) => i !== index,
                    ),
                  })
                }
                className="mt-1 rounded-full bg-white px-3 py-2"
              >
                <Text className="text-center text-xs text-red-600">移除</Text>
              </Pressable></View>
            ))}
          </ScrollView>
        )}
        <Pressable
          disabled={busy || !form.content.trim()}
          onPress={save}
          className={`rounded-2xl p-4 ${busy || !form.content.trim() ? "bg-stone-300" : "bg-sage"}`}
        >
          <Text className="text-center font-bold text-white">
            {busy ? "处理中..." : "保存日记"}
          </Text>
        </Pressable>
        {!id && (
          <Text className="text-center text-xs text-brown">
            内容会自动保存为本机草稿
          </Text>
        )}
        {id && (
          <Pressable onPress={remove} className="p-4">
            <Text className="text-center text-red-600">删除这篇日记</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
