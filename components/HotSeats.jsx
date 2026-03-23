"use client";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";

/* ═══════════════════════════════════════════
   HOT SEATS — FINAL BUILD
   Top Ticket Trends Intelligence Platform
   ═══════════════════════════════════════════ */

// API keys are server-side in /api routes — never exposed to browser

// ── TIMEZONE ──
const ST_TZ={"az":"America/Phoenix","al":"America/Chicago","ak":"America/Anchorage","ar":"America/Chicago","ca":"America/Los_Angeles","co":"America/Denver","ct":"America/New_York","de":"America/New_York","fl":"America/New_York","ga":"America/New_York","hi":"Pacific/Honolulu","id":"America/Boise","il":"America/Chicago","in":"America/Indiana/Indianapolis","ia":"America/Chicago","ks":"America/Chicago","ky":"America/New_York","la":"America/Chicago","me":"America/New_York","md":"America/New_York","ma":"America/New_York","mi":"America/Detroit","mn":"America/Chicago","ms":"America/Chicago","mo":"America/Chicago","mt":"America/Denver","ne":"America/Chicago","nv":"America/Los_Angeles","nh":"America/New_York","nj":"America/New_York","nm":"America/Denver","ny":"America/New_York","nc":"America/New_York","nd":"America/Chicago","oh":"America/New_York","ok":"America/Chicago","or":"America/Los_Angeles","pa":"America/New_York","ri":"America/New_York","sc":"America/New_York","sd":"America/Chicago","tn":"America/Chicago","tx":"America/Chicago","ut":"America/Denver","vt":"America/New_York","va":"America/New_York","wa":"America/Los_Angeles","wv":"America/New_York","wi":"America/Chicago","wy":"America/Denver","on":"America/Toronto"};
const CI_TZ={"new york":"America/New_York","los angeles":"America/Los_Angeles","chicago":"America/Chicago","houston":"America/Chicago","phoenix":"America/Phoenix","philadelphia":"America/New_York","dallas":"America/Chicago","san francisco":"America/Los_Angeles","denver":"America/Denver","boston":"America/New_York","nashville":"America/Chicago","las vegas":"America/Los_Angeles","detroit":"America/Detroit","miami":"America/New_York","atlanta":"America/New_York","seattle":"America/Los_Angeles","milwaukee":"America/Chicago","portland":"America/Los_Angeles","toronto":"America/Toronto","arlington":"America/Chicago","east rutherford":"America/New_York","inglewood":"America/Los_Angeles","green bay":"America/Chicago","miami gardens":"America/New_York","avondale":"America/Phoenix","bronx":"America/New_York"};

function getTZ(addr,ven){const a=(addr||"").toLowerCase(),v=(ven||"").toLowerCase();const m=a.match(/,\s*([a-z]{2})\s+\d{5}/i)||a.match(/,\s*([a-z]{2})\s*$/i);if(m&&ST_TZ[m[1].toLowerCase()])return ST_TZ[m[1].toLowerCase()];for(const[c,tz]of Object.entries(CI_TZ))if(a.includes(c)||v.includes(c))return tz;return"America/New_York";}
function getLocalTime(tz){try{return new Date().toLocaleString("en-US",{timeZone:tz,hour:"numeric",minute:"2-digit",hour12:true});}catch{return null;}}
function getCallBadge(tz){try{const n=new Date(),vt=new Date(n.toLocaleString("en-US",{timeZone:tz})),h=vt.getHours(),d=vt.getDay();if(d===0)return{s:"closed",l:"Sunday — Closed",c:"#ef4444"};if(d===6)return h>=10&&h<14?{s:"open",l:"Saturday — Open",c:"#22c55e"}:{s:"closed",l:"Saturday — Closed",c:"#ef4444"};if(h>=10&&h<18)return{s:"open",l:"Good time to call",c:"#22c55e"};if(h>=9&&h<10)return{s:"maybe",l:"Opening soon",c:"#eab308"};if(h>=18&&h<19)return{s:"maybe",l:"Closing soon",c:"#eab308"};return{s:"closed",l:"Probably closed",c:"#ef4444"};}catch{return{s:"unknown",l:"Unknown",c:"#eab308"};}}

// ── STATUSES ──
const ST=[
  {k:"NOT_CALLED",l:"NOT CALLED",c:"#6b7280",bg:"rgba(107,114,128,0.15)"},
  {k:"HIT",l:"HIT",c:"#22c55e",bg:"rgba(34,197,94,0.18)"},
  {k:"NO",l:"NO",c:"#ef4444",bg:"rgba(239,68,68,0.18)"},
  {k:"FOLLOW_UP",l:"FOLLOW UP",c:"#eab308",bg:"rgba(234,179,8,0.18)"},
  {k:"SOLD_OUT",l:"SOLD OUT",c:"#3b82f6",bg:"rgba(59,130,246,0.18)"},
  {k:"DIDNT_ANSWER",l:"DIDN'T ANSWER",c:"#a855f7",bg:"rgba(168,85,247,0.18)"},
  {k:"CALLING",l:"CALLING",c:"#10b981",bg:"rgba(16,185,129,0.18)"},
  {k:"DISS",l:"DISS",c:"#f43f5e",bg:"rgba(244,63,94,0.2)"},
];
const DEAD=["DISS","NO","SOLD_OUT"];

// Category config: each tab maps to SeatGeek type + Ticketmaster classificationName
const CAT_CONFIG={
  sports:{sg:"",tm:"Sports",subs:["NBA","NFL","MLB","NHL","NCAA Mens Basketball","NCAA Womens Basketball","MLS","UFC/MMA","Boxing","Wrestling","Tennis","Golf"]},
  concerts:{sg:"concert",tm:"Music",subs:["Pop","Rock","Hip-Hop/Rap","Country","R&B","Latin","EDM/Electronic","Alternative","Jazz/Blues","Classical"]},
  theatre:{sg:"theater",tm:"Arts & Theatre",subs:["Broadway","Musical","Comedy","Opera","Ballet","Cirque du Soleil","Off-Broadway"]},
  rodeo:{sg:"",tm:"",subs:["PBR","NFR","Rodeo","Bull Riding","Barrel Racing"]},
};

const TABS=[{k:"home",l:"🏠 Home"},{k:"all",l:"All Events"},{k:"sports",l:"Sports"},{k:"concerts",l:"Concerts"},{k:"theatre",l:"Theatre"},{k:"rodeo",l:"🤠 Rodeo"},{k:"top_cities",l:"Top Cities"},{k:"calendar",l:"Calendar"},{k:"quickdial",l:"⚡ Quick Dial"}];
const TOP_CITIES=["Atlanta","Chicago","Los Angeles","New York","SF Bay Area","Boston","Houston","Las Vegas","Denver","Detroit","Nashville","Miami","Philadelphia","Seattle","Portland","Toronto"];

// ── EVENTS ──
const DE={
sports:[
{id:"s1",name:"NASCAR Cup Series — Straight Talk Wireless 500",date:"2026-03-07",dd:"Sat March 7 & Sun March 8, 2026",time:"1:00 PM Sat & 12:30 PM Sun",venue:"Phoenix Raceway",addr:"7602 S Avondale Blvd, Avondale, AZ 85323",ph:"866-408-7223",alt:"(623) 463-5400",altL:"Main Office",cat:"Sports"},
{id:"s2",name:"NBA — Lakers vs Celtics",date:"2026-04-10",dd:"Friday, April 10, 2026",time:"7:30 PM PT",venue:"Crypto.com Arena",addr:"1111 S Figueroa St, Los Angeles, CA 90015",ph:"(213) 742-7100",alt:"",altL:"",cat:"Sports"},
{id:"s3",name:"MLB — Yankees vs Red Sox",date:"2026-04-18",dd:"Saturday, April 18, 2026",time:"1:05 PM ET",venue:"Yankee Stadium",addr:"1 E 161 St, Bronx, NY 10451",ph:"(718) 293-4300",alt:"",altL:"",cat:"Sports"},
{id:"s4",name:"NHL — Blackhawks vs Red Wings",date:"2026-04-22",dd:"Wednesday, April 22, 2026",time:"7:00 PM CT",venue:"United Center",addr:"1901 W Madison St, Chicago, IL 60612",ph:"(312) 455-4500",alt:"",altL:"",cat:"Sports"},
{id:"s5",name:"NFL Draft 2026 — Round 1",date:"2026-04-23",dd:"Thursday, April 23, 2026",time:"8:00 PM ET",venue:"Lambeau Field",addr:"1265 Lombardi Ave, Green Bay, WI 54304",ph:"(920) 569-7500",alt:"(888) 442-7225",altL:"Packers Tickets",cat:"Sports"},
{id:"s6",name:"UFC 310",date:"2026-05-02",dd:"Saturday, May 2, 2026",time:"10:00 PM ET",venue:"T-Mobile Arena",addr:"3780 Las Vegas Blvd S, Las Vegas, NV 89158",ph:"(702) 692-1600",alt:"",altL:"",cat:"Sports"},
{id:"s7",name:"Formula 1 — Miami Grand Prix",date:"2026-05-10",dd:"Sunday, May 10, 2026",time:"2:00 PM ET",venue:"Miami International Autodrome",addr:"347 Don Shula Dr, Miami Gardens, FL 33056",ph:"(305) 943-8000",alt:"",altL:"",cat:"Sports"},
{id:"s8",name:"NBA Finals — Game 1",date:"2026-06-04",dd:"Thursday, June 4, 2026",time:"9:00 PM ET",venue:"Madison Square Garden",addr:"4 Pennsylvania Plaza, New York, NY 10001",ph:"(212) 465-6741",alt:"",altL:"",cat:"Sports"},
{id:"s9",name:"MLB — Dodgers vs Giants",date:"2026-03-28",dd:"Saturday, March 28, 2026",time:"1:10 PM PT",venue:"Dodger Stadium",addr:"1000 Vin Scully Ave, Los Angeles, CA 90012",ph:"(866) 363-4377",alt:"",altL:"",cat:"Sports"},
{id:"s10",name:"Toronto Maple Leafs vs Bruins",date:"2026-04-05",dd:"Sunday, April 5, 2026",time:"7:00 PM ET",venue:"Scotiabank Arena",addr:"40 Bay St, Toronto, ON M5J 2X2",ph:"(416) 815-5500",alt:"",altL:"",cat:"Sports"},
],
concerts:[
{id:"c1",name:"Morgan Wallen — I'm The Problem Tour",date:"2026-04-12",dd:"Saturday, April 12, 2026",time:"7:00 PM CT",venue:"AT&T Stadium",addr:"1 AT&T Way, Arlington, TX 76011",ph:"(817) 892-4161",alt:"",altL:"",cat:"Concerts"},
{id:"c2",name:"Kendrick Lamar — Grand National Tour",date:"2026-04-25",dd:"Friday, April 25, 2026",time:"8:00 PM ET",venue:"MetLife Stadium",addr:"1 MetLife Stadium Dr, East Rutherford, NJ 07073",ph:"(201) 559-1515",alt:"",altL:"",cat:"Concerts"},
{id:"c3",name:"Billie Eilish — Hit Me Hard And Soft",date:"2026-05-03",dd:"Sunday, May 3, 2026",time:"7:30 PM PT",venue:"SoFi Stadium",addr:"1001 Stadium Dr, Inglewood, CA 90301",ph:"(844) 373-4764",alt:"",altL:"",cat:"Concerts"},
{id:"c4",name:"SZA — Lana Tour",date:"2026-05-15",dd:"Friday, May 15, 2026",time:"8:00 PM ET",venue:"Madison Square Garden",addr:"4 Pennsylvania Plaza, New York, NY 10001",ph:"(212) 465-6741",alt:"(866) 858-0008",altL:"MSG Hotline",cat:"Concerts"},
{id:"c5",name:"Post Malone — F-1 Trillion Tour",date:"2026-05-22",dd:"Friday, May 22, 2026",time:"7:00 PM CT",venue:"Soldier Field",addr:"1410 Special Olympics Dr, Chicago, IL 60605",ph:"(312) 235-7000",alt:"",altL:"",cat:"Concerts"},
{id:"c6",name:"Dua Lipa — Radical Optimism Tour",date:"2026-06-05",dd:"Friday, June 5, 2026",time:"8:00 PM ET",venue:"Fenway Park",addr:"4 Jersey St, Boston, MA 02215",ph:"(877) 733-7699",alt:"",altL:"",cat:"Concerts"},
{id:"c7",name:"Tyler, The Creator — Chromakopia",date:"2026-06-14",dd:"Sunday, June 14, 2026",time:"7:30 PM PT",venue:"Chase Center",addr:"1 Warriors Way, San Francisco, CA 94158",ph:"(415) 486-6000",alt:"",altL:"",cat:"Concerts"},
{id:"c8",name:"Sabrina Carpenter — Short n' Sweet",date:"2026-06-20",dd:"Saturday, June 20, 2026",time:"8:00 PM CT",venue:"Bridgestone Arena",addr:"501 Broadway, Nashville, TN 37203",ph:"(615) 770-2000",alt:"",altL:"",cat:"Concerts"},
{id:"c9",name:"Bad Bunny — No Me Quiero Ir de Aquí",date:"2026-03-28",dd:"Saturday, March 28, 2026",time:"8:00 PM ET",venue:"Hard Rock Stadium",addr:"347 Don Shula Dr, Miami Gardens, FL 33056",ph:"(305) 943-8000",alt:"",altL:"",cat:"Concerts"},
{id:"c10",name:"Olivia Rodrigo — GUTS World Tour",date:"2026-04-05",dd:"Sunday, April 5, 2026",time:"7:30 PM ET",venue:"Wells Fargo Center",addr:"3601 S Broad St, Philadelphia, PA 19148",ph:"(215) 336-3600",alt:"",altL:"",cat:"Concerts"},
],
theatre:[
{id:"t1",name:"The Wiz — Broadway Musical",date:"2026-03-25",dd:"Wednesday, March 25, 2026",time:"7:30 PM CT",venue:"Uihlein Hall at Marcus Center",addr:"929 N Water St, Milwaukee, WI 53202",ph:"(414) 273-7206",alt:"",altL:"",cat:"Theatre"},
{id:"t2",name:"Hamilton",date:"2026-04-01",dd:"Wednesday, April 1, 2026",time:"7:00 PM ET",venue:"Richard Rodgers Theatre",addr:"226 W 46th St, New York, NY 10036",ph:"(212) 221-1211",alt:"",altL:"",cat:"Theatre"},
{id:"t3",name:"Wicked",date:"2026-04-15",dd:"Wednesday, April 15, 2026",time:"7:30 PM ET",venue:"Gershwin Theatre",addr:"222 W 51st St, New York, NY 10019",ph:"(212) 586-6510",alt:"",altL:"",cat:"Theatre"},
{id:"t4",name:"The Lion King",date:"2026-04-20",dd:"Sunday, April 20, 2026",time:"2:00 PM ET",venue:"Minskoff Theatre",addr:"200 W 45th St, New York, NY 10036",ph:"(212) 869-0550",alt:"(866) 870-2717",altL:"Ticketmaster",cat:"Theatre"},
{id:"t5",name:"Cirque du Soleil: Kooza",date:"2026-05-08",dd:"Friday, May 8, 2026",time:"7:30 PM PT",venue:"Grand Chapiteau",addr:"1000 Vin Scully Ave, Los Angeles, CA 90012",ph:"(866) 999-8111",alt:"",altL:"",cat:"Theatre"},
{id:"t6",name:"Six: The Musical",date:"2026-05-20",dd:"Wednesday, May 20, 2026",time:"7:30 PM CT",venue:"Cadillac Palace Theatre",addr:"151 W Randolph St, Chicago, IL 60601",ph:"(312) 977-1700",alt:"",altL:"",cat:"Theatre"},
{id:"t7",name:"MJ The Musical",date:"2026-03-30",dd:"Monday, March 30, 2026",time:"7:00 PM ET",venue:"Neil Simon Theatre",addr:"250 W 52nd St, New York, NY 10019",ph:"(212) 757-8646",alt:"",altL:"",cat:"Theatre"},
]};
const ALL=[ ...DE.sports,...DE.concerts,...DE.theatre];

// ── STORAGE ──
async function ld(k,f){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):f;}catch{return f;}}
async function sv(k,d){try{await window.storage.set(k,JSON.stringify(d));}catch{}}

// ── GOOGLE PLACES ──
async function gLookup(v,a){try{const res=await fetch(`/api/phone-lookup?venue=${encodeURIComponent(v)}&address=${encodeURIComponent(a)}`);const data=await res.json();return data.phone?{phone:data.phone,name:data.name||v,cachedAt:new Date().toISOString()}:null;}catch{return null;}}

// ── TREND ALERTS GENERATOR ──
function generateAlerts(events, logs) {
  const alerts = [];
  const now = new Date(), week = new Date(now.getTime()+7*24*60*60*1000);
  // City opportunity counts
  const cityCount = {};
  events.forEach(e => {
    const d = new Date(e.date+"T12:00:00");
    if (d >= now && d <= week) {
      const city = (e.addr.match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}/)?.[1]||"").trim();
      if (city) cityCount[city] = (cityCount[city]||0)+1;
    }
  });
  Object.entries(cityCount).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([city,cnt])=>{
    alerts.push({type:"city",icon:"🏙️",text:`${city} has ${cnt} events this week`,color:"#a855f7"});
  });
  // Category conversion rates
  const catStats = {};
  Object.entries(logs).forEach(([eid,log])=>{
    const ev = events.find(e=>e.id===eid);
    if(!ev)return;
    if(!catStats[ev.cat])catStats[ev.cat]={calls:0,hits:0};
    catStats[ev.cat].calls++;
    if(log.status==="HIT")catStats[ev.cat].hits++;
  });
  Object.entries(catStats).filter(([,s])=>s.calls>=3).forEach(([cat,s])=>{
    const rate = Math.round(s.hits/s.calls*100);
    if(rate>=30) alerts.push({type:"trend",icon:"📈",text:`${cat} converting at ${rate}% — focus here`,color:"#22c55e"});
  });
  // Upcoming event density
  const soonCount = events.filter(e=>{const d=new Date(e.date+"T12:00:00");return d>=now&&d<=week;}).length;
  if(soonCount>=5) alerts.push({type:"density",icon:"🔥",text:`${soonCount} events in the next 7 days — busy week ahead`,color:"#f59e0b"});
  return alerts;
}

// ── EVENT GROUPING ──
function groupEvents(events) {
  const groups = {};
  events.forEach(ev => {
    // Group by venue
    const vk = ev.venue.toLowerCase().trim();
    if (!groups[vk]) groups[vk] = { venue: ev.venue, events: [] };
    groups[vk].events.push(ev);
  });
  return Object.values(groups).filter(g => g.events.length > 1).sort((a,b) => b.events.length - a.events.length);
}

// ── EXPORT CSV ──
function exportCSV(logs, events, emp, stats, revenue) {
  const rows = [["Event","Venue","Status","Notes","Employee","Revenue","Timestamp"]];
  Object.entries(logs).forEach(([eid,log])=>{
    const ev = events.find(e=>e.id===eid);
    const rev = revenue[eid] || {};
    rows.push([ev?.name||eid, ev?.venue||"", log.status, (log.note||"").replace(/,/g,";"), log.employee, rev.amount||"", log.timestamp]);
  });
  const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `hot-seats-report-${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── ICONS ──
const I={
  Phone:({s=14})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Copy:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Check:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Search:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Chev:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Trophy:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  Sun:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>,
  Moon:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Left:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Right:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Bell:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Clock:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

// ── REMINDER OPTIONS ──
function remOpts(evDate){const n=new Date();const o=[{l:"In 2 hours",t:new Date(n.getTime()+2*3600000).toISOString()},{l:"Tomorrow 10 AM",t:(()=>{const d=new Date(n);d.setDate(d.getDate()+1);d.setHours(10,0,0,0);return d.toISOString();})()},{l:"Tomorrow 2 PM",t:(()=>{const d=new Date(n);d.setDate(d.getDate()+1);d.setHours(14,0,0,0);return d.toISOString();})()}];if(evDate){const w=new Date(new Date(evDate+"T12:00:00").getTime()-7*86400000);if(w>n)o.push({l:"7 days before event",t:w.toISOString()});}return o;}

// ── CALENDAR ──
function Cal({events,sel,onSel}){const[vm,setVm]=useState(()=>{const d=sel?new Date(sel+"T12:00:00"):new Date();return{y:d.getFullYear(),m:d.getMonth()};});const dim=new Date(vm.y,vm.m+1,0).getDate(),fd=new Date(vm.y,vm.m,1).getDay(),mn=new Date(vm.y,vm.m).toLocaleString("en-US",{month:"long",year:"numeric"});const eM=useMemo(()=>{const m={};events.forEach(e=>{if(e.date)m[e.date]=(m[e.date]||0)+1;});return m;},[events]);const p=n=>String(n).padStart(2,"0");const days=[];for(let i=0;i<fd;i++)days.push(null);for(let i=1;i<=dim;i++)days.push(i);
return(<div className="cal"><div className="cal-h"><button className="cal-n" onClick={()=>setVm(p=>p.m===0?{y:p.y-1,m:11}:{...p,m:p.m-1})}><I.Left/></button><span className="cal-m">{mn}</span><button className="cal-n" onClick={()=>setVm(p=>p.m===11?{y:p.y+1,m:0}:{...p,m:p.m+1})}><I.Right/></button></div><div className="cal-w">{["S","M","T","W","T","F","S"].map((d,i)=><div key={i} className="cal-wd">{d}</div>)}</div><div className="cal-g">{days.map((day,i)=>{if(!day)return<div key={`e${i}`} className="cal-c cal-e"/>;const ds=`${vm.y}-${p(vm.m+1)}-${p(day)}`,cnt=eM[ds]||0,s=ds===sel,td=ds===new Date().toISOString().split("T")[0];return<button key={ds} className={`cal-c ${cnt>0?"cal-has":""} ${s?"cal-sel":""} ${td?"cal-td":""}`} onClick={()=>onSel(ds===sel?null:ds)}><span className="cal-dy">{day}</span>{cnt>0&&<span className="cal-dt">{cnt}</span>}</button>;})}</div></div>);}

// ── EVENT CARD ──
function EC({ev,idx,log,pc,onSt,onNote,onPh,onRem,rems,onRev,revenue}){
  const[cp,setCp]=useState(null);const[ss,setSs]=useState(false);const[sn,setSn]=useState(false);const[sr,setSr]=useState(false);const[lu,setLu]=useState(false);const[cr,setCr]=useState(false);const[nt,setNt]=useState(log?.note||"");const[showRev,setShowRev]=useState(false);const[revAmt,setRevAmt]=useState("");const[revTix,setRevTix]=useState("");const stR=useRef(null);
  const cur=ST.find(s=>s.k===(log?.status||"NOT_CALLED"))||ST[0];
  useEffect(()=>{setNt(log?.note||"");},[log?.note]);
  useEffect(()=>{const h=e=>{if(stR.current&&!stR.current.contains(e.target))setSs(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const tz=getTZ(ev.addr,ev.venue),lt=getLocalTime(tz),cb=getCallBadge(tz);
  const vk=(ev.venue||"").toLowerCase().trim(),cached=pc[vk],phone=ev.ph||cached?.phone;
  const evRems=(rems||[]).filter(r=>r.eid===ev.id);
  const evRev=revenue?.[ev.id];

  const copyAll=()=>{navigator.clipboard.writeText(`🎟 ${ev.name}\n📅 ${ev.dd}\n⏰ ${ev.time}\n📍 ${ev.venue} — ${ev.addr}\n📞 ${phone||"N/A"}${ev.alt?`\n📞 ${ev.altL}: ${ev.alt}`:""}`);setCp(1);setTimeout(()=>setCp(null),1500);};
  const doLu=async()=>{if(phone&&!cr){setCr(true);return;}setCr(false);setLu(true);await onPh(ev.id,ev.venue,ev.addr);setLu(false);};
  const handleSt=(k)=>{onSt(ev.id,k);setSs(false);if(k==="HIT")setShowRev(true);};

  return(
    <div className="ec" style={{"--sc":cur.c}}>
      <div className="ec-top">
        <div className="ec-tz"><span className="tz-d" style={{background:cb.c}}/><span style={{color:cb.c,fontSize:11,fontWeight:700}}>{cb.l}</span>{lt&&<span className="tz-t"><I.Clock/> {lt}</span>}</div>
        <div className="ec-ri">
          <span className="ec-idx">#{idx+1}</span>
          <div ref={stR} style={{position:"relative"}}>
            <button className="ec-badge" style={{background:cur.bg,color:cur.c,borderColor:cur.c+"44"}} onClick={()=>setSs(!ss)}>{cur.l} <I.Chev/></button>
            {ss&&<div className="ec-dd">{ST.map(s=><button key={s.k} className={`ec-ddo ${s.k===cur.k?"ec-dda":""}`} onClick={()=>handleSt(s.k)}><span className="ec-dot" style={{background:s.c}}/>{s.l}</button>)}</div>}
          </div>
        </div>
      </div>
      <div className="ec-body">
        <div className="ec-nm">🎟 {ev.name}</div>
        <div className="ec-d">📅 {ev.dd}</div><div className="ec-d">⏰ {ev.time}</div><div className="ec-d">📍 {ev.venue} — {ev.addr}</div>
        {phone&&<div className="ec-ph">📞 Box Office: <a href={`tel:${phone.replace(/[^0-9+]/g,"")}`} className="ec-phn">{phone}</a>{cached&&<span className="ec-vf">✓ Google</span>}</div>}
        {ev.alt&&<div className="ec-ph">📞 {ev.altL||"Alt"}: <a href={`tel:${ev.alt.replace(/[^0-9+]/g,"")}`} className="ec-phn">{ev.alt}</a></div>}
        {!phone&&<div className="ec-noph">No phone — use Google Lookup</div>}
        {evRev&&<div className="ec-rev">💰 Revenue: ${evRev.amount} ({evRev.tickets} tix)</div>}
        {log?.note&&!sn&&<div className="ec-np" onClick={()=>setSn(true)}>📝 {log.note.substring(0,50)}{log.note.length>50?"…":""}</div>}
        {evRems.length>0&&<div className="ec-rems">{evRems.map((r,i)=><span key={i} className="ec-rt"><I.Bell/> {new Date(r.t).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span>)}</div>}
      </div>
      {cr&&<div className="ec-warn">⚠️ Number exists. Re-lookup ~$0.03? <button className="eb ew-y" onClick={doLu}>Yes</button><button className="eb ew-n" onClick={()=>setCr(false)}>No</button></div>}
      {showRev&&<div className="ec-rev-form"><span>💰 How many tickets & total $?</span><input className="rev-in" placeholder="# tickets" value={revTix} onChange={e=>setRevTix(e.target.value)}/><input className="rev-in" placeholder="$ amount" value={revAmt} onChange={e=>setRevAmt(e.target.value)}/><button className="eb ec-save" onClick={()=>{if(revAmt)onRev(ev.id,{tickets:revTix||"?",amount:revAmt});setShowRev(false);setRevAmt("");setRevTix("");}}>Save</button><button className="eb ew-n" onClick={()=>setShowRev(false)}>Skip</button></div>}
      <div className="ec-act">
        <button className="eb ec-copy" onClick={copyAll}>{cp?<><I.Check/> Copied</>:<><I.Copy/> Copy</>}</button>
        {!cached?<button className="eb ec-goog" onClick={doLu} disabled={lu}>{lu?<><span className="msp"/>...</>:<><I.Search/> Google</>}</button>:<span className="ec-cch">✓ Cached</span>}
        {phone&&<a href={`tel:${phone.replace(/[^0-9+]/g,"")}`} className="eb ec-call"><I.Phone s={12}/> Call</a>}
        <button className="eb ec-rb" onClick={()=>setSr(!sr)}><I.Bell/></button>
        <button className="eb ec-nb" onClick={()=>setSn(!sn)}>📝</button>
      </div>
      {sr&&<div className="ec-rp">{remOpts(ev.date).map((o,i)=><button key={i} className="eb ec-ro" onClick={()=>{onRem(ev.id,ev.name,o.t,o.l);setSr(false);}}>{o.l}</button>)}</div>}
      {sn&&<div className="ec-notes"><textarea className="ec-ta" placeholder="What happened?" value={nt} onChange={e=>setNt(e.target.value)} rows={2}/><div className="ec-nr"><button className="eb ec-save" onClick={()=>onNote(ev.id,nt)}>Save</button>{log?.noteBy&&<span className="ec-nby">— {log.noteBy}</span>}</div></div>}
    </div>
  );
}

// ═══════════════════════════════════════
// STUBHUB LIVE FETCH
// ═══════════════════════════════════════
// MULTI-SOURCE API FETCH (SeatGeek + Ticketmaster + StubHub fallback)
// ═══════════════════════════════════════
async function fetchSeatGeek(query = "", page = 1) {
  try {
    const params = new URLSearchParams({ page: String(page), per_page: "200" });
    if (query) params.set("q", query);
    const res = await fetch(`/api/seatgeek?${params}`);
    if (!res.ok) throw new Error(`SeatGeek ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) { return { events: [], total: 0, error: err.message, source: "seatgeek" }; }
}

async function fetchTicketmaster(query = "", page = 0) {
  try {
    const params = new URLSearchParams({ page: String(page), size: "200" });
    if (query) params.set("q", query);
    const res = await fetch(`/api/ticketmaster?${params}`);
    if (!res.ok) throw new Error(`Ticketmaster ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) { return { events: [], total: 0, error: err.message, source: "ticketmaster" }; }
}

async function fetchAllSources(query = "", page = 1) {
  // Fetch from both sources in parallel
  const [sg, tm] = await Promise.all([
    fetchSeatGeek(query, page),
    fetchTicketmaster(query, page - 1), // TM is 0-indexed
  ]);

  // Combine and deduplicate by name+date
  const seen = new Set();
  const combined = [];
  const addEvents = (events) => {
    events.forEach(ev => {
      const key = (ev.name + ev.date).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(key)) { seen.add(key); combined.push(ev); }
    });
  };

  // SeatGeek first (has popularity scores)
  if (sg.events?.length) addEvents(sg.events);
  if (tm.events?.length) addEvents(tm.events);

  const errors = [sg.error, tm.error].filter(Boolean);
  const totalEstimate = (sg.total || 0) + (tm.total || 0);

  return {
    events: combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0)),
    total: totalEstimate,
    page,
    errors: errors.length > 0 ? errors : null,
    sources: { seatgeek: sg.events?.length || 0, ticketmaster: tm.events?.length || 0 },
  };
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function HotSeats(){
  const[pg,setPg]=useState("splash");
  const[tab,setTab]=useState("home");
  const[city,setCity]=useState(null);const[sc,setSc]=useState(false);
  const[emp,setEmp]=useState(null);const[emps,setEmps]=useState([]);const[ei,setEi]=useState("");
  const[logs,setLogs]=useState({});const[stats,setSt]=useState({});
  const[q,setQ]=useState("");const[theme,setTh]=useState("dark");
  const[cd,setCd]=useState(null);const[act,setAct]=useState([]);
  const[pc,setPc]=useState({});const[rems,setRems]=useState([]);
  const[rev,setRev]=useState({});const[deadFilter,setDF]=useState(false);
  const[liveEvents,setLiveEvents]=useState([]);
  const[liveLoading,setLiveLoading]=useState(false);
  const[liveError,setLiveError]=useState(null);
  const[liveTotal,setLiveTotal]=useState(0);
  const[livePage,setLivePage]=useState(1);
  const[isLive,setIsLive]=useState(false);
  const cR=useRef(null);

  // Category-aware fetch from SeatGeek + Ticketmaster
  const loadCategory=async(category,query="",page=1)=>{
    setLiveLoading(true);setLiveError(null);
    const cfg=CAT_CONFIG[category];
    try{
      const params=new URLSearchParams({page:String(page),per_page:"200"});
      if(query)params.set("q",query);
      
      let sgPromise,tmPromise;
      
      if(category==="rodeo"){
        // Rodeo: search by keyword
        const rParams=new URLSearchParams({page:String(page),per_page:"200",q:"rodeo"});
        sgPromise=fetch(`/api/seatgeek?${rParams}`).then(r=>r.json()).catch(()=>({events:[]}));
        const tmP=new URLSearchParams({page:String(page-1),size:"200",q:"rodeo"});
        tmPromise=fetch(`/api/ticketmaster?${tmP}`).then(r=>r.json()).catch(()=>({events:[]}));
      } else if(cfg){
        // SeatGeek: use type param
        if(cfg.sg)params.set("type",cfg.sg);
        sgPromise=fetch(`/api/seatgeek?${params}`).then(r=>r.json()).catch(()=>({events:[]}));
        // Ticketmaster: use category param
        const tmP=new URLSearchParams({page:String(page-1),size:"200"});
        if(query)tmP.set("q",query);
        if(cfg.tm)tmP.set("category",cfg.tm);
        tmPromise=fetch(`/api/ticketmaster?${tmP}`).then(r=>r.json()).catch(()=>({events:[]}));
      } else {
        // All events / search
        if(query)params.set("q",query);
        sgPromise=fetch(`/api/seatgeek?${params}`).then(r=>r.json()).catch(()=>({events:[]}));
        const tmP=new URLSearchParams({page:String(page-1),size:"200"});
        if(query)tmP.set("q",query);
        tmPromise=fetch(`/api/ticketmaster?${tmP}`).then(r=>r.json()).catch(()=>({events:[]}));
      }

      const[sg,tm]=await Promise.all([sgPromise,tmPromise]);
      
      // Combine + deduplicate
      const seen=new Set();const combined=[];
      const add=(events)=>{(events||[]).forEach(ev=>{const key=(ev.name+ev.date).toLowerCase().replace(/[^a-z0-9]/g,"");if(!seen.has(key)){seen.add(key);combined.push(ev);}});};
      if(sg?.events)add(sg.events);
      if(tm?.events)add(tm.events);

      const total=(sg?.total||0)+(tm?.total||0);
      setLiveEvents(prev=>page===1?combined:[...prev,...combined]);
      setLiveTotal(total);setLivePage(page);setIsLive(true);setLiveLoading(false);
      if(page===1)await sv("hf-cat-"+category,combined);
    }catch(err){setLiveError(err.message);setLiveLoading(false);}
  };

  // Load when tab changes (auto-fetch for category tabs)
  const[catCache,setCatCache]=useState({});
  const[activeSub,setActiveSub]=useState("");
  
  useEffect(()=>{
    if(["sports","concerts","theatre","rodeo"].includes(tab)){
      // Check if already cached
      if(catCache[tab]?.length>0){
        setLiveEvents(catCache[tab]);setIsLive(true);setLiveTotal(catCache[tab].length);
      } else {
        loadCategory(tab);
      }
      setActiveSub("");
    } else if(tab==="all"){
      loadCategory("all");
      setActiveSub("");
    }
  },[tab]);

  // Cache loaded events per category
  useEffect(()=>{
    if(isLive&&liveEvents.length>0&&["sports","concerts","theatre","rodeo","all"].includes(tab)){
      setCatCache(prev=>({...prev,[tab]:liveEvents}));
    }
  },[liveEvents,tab,isLive]);

  // Search handler
  const searchLive=async(query)=>{
    if(!query.trim())return;
    setLiveLoading(true);
    const cat=["sports","concerts","theatre","rodeo"].includes(tab)?tab:"all";
    await loadCategory(cat,query.trim());
  };

  // Load more pages
  const loadMore=async()=>{
    const cat=["sports","concerts","theatre","rodeo"].includes(tab)?tab:"all";
    await loadCategory(cat,q,livePage+1);
  };

  // Combined events: live if available, otherwise demo
  const ALL_COMBINED=useMemo(()=>{
    if(isLive&&liveEvents.length>0)return liveEvents;
    return ALL;
  },[isLive,liveEvents]);

  useEffect(()=>{(async()=>{setLogs(await ld("hf-logs",{}));setSt(await ld("hf-stats",{}));setEmps(await ld("hf-emps",[]));setAct(await ld("hf-act",[]));setPc(await ld("hf-phones",{}));setRems(await ld("hf-rem",[]));setRev(await ld("hf-rev",{}));
    const l=await ld("hf-emp",null),t=await ld("hf-theme","dark");setTh(t);if(l)setEmp(l);})();},[]);
  useEffect(()=>{const h=e=>{if(cR.current&&!cR.current.contains(e.target))setSc(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);

  const s=async(k,v,fn)=>{fn(v);await sv(k,v);};
  const dk=theme==="dark";

  const login=async n=>{const nm=n.trim();if(!nm)return;setEmp(nm);await sv("hf-emp",nm);if(!emps.includes(nm)){const ne=[...emps,nm];setEmps(ne);await sv("hf-emps",ne);}if(!stats[nm])await s("hf-stats",{...stats,[nm]:{calls:0,sold:0,streak:0}},setSt);setPg("main");};

  // Get streak
  const getStreak=()=>{let streak=0;for(const a of act){if(a.emp===emp&&a.action==="HIT")streak++;else if(a.emp===emp)break;}return streak;};

  const doSt=async(eid,status)=>{
    const prev=logs[eid];const nl={...logs,[eid]:{...prev,status,employee:emp,timestamp:new Date().toISOString(),note:prev?.note||"",noteBy:prev?.noteBy||""}};await s("hf-logs",nl,setLogs);
    const st={...stats};if(!st[emp])st[emp]={calls:0,sold:0,streak:0};
    if(prev?.employee===emp&&prev?.status!=="NOT_CALLED")st[emp].calls=Math.max(0,st[emp].calls-1);
    if(prev?.employee===emp&&prev?.status==="HIT")st[emp].sold=Math.max(0,st[emp].sold-1);
    if(status!=="NOT_CALLED")st[emp].calls+=1;if(status==="HIT")st[emp].sold+=1;
    await s("hf-stats",st,setSt);
    const evN=ALL_COMBINED.find(e=>e.id===eid)?.name||eid;
    await s("hf-act",[{emp,action:status,event:evN,time:new Date().toISOString()},...act].slice(0,50),setAct);
  };

  const doNote=async(eid,note)=>{const prev=logs[eid]||{status:"NOT_CALLED",employee:"",timestamp:""};await s("hf-logs",{...logs,[eid]:{...prev,note,noteBy:emp}},setLogs);};
  const doPh=async(eid,v,a)=>{const vk=v.toLowerCase().trim();if(pc[vk])return;const r=await gLookup(v,a);if(r?.phone)await s("hf-phones",{...pc,[vk]:r},setPc);};
  const doRem=async(eid,name,t,l)=>await s("hf-rem",[...rems,{eid,eventName:name,t,l,by:emp}],setRems);
  const doRev=async(eid,data)=>await s("hf-rev",{...rev,[eid]:data},setRev);

  // Filter events by tab + subcategory
  const getEvents=()=>{
    let evs=[...ALL_COMBINED];
    if(tab==="home")return[];
    if(tab==="calendar")return cd?evs.filter(e=>e.date===cd):[];
    if(tab==="top_cities")return city?evs.filter(e=>e.addr.toLowerCase().includes(city.toLowerCase())||e.venue.toLowerCase().includes(city.toLowerCase())):[];
    if(tab==="quickdial")return evs.filter(e=>{const log=logs[e.id];return(!log||log.status==="NOT_CALLED")&&(e.ph||pc[(e.venue||"").toLowerCase().trim()]?.phone);});
    // Subcategory filter
    if(activeSub){evs=evs.filter(e=>(e.name+e.cat+(e.subcat||"")).toLowerCase().includes(activeSub.toLowerCase()));}
    // Search filter
    if(q)evs=evs.filter(e=>(e.name+e.venue+e.addr+e.cat+(e.subcat||"")).toLowerCase().includes(q.toLowerCase()));
    // Dead filter
    if(deadFilter)evs=evs.filter(e=>!DEAD.includes(logs[e.id]?.status));
    return evs;
  };

  const filtered=getEvents();
  const streak=getStreak();
  const alerts=useMemo(()=>generateAlerts(ALL_COMBINED,logs),[logs]);
  const groups=useMemo(()=>groupEvents(ALL_COMBINED),[]);
  const totalRev=Object.values(rev).reduce((a,r)=>a+Number(r.amount||0),0);

  // ═══ SPLASH ═══
  if(pg==="splash")return(<><style>{CSS(dk)}</style><div className="splash"><div className="splash-bg"/><div className="splash-in"><div className="slogo"><div className="slt"><span className="sh">HOT</span><span className="ss">SEATS</span></div><div className="ssu">— TOP TICKET TRENDS —</div></div><button className="sbtn" onClick={()=>setPg(emp?"main":"login")}><span className="sbt">START</span><span className="sbg"/></button></div><div className="pts">{[...Array(20)].map((_,i)=><div key={i} className="pt" style={{"--x":Math.random()*100,"--y":Math.random()*100,"--dur":Math.random()*3+2}}/>)}</div></div></>);

  // ═══ LOGIN ═══
  if(pg==="login"||!emp)return(<><style>{CSS(dk)}</style><div className="app"><div className="lw"><div className="lc"><div className="lcb"><span className="sh">HOT</span><span className="ss">SEATS</span></div><h2 className="lct">Who's on the phones?</h2>{emps.length>0&&<div className="ech">{emps.map(e=><button key={e} className="ecp" onClick={()=>login(e)}>{e}{stats[e]&&<span className="ecst">{stats[e].sold} hits</span>}</button>)}</div>}<div className="lcr"><input className="lci" placeholder="Enter your name..." value={ei} onChange={e=>setEi(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login(ei)}/><button className="lcg" onClick={()=>login(ei)}>GO</button></div></div></div></div></>);

  // ═══ LEADERBOARD ═══
  if(pg==="leaderboard"){const sorted=Object.entries(stats).map(([n,s])=>({name:n,...s})).sort((a,b)=>b.sold-a.sold||b.calls-a.calls);
  return(<><style>{CSS(dk)}</style><div className="app"><nav className="tn"><div className="brand" onClick={()=>setPg("main")}><span className="sh">HOT</span><span className="ss">SEATS</span></div><button className="nb" onClick={()=>setPg("main")}>← Back</button></nav><div className="mc"><h2 className="pgt"><I.Trophy/> Leaderboard</h2>{sorted.map((e,i)=><div key={e.name} className={`lbr ${e.name===emp?"lbm":""}`}><span className="lrk">{i<3?["🥇","🥈","🥉"][i]:`#${i+1}`}</span><span className="lnm">{e.name}{e.name===emp&&<span className="lyu">YOU</span>}</span><span className="lht">{e.sold} hits</span><span className="lcl">{e.calls} calls</span><span className="lrt">{e.calls>0?Math.round(e.sold/e.calls*100):0}%</span></div>)}{sorted.length===0&&<div className="empty">No calls yet</div>}</div></div></>);}

  // ═══ MAIN ═══
  return(<><style>{CSS(dk)}</style><div className="app">
    <nav className="tn">
      <div className="brand" onClick={()=>setTab("home")}><span className="sh">HOT</span><span className="ss">SEATS</span></div>
      <div className="nr">
        {streak>=2&&<span className="streak">🔥{streak}</span>}
        <button className="nb" onClick={()=>setPg("leaderboard")}><I.Trophy/></button>
        <button className="nb" onClick={()=>setTh(dk?"light":"dark")}>{dk?<I.Sun/>:<I.Moon/>}</button>
        <button className="nb" onClick={()=>exportCSV(logs,ALL_COMBINED,emp,stats,rev)}>📥</button>
        <div className="nuser">{emp}</div>
        <button className="nb nsw" onClick={()=>{setEmp(null);setPg("login");}}>↻</button>
      </div>
    </nav>

    {/* Search bar */}
    <div className="search-bar"><I.Search/><input className="search-in" placeholder="Search by artist, team, or venue" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&q.trim())searchLive(q.trim());}}/>{q&&<button className="search-x" onClick={()=>setQ("")}>✕</button>}<button className="sb-go" onClick={()=>searchLive(q||"")} disabled={liveLoading}>{liveLoading?"Loading...":"🔍 Search Live"}</button></div>
    {isLive&&<div className="live-bar"><span className="live-dot"/>LIVE — SeatGeek + Ticketmaster · {liveTotal.toLocaleString()} events{liveError&&<span className="live-err"> · {liveError}</span>}<button className="live-demo" onClick={()=>{setIsLive(false);setLiveEvents([]);setCatCache({});}}>Switch to Demo</button></div>}
    {!isLive&&!liveLoading&&<div className="demo-bar">📋 Click a category tab to load live events</div>}

    {/* Tabs */}
    <div className="tbar">{TABS.map(t=><button key={t.k} className={`tb ${tab===t.k?"tba":""}`} onClick={()=>{setTab(t.k);setCity(null);setCd(null);}}>{t.l}</button>)}</div>

    <div className="mc">
      {/* Subcategory pills for category tabs */}
      {CAT_CONFIG[tab]&&<div className="sub-bar"><button className={`sub-pill ${!activeSub?"sub-act":""}`} onClick={()=>setActiveSub("")}>All</button>{CAT_CONFIG[tab].subs.map(s=><button key={s} className={`sub-pill ${activeSub===s?"sub-act":""}`} onClick={()=>setActiveSub(activeSub===s?"":s)}>{s}</button>)}</div>}

      {/* Loading indicator */}
      {liveLoading&&<div className="loading-bar"><span className="load-spin"/>Loading events...</div>}

      {/* Dead list filter toggle */}
      {tab!=="home"&&!liveLoading&&<div className="filter-row"><button className={`fb ${deadFilter?"fb-on":""}`} onClick={()=>setDF(!deadFilter)}>{deadFilter?"Showing fresh only ✓":"Hide dead events"}</button><span className="fc">{filtered.length} events</span></div>}

      {/* HOME */}
      {tab==="home"&&(<div className="home">
        {/* Alerts */}
        {alerts.length>0&&<div className="alerts">{alerts.map((a,i)=><div key={i} className="alert" style={{borderLeftColor:a.color}}><span>{a.icon}</span><span>{a.text}</span></div>)}</div>}

        {/* Stats */}
        <div className="sstrip"><div className="ssi"><span className="ssn">{stats[emp]?.calls||0}</span>calls</div><div className="ssi"><span className="ssn ssg">{stats[emp]?.sold||0}</span>hits</div><div className="ssi"><span className="ssn ssb">{stats[emp]?.calls>0?Math.round((stats[emp]?.sold||0)/stats[emp].calls*100):0}%</span>rate</div><div className="ssi"><span className="ssn ssp">${totalRev}</span>revenue</div></div>

        {/* Due reminders */}
        {rems.filter(r=>new Date(r.t)<=new Date()).length>0&&<div className="hsec hurg"><h3 className="hst">🔔 Follow-Ups Due</h3>{rems.filter(r=>new Date(r.t)<=new Date()).map((r,i)=><div key={i} className="hcard hcard-click" onClick={()=>{setTab("all");setQ(r.eventName);}}><div className="hcn">{r.eventName}</div><div className="hcm">{r.l}</div></div>)}</div>}

        {/* Events this week */}
        <div className="hsec"><h3 className="hst">📅 Events This Week ({ALL_COMBINED.filter(e=>{const d=new Date(e.date+"T12:00:00"),n=new Date(),w=new Date(n.getTime()+7*86400000);return d>=n&&d<=w;}).length})</h3>{ALL_COMBINED.filter(e=>{const d=new Date(e.date+"T12:00:00"),n=new Date(),w=new Date(n.getTime()+7*86400000);return d>=n&&d<=w;}).sort((a,b)=>new Date(a.date)-new Date(b.date)).map((ev,i)=><div key={ev.id} className="hcard hcard-click" onClick={()=>{setTab("all");setQ(ev.name);}}><div className="hcn">{ev.name}</div><div className="hcm">{ev.dd} · {ev.venue}</div></div>)}</div>

        {/* Event groups */}
        {groups.length>0&&<div className="hsec"><h3 className="hst">🔗 Venue Clusters (same venue, multiple events)</h3>{groups.slice(0,5).map((g,i)=><div key={i} className="hcard"><div className="hcn">{g.venue} — {g.events.length} events</div><div className="hcm">{g.events.map(e=>e.name).join(", ")}</div></div>)}</div>}
      </div>)}

      {/* CALENDAR */}
      {tab==="calendar"&&<Cal events={ALL_COMBINED} sel={cd} onSel={setCd}/>}

      {/* TOP CITIES */}
      {tab==="top_cities"&&<div className="csel" ref={cR}><button className="ctog" onClick={()=>setSc(!sc)}>{city||"Select a City"} <I.Chev/></button>{sc&&<div className="cdd">{TOP_CITIES.map(c=><button key={c} className={`copt ${c===city?"cact":""}`} onClick={()=>{setCity(c);setSc(false);}}>{c}</button>)}</div>}</div>}

      {/* QUICK DIAL */}
      {tab==="quickdial"&&filtered.length>0&&<div className="qd-header"><span className="qd-title">⚡ Quick Dial Mode</span><span className="qd-sub">Only uncalled events with phone numbers. Call → mark → next.</span></div>}

      {/* EVENT LIST */}
      {tab!=="home"&&(filtered.length===0?<div className="empty">{tab==="top_cities"&&!city?"Pick a city":tab==="calendar"&&!cd?"Pick a date":"No events found"}</div>:
        <div className="evl">{filtered.map((ev,i)=><EC key={ev.id} ev={ev} idx={i} log={logs[ev.id]} pc={pc} onSt={doSt} onNote={doNote} onPh={doPh} onRem={doRem} rems={rems} onRev={doRev} revenue={rev}/>)}</div>
      )}

      <div className="ded">IN DEDICATION TO GET OUT THE TRENCH</div>
      {isLive&&liveEvents.length<liveTotal&&<div className="load-more"><button className="lm-btn" onClick={loadMore} disabled={liveLoading}>{liveLoading?"Loading...":"Load More Events ("+liveEvents.length+" of "+liveTotal.toLocaleString()+")"}</button></div>}
      <div className="foot">Hot Seats — Top Ticket Trends · {isLive?liveTotal.toLocaleString()+" live events":"Demo data"} · {Object.keys(pc).length} venues cached</div>
    </div>
  </div></>);
}

// ═══════════════════════════════════════
// CSS
// ═══════════════════════════════════════
function CSS(dk){const bg=dk?"#0a0b14":"#f4f4f8",bg2=dk?"#0d1117":"#fff",cd=dk?"rgba(255,255,255,0.025)":"rgba(0,0,0,0.025)",bd=dk?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)",tx=dk?"#e8e6e1":"#1a1a2e",tm=dk?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.5)",td=dk?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.25)",inp=dk?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",dr=dk?"#14152a":"#fff",hv=dk?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)";
return `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Space+Mono:wght@400;700&family=Outfit:wght@400;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
.splash{position:fixed;inset:0;background:#0a0b14;display:flex;align-items:center;justify-content:center;overflow:hidden;z-index:1000;}.splash-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 30% 50%,rgba(168,85,247,0.12) 0%,transparent 50%),radial-gradient(ellipse at 70% 50%,rgba(244,63,94,0.1) 0%,transparent 50%);}.splash-in{position:relative;z-index:2;text-align:center;display:flex;flex-direction:column;align-items:center;gap:48px;}.slogo{cursor:pointer;transition:transform 0.3s,filter 0.3s;}.slogo:hover{transform:scale(1.06) rotate(-1deg);filter:drop-shadow(0 0 40px rgba(168,85,247,0.5));}.slt{display:flex;gap:8px;justify-content:center;}.sh{font-family:'Outfit',sans-serif;font-weight:900;background:linear-gradient(135deg,#f43f5e,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}.ss{font-family:'Outfit',sans-serif;font-weight:900;background:linear-gradient(135deg,#a855f7,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}.slt .sh,.slt .ss{font-size:clamp(48px,12vw,80px);}.ssu{font-family:'Space Mono',monospace;font-size:13px;color:rgba(255,255,255,0.3);letter-spacing:5px;}.sbtn{position:relative;background:linear-gradient(135deg,#a855f7,#f43f5e,#f59e0b);border:none;border-radius:16px;padding:18px 72px;cursor:pointer;overflow:hidden;transition:transform 0.2s,box-shadow 0.3s;}.sbtn:hover{transform:scale(1.05);box-shadow:0 0 50px rgba(168,85,247,0.4);}.sbt{position:relative;z-index:1;font-family:'Outfit',sans-serif;font-size:22px;font-weight:800;color:#fff;letter-spacing:6px;}.sbg{position:absolute;inset:-2px;border-radius:18px;background:inherit;filter:blur(18px);opacity:0.5;animation:gp 2s ease-in-out infinite;}@keyframes gp{0%,100%{opacity:0.4;}50%{opacity:0.7;}}.pts{position:absolute;inset:0;pointer-events:none;z-index:1;}.pt{position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(168,85,247,0.35);left:calc(var(--x)*1%);top:calc(var(--y)*1%);animation:fp calc(var(--dur)*1s) ease-in-out infinite;}@keyframes fp{0%,100%{transform:translateY(0);opacity:0.2;}50%{transform:translateY(-25px);opacity:0.6;}}
.app{font-family:'DM Sans',sans-serif;min-height:100vh;background:${bg};color:${tx};transition:background 0.3s,color 0.3s;}
.tn{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:${bg2};border-bottom:1px solid ${bd};position:sticky;top:0;z-index:100;}.brand{cursor:pointer;display:flex;gap:3px;}.brand .sh,.brand .ss{font-size:18px;}.nr{display:flex;align-items:center;gap:6px;}.nb{display:flex;align-items:center;gap:3px;background:${cd};border:1px solid ${bd};border-radius:8px;padding:5px 9px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:${tm};cursor:pointer;transition:all 0.15s;}.nb:hover{color:${tx};background:${hv};}.nuser{font-size:12px;font-weight:700;color:${tx};opacity:0.8;}.nsw{color:${td};font-size:14px;}.streak{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-size:12px;font-weight:800;padding:4px 10px;border-radius:20px;animation:pulse 1s ease-in-out infinite;}@keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.08);}}
/* Search */
.search-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;background:${bg2};border-bottom:1px solid ${bd};}.search-in{flex:1;background:${dk?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)"};border:1px solid ${bd};border-radius:24px;padding:11px 18px;font-family:'DM Sans',sans-serif;font-size:14px;color:${tx};outline:none;transition:border-color 0.2s;}.search-in::placeholder{color:${td};}.search-in:focus{border-color:rgba(168,85,247,0.5);}.search-x{background:none;border:none;color:${tm};font-size:16px;cursor:pointer;padding:4px 8px;}
.tbar{display:flex;gap:0;border-bottom:1px solid ${bd};padding:0 12px;background:${dk?"rgba(10,11,20,0.5)":"rgba(255,255,255,0.5)"};overflow-x:auto;-webkit-overflow-scrolling:touch;}.tb{background:none;border:none;border-bottom:2px solid transparent;padding:11px 14px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:${tm};cursor:pointer;transition:all 0.2s;white-space:nowrap;}.tb:hover{color:${tx};}.tba{color:${dk?"#fff":"#1a1a2e"};border-bottom-color:#a855f7;}
.mc{max-width:820px;margin:0 auto;padding:16px 14px 60px;}
/* Filter row */
.filter-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}.fb{background:${cd};border:1px solid ${bd};border-radius:8px;padding:6px 14px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:${tm};cursor:pointer;transition:all 0.15s;}.fb:hover{color:${tx};}.fb-on{background:rgba(239,68,68,0.1);color:#ef4444;border-color:rgba(239,68,68,0.2);}.fc{font-size:12px;color:${tm};}
/* Home */
.home{}.alerts{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}.alert{display:flex;align-items:center;gap:8px;padding:10px 14px;background:${cd};border:1px solid ${bd};border-left:3px solid;border-radius:10px;font-size:13px;color:${tx};}
.sstrip{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;}.ssi{background:${cd};border:1px solid ${bd};border-radius:10px;padding:7px 10px;font-size:10px;color:${tm};flex:1;text-align:center;min-width:60px;}.ssn{font-family:'Space Mono',monospace;font-weight:700;font-size:16px;color:${tx};display:block;}.ssg{color:#22c55e;}.ssb{color:#3b82f6;}.ssp{color:#a855f7;}
.hsec{margin-bottom:20px;}.hurg{background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:14px;padding:14px;}.hst{font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;color:${tx};margin-bottom:8px;}.hcard{background:${cd};border:1px solid ${bd};border-radius:10px;padding:10px 14px;margin-bottom:6px;transition:all 0.15s;}.hcard-click{cursor:pointer;}.hcard-click:hover{border-color:rgba(168,85,247,0.3);background:rgba(168,85,247,0.04);}.hcn{font-weight:600;font-size:13px;color:${tx};}.hcm{font-size:11px;color:${tm};margin-top:2px;}
.qd-header{text-align:center;padding:16px;margin-bottom:12px;background:linear-gradient(135deg,rgba(168,85,247,0.06),rgba(244,63,94,0.06));border:1px solid rgba(168,85,247,0.15);border-radius:14px;}.qd-title{font-family:'Outfit',sans-serif;font-size:18px;font-weight:800;color:${tx};display:block;}.qd-sub{font-size:12px;color:${tm};}
/* Calendar */
.cal{background:${cd};border:1px solid ${bd};border-radius:14px;padding:16px;margin-bottom:16px;}.cal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}.cal-m{font-family:'Outfit',sans-serif;font-weight:700;font-size:16px;color:${tx};}.cal-n{background:${inp};border:1px solid ${bd};border-radius:8px;padding:5px 8px;cursor:pointer;color:${tm};display:flex;}.cal-n:hover{color:${tx};}.cal-w{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:6px;}.cal-wd{text-align:center;font-size:10px;font-weight:700;color:${td};padding:3px;}.cal-g{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}.cal-c{border:none;background:${inp};border-radius:8px;padding:8px 3px;text-align:center;cursor:pointer;transition:all 0.15s;min-height:38px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;}.cal-c:hover{background:${hv};}.cal-e{background:transparent;cursor:default;}.cal-dy{font-size:13px;font-weight:600;color:${tx};}.cal-dt{font-size:8px;font-weight:700;color:#a855f7;background:rgba(168,85,247,0.15);padding:1px 4px;border-radius:8px;}.cal-has{background:rgba(168,85,247,0.06);}.cal-sel{background:rgba(168,85,247,0.2)!important;outline:2px solid #a855f7;}.cal-td .cal-dy{color:#f43f5e;}
/* City */
.csel{position:relative;margin-bottom:14px;}.ctog{width:100%;background:${inp};border:1px solid ${bd};border-radius:12px;padding:12px 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:${tx};cursor:pointer;display:flex;align-items:center;justify-content:space-between;}.ctog:hover{border-color:rgba(168,85,247,0.4);}.cdd{position:absolute;top:100%;left:0;right:0;background:${dr};border:1px solid ${bd};border-radius:12px;margin-top:4px;max-height:250px;overflow-y:auto;z-index:50;box-shadow:0 16px 48px rgba(0,0,0,${dk?0.5:0.15});}.copt{display:block;width:100%;background:none;border:none;border-bottom:1px solid ${bd};padding:10px 16px;font-size:13px;color:${tm};cursor:pointer;text-align:left;transition:all 0.1s;}.copt:hover{background:rgba(168,85,247,0.08);color:${tx};}.cact{color:#a855f7;}
/* Event card */
.evl{display:flex;flex-direction:column;gap:10px;}@keyframes ci{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}.ec{background:${cd};border:1px solid ${bd};border-left:3px solid var(--sc,#555);border-radius:12px;overflow:hidden;animation:ci 0.3s ease both;transition:all 0.15s;}.ec:hover{border-color:${dk?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"};}
.ec-top{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;background:${dk?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.02)"};border-bottom:1px solid ${bd};flex-wrap:wrap;gap:4px;}.ec-tz{display:flex;align-items:center;gap:5px;}.tz-d{width:7px;height:7px;border-radius:50%;}.tz-t{font-size:10px;color:${tm};display:flex;align-items:center;gap:2px;}.ec-ri{display:flex;align-items:center;gap:6px;}.ec-idx{font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:${td};}
.ec-badge{display:flex;align-items:center;gap:4px;border:1px solid;border-radius:5px;padding:3px 8px;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.5px;cursor:pointer;}.ec-badge:hover{filter:brightness(1.2);}.ec-dd{position:absolute;top:100%;right:0;background:${dr};border:1px solid ${bd};border-radius:10px;padding:5px;margin-top:4px;z-index:50;min-width:170px;box-shadow:0 12px 40px rgba(0,0,0,${dk?0.5:0.15});}.ec-ddo{display:flex;align-items:center;gap:7px;width:100%;background:none;border:none;padding:7px 10px;font-size:12px;color:${tm};cursor:pointer;border-radius:5px;}.ec-ddo:hover{background:${hv};}.ec-dda{background:${dk?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"};}.ec-dot{width:7px;height:7px;border-radius:50%;}
.ec-body{padding:12px 14px 8px;}.ec-nm{font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;color:${tx};margin-bottom:6px;line-height:1.3;}.ec-d{font-size:12px;color:${tm};margin-bottom:2px;line-height:1.4;}.ec-ph{margin-top:5px;font-size:12px;color:${tm};display:flex;flex-wrap:wrap;align-items:center;gap:5px;}.ec-phn{font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:#f43f5e;text-decoration:none;}.ec-phn:hover{opacity:0.75;}.ec-vf{font-size:9px;color:#22c55e;font-weight:600;background:rgba(34,197,94,0.1);padding:1px 6px;border-radius:3px;}.ec-noph{font-size:11px;color:${td};font-style:italic;margin-top:5px;}.ec-rev{font-size:12px;color:#22c55e;font-weight:700;margin-top:6px;}.ec-np{font-size:11px;color:${tm};margin-top:6px;padding:6px 8px;background:${inp};border-radius:6px;cursor:pointer;}.ec-np:hover{background:${hv};}.ec-rems{display:flex;flex-wrap:wrap;gap:3px;margin-top:6px;}.ec-rt{display:flex;align-items:center;gap:3px;font-size:9px;font-weight:600;color:#eab308;background:rgba(234,179,8,0.1);padding:2px 6px;border-radius:3px;}
.ec-warn{display:flex;align-items:center;gap:6px;padding:7px 12px;background:rgba(234,179,8,0.08);font-size:11px;color:${tm};flex-wrap:wrap;}
.ec-rev-form{display:flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(34,197,94,0.05);border-top:1px solid rgba(34,197,94,0.1);flex-wrap:wrap;font-size:12px;color:${tm};}.rev-in{background:${inp};border:1px solid ${bd};border-radius:6px;padding:5px 8px;font-size:12px;color:${tx};width:80px;outline:none;font-family:'DM Sans',sans-serif;}
.ec-act{display:flex;gap:4px;padding:8px 12px;border-top:1px solid ${bd};flex-wrap:wrap;}.eb{display:flex;align-items:center;gap:3px;border:none;border-radius:7px;padding:6px 10px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s;white-space:nowrap;text-decoration:none;}.ec-copy{background:${dk?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)"};color:${tm};border:1px solid ${bd};}.ec-copy:hover{color:${tx};}.ec-goog{background:linear-gradient(135deg,rgba(66,133,244,0.1),rgba(52,168,83,0.1));color:#4285f4;border:1px solid rgba(66,133,244,0.15);}.ec-goog:disabled{opacity:0.5;cursor:not-allowed;}.ec-cch{font-size:10px;color:#22c55e;font-weight:600;padding:0 6px;}.ec-call{background:linear-gradient(135deg,#f43f5e,#e11d48);color:#fff;}.ec-call:hover{filter:brightness(1.15);}.ec-rb{background:rgba(234,179,8,0.08);color:#eab308;border:1px solid rgba(234,179,8,0.12);}.ec-nb{background:${cd};color:${td};border:1px solid ${bd};}.ec-save{background:#22c55e;color:#fff;}.ew-y{background:rgba(234,179,8,0.15);color:#eab308;border:1px solid rgba(234,179,8,0.3);}.ew-n{background:${cd};color:${tm};border:1px solid ${bd};}.msp{display:inline-block;width:10px;height:10px;border:2px solid rgba(66,133,244,0.2);border-top-color:#4285f4;border-radius:50%;animation:sp 0.6s linear infinite;}@keyframes sp{to{transform:rotate(360deg);}}
.ec-rp{display:flex;gap:4px;padding:6px 12px;border-top:1px solid ${bd};flex-wrap:wrap;background:${dk?"rgba(0,0,0,0.1)":"rgba(0,0,0,0.02)"};}.ec-ro{background:rgba(234,179,8,0.08);color:#eab308;border:1px solid rgba(234,179,8,0.1);font-size:10px;padding:5px 10px;}.ec-ro:hover{background:rgba(234,179,8,0.18);}
.ec-notes{padding:10px 14px;background:${dk?"rgba(0,0,0,0.1)":"rgba(0,0,0,0.02)"};border-top:1px solid ${bd};}.ec-ta{width:100%;background:${inp};border:1px solid ${bd};border-radius:7px;padding:8px 12px;font-family:'DM Sans',sans-serif;font-size:12px;color:${tx};resize:vertical;outline:none;}.ec-ta::placeholder{color:${td};}.ec-ta:focus{border-color:rgba(168,85,247,0.4);}.ec-nr{display:flex;align-items:center;gap:8px;margin-top:6px;}.ec-nby{font-size:10px;color:${td};}
/* Login */
.lw{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:${bg};}.lc{background:${cd};border:1px solid ${bd};border-radius:20px;padding:36px 28px;max-width:420px;width:100%;text-align:center;}.lcb{margin-bottom:16px;}.lcb .sh,.lcb .ss{font-size:30px;}.lct{font-size:18px;font-weight:700;color:${tx};margin-bottom:20px;}.ech{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px;}.ecp{background:${dk?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)"};border:1px solid ${bd};border-radius:10px;padding:9px 16px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:${tx};cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s;}.ecp:hover{border-color:#a855f7;}.ecst{font-size:10px;color:#22c55e;font-weight:700;}.lcr{display:flex;gap:6px;}.lci{flex:1;background:${inp};border:1px solid ${bd};border-radius:10px;padding:11px 14px;font-size:14px;color:${tx};outline:none;font-family:'DM Sans',sans-serif;}.lci::placeholder{color:${td};}.lcg{background:linear-gradient(135deg,#a855f7,#f43f5e);border:none;border-radius:10px;padding:11px 24px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:800;color:#fff;cursor:pointer;letter-spacing:2px;}.lcg:hover{filter:brightness(1.15);}
/* Leaderboard */
.pgt{font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:${tx};margin-bottom:16px;display:flex;align-items:center;gap:8px;}.lbr{display:flex;align-items:center;gap:12px;background:${cd};border:1px solid ${bd};border-radius:10px;padding:14px 16px;margin-bottom:6px;}.lbm{border-color:rgba(168,85,247,0.3);background:rgba(168,85,247,0.04);}.lrk{font-size:18px;width:32px;text-align:center;}.lnm{font-weight:600;font-size:14px;color:${tx};flex:1;display:flex;align-items:center;gap:6px;}.lyu{font-size:8px;background:linear-gradient(135deg,#a855f7,#f43f5e);color:#fff;padding:2px 5px;border-radius:3px;font-weight:700;}.lht{font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:#22c55e;}.lcl{font-size:11px;color:${tm};}.lrt{font-size:11px;color:#3b82f6;font-weight:600;}
.sub-bar{display:flex;gap:6px;padding:10px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;flex-wrap:wrap;margin-bottom:8px;}.sub-pill{background:${cd};border:1px solid ${bd};border-radius:20px;padding:6px 14px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:${tm};cursor:pointer;white-space:nowrap;transition:all 0.15s;}.sub-pill:hover{color:${tx};border-color:rgba(168,85,247,0.3);}.sub-act{background:rgba(168,85,247,0.15);color:#a855f7;border-color:rgba(168,85,247,0.3);}
.loading-bar{display:flex;align-items:center;justify-content:center;gap:10px;padding:24px;color:${tm};font-size:14px;}.load-spin{display:inline-block;width:16px;height:16px;border:2px solid ${bd};border-top-color:#a855f7;border-radius:50%;animation:sp 0.6s linear infinite;}
.ded{text-align:center;margin-top:40px;font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;color:${dk?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.15)"};text-transform:uppercase;}
.live-bar{display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(34,197,94,0.08);border-bottom:1px solid rgba(34,197,94,0.15);font-size:12px;font-weight:600;color:#22c55e;flex-wrap:wrap;}.live-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 1.5s ease-in-out infinite;}.live-err{color:#ef4444;font-weight:400;}.live-demo{background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:3px 10px;font-size:11px;color:${tm};cursor:pointer;margin-left:auto;font-family:'DM Sans',sans-serif;}.live-demo:hover{color:${tx};}
.demo-bar{padding:8px 16px;background:rgba(168,85,247,0.06);border-bottom:1px solid rgba(168,85,247,0.1);font-size:12px;color:${tm};}.live-load{background:linear-gradient(135deg,#a855f7,#f43f5e);border:none;border-radius:6px;padding:4px 14px;font-size:12px;font-weight:700;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;}.live-load:hover{filter:brightness(1.15);}.live-load:disabled{opacity:0.5;}
.sb-go{background:linear-gradient(135deg,#a855f7,#f43f5e);border:none;border-radius:24px;padding:11px 20px;font-size:13px;font-weight:700;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:all 0.15s;}.sb-go:hover{filter:brightness(1.15);}.sb-go:disabled{opacity:0.5;}
.load-more{text-align:center;padding:20px;}.lm-btn{background:linear-gradient(135deg,#a855f7,#6366f1);border:none;border-radius:12px;padding:14px 32px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;color:#fff;cursor:pointer;transition:all 0.15s;}.lm-btn:hover{filter:brightness(1.15);transform:scale(1.02);}.lm-btn:disabled{opacity:0.5;}
.empty{text-align:center;padding:36px 20px;color:${td};font-size:13px;}.foot{text-align:center;margin-top:12px;font-size:10px;color:${td};}
@media(max-width:520px){.nr{gap:3px;}.nb{padding:4px 6px;font-size:10px;}.nuser{font-size:10px;}.ec-act{gap:3px;}.eb{padding:5px 8px;font-size:10px;}.ssn{font-size:14px;}.tb{padding:9px 10px;font-size:11px;}.slt .sh,.slt .ss{font-size:48px;}.search-in{padding:9px 14px;font-size:13px;}}
`;}
