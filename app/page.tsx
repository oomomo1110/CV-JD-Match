import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-app text-ink">
      <section className="relative min-h-screen overflow-hidden border-b border-white/70 bg-white/80">
        <div className="absolute left-8 top-10 h-24 w-24 rounded-full bg-lemon/70 blur-2xl" />
        <div className="absolute right-12 top-20 h-32 w-32 rounded-full bg-sky/20 blur-2xl" />
        <div className="absolute bottom-8 left-1/2 h-28 w-28 rounded-full bg-coral/20 blur-2xl" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-12 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-[#086b5c]">
                  JD 定向优化
                </span>
                <span className="rounded-full bg-lemon px-3 py-1 text-xs font-semibold text-[#775e00]">
                  面向大学生求职
                </span>
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-normal text-ink sm:text-6xl">
                职简匹配助手
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                基于已有简历和目标 JD，定位项目经历、追问关键细节，并在不编造事实的前提下优化表达。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/workspace"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-ink px-6 text-sm font-bold text-white shadow-button transition hover:-translate-y-0.5 hover:bg-[#0f172a]"
                >
                  开始你的简历优化之旅
                </Link>
                <span className="text-sm font-semibold text-muted">
                  上传简历、粘贴 JD，然后进入定向优化流程
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-pop">
              <div className="rounded-xl bg-[#f8fbff] p-4">
                <p className="text-sm font-black text-ink">你的优化路径</p>
                <div className="mt-4 grid gap-3">
                  <JourneyStep value="01" title="上传已有简历" text="保留真实经历，不从零生成。" tone="coral" />
                  <JourneyStep value="02" title="贴上目标 JD" text="只围绕目标岗位做定向优化。" tone="sky" />
                  <JourneyStep value="03" title="追问项目细节" text="缺数据就问，不替你编。" tone="violet" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function JourneyStep({
  value,
  title,
  text,
  tone
}: {
  value: string;
  title: string;
  text: string;
  tone: "coral" | "sky" | "violet";
}) {
  const toneClass = {
    coral: "bg-coral text-white",
    sky: "bg-sky text-white",
    violet: "bg-violet text-white"
  }[tone];

  return (
    <div className="flex gap-3 rounded-lg bg-white p-3 shadow-sm">
      <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg text-xs font-black ${toneClass}`}>
        {value}
      </div>
      <div>
        <p className="text-sm font-black text-ink">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
      </div>
    </div>
  );
}
