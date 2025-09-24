import React, { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

// ✅ 已填入你的 /exec URL（可自行更改為其他 GAS 部署網址）
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyalzLLEozy9HJDQHXo45nurA_SRIwn7T6I48O65iQPWcHaYWBAeki2HmT0nkl9OyHB5Q/exec'

type StudentRow = { grade: string; clazz: string; name: string; count: number }
type ClassRow   = { grade: string; clazz: string; count: number }
type BookRow    = { title: string; count: number }

export default function App() {
  // ---------- 馬卡龍配色 ----------
  const macaron = { bg:'bg-[#FFF6F6]', card:'bg-[#FDF2FA]', card2:'bg-[#F1F8FF]', card3:'bg-[#FDF7E3]', accent:'bg-[#FADADD]', accent2:'bg-[#C7E9B0]', text:'text-slate-700', title:'text-slate-800', border:'border-[#F3E8FF]', chip:'bg-white/70', danger:'text-rose-600' }

  // ---------- 工具 ----------
  const safeNum = (v: unknown)=>{ const n=Number(String(v??'').replace(/[^\d.\-]/g,'')); return Number.isFinite(n)?n:0 }
  const sortGrade = (a:string,b:string)=>{ const na=Number(a), nb=Number(b); if(Number.isFinite(na)&&Number.isFinite(nb)) return na-nb; return String(a).localeCompare(String(b),'zh-Hant') }
  const parseClassName = (val: unknown)=>{ 
    const s=String(val??'').trim(); 
    if(!s) return {gradeText:'', classText:''}; 
    const zh=s.match(/([一二三四五六])年級\s*(\d{1,2})\s*班/); 
    if(zh) return {gradeText:`${zh[1]}年級`, classText:`${parseInt(zh[2],10)}班`}; 
    const num=s.match(/^(\d)(\d{2})$/); 
    if(num){ 
      const digit=parseInt(num[1],10), cls=parseInt(num[2],10); 
      const map=['零','一','二','三','四','五','六']; 
      return {gradeText:`${map[digit]||digit}年級`, classText:`${cls}班`}; 
    } 
    const any=s.match(/(\d)(\d{1,2})/); 
    if(any){ 
      const digit=parseInt(any[1],10), cls=parseInt(any[2],10); 
      const map=['零','一','二','三','四','五','六']; 
      return {gradeText:`${map[digit]||digit}年級`, classText:`${cls}班`}; 
    } 
    const g=s.match(/([一二三四五六])年級/); 
    const c=s.match(/(\d{1,2})\s*班/); 
    return {gradeText:g?`${g[1]}年級`:'', classText:c?`${parseInt(c[1],10)}班`:s}; 
  }

  // ---------- Tab ----------
  const [tab, setTab] = useState<'student'|'class'|'book'>('student')

  // ---------- 欄位別名 ----------
  const STUDENT_ALIASES = { name:['姓名','name','Name','學生姓名','学生姓名'], count:['借閱次數','借閱量','次數','count','Count','BorrowCount','借閱人次'], className:['班級名稱','班級代碼','班級','ClassName','class_name','班級名稱(代碼)'] }
  const CLASS_ALIASES   = { className:['班級名稱','班級代碼','班級','ClassName','class_name','班級名稱(代碼)'], count:['借閱次數','借閱量','次數','count','Count','BorrowCount'] }
  const BOOK_ALIASES    = { title:['書名','題名','書籍名稱','Title','BookTitle'], count:['借閱次數','借閱量','次數','count','Count','BorrowCount'] }

  const pickHeader = (headers:string[], aliases:string[])=>{ const hs=headers.map(h=>String(h).trim()); for(const a of aliases){ const i=hs.findIndex(x=>x.toLowerCase()===a.toLowerCase()); if(i!==-1) return headers[i]; } for(const a of aliases){ const i=hs.findIndex(x=>x.toLowerCase().includes(a.toLowerCase())); if(i!==-1) return headers[i]; } return '' }
  const requireHeaders = (headers:string[], aliasMap:Record<string,string[]>)=>{ const result:Record<string,string>={}; for(const k of Object.keys(aliasMap)){ const hit=pickHeader(headers, aliasMap[k]); if(!hit) return {ok:false as const, missing:k}; result[k]=hit; } return {ok:true as const, mapping:result} }
  const readSheet = (file:File)=> new Promise<any[]>((resolve,reject)=>{ const r=new FileReader(); const isCSV=file.name.toLowerCase().endsWith('.csv'); r.onload=(e)=>{ try{ const data=(e.target as any)?.result; if(!data) return resolve([]); const wb=isCSV? XLSX.read(data,{type:'string'}) : XLSX.read(new Uint8Array(data as ArrayBuffer),{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]]; resolve(XLSX.utils.sheet_to_json(ws,{defval:''})); }catch(err){ reject(err);} }; if(isCSV) r.readAsText(file,'utf-8'); else r.readAsArrayBuffer(file); })

  // ---------- 狀態 ----------
  const [stuRows, setStuRows] = useState<StudentRow[]>([])
  const [stuTopN,setStuTopN]=useState<number>(50)
  const [stuErr,setStuErr]=useState<string>('')

  const [clsRows, setClsRows] = useState<ClassRow[]>([])
  const [clsTopN,setClsTopN]=useState<number>(50)
  const [clsErr,setClsErr]=useState<string>('')

  const [bookRows,setBookRows]=useState<BookRow[]>([])
  const [bookTopN,setBookTopN]=useState<number>(100)
  const [bookErr,setBookErr]=useState<string>('')

  const [loadingCloud,setLoadingCloud]=useState<boolean>(false)
  const [saving,setSaving]=useState<boolean>(false)
  const [refreshing,setRefreshing]=useState<boolean>(false)

  // ---------- 啟動：讀取雲端 JSON ----------
  useEffect(()=>{ (async()=>{ try{ setLoadingCloud(true); const res=await fetch(BACKEND_URL); const json=await res.json(); const data=json?.data? json.data : json; if(data && data.student && data.class && data.book){ setStuRows(Array.isArray(data.student)? data.student:[]); setClsRows(Array.isArray(data.class)? data.class:[]); setBookRows(Array.isArray(data.book)? data.book:[]); } }catch(e){} finally{ setLoadingCloud(false);} })(); },[])

  // ---------- 一鍵儲存到雲端（直接送 JSON） ----------
  async function saveToCloud(){
    const payload = { generatedAt:new Date().toISOString(), student:stuRows, class:clsRows, book:bookRows }
    try{ setSaving(true); const res=await fetch(BACKEND_URL,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}); const json=await res.json(); if(json.ok){ alert('已儲存到雲端！'); } else { alert('儲存失敗：'+(json.error||'unknown')); } } catch(err){ alert('連線失敗，請稍後再試'); } finally{ setSaving(false); }
  }

  // ---------- 一鍵刷新：請 GAS 直接讀三份 Google Sheet、重建並覆寫 JSON ----------
  async function refreshFromSheets(){
    try{
      setRefreshing(true)
      const res = await fetch(BACKEND_URL + '?action=refresh', { method: 'POST' })
      const json = await res.json()
      if(!json.ok){ alert('刷新失敗：' + (json.error||'unknown')); return }
      const r2 = await fetch(BACKEND_URL + '?' + Date.now())
      const data = await r2.json()
      const payload = data?.data ? data.data : data
      if(payload && payload.student && payload.class && payload.book){
        setStuRows(Array.isArray(payload.student)? payload.student:[])
        setClsRows(Array.isArray(payload.class)? payload.class:[])
        setBookRows(Array.isArray(payload.book)? payload.book:[])
      }
      alert('已從 Google 試算表刷新完成！')
    }catch(err){
      alert('連線失敗，請稍後再試')
    }finally{
      setRefreshing(false)
    }
  }

  // ---------- 上傳 Excel → 本地生成 ----------
  const handleStudentFile = async(file:File)=>{ setStuErr(''); const json=await readSheet(file); const headers=Object.keys(json?.[0]||{}); const check=requireHeaders(headers, STUDENT_ALIASES); if(!check.ok){ setStuErr(`學生表缺少必要欄位：${check.missing}`); setStuRows([]); return; } const {name,count,className}=check.mapping as any; const rows:StudentRow[]=json.map((r:any)=>{ const nm=String(r[name]??'').trim(); const cnt=safeNum(r[count]??0); const parsed=parseClassName(r[className]); return { grade:parsed.gradeText, clazz:parsed.classText, name:nm, count:cnt }; }).filter(r=>r.grade && r.name).sort((a,b)=>b.count-a.count); setStuRows(rows); }
  const handleClassFile   = async(file:File)=>{ setClsErr(''); const json=await readSheet(file); const headers=Object.keys(json?.[0]||{}); const check=requireHeaders(headers, CLASS_ALIASES); if(!check.ok){ setClsErr(`班級表缺少必要欄位：${check.missing}`); setClsRows([]); return; } const {className,count}=check.mapping as any; const rows:ClassRow[]=json.map((r:any)=>{ const p=parseClassName(r[className]); return { grade:p.gradeText, clazz:p.classText, count:safeNum(r[count]??0) }; }).filter(r=>r.grade && r.clazz).sort((a,b)=>b.count-a.count); setClsRows(rows); }
  const handleBookFile    = async(file:File)=>{ setBookErr(''); const json=await readSheet(file); const headers=Object.keys(json?.[0]||{}); const check=requireHeaders(headers, BOOK_ALIASES); if(!check.ok){ setBookErr(`書籍表缺少必要欄位：${check.missing}`); setBookRows([]); return; } const {title,count}=check.mapping as any; const rows:BookRow[]=json.map((r:any)=>({ title:String(r[title]??'').trim(), count:safeNum(r[count]??0) })).filter(r=>r.title).sort((a,b)=>b.count-a.count); setBookRows(rows); }

  // ---------- 衍生資料 ----------
  const stuByGrade = useMemo(()=>{ const map=new Map<string,StudentRow[]>(); for(const r of stuRows){ if(!map.has(r.grade)) map.set(r.grade,[]); map.get(r.grade)!.push(r)} for(const [g,arr] of map) arr.sort((a,b)=>b.count-a.count); return map },[stuRows])
  const stuGrades   = useMemo(()=> Array.from(stuByGrade.keys()).sort(sortGrade), [stuByGrade])
  const stuSchoolTop= useMemo(()=> stuRows.slice(0,stuTopN), [stuRows,stuTopN])
  const clsSchoolTop= useMemo(()=> clsRows.slice(0,clsTopN), [clsRows,clsTopN])
  const bookSchoolTop=useMemo(()=> bookRows.slice(0,bookTopN), [bookRows,bookTopN])

  // ---------- UI 小元件 ----------
  const UploadInline: React.FC<{label:string; onFile:(f:File)=>void}> = ({ label, onFile }) => (
    <div className={`rounded-2xl ${macaron.card2} p-5 border ${macaron.border} shadow-sm`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={`text-base md:text-lg font-semibold ${macaron.title}`}>{label}</h2>
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm hover:shadow transition">
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onFile(f) }} />
          <span className="font-medium">選擇檔案</span>
        </label>
      </div>
    </div>
  )

  const Table: React.FC<{columns:{key:string;label:string;render?:(v:any,row:any,i:number)=>React.ReactNode}[]; rows:any[]; title:string; limit?:number; rightAlignKeys?:string[]}> = ({ columns, rows, title, limit, rightAlignKeys=[] }) => (
    <div className={`rounded-2xl ${macaron.card} shadow-sm border ${macaron.border} p-4 md:p-6`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold text-lg md:text-xl ${macaron.title}`}>{title}</h3>
        {typeof limit==='number' && (<span className={`text-xs md:text-sm px-2 py-1 rounded-full ${macaron.chip} ${macaron.text}`}>Top {limit}</span>)}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b border-white/60">{columns.map(c=>(<th key={c.key} className={`text-left py-2 pr-2 ${rightAlignKeys.includes(c.key)?'text-right':''}`}>{c.label}</th>))}</tr></thead>
          <tbody>{rows.map((r,idx)=>(<tr key={idx} className="border-b border-white/40 last:border-none">{columns.map(c=>(<td key={c.key} className={`py-2 pr-2 ${rightAlignKeys.includes(c.key)?'text-right':''}`}>{c.render? c.render((r as any)[c.key], r, idx) : (r as any)[c.key]}</td>))}</tr>))}</tbody>
        </table>
      </div>
    </div>
  )

  // ---------- 分頁 ----------
  const StudentPage = () => (
    <div className="space-y-6">
      <UploadInline label="上傳【學生借閱】檔案（姓名／借閱次數／班級名稱）" onFile={handleStudentFile} />
      {stuErr && <p className={`${macaron.danger}`}>{stuErr}</p>}
      {stuRows.length>0 && (<>
        <div className={`rounded-2xl ${macaron.card} p-5 border ${macaron.border} shadow-sm flex flex-wrap items-center gap-4`}>
          <div className="flex items-center gap-2"><label className="text-sm">全校 Top N：</label><input type="number" min={1} max={9999} value={stuTopN} onChange={(e)=>setStuTopN(Math.max(1,Math.min(9999,Number(e.target.value)||1)))} className="w-24 rounded-xl border border-white bg-white px-3 py-2"/></div>
          <div className="text-xs text-slate-500">資料列數：{stuRows.length}</div>
        </div>
        <Table title={`全校學生借閱排行榜（Top ${stuTopN}）`} limit={stuTopN} columns={[{key:'rank',label:'名次',render:(_,__,i)=>i+1},{key:'name',label:'姓名'},{key:'grade',label:'年級'},{key:'clazz',label:'班級'},{key:'count',label:'借閱次數'}]} rows={stuSchoolTop} rightAlignKeys={["count"]}/>
        <div className="mt-6">
          <h2 className={`text-xl font-bold ${macaron.title} mb-3`}>各年級前 10 名</h2>
          <div className="flex flex-wrap gap-2 mb-4">{stuGrades.map(g=>(<span key={g} className={`px-3 py-1 rounded-full ${macaron.accent2} ${macaron.text} shadow-sm`}>年級：{g}</span>))}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stuGrades.map((g)=> (<Table key={g} title={`【${g}年級】借閱前十名`} limit={10} columns={[{key:'rank',label:'名次',render:(_,__,i)=>i+1},{key:'name',label:'姓名'},{key:'clazz',label:'班級'},{key:'count',label:'借閱次數'}]} rows={(stuByGrade.get(g)||[]).slice(0,10)} rightAlignKeys={["count"]}/>))}
          </div>
        </div>
      </>)}
    </div>
  )

  const ClassPage = () => (
    <div className="space-y-6">
      <UploadInline label="上傳【班級借閱】檔案（班級名稱／借閱次數）" onFile={handleClassFile} />
      {clsErr && <p className={`${macaron.danger}`}>{clsErr}</p>}
      {clsRows.length>0 && (<>
        <div className={`rounded-2xl ${macaron.card} p-5 border ${macaron.border} shadow-sm flex flex-wrap items-center gap-4`}>
          <div className="flex items-center gap-2"><label className="text-sm">全校 Top N：</label><input type="number" min={1} max={9999} value={clsTopN} onChange={(e)=>setClsTopN(Math.max(1,Math.min(9999,Number(e.target.value)||1)))} className="w-24 rounded-xl border border-white bg-white px-3 py-2"/></div>
          <div className="text-xs text-slate-500">班級數：{clsRows.length}</div>
        </div>
        <Table title={`全校班級借閱排行榜（Top ${clsTopN}）`} limit={clsTopN} columns={[{key:'rank',label:'名次',render:(_,__,i)=>i+1},{key:'clazz',label:'班級'},{key:'grade',label:'年級'},{key:'count',label:'借閱次數'}]} rows={clsSchoolTop} rightAlignKeys={["count"]}/>
      </>)}
    </div>
  )

  const BookPage = () => (
    <div className="space-y-6">
      <UploadInline label="上傳【書籍借閱】檔案（書名／借閱次數）" onFile={handleBookFile} />
      {bookErr && <p className={`${macaron.danger}`}>{bookErr}</p>}
      {bookRows.length>0 && (<>
        <div className={`rounded-2xl ${macaron.card} p-5 border ${macaron.border} shadow-sm flex flex-wrap items-center gap-4`}>
          <div className="flex items-center gap-2"><label className="text-sm">全校 Top N：</label><input type="number" min={1} max={9999} value={bookTopN} onChange={(e)=>setBookTopN(Math.max(1,Math.min(9999,Number(e.target.value)||1)))} className="w-24 rounded-xl border border-white bg-white px-3 py-2"/></div>
          <div className="text-xs text-slate-500">書目數：{bookRows.length}</div>
        </div>
        <Table title={`全校書籍借閱排行榜（Top ${bookTopN}）`} limit={bookTopN} columns={[{key:'rank',label:'名次',render:(_,__,i)=>i+1},{key:'title',label:'書名'},{key:'count',label:'借閱次數'}]} rows={bookSchoolTop} rightAlignKeys={["count"]}/>
      </>)}
    </div>
  )

  return (
    <div className={`min-h-screen ${macaron.bg} ${macaron.text} p-4 md:p-8`}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className={`rounded-2xl ${macaron.card3} p-5 md:p-8 border ${macaron.border} shadow-sm`}>
          <h1 className={`text-2xl md:text-3xl font-extrabold ${macaron.title}`}>📚 快樂國小｜閱讀排行榜（GAS 雲端保存＋一鍵刷新）</h1>
          <p className={`${macaron.text} mt-2`}>可直接上傳 Excel 產生榜單、儲存到雲端，或按「一鍵刷新」從 Google 試算表重建。</p>
        </header>

        <div className={`rounded-2xl ${macaron.card3} p-4 border ${macaron.border} shadow-sm flex flex-wrap items-center gap-3`}>
          <button onClick={saveToCloud} disabled={saving} className="px-4 py-2 rounded-xl bg-white shadow hover:shadow-md disabled:opacity-60">{saving? '儲存中…' : '儲存到雲端'}</button>
          <button onClick={refreshFromSheets} disabled={refreshing} className="px-4 py-2 rounded-xl bg-white shadow hover:shadow-md disabled:opacity-60">{refreshing? '刷新中（抓取試算表）…' : '一鍵刷新（讀取試算表）'}</button>
        </div>

        <div className="flex flex-wrap gap-2">
          {['student','class','book'].map((id)=> (
            <button key={id} onClick={()=>setTab(id as any)} className={`px-4 py-2 rounded-full shadow-sm border ${macaron.border} ${tab===id? macaron.accent : 'bg-white'}`}>
              {id==='student'?'學生借閱': id==='class'?'班級借閱':'書籍借閱'}
            </button>
          ))}
        </div>

        {tab==='student' && <StudentPage/>}
        {tab==='class' && <ClassPage/>}
        {tab==='book' && <BookPage/>}

        <footer className="pt-6 text-xs text-center text-slate-500"><p>© {new Date().getFullYear()} 快樂國小｜閱讀推動</p></footer>
      </div>
    </div>
  )
}
