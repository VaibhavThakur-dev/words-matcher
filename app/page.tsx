import { WordMatcher } from "@/components/word-matcher";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <WordMatcher />
    </div>
  );
}
