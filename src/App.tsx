// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import type { Leaderboards, Student, Clazz, Book } from "./api";
import { fetchLeaderboards, refreshLeaderboards } from "./api";

type TabKey = "student" | "class" | "book";

const pastel = {
  bg: "bg-[#FFF7F9]",          // very light pink
  card: "bg-white/90 backdrop-blur",
  border: "border-[#EFD9E0]",
  primary: "bg-[#FFC6D9]",     // macaron pink
  secondary: "bg-[#C3E7E3]",   // mint
  accent: "bg-[#F8E6C2]",      // cream
  text: "text-[#3b3355]",
  muted: "text-[#7b7399]",
  chip: ["#FFC6D9", "#C3E7E3", "#F8E6C2", "#DCC4F3", "#BFE0FF", "#FAD4B8"],
};

export default function App() {
  const [tab, setTab] = useState<TabKey>("student");
  const [data, setData] = useState<Leaderboards | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchLeaderboards();
      setData(d);
      if (!d) setErr("目前尚未建立排行榜，請先點『一鍵刷新』。");
    } catch (e:any) {
      setErr("讀取失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function doRefresh() {
    setRefreshing(true);
    setErr(null);
    try {
      const ok = await refreshLeaderboards();
      if (!ok) throw new Error("refresh failed");
      await load();
    } catch {
      setErr("重新整理失敗，請檢查後端權限或稍後再試。");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className={`${pastel.bg} min-h-screen`}>
      <header className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${pastel.text}`}>快樂國小｜閱讀小博士排行榜</h1>
            <p className={`${pastel.muted} text-sm mt-1`}>學生 / 班級 / 書籍　三大榜單（按 一鍵刷新）</p>
          </div>
          <button
            onClick={doRefresh}
            disabled={refreshing}
            className={`px-4 py-2 rounded-2xl shadow border ${pastel.border} ${pastel.primary} hover:opacity-90 disabled:opacity-60`}
            title="讀取三份 Google 試算表，重建並覆寫 leaderboards.json"
          >
            {refreshing ? "刷新中..." : "一鍵刷新"}
          </button>
        </div>

        <nav className="mt-6 flex gap-2">
          {([
            ["student","學生借閱"] as const,
            ["class","班級借閱"] as const,
            ["book","書籍借閱"] as const,
          ]).map(([k,label],i)=>(
            <button
              key={k}
              onClick={()=>setTab(k as TabKey)}
              className={`px-4 py-2 rounded-2xl border ${pastel.border} ${tab===k ? "bg-white" : "bg-white/70 hover:bg-white"} shadow-sm`}
              aria-pressed={tab===k}
            >
              <span className={`${pastel.text} font-medium`}>{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-6 pt-2">
        <section className={`rounded-3xl border ${pastel.border} ${pastel.card} p-4 md:p-6 shadow`}>
          {loading ? (
            <div className="animate-pulse text-center py-12">載入中...</div>
          ) : err ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">{err}</p>
              <div className="mt-4">
                <button onClick={load} className="px-4 py-2 rounded-2xl border bg-white hover:bg-white/80">重新載入</button>
              </div>
            </div>
          ) : !data ? (
            <div className="text-center py-8">目前尚無資料，請點上方「一鍵刷新」。</div>
          ) : (
            <>
              {tab==="student" && <StudentTab data={data} />}
              {tab==="class"   && <ClassTab data={data} />}
              {tab==="book"    && <BookTab data={data} />}
              <footer className="pt-4 text-xs text-right text-gray-500">
                產生時間：{new Date(data.generatedAt).toLocaleString()}
              </footer>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

/* ---------- 子元件 ---------- */

function Chip({text, i}:{text:string; i:number}) {
  const color = pastel.chip[i % pastel.chip.length];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2"
      style={{ backgroundColor: color, color: "#3b3355" }}
    >
      {text}
    </span>
  );
}

function RankTable({
  headers, rows, getKey
}:{
  headers: string[];
  rows: React.ReactNode[][];
  getKey: (i:number)=>string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border mt-2" style={{borderColor: "#EFD9E0"}}>
      <table className="min-w-full text-sm">
        <thead className="bg-white/90">
          <tr>
            {headers.map((h,idx)=>(
              <th key={idx} className="px-3 py-2 text-left font-semibold text-[#3b3355]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{borderColor: "#F3E6EA"}}>
          {rows.map((cols,i)=>(
            <tr key={getKey(i)} className="hover:bg-white/70">
              {cols.map((c,ci)=>(
                <td key={ci} className="px-3 py-2">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --- Student tab --- */
function StudentTab({data}:{data:Leaderboards}) {
  const overall = data.studentOverall;
  // 依年級群組，取各年級前10名（後端已有，但前端也做一次保險）
  const byGrade = useMemo(() => {
    const m = new Map<number, Student[]>();
    for (const s of overall) {
      if (!m.has(s.gradeNo)) m.set(s.gradeNo, []);
      m.get(s.gradeNo)!.push(s);
    }
    for (const [g, arr] of m) arr.sort((a,b)=>b.count-a.count);
    return m;
  }, [overall]);

  return (
    <div>
      <h2 className="text-xl font-bold text-[#3b3355]">全校學生排行榜</h2>
      <RankTable
        headers={["名次","年級","班級","姓名","借閱次數"]}
        rows={overall.map((s,idx)=>[
          <b key="rank">#{idx+1}</b>,
          <span key="g"><Chip text={s.grade} i={s.gradeNo}/></span>,
          <span key="c">{s.clazz}</span>,
          <span key="n" className="font-medium">{s.name}</span>,
          <span key="ct">{s.count}</span>
        ])}
        getKey={(i)=>`stu-${i}`}
      />

      <h3 className="text-lg font-semibold text-[#3b3355] mt-6">各年級前十名</h3>
      <div className="grid md:grid-cols-2 gap-4 mt-2">
        {Array.from({length:6},(_,i)=>i+1).map(gradeNo=>{
          const list = (data.studentTopByGrade?.[gradeNo] ?? byGrade.get(gradeNo) ?? []).slice(0,10);
          return (
            <div key={gradeNo} className="p-4 rounded-2xl border" style={{borderColor:"#EFD9E0"}}>
              <div className="flex items-center justify-between">
                <div className="font-bold text-[#3b3355]">{["","一","二","三","四","五","六"][gradeNo]}年級</div>
                <div className={`px-2 py-1 rounded-xl text-xs ${pastel.secondary}`}>Top 10</div>
              </div>
              <ol className="mt-2 space-y-1">
                {list.map((s,idx)=>(
                  <li key={idx} className="flex justify-between text-sm">
                    <span className="truncate">
                      <b className="mr-2">#{idx+1}</b>
                      <span className="mr-2">{s.clazz}</span>
                      <span className="font-medium">{s.name}</span>
                    </span>
                    <span className="tabular-nums">{s.count}</span>
                  </li>
                ))}
                {list.length===0 && <div className="text-sm text-gray-500">無資料</div>}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --- Class tab --- */
function ClassTab({data}:{data:Leaderboards}) {
  const rows = data.classTop;
  return (
    <div>
      <h2 className="text-xl font-bold text-[#3b3355]">班級借閱排行榜</h2>
      <RankTable
        headers={["名次","年級","班級","借閱次數"]}
        rows={rows.map((c,idx)=>[
          <b key="rank">#{idx+1}</b>,
          <span key="g"><Chip text={c.grade} i={c.gradeNo} /></span>,
          <span key="c">{c.className}</span>,
          <span key="ct" className="tabular-nums">{c.count}</span>,
        ])}
        getKey={(i)=>`cls-${i}`}
      />
    </div>
  );
}

/* --- Book tab --- */
function BookTab({data}:{data:Leaderboards}) {
  const rows = data.bookTop;
  return (
    <div>
      <h2 className="text-xl font-bold text-[#3b3355]">書籍借閱排行榜</h2>
      <RankTable
        headers={["名次","書名","借閱次數"]}
        rows={rows.map((b,idx)=>[
          <b key="rank">#{idx+1}</b>,
          <span key="t" className="font-medium">{b.title}</span>,
          <span key="ct" className="tabular-nums">{b.count}</span>,
        ])}
        getKey={(i)=>`book-${i}`}
      />
    </div>
  );
}
