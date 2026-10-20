/* Master export: every table on the site into ONE Excel file, one tab per table.
   Staff only. Add a new table here when you add a new sheet (name -> tab label). */
window.TTCExport = (function(){
  const TABLES = [
    ["board_slides","Board history"], ["calendar_events","Calendar"], ["members","Members"],
    ["visits","Studio"], ["ftc_visits","FTC"], ["podcast_visits","Podcasting"], ["printer_visits","3D Printer"],
    ["art_visits","Art"], ["youthcouncil_visits","Youth Council"], ["musicvideo_visits","Music Video"],
    ["openmic_visits","Open Mic"], ["peerpanel_visits","Career Panel"], ["askajob_visits","Ask a Job"],
    ["linkedin_visits","LinkedIn"], ["vibecoding_visits","Vibe Coding"], ["tshirt_visits","T-shirt"],
    ["event_sheets","Event sheets"], ["event_signins","Event sign-ins"], ["milestones","Milestones"]
  ];
  // columns to put first, per table (rest follow in database order)
  const FIRST = { board_slides:["image_filename","title","kind","body","starts_on","until","removed_at","image_deleted_at","image_url","image_full","created_at"] };
  const HIDE = ["id","sort","color"];

  function loadXLSX(){
    if (window.XLSX) return Promise.resolve();
    return new Promise((res,rej)=>{ const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload=res; s.onerror=()=>rej(new Error("xlsx lib"));
      document.head.appendChild(s); });
  }
  async function all(table){
    const out=[]; const step=1000;
    for(let off=0; off<200000; off+=step){
      const r = await fetch(TTC.rest(table)+"?select=*&order=created_at.asc&offset="+off+"&limit="+step, { headers:TTC.headers() });
      if(!r.ok){ if(off===0) return null; break; }
      const rows = await r.json(); out.push(...rows); if(rows.length<step) break;
    }
    return out;
  }
  async function run(onProgress){
    await loadXLSX();
    const wb = XLSX.utils.book_new(); let n=0;
    for(const [t,label] of TABLES){
      onProgress && onProgress(label);
      const rows = await all(t); if(!rows) continue;       // table missing: skip
      const first = FIRST[t]||[];
      const keys = []; rows.forEach(r=>Object.keys(r).forEach(k=>{ if(!keys.includes(k)) keys.push(k); }));
      const cols = first.filter(k=>keys.includes(k)).concat(keys.filter(k=>!first.includes(k) && !HIDE.includes(k)));
      const data = rows.map(r=>{ const o={}; cols.forEach(c=>{ let v=r[c]; if(v&&typeof v==="object") v=JSON.stringify(v); o[c]=v==null?"":v; }); return o; });
      const ws = XLSX.utils.json_to_sheet(data.length?data:[{}], { header: cols });
      ws["!cols"] = cols.map(c=>({ wch: Math.min(40, Math.max(c.length+2, 12)) }));
      XLSX.utils.book_append_sheet(wb, ws, label.slice(0,31)); n++;
    }
    const d=new Date(), p=x=>String(x).padStart(2,"0");
    XLSX.writeFile(wb, `KingsHwy-TTC-everything-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}.xlsx`);
    return n;
  }
  return { run };
})();
