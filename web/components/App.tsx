"use client";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  CalendarDays,
  Download,
  Grid2X2,
  ImagePlus,
  LayoutList,
  LogOut,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PrivateImage } from "@/components/PrivateImage";
import type { Diary, Mood, Weather } from "@/lib/types";

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
const DRAFT_KEY = "shudong-draft";
type Draft = Omit<Diary, "id" | "user_id" | "created_at" | "updated_at"> &
  Partial<Pick<Diary, "id">>;
const blankDiary = (): Draft => ({
  title: "",
  content: "",
  mood: "calm",
  weather: null,
  diary_date: new Date().toISOString().slice(0, 10),
  image_paths: [],
});
const wordCount = (text: string) =>
  text.replace(/[#>*_`~\[\]()!-]/g, " ").trim().length;

export default function App({ user }: { user: { id: string } }) {
  const [items, setItems] = useState<Diary[]>([]),
    [edit, setEdit] = useState<Draft | null>(null),
    [query, setQuery] = useState(""),
    [mood, setMood] = useState(""),
    [date, setDate] = useState(""),
    [dark, setDark] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [view, setView] = useState<"grid" | "list">("grid");
  async function load() {
    setLoading(true);
    let q: any = supabase
      .from("diaries")
      .select("*")
      .order("diary_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (mood) q = q.eq("mood", mood);
    if (date) q = q.eq("diary_date", date);
    if (query) {
      const safe = query.replace(/[%_,()]/g, "");
      q = q.or(`title.ilike.%${safe}%,content.ilike.%${safe}%`);
    }
    const { data, error } = await q;
    if (error) setNotice("日记加载失败，请稍后重试。");
    else setItems((data ?? []) as Diary[]);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, [mood, date, query]);
  useEffect(() => {
    const saved = localStorage.getItem("shudong-theme");
    setDark(
      saved === "dark" ||
        (!saved && matchMedia("(prefers-color-scheme: dark)").matches),
    );
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("shudong-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (edit && !edit.id) localStorage.setItem(DRAFT_KEY, JSON.stringify(edit));
  }, [edit]);
  const stats = useMemo(
    () => ({
      total: items.length,
      month: items.filter(
        (x) =>
          x.diary_date.slice(0, 7) === new Date().toISOString().slice(0, 7),
      ).length,
      words: items.reduce((n, x) => n + wordCount(x.content), 0),
    }),
    [items],
  );
  function startWriting() {
    const saved = localStorage.getItem(DRAFT_KEY);
    setEdit(saved ? JSON.parse(saved) : blankDiary());
  }
  async function upload(files: FileList | null) {
    if (!files || !edit) return;
    setBusy(true);
    const paths = [...edit.image_paths];
    for (const file of Array.from(files)) {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const { error } = await supabase.storage
        .from("diary-images")
        .upload(path, file);
      if (error) setNotice(`图片 ${file.name} 上传失败。`);
      else paths.push(path);
    }
    setEdit({ ...edit, image_paths: paths });
    setBusy(false);
  }
  async function save() {
    if (!edit?.content.trim()) return;
    setBusy(true);
    setNotice("");
    const { id, ...payload } = { ...edit, user_id: user.id },
      old = id ? items.find((x) => x.id === id) : undefined,
      { error } = id
        ? await supabase.from("diaries").update(payload).eq("id", id)
        : await supabase.from("diaries").insert(payload);
    if (error) {
      setNotice("保存失败，请检查网络后重试。");
      setBusy(false);
      return;
    }
    if (old) {
      const removed = old.image_paths.filter(
        (path) => !edit.image_paths.includes(path),
      );
      if (removed.length)
        await supabase.storage.from("diary-images").remove(removed);
    }
    localStorage.removeItem(DRAFT_KEY);
    setEdit(null);
    await load();
    setBusy(false);
  }
  async function remove(d: Diary) {
    if (!confirm("确定删除这篇日记吗？此操作无法撤销。")) return;
    await supabase.from("diaries").delete().eq("id", d.id);
    if (d.image_paths.length)
      await supabase.storage.from("diary-images").remove(d.image_paths);
    void load();
  }
  function exportData() {
    const blob = new Blob(
        [
          JSON.stringify(
            { exported_at: new Date().toISOString(), diaries: items },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shudong-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <main className="min-h-screen pb-24">
      {notice && (
        <div className="fixed left-1/2 top-20 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center rounded-xl bg-red-50 p-3 text-sm text-red-700 shadow-lg">
          <span className="flex-1">{notice}</span>
          <button aria-label="关闭提示" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-cream/85 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/85">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 md:px-8">
          <div className="mr-auto flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sage text-xl text-white">
              树
            </span>
            <div>
              <h1 className="font-semibold leading-tight">我的树洞</h1>
              <p className="hidden text-xs text-stone-500 sm:block">
                只属于你的安静角落
              </p>
            </div>
          </div>
          <button
            className="icon-btn"
            title="切换主题"
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun /> : <Moon />}
          </button>
          <button className="icon-btn" title="导出日记" onClick={exportData}>
            <Download />
          </button>
          <button
            className="icon-btn"
            title="退出登录"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut />
          </button>
          <button
            className="btn ml-1 flex items-center gap-2"
            onClick={startWriting}
          >
            <Plus size={19} />
            <span className="hidden sm:inline">写日记</span>
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 pt-8 md:px-8">
        <section className="hero mb-7 overflow-hidden">
          <div className="relative z-[1] max-w-xl">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-sage dark:text-emerald-300">
              <Sparkles size={16} /> 今天也辛苦了
            </p>
            <h2 className="text-3xl font-semibold leading-tight md:text-5xl">
              把心事轻轻放在这里
            </h2>
            <p className="mt-4 leading-7 text-stone-600 dark:text-stone-300">
              记录当下的情绪、天气与微小瞬间。写给此刻，也写给未来的自己。
            </p>
            <button className="btn mt-6" onClick={startWriting}>
              开始记录
            </button>
          </div>
        </section>
        <section className="mb-7 grid grid-cols-3 gap-3">
          <Stat icon={<BookOpen />} value={stats.total} label="当前记录" />
          <Stat icon={<CalendarDays />} value={stats.month} label="本月写下" />
          <Stat
            icon={<Sparkles />}
            value={stats.words.toLocaleString()}
            label="累计字数"
          />
        </section>
        <section className="card mb-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
            <label className="relative">
              <Search className="absolute left-3.5 top-3.5 h-5 text-stone-400" />
              <input
                className="field pl-11"
                placeholder="搜索标题或正文..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              className="field"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            >
              <option value="">全部心情</option>
              {Object.entries(moods).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              className="field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="icon-btn flex-1"
                title="清空筛选"
                onClick={() => {
                  setQuery("");
                  setMood("");
                  setDate("");
                }}
              >
                <X />
              </button>
              <button
                className={`icon-btn flex-1 ${view === "grid" ? "active" : ""}`}
                title="卡片视图"
                onClick={() => setView("grid")}
              >
                <Grid2X2 />
              </button>
              <button
                className={`icon-btn flex-1 ${view === "list" ? "active" : ""}`}
                title="列表视图"
                onClick={() => setView("list")}
              >
                <LayoutList />
              </button>
            </div>
          </div>
        </section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">时光记录</h2>
          <p className="mt-1 text-sm text-stone-500">
            {loading ? "正在整理..." : `找到 ${items.length} 篇日记`}
          </p>
        </div>
        <section
          className={
            view === "grid"
              ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-3"
          }
        >
          {items.map((d) => (
            <article
              key={d.id}
              className={`diary-card group ${view === "list" ? "md:flex md:items-start md:gap-8" : ""}`}
              onClick={() => setEdit({ ...d })}
            >
              <div className={view === "list" ? "md:w-40 md:shrink-0" : ""}>
                <div className="mb-3 flex items-center gap-2 text-sm text-stone-500">
                  <span>{d.diary_date}</span>
                  <span className="mood-pill">{moods[d.mood]}</span>
                </div>
                {d.weather && (
                  <p className="mb-3 text-xs text-stone-400">
                    {weathers[d.weather]}
                  </p>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex gap-2">
                  <h3 className="mb-2 flex-1 truncate text-xl font-semibold">
                    {d.title || "无题"}
                  </h3>
                  <button
                    className="icon-btn h-9 w-9 opacity-0 hover:!text-red-600 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      void remove(d);
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                <div className="line-clamp-3 leading-7 text-stone-600 dark:text-stone-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {d.content}
                  </ReactMarkdown>
                </div>
                {d.image_paths.length > 0 && (
                  <div className="mt-4 overflow-hidden rounded-2xl"><PrivateImage path={d.image_paths[0]} className="h-44 w-full" /></div>
                )}
                <div className="mt-4 flex gap-4 text-xs text-stone-400">
                  <span>{wordCount(d.content)} 字</span>
                  <span>
                    约 {Math.max(1, Math.ceil(wordCount(d.content) / 400))}{" "}
                    分钟阅读
                  </span>
                  {d.image_paths.length > 0 && (
                    <span>📷 {d.image_paths.length}</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
        {!loading && !items.length && (
          <div className="card py-20 text-center">
            <div className="mb-4 text-5xl">🌱</div>
            <h3 className="text-xl font-semibold">这里还很安静</h3>
            <p className="mt-2 text-stone-500">
              写下第一篇记录，让时间在这里生根。
            </p>
            <button className="btn mt-6" onClick={startWriting}>
              写下此刻
            </button>
          </div>
        )}
      </div>
      {edit && (
        <Editor
          value={edit}
          setValue={setEdit}
          save={save}
          close={() => setEdit(null)}
          upload={upload}
          busy={busy}
        />
      )}
    </main>
  );
}
function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="stat-card">
      <span className="hidden text-sage sm:block">{icon}</span>
      <div>
        <strong className="block text-xl md:text-2xl">{value}</strong>
        <span className="text-xs text-stone-500 md:text-sm">{label}</span>
      </div>
    </div>
  );
}
function Editor({
  value,
  setValue,
  save,
  close,
  upload,
  busy,
}: {
  value: Draft;
  setValue: (v: Draft) => void;
  save: () => void;
  close: () => void;
  upload: (f: FileList | null) => void;
  busy: boolean;
}) {
  const [preview, setPreview] = useState(false),
    count = wordCount(value.content);
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-stone-950/55 p-2 backdrop-blur-sm md:p-8">
      <div className="editor-panel mx-auto max-w-5xl">
        <div className="flex items-center border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <div className="mr-auto">
            <h2 className="font-semibold">
              {value.id ? "编辑日记" : "写下此刻"}
            </h2>
            <p className="text-xs text-stone-500">
              新日记会自动保存在本机草稿中
            </p>
          </div>
          <button className="icon-btn" onClick={close}>
            <X />
          </button>
        </div>
        <div className="space-y-5 p-5 md:p-8">
          <input
            className="title-field"
            placeholder="给今天起一个名字"
            value={value.title}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="field"
              type="date"
              value={value.diary_date}
              onChange={(e) =>
                setValue({ ...value, diary_date: e.target.value })
              }
            />
            <select
              className="field"
              value={value.mood}
              onChange={(e) =>
                setValue({ ...value, mood: e.target.value as Mood })
              }
            >
              {Object.entries(moods).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={value.weather ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  weather: (e.target.value || null) as Weather | null,
                })
              }
            >
              <option value="">不记录天气</option>
              {Object.entries(weathers).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800">
            <button
              className={`tab ${!preview ? "selected" : ""}`}
              onClick={() => setPreview(false)}
            >
              编辑
            </button>
            <button
              className={`tab ${preview ? "selected" : ""}`}
              onClick={() => setPreview(true)}
            >
              预览
            </button>
            <span className="ml-auto pb-2 text-xs text-stone-400">
              {count} 字 · 约 {Math.max(1, Math.ceil(count / 400))} 分钟阅读
            </span>
          </div>
          {preview ? (
            <div className="min-h-80 rounded-2xl bg-stone-50 p-5 dark:bg-stone-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value.content || "*还没有内容*"}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              autoFocus
              className="content-field"
              placeholder="写下此刻的想法……支持 Markdown"
              value={value.content}
              onChange={(e) => setValue({ ...value, content: e.target.value })}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="ghost flex cursor-pointer items-center gap-2">
              <ImagePlus size={18} /> 添加图片
              <input
                hidden
                multiple
                accept="image/*"
                type="file"
                onChange={(e) => upload(e.target.files)}
              />
            </label>
            {value.image_paths.map((path, index) => (
              <div key={path} className="relative">
                <PrivateImage path={path} />
                <button className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white" title="移除图片" onClick={() => setValue({...value,image_paths:value.image_paths.filter((_,i)=>i!==index)})}><X size={14} /></button>
              </div>
            ))}
            <button
              className="btn ml-auto min-w-28"
              disabled={busy || !value.content.trim()}
              onClick={save}
            >
              {busy ? "保存中..." : "保存日记"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
