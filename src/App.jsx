import { dbLoad, dbSave } from "./supabase.js";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const uid = () => "x" + Date.now() + Math.random().toString(36).substr(2, 5);
const fHas = (n) => (Number(n) || 0).toFixed(4) + " has";
const fUSD = (p) => "$" + (Number(p) || 0).toFixed(2);
const fN = (n, d) => (Number(n) || 0).toFixed(d || 3);

const YOGUNLUKLAR = { "8K": 9.70, "10K": 11.60, "14K": 13.40, "18K": 15.50, "22K": 15.95, "24K": 19.32, "925": 10.40 };
const AYARLAR = [
  { id: "8K",  l: "8 Ayar",     o: 0.333 },
  { id: "10K", l: "10 Ayar",    o: 0.417 },
  { id: "14K", l: "14 Ayar",    o: 0.585 },
  { id: "18K", l: "18 Ayar",    o: 0.750 },
  { id: "22K", l: "22 Ayar",    o: 0.916 },
  { id: "24K", l: "24 Ayar",    o: 1.000 },
  { id: "925", l: "925 Gumus",  o: 0.925 },
];
const DURUMLAR = [
  { id: "baslanmadi", l: "Baslanmadi",    c: "#8a7d64", s: 0 },
  { id: "cizimde",    l: "Cizimde",       c: "#a78bfa", s: 1 },
  { id: "mum_tas",    l: "Muma Tas",      c: "#f59e0b", s: 2 },
  { id: "dokum",      l: "Dokumde",       c: "#e8833a", s: 3 },
  { id: "tezgah",     l: "Tezgahta",      c: "#5b9bd5", s: 4 },
  { id: "cila",       l: "Cilada",        c: "#c9a84c", s: 5 },
  { id: "tas_dus",    l: "Tas Dusuk",     c: "#c27ba0", s: 6 },
  { id: "kalite",     l: "Kalite",        c: "#9b59b6", s: 7 },
  { id: "tamam",      l: "Tamamlandi",    c: "#6abf69", s: 8 },
  { id: "teslim",     l: "Teslime Hazir", c: "#2ecc71", s: 9 },
  { id: "hurda",      l: "Hurda",         c: "#e85a4f", s: -1 },
];

const MIN_KAR = 0.05;
const MIN_MLY = 0.020; // milyem/gr — bu altındaki modeller düşük karlı sayılır
const TEMALAR = {
  altin:    { id:"altin",    l:"◆ Klasik Altın",  ac:"Koyu zemin, altın vurgular", bg:"linear-gradient(165deg,#110f0a,#16140e,#141210)", bg2:"#110f0a", gold:"#c9a84c", text:"#e8dcc8", sub:"#998a6e", dim:"#665d4a", card:"rgba(201,168,76,0.03)", border:"rgba(201,168,76,0.08)", header:"rgba(201,168,76,0.04)", headerBorder:"rgba(201,168,76,0.07)", btnBg:"rgba(201,168,76,0.08)", btnBorder:"rgba(201,168,76,0.15)", accent:"#c9a84c", danger:"#e85a4f", success:"#6abf69", info:"#5b9bd5" },
  obsidyen: { id:"obsidyen", l:"◆ Obsidyen",      ac:"Tam siyah, sade beyaz",     bg:"linear-gradient(165deg,#080808,#0e0e0e,#0a0a0a)", bg2:"#080808", gold:"#e0e0e0", text:"#f0f0f0", sub:"#777777", dim:"#4a4a4a", card:"rgba(255,255,255,0.03)", border:"rgba(255,255,255,0.07)", header:"rgba(255,255,255,0.03)", headerBorder:"rgba(255,255,255,0.06)", btnBg:"rgba(255,255,255,0.05)", btnBorder:"rgba(255,255,255,0.1)", accent:"#e0e0e0", danger:"#ff6b6b", success:"#69db7c", info:"#74c0fc" },
  slate:    { id:"slate",    l:"◆ Slate",         ac:"Lacivert-gri, profesyonel", bg:"linear-gradient(165deg,#0f1923,#141f2e,#111a28)", bg2:"#0f1923", gold:"#5b9bd5", text:"#d0dff0", sub:"#6a85aa", dim:"#445570", card:"rgba(91,155,213,0.04)", border:"rgba(91,155,213,0.08)", header:"rgba(91,155,213,0.04)", headerBorder:"rgba(91,155,213,0.07)", btnBg:"rgba(91,155,213,0.06)", btnBorder:"rgba(91,155,213,0.12)", accent:"#5b9bd5", danger:"#e85a4f", success:"#6abf69", info:"#5b9bd5" },
  beyaz:    { id:"beyaz",    l:"◆ Beyaz",         ac:"Apple tarzı, minimal açık",  bg:"linear-gradient(165deg,#f5f5f7,#f0f0f2,#eeeef0)", bg2:"#f5f5f7", gold:"#1d1d1f", text:"#1d1d1f", sub:"#86868b", dim:"#aeaeb2", card:"rgba(0,0,0,0.02)", border:"rgba(0,0,0,0.06)", header:"rgba(0,0,0,0.02)", headerBorder:"rgba(0,0,0,0.05)", btnBg:"rgba(0,0,0,0.04)", btnBorder:"rgba(0,0,0,0.1)", accent:"#0066cc", danger:"#ff3b30", success:"#34c759", info:"#007aff" },
};

let _tema = TEMALAR.altin;
try { const t = localStorage.getItem("atolye_tema"); if (t && TEMALAR[t]) _tema = TEMALAR[t]; } catch {}
let GOLD = _tema.gold;
let DARK = _tema.bg2;

// ═══ BOY TABLOLARI ═══
const BOY_YUZUK = {
  "US":     [3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10,10.5,11,11.5,12],
  "Euro":   [44,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65],
  "Japon":  [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27],
  "İtalyan":[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
  "mm":     [14,14.5,15,15.5,16,16.5,17,17.5,18,18.5,19,19.5,20,20.5,21,21.5,22,22.5,23],
};
// US → mm dönüşüm (yaklaşık)
const US_TO_MM = {3:14.1,3.5:14.5,4:14.9,4.5:15.3,5:15.7,5.5:16.1,6:16.5,6.5:16.9,7:17.3,7.5:17.7,8:18.1,8.5:18.5,9:18.9,9.5:19.3,10:19.8,10.5:20.2,11:20.6,11.5:21.0,12:21.4};
const EURO_TO_MM = {44:14.0,46:14.6,47:15.0,48:15.3,49:15.6,50:15.9,51:16.2,52:16.6,53:16.9,54:17.2,55:17.5,56:17.8,57:18.1,58:18.5,59:18.8,60:19.1,61:19.4,62:19.7,63:20.0,64:20.4,65:20.7};
const JP_TO_MM  = {1:13.0,2:13.3,3:13.5,4:13.8,5:14.0,6:14.3,7:14.5,8:14.8,9:15.0,10:15.3,11:15.5,12:15.8,13:16.0,14:16.3,15:16.5,16:16.8,17:17.0,18:17.3,19:17.5,20:17.8,21:18.0,22:18.3,23:18.5,24:18.8,25:19.0,26:19.3,27:19.5};
const IT_TO_MM  = {4:13.0,5:13.3,6:13.5,7:13.8,8:14.0,9:14.3,10:14.5,11:14.8,12:15.0,13:15.3,14:15.5,15:15.8,16:16.0,17:16.3,18:16.5,19:16.8,20:17.0,21:17.3,22:17.5,23:17.8,24:18.0,25:18.3,26:18.5,27:18.8,28:19.0,29:19.3,30:19.5};

function boyToMM(sistem, deger) {
  if (sistem === "mm") return Number(deger);
  if (sistem === "US") return US_TO_MM[Number(deger)] || 0;
  if (sistem === "Euro") return EURO_TO_MM[Number(deger)] || 0;
  if (sistem === "Japon") return JP_TO_MM[Number(deger)] || 0;
  if (sistem === "İtalyan") return IT_TO_MM[Number(deger)] || 0;
  return 0;
}

const BOY_BILEZIK = {
  "mm (iç çap)": [55,56,57,58,59,60,61,62,63,64,65,66,67,68,70,72],
  "mm (iç çevre)": [160,162,165,168,170,172,175,178,180,182,185,188,190,195,200],
  "Beden": ["XS","S","M","L","XL","XXL"],
};

const KATEGORILER = [
  { id: "yuzuk",    l: "Yuzuk" },
  { id: "kolye",    l: "Kolye" },
  { id: "kupe",     l: "Kupe" },
  { id: "bilezik",  l: "Bilezik" },
  { id: "bileklik", l: "Bileklik" },
  { id: "pendant",  l: "Pendant" },
  { id: "set",      l: "Set" },
  { id: "diger",    l: "Diger" },
];

function gramDonustur(refGram, refAyar, hedefAyar, tasGram) {
  if (refAyar === hedefAyar) return refGram;
  // Karat sayıları
  const karatMap = { "8K":8, "10K":10, "14K":14, "18K":18, "22K":22, "24K":24, "925":9.25 };
  const eskiK = karatMap[refAyar] || 14;
  const yeniK = karatMap[hedefAyar] || 14;
  // Taş gramını ayır (taş değişmez!)
  const tas = Number(tasGram) || 0;
  const madenGram = Math.max(0, Number(refGram) - tas);
  // Atölye katsayısı: maden gramı × (yeniK / eskiK)
  const yeniMadenGram = madenGram * (yeniK / eskiK);
  // Taşı geri ekle
  return yeniMadenGram + tas;
}

// ═══ HESAPLAMA — Tüm sonuçlar HAS GRAM cinsinden ═══
// altinKgUSD: kg başına dolar (örn: 96000)
// hasGramUSD = altinKgUSD / 1000
// İşçilik has = (mamulGr × iscilikDolarGr) / hasGramUSD
// Taş has    = tasGr × ayarOran
// Maliyet has = mamulGr × maliyetMly (0.25)
// Ek maliyet has = ekMaliyetUSD / hasGramUSD
// Kâr has = Taş has + İşçilik has - Maliyet has - Ek maliyet has
function hesapla(m, secilenAyar, altinKgUSD, varsayilanMly) {
  const refAyar    = m.refAyar || "14K";
  const refGram    = Number(m.gram) || 0;
  const tasGram    = Number(m.tasGram) || 0;
  const aktifAyar  = secilenAyar || refAyar;
  const mamulGram  = gramDonustur(refGram, refAyar, aktifAyar, tasGram);
  const ayarOran   = (AYARLAR.find(a => a.id === aktifAyar) || { o: 0.585 }).o;
  const malMly     = Number(m.madenCarpan) || Number(varsayilanMly) || 0.030;
  const hasGramUSD = altinKgUSD > 0 ? altinKgUSD / 1000 : 0;

  // Taş has gram
  const tasHas = tasGram * ayarOran;

  // İşçilik has gram
  const iscilikDolarGr = Number(m.iscilikDolar) || 0;
  let iscilikHas = 0;
  let iscilikUSD = 0;
  if (m.iscilikBirim === "milyem") {
    // milyem/gr → has gram doğrudan
    iscilikHas = mamulGram * iscilikDolarGr;
    iscilikUSD = iscilikHas * hasGramUSD;
  } else {
    // $/gr
    iscilikUSD = mamulGram * iscilikDolarGr;
    iscilikHas = hasGramUSD > 0 ? iscilikUSD / hasGramUSD : 0;
  }

  // Maliyet has gram
  const maliyetHas = mamulGram * malMly;

  // Ek maliyet has gram (USD olarak girilir)
  const ekMaliyetUSD = Number(m.ekMaliyet) || 0;
  const ekMaliyetHas = hasGramUSD > 0 ? ekMaliyetUSD / hasGramUSD : 0;

  // Toplam gelir has
  const gelirHas = tasHas + iscilikHas;
  // Toplam maliyet has
  const topMaliyetHas = maliyetHas + ekMaliyetHas;
  // Kâr has
  const karHas = gelirHas - topMaliyetHas;
  const karUSD = karHas * hasGramUSD;
  // Karlılık milyem/gr = karHas / mamulGram
  const karMly = mamulGram > 0 ? karHas / mamulGram : 0;
  const karUyari = karMly < MIN_MLY && mamulGram > 0;

  return {
    mamulGram, aktifAyar, ayarOran,
    tasHas, iscilikUSD, iscilikHas,
    maliyetHas, ekMaliyetUSD, ekMaliyetHas,
    gelirHas, topMaliyetHas,
    karHas, karUSD, karMly, karUyari,
    hasGramUSD,
  };
}

async function ld(k, f) { try { const r = await dbLoad(k, f); return r ?? f; } catch { return f; } }
async function sv(k, d) { try { await dbSave(k, d); } catch(e) { console.error("sv error:", e); } }

function resizeImg(file) {
  return new Promise(resolve => {
    const rd = new FileReader();
    rd.onload = e => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > 1200) { h = Math.round(h * 1200 / w); w = 1200; }
        if (h > 1200) { w = Math.round(w * 1200 / h); h = 1200; }
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.75));
      };
      img.src = e.target.result;
    };
    rd.readAsDataURL(file);
  });
}

// PDF — blob download (popup yok)
// ═══ ÜRETİM TAKİP YARDIMCILARI ═══
function sureFmt(ms) {
  if (!ms || ms < 0) return "-";
  const dk = Math.floor(ms / 60000);
  const sa = Math.floor(dk / 60);
  const gun = Math.floor(sa / 24);
  if (gun > 0) return gun + " gün " + (sa % 24) + " sa";
  if (sa > 0) return sa + " sa " + (dk % 60) + " dk";
  return dk + " dk";
}

function siparisDurumHesapla(s) {
  // Tüm kalemlerin mevcut durumlarından en yaygın olanı bul
  const kalemDurumlar = s.kalemDurumlar || {};
  const durumlar = (s.kalemler||[]).map(k => kalemDurumlar[k.id] || k.durum || "baslanmadi").filter(d => d !== "hurda");
  if (!durumlar.length) return "baslanmadi";
  const say = {};
  durumlar.forEach(d => say[d] = (say[d]||0)+1);
  return Object.entries(say).sort((a,b)=>b[1]-a[1])[0][0];
}

function durumSureHesapla(gecmis) {
  // [{durum, tarih}] → her durum için harcanan süre
  const sonuclar = {};
  for (let i = 0; i < gecmis.length; i++) {
    const d = gecmis[i];
    const sonraki = gecmis[i+1];
    const sure = sonraki ? sonraki.tarih - d.tarih : Date.now() - d.tarih;
    sonuclar[d.durum] = (sonuclar[d.durum] || 0) + sure;
  }
  return sonuclar;
}

function downloadPDF(html, filename) {
  try {
    // Yöntem 1: Blob ile yeni sekme
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  } catch(e) {
    // Yöntem 2: data URI
    try {
      const encoded = "data:text/html;charset=utf-8," + encodeURIComponent(html);
      const a = document.createElement("a");
      a.href = encoded;
      a.target = "_blank";
      a.download = (filename||"pdf") + ".html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch(e2) {
      alert("PDF acilamadi. Tarayici popup izni verin.");
    }
  }
}

// Doğal sıralama: ALT1, ALT2, ALT10 (numara sırasıyla)
function dogalSirala(a, b) {
  const ka = (a.kod || "ZZZ").toUpperCase();
  const kb = (b.kod || "ZZZ").toUpperCase();
  return ka.localeCompare(kb, undefined, { numeric: true, sensitivity: 'base' });
}

function buildKatalogHTML(kol, modeller, sutun, hedefAyar) {
  // sutun: 3 veya 4 (kullanıcı seçer)
  // hedefAyar: "8K", "10K", "14K", "18K" vb — gram dönüşümü yapılır
  // bileklik kategorisi → otomatik 2'li geniş layout
  const cols = sutun || 3;
  const perPage = cols === 4 ? 16 : 12;

  // Modelleri üçe ayır: bileklik, kolye ve diğerleri
  const bileklikler = modeller.filter(m => m.kategori === "bileklik");
  const kolyeler    = modeller.filter(m => m.kategori === "kolye");
  const digerler    = modeller.filter(m => m.kategori !== "bileklik" && m.kategori !== "kolye");

  const css = "*{margin:0;padding:0;box-sizing:border-box}"
    + "body{font-family:Arial,Helvetica,sans-serif;background:#f3f3f3;color:#1a1a1a}"
    + "@media print{.np{display:none!important}@page{size:A4 portrait;margin:6mm}}"
    + ".cv{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;background:#f3f3f3}"
    + ".cv .ln{width:44px;height:1px;background:#c9a84c;margin:14px 0}"
    + ".cv h1{font-size:28px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-align:center}"
    + ".cv p{font-size:11px;color:#aaa;letter-spacing:.1em;text-transform:uppercase}"
    + ".pg{padding:7px 16px 5px;page-break-after:always;height:99vh;display:flex;flex-direction:column;background:#f3f3f3}"
    + ".pg:last-child{page-break-after:auto}"
    + ".grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;flex:1;min-height:0}"
    + ".grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;flex:1;min-height:0}"
    + ".grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:1;min-height:0}"
    + ".grid2x2{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:6px;flex:1;min-height:0}"
    + ".cd{background:#fff;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 2px 8px rgba(0,0,0,0.10)}"
    + ".cd.full{grid-column:1/-1}"
    + ".cd.span2{grid-column:span 2}"
    + ".cd.big{grid-column:span 2;grid-row:span 2}" // kolye 2x2
    + ".ph{flex:1;min-height:0;position:relative;background:#f3f3f3;overflow:hidden}"
    + ".ph img{position:absolute;top:50%;left:50%;width:100%;height:100%;object-fit:contain;object-position:center;display:block;transform:translate(-50%,-50%)}"
    + ".ph .ni{position:absolute;top:0;left:0;width:100%;height:100%;background:#f3f3f3;display:flex;align-items:center;justify-content:center;color:#ddd;font-size:20px}"
    + ".cd2 .ph{min-height:180px}"
    + ".cd-kolye .ph{min-height:280px}"
    + ".cd-bileklik{grid-column:1/-1;overflow:hidden;display:flex;flex-direction:column;flex:1}"
    + ".cd-bileklik .ph{flex:1;padding:0;position:relative;overflow:hidden}"
    + ".cd-bileklik .ph img{object-fit:cover;object-position:center;width:100%;height:100%;position:absolute;top:0;left:0;transform:none}"
    + ".inf{padding:6px 9px 7px 10px;flex-shrink:0;background:#fff;border-top:1px solid #f0f0f0;border-left:3px solid #c9a84c}"
    + ".r1{display:flex;justify-content:space-between;align-items:baseline}"
    + ".kod{font-size:13px;color:#c9a84c;font-weight:700;letter-spacing:.04em}"
    + ".gram{font-size:10px;font-weight:700;color:#333}"
    + ".ac{font-size:8px;color:#aaa;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    + ".ft{display:flex;justify-content:space-between;align-items:center;padding:5px 3px 0;border-top:1px solid #e0e0e0;flex-shrink:0}"
    + ".ft span{font-size:7px;color:#c9a84c;font-weight:700;letter-spacing:.08em;text-transform:uppercase}"
    + ".ft small{font-size:7px;color:#ccc}"
    + ".sec-title{font-size:9px;color:#c9a84c;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin:8px 0 4px;padding-left:2px;border-left:3px solid #c9a84c;padding-left:6px}"
    + ".pb{position:fixed;bottom:16px;right:16px;background:#c9a84c;border:none;border-radius:8px;padding:10px 20px;color:#fff;font-size:13px;cursor:pointer;font-family:sans-serif}";

  const gridClass = cols === 4 ? "grid4" : "grid3";

  // Kart HTML'i oluştur
  const kartHTML = (m, extraCls) => {
    // Gram dönüşümü: hedefAyar farklıysa gramı çevir
    const gosterAyar = hedefAyar || m.refAyar || "14K";
    const gosterGram = hedefAyar && hedefAyar !== m.refAyar
      ? gramDonustur(Number(m.gram)||0, m.refAyar||"14K", hedefAyar, m.tasGram||0).toFixed(2)
      : (m.gram || "—");
    
    let h = "<div class='cd" + (extraCls?" "+extraCls:"") + "'>";
    h += "<div class='ph'>";
    h += m.foto ? "<img src='" + m.foto + "'/>" : "<div class='ni'>◇</div>";
    h += "</div><div class='inf'><div class='r1'>";
    h += "<span class='kod'>" + (m.kod || "—") + "</span>";
    h += "<span class='gram'>" + gosterGram + "gr · " + gosterAyar + "</span>";
    h += "</div>";
    if (m.ac) h += "<div class='ac'>" + m.ac + "</div>";
    h += "</div></div>";
    return h;
  };

  let h = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + kol.ad + "</title><style>" + css + "</style></head><body>";
  h += "<div class='cv'><div class='ln'></div><h1>" + kol.ad + "</h1>";
  if (hedefAyar) h += "<p style='margin-top:6px;font-size:14px;color:#c9a84c;letter-spacing:.08em'>" + hedefAyar + "</p>";
  if (kol.ac) h += "<p style='margin-top:8px'>" + kol.ac + "</p>";
  h += "<div class='ln'></div></div>";

  let pageNum = 0;
  const kolyePerPage = cols === 4 ? 4 : 2; // 4'lü gridde 4 kolye, 3'lü gridde 2
  const totalPages = Math.ceil(digerler.length / perPage) + Math.ceil(kolyeler.length / kolyePerPage) + Math.ceil(bileklikler.length / 3);

  // DİĞER ÜRÜNLER — seçilen grid (3 veya 4 sütun)
  const digerPages = [];
  for (let i = 0; i < digerler.length; i += perPage) digerPages.push(digerler.slice(i, i + perPage));

  digerPages.forEach((pg, pi) => {
    pageNum++;
    h += "<div class='pg'><div class='" + gridClass + "'>";
    pg.forEach((m, idx) => {
      h += kartHTML(m, "");
    });
    // Boş placeholder kutular — grid düzeni korusun
    const rem = pg.length % cols;
    if (rem > 0) {
      for (let i = 0; i < cols - rem; i++) {
        h += "<div class='cd' style='opacity:0;pointer-events:none'></div>";
      }
    }
    h += "</div><div class='ft'><span>" + kol.ad + "</span><small>" + pageNum + " / " + totalPages + "</small></div></div>";
  });

  // KOLYE — 2x2 büyük kart (sayfada 2-4 kolye)
  if (kolyeler.length > 0) {
    const kolyePages = [];
    for (let i = 0; i < kolyeler.length; i += kolyePerPage) kolyePages.push(kolyeler.slice(i, i + kolyePerPage));

    kolyePages.forEach((pg, pi) => {
      pageNum++;
      h += "<div class='pg'>";
      if (pi === 0) h += "<div class='sec-title'>Kolye</div>";
      h += "<div class='grid2x2'>";
      pg.forEach(m => h += kartHTML(m, "cd-kolye"));
      if (pg.length % 2 !== 0) h += "<div></div>";
      h += "</div><div class='ft'><span>" + kol.ad + " · Kolye</span><small>" + pageNum + " / " + totalPages + "</small></div></div>";
    });
  }

  // BİLEKLİK — tam genişlik, sayfada 12 tane
  if (bileklikler.length > 0) {
    const bileklikPerPage = 12;
    const bileklikPages = [];
    for (let i = 0; i < bileklikler.length; i += bileklikPerPage) bileklikPages.push(bileklikler.slice(i, i + bileklikPerPage));

    bileklikPages.forEach((pg, pi) => {
      pageNum++;
      const satirYuksekligi = Math.floor(88 / pg.length); // vh cinsinden her satır
      h += "<div class='pg'>";
      if (pi === 0) h += "<div class='sec-title'>Bileklik</div>";
      h += "<div style='display:flex;flex-direction:column;gap:4px;flex:1;min-height:0;overflow:hidden'>";
      pg.forEach(m => {
        const gosterAyar = hedefAyar || m.refAyar || "14K";
        const gosterGram = hedefAyar && hedefAyar !== m.refAyar
          ? gramDonustur(Number(m.gram)||0, m.refAyar||"14K", hedefAyar, m.tasGram||0).toFixed(2)
          : (m.gram || "—");
        h += "<div style='display:flex;flex-direction:column;flex:1;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)'>"
          + "<div style='flex:1;overflow:hidden;position:relative;min-height:0'>"
          + (m.foto 
            ? "<img src='" + m.foto + "' style='width:100%;height:100%;object-fit:cover;object-position:center;display:block;position:absolute;top:0;left:0'/>"
            : "<div style='width:100%;height:100%;background:#f3f3f3;display:flex;align-items:center;justify-content:center;color:#ddd;font-size:14px;position:absolute;top:0;left:0'>◇</div>")
          + "</div>"
          + "<div style='padding:3px 8px 4px;border-top:1px solid #f0f0f0;border-left:3px solid #c9a84c;display:flex;justify-content:space-between;align-items:baseline;flex-shrink:0'>"
          + "<div>"
          + "<span style='font-size:11px;color:#c9a84c;font-weight:700;letter-spacing:.04em'>" + (m.kod||"—") + "</span>"
          + (m.ac ? "<span style='font-size:8px;color:#aaa;margin-left:6px'>" + m.ac + "</span>" : "")
          + "</div>"
          + "<span style='font-size:9px;font-weight:700;color:#333'>" + gosterGram + "gr · " + gosterAyar + "</span>"
          + "</div></div>";
      });
      h += "</div><div class='ft'><span>" + kol.ad + " · Bileklik</span><small>" + pageNum + " / " + totalPages + "</small></div></div>";
    });
  }

  h += "<button class='np pb' onclick='window.print()'>Yazdir / PDF</button></body></html>";
  return h;
}


// Konfirmasyon — fiyatli (ic kullanim) veya fiyatsiz (musteriye)
function buildKonfHTML(siparis, altinKgUSD, mc, fiyatli) {
  const hasGramUSD = altinKgUSD / 1000;
  let tGram = 0, tKar = 0;
  const rows = (siparis.kalemler || []).map(k => {
    const hc = hesapla(k, k.secilenAyar || k.refAyar, altinKgUSD, mc);
    const adet = k.adet || 1;
    tGram += hc.mamulGram * adet;
    tKar  += hc.karHas * adet;
    return { ...k, hc, adet };
  });

  const css = "*{margin:0;padding:0;box-sizing:border-box}"
    + "body{font-family:'Segoe UI',Arial,sans-serif;background:#e8edf2;padding:20px;display:flex;justify-content:center}"
    + "@media print{.np{display:none!important}@page{size:A4;margin:8mm}body{background:#fff;padding:0;display:block}}"
    + ".wrap{background:#fff;border-radius:8px;border:1px solid #c8d8e8;width:100%;max-width:720px;overflow:hidden}"
    + ".hdr{padding:22px 28px 20px;background:#f5f8fc;border-bottom:1px solid #dce8f0;display:flex;justify-content:space-between;align-items:flex-end}"
    + ".lbl{font-size:8px;color:#7a9ab5;text-transform:uppercase;letter-spacing:.14em;margin-bottom:5px}"
    + ".musno{font-size:26px;font-weight:500;color:#1e3a5f}"
    + ".musad{font-size:11px;color:#7a9ab5;margin-top:3px}"
    + ".meta{font-size:10px;color:#7a9ab5}"
    + ".ayar-bar{margin:14px 28px 10px;display:flex;gap:24px;padding:8px 14px;background:#f5f8fc;border-radius:5px;border:1px solid #dce8f0}"
    + ".ayar-bar .lk{font-size:8px;color:#7a9ab5;text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px}"
    + ".ayar-bar .vk{font-size:11px;color:#1e3a5f;font-weight:500}"
    + "table{width:100%;border-collapse:collapse;margin:0 0 4px}"
    + ".tbl-wrap{padding:0 28px}"
    + "th{font-size:8px;color:#7a9ab5;text-transform:uppercase;letter-spacing:.08em;padding:0 6px 8px;border-bottom:1px solid #dce8f0;font-weight:400;text-align:left}"
    + "th.r{text-align:right}"
    + "td{padding:11px 6px;border-bottom:.5px solid #f0f4f8;vertical-align:middle;font-size:11px;color:#1a1a1a}"
    + "td.r{text-align:right}"
    + ".ic img{width:66px;height:66px;object-fit:cover;border-radius:6px;display:block}"
    + ".ni2{width:66px;height:66px;background:#eef4fa;border-radius:6px}"
    + ".kod{font-size:12px;font-weight:500;color:#1e3a5f}"
    + ".nm{font-size:11px;color:#1a1a1a}"
    + ".nt{font-size:9px;color:#aaa;margin-top:2px}"
    + ".boy{font-size:9px;color:#5a7a95;margin-top:2px}"
    + ".dim{font-size:10px;color:#888}"
    + ".tot-blok{padding:14px 34px 0;display:flex;justify-content:flex-end;border-top:1px solid #dce8f0;margin:0 28px}"
    + ".tot-tbl{border-collapse:collapse;min-width:230px}"
    + ".tot-tbl td{padding:4px 8px;font-size:11px}"
    + ".tot-tbl .lc{text-align:left;color:#7a9ab5;font-size:10px;text-transform:uppercase;letter-spacing:.05em}"
    + ".tot-tbl .rc{text-align:right;color:#1a1a1a}"
    + ".tot-tbl .grand td{border-top:1px solid #dce8f0;padding-top:10px;font-weight:500;color:#1e3a5f;font-size:13px}"
    + ".footer{margin:14px 28px 0;padding:10px 0;border-top:.5px solid #eef4fa;display:flex;justify-content:space-between;font-size:8px;color:#b0c4d4}"
    + ".pb{position:fixed;bottom:16px;right:16px;background:#1e3a5f;border:none;border-radius:8px;padding:10px 22px;color:#fff;font-size:13px;cursor:pointer}";

  let h = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + (fiyatli ? "Ic Konfirmasyon" : "Siparis Formu") + "</title><style>" + css + "</style></head><body><div class='wrap'>";

  // Başlık
  h += "<div class='hdr'>";
  h += "<div><div class='lbl'>" + (fiyatli ? "Siparis Konfirmasyonu" : "Siparis Formu") + "</div>";
  h += "<div class='musno'>" + (siparis.musKod||siparis.musteri||"—") + "</div>";
  h += "<div class='musad'>" + (siparis.musteri||"") + "</div></div>";
  h += "<div style='text-align:right'><div class='meta'>" + new Date(siparis.tarih).toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"}) + "</div>";
  h += "<div class='meta' style='margin-top:3px'>" + rows.length + " kalem" + (siparis.teslimTarihi ? " &nbsp;·&nbsp; Teslim: " + new Date(siparis.teslimTarihi).toLocaleDateString("tr-TR") : "") + "</div></div>";
  h += "</div>";

  // Ayar bar — altın fiyatı yok
  const ayarLabel = rows[0]?.secilenAyar ? rows[0].secilenAyar.replace("K"," Ayar") : "14 Ayar";
  h += "<div class='ayar-bar'><div><div class='lk'>Ayar</div><div class='vk'>" + ayarLabel + "</div></div></div>";

  // Tablo
  h += "<div class='tbl-wrap'><table>";

  h += "<thead><tr><th style='width:74px'></th><th style='width:68px'>Kod</th><th>Kategori / Not</th><th class='r' style='width:50px'>Renk</th><th class='r' style='width:38px'>Adet</th><th class='r' style='width:56px'>Gram</th><th class='r' style='width:64px'>Iscilik</th></tr></thead><tbody>";

  let tIscilik = 0;
  rows.forEach(r => {
    const topGram = r.hc.mamulGram * r.adet;
    const iscilikTop = r.iscilikBirim==="milyem"
      ? r.hc.iscilikHas * r.hc.hasGramUSD * r.adet
      : (r.iscilikDolar||0) * topGram * r.adet;
    tIscilik += iscilikTop;
    const katLabel = r.kategori ? r.kategori.charAt(0).toUpperCase()+r.kategori.slice(1) : "";
    const boyLabel = r.boy&&r.boy.deger ? "Boy: "+r.boy.sistem+" "+r.boy.deger+(r.boy.sistem!=="mm"&&r.boy.sistem!=="Beden"&&r.boy.sistem!=="mm (iç çap)"&&r.boy.sistem!=="mm (iç çevre)"?" (≈"+boyToMM(r.boy.sistem,r.boy.deger)+"mm)":"") : "";
    // Kolye/bileklik için boyListesi
    let boyListesiHTML = "";
    if (r.boyListesi && r.boyListesi.length > 0) {
      boyListesiHTML = "<div class='boy' style='margin-top:3px'><b>Boylar:</b> " + r.boyListesi.map(b => 
        (b.uzunluk||"-") + (b.birim||"cm") + " · " + (b.gram||"-") + "gr × " + (b.adet||1) + "ad"
      ).join(" / ") + "</div>";
    }
    h += "<tr>";
    h += "<td>" + (r.foto ? "<img src='"+r.foto+"' style='width:66px;height:66px;object-fit:cover;border-radius:6px;display:block'/>" : "<div style='width:66px;height:66px;background:#eef4fa;border-radius:6px'></div>") + "</td>";
    h += "<td class='kod'>" + (r.kod||"-") + "</td>";
    h += "<td>" + (katLabel?"<div class='nm'>"+katLabel+"</div>":"") + (r.sipNot?"<div class='nt'>"+r.sipNot+"</div>":"") + (boyLabel?"<div class='boy'>"+boyLabel+"</div>":"") + boyListesiHTML + "</td>";
    h += "<td class='r dim'>" + (r.renk||"Sari") + "</td>";
    h += "<td class='r'>" + r.adet + "</td>";
    h += "<td class='r'>" + fN(topGram,2) + " gr</td>";
    h += "<td class='r dim'>" + (iscilikTop>0 ? fUSD(iscilikTop) : "-") + "</td>";
    h += "</tr>";
  });

  const tAdet = rows.reduce((s,r)=>s+r.adet,0);
  h += "</tbody></table></div>";

  // Toplam blok
  h += "<div class='tot-blok'><table class='tot-tbl'>";
  h += "<tr><td class='lc'>Toplam Gram</td><td class='rc'>" + fN(tGram,2) + " gr</td></tr>";
  h += "<tr><td class='lc'>Toplam Adet</td><td class='rc'>" + tAdet + " adet</td></tr>";
  if (tIscilik > 0) h += "<tr><td class='lc'>Toplam Iscilik</td><td class='rc'>" + fUSD(tIscilik) + "</td></tr>";
  if (!fiyatli && tIscilik > 0) h += "<tr class='grand'><td class='lc'>Genel Toplam</td><td class='rc'>" + fUSD(tIscilik) + "</td></tr>";
  h += "</table></div>";

  h += "<div class='footer'><span>Atolye yonetim sistemi</span><span>" + new Date().toLocaleDateString("tr-TR") + "</span></div>";
  h += "</div><button class='np pb' onclick='window.print()'>Yazdir / PDF</button></body></html>";
  return h;
}

// ═══ TAŞ GRAM TABLOSU ═══
// gram_per_adet = 1 / (adet_per_gram)
// Kullanim: tasGramHesapla(sekil, tur, boyut, adet) -> toplam gram
const TAS_GRAM = {
  // ROUND NORMAL
  "ROUND_N": {
    1:1/560, 1.1:1/435, 1.2:1/320, 1.3:1/270, 1.4:1/210,
    1.5:1/170, 1.6:1/155, 1.7:1/125, 1.75:1/107, 2:1/76,
    2.25:1/53, 2.5:1/40, 2.75:1/33, 3:1/25, 3.5:1/15,
    4:1/10, 4.5:1/8, 5:0.17, 5.5:0.23, 6:0.33,
  },
  // ROUND HEAVY
  "ROUND_H": {
    1:1/417, 1.1:1/320, 1.2:1/252, 1.3:1/193, 1.4:1/160,
    1.5:1/126, 1.6:1/108, 1.7:1/89, 1.75:1/83, 2:1/56,
    2.25:1/42, 2.5:1/31, 2.75:1/24, 3:0.06, 3.25:0.08,
    3.5:0.09, 3.75:0.11, 4:0.13, 4.25:0.15, 4.5:0.18,
    4.75:0.22, 5:0.26, 5.25:0.31, 5.5:0.36, 5.75:0.39,
    6:0.44, 6.25:0.5, 6.5:0.57, 6.75:0.63, 7:0.69,
  },
  // TRAPEZ
  "TRAPEZ": {
    "2X1.5X1":1/120, "2.5X1.5X1":1/97, "2.5X2X1.5":1/56,
    "3X1.5X1":1/130, "3X2X1":1/60, "3X2X1.5":1/62,
    "4X2X1":1/38, "5X2.5X1.5":1/19,
  },
  // OVAL
  "OVAL": {
    "5X3":1/15, "6X4":1/7, "7X5":1/4, "10X12":0.6369,
  },
  // DAMLA
  "DAMLA": {
    "3X2":1/56, "4X2":1/39, "5X3":1/16,
    "6X4":1/8, "7X5":0.2801, "8X6":0.28,
  },
  // MARKİZ
  "MARKİZ": {
    "3X2":1/62, "4X2":1/46, "5X2.5":1/25, "6X3":1/15,
  },
  // BAGET
  "BAGET": {
    "2X1":1/202, "2.5X1.5":1/82, "3X1.5":1/67,
    "3X2":1/40, "4X2":1/32,
  },
  // KARE
  "KARE": {
    "1.5X1.5":1/137, "1.75X1.75":1/90, "2X2":1/58,
    "2.5X2.5":1/34, "3X3":1/19, "3.5X3.5":1/13, "4X4":1/9,
  },
  // KALP
  "KALP": {
    "3X3":1/24, "3X4":1/12, "3X5":1/6, "3X6":1/4,
  },
};

function tasGramHesapla(sekil, tur, boyut, adet, ozelTaslar) {
  const key = sekil === "ROUND" ? "ROUND_" + tur : sekil;
  const tablo = TAS_GRAM[key];
  const gramPerAdet = tablo && (tablo[boyut] || tablo[String(boyut)]);
  if (gramPerAdet) return gramPerAdet * adet;
  // Özel taş listesinde ara
  if (ozelTaslar?.length) {
    const ozel = ozelTaslar.find(t => t.sekil === sekil && String(t.boyut) === String(boyut));
    if (ozel) return ozel.gramPerAdet * adet;
  }
  return 0;
}

const IS = { width: "100%", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 10, padding: "10px 14px", color: "#e8dcc8", fontSize: 13, outline: "none", fontFamily: "sans-serif", boxSizing: "border-box" };
const BG = { background: "linear-gradient(135deg,#c9a84c,#b8943f)", border: "none", borderRadius: 10, padding: "9px 18px", color: DARK, fontSize: 12, fontWeight: 800, cursor: "pointer" };
const GH = { background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 9, padding: "7px 13px", color: GOLD, fontSize: 11, fontWeight: 700, cursor: "pointer" };
const RD = { background: "rgba(232,90,79,0.08)", border: "1px solid rgba(232,90,79,0.2)", borderRadius: 9, padding: "7px 13px", color: "#e85a4f", fontSize: 11, fontWeight: 700, cursor: "pointer" };

// ═══ SATIŞ RAPORU PDF ═══
function buildSatisRaporuHTML(modeller, siparisler) {
  const mSatis = {};
  let toplamHurda = 0, toplamHurdaGr = 0;
  siparisler.forEach(s => {
    (s.kalemler||[]).forEach(k => {
      if (!mSatis[k.id]) mSatis[k.id] = { ad:k.ad, kod:k.kod||"", foto:k.foto||"", adet:0, kar:0, gram:0, hurda:0 };
      const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD, s.mc);
      const hurdaAdet = ((s.kalemHurda)||{})[k.id] || 0;
      const netAdet = (k.adet||1) - hurdaAdet;
      mSatis[k.id].adet  += netAdet;
      mSatis[k.id].kar   += hc.karHas * netAdet;
      mSatis[k.id].gram  += hc.mamulGram * netAdet;
      mSatis[k.id].hurda += hurdaAdet;
      toplamHurda   += hurdaAdet;
      toplamHurdaGr += hc.mamulGram * hurdaAdet;
    });
  });
  const sirali = Object.entries(mSatis).sort((a,b)=>b[1].adet-a[1].adet);
  const topAdet = sirali.reduce((s,[,d])=>s+d.adet,0);
  const topKar  = sirali.reduce((s,[,d])=>s+d.kar,0);
  const topGram = sirali.reduce((s,[,d])=>s+d.gram,0);

  const css = "*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#f0f0f0;padding:16px;display:flex;justify-content:center}"
    + "@media print{.np{display:none!important}@page{size:A4;margin:8mm}body{background:#fff;padding:0;display:block}}"
    + ".wrap{background:#fff;border-radius:10px;padding:16px 20px;width:100%;max-width:720px}"
    + ".hdr{border-bottom:2px solid #c9a84c;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end}"
    + ".hdr h1{font-size:18px;font-weight:800;color:#1a1a1a}"
    + ".hdr .dt{font-size:9px;color:#999}"
    + ".sum{display:flex;gap:10px;margin-bottom:14px}"
    + ".sbox{background:#faf5e8;border:1px solid #e8d5a0;border-radius:8px;padding:8px 14px;flex:1;text-align:center}"
    + ".sbox .lb{font-size:8px;color:#999;text-transform:uppercase;margin-bottom:2px}"
    + ".sbox .vl{font-size:16px;font-weight:800;color:#1a1a1a}"
    + ".sbox .gn{color:#2d8a4e}.sbox .rd{color:#c0392b}"
    + "table{width:100%;border-collapse:collapse;margin-bottom:14px}"
    + "th{background:#faf5e8;padding:6px 8px;font-size:8px;font-weight:700;color:#8a7d64;text-transform:uppercase;border-bottom:2px solid #c9a84c;text-align:left}"
    + "th.r{text-align:right}td{padding:7px 8px;border-bottom:1px solid #f0f0f0;font-size:11px;vertical-align:middle}"
    + "td.r{text-align:right}.tot{background:#faf5e8;font-weight:800;border-top:2px solid #c9a84c}"
    + ".hurda-sec{margin-top:16px;padding-top:14px;border-top:2px solid #e85a4f}"
    + ".hurda-sec h2{font-size:13px;font-weight:800;color:#e85a4f;margin-bottom:10px}"
    + ".bar{height:4px;background:#f0f0f0;border-radius:2px;overflow:hidden;margin-top:3px}"
    + ".bar div{height:100%;background:#c9a84c;border-radius:2px}"
    + ".pb{position:fixed;bottom:16px;right:16px;background:#c9a84c;border:none;border-radius:10px;padding:10px 22px;color:#fff;font-size:13px;cursor:pointer}";

  let h = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Satis Raporu</title><style>" + css + "</style></head><body><div class='wrap'>";
  h += "<div class='hdr'><div><h1>Satis Raporu</h1><div class='dt'>" + new Date().toLocaleDateString("tr-TR") + " · " + siparisler.length + " siparis · " + sirali.length + " model</div></div></div>";

  h += "<div class='sum'>";
  h += "<div class='sbox'><div class='lb'>Toplam Adet</div><div class='vl'>" + topAdet + "</div></div>";
  h += "<div class='sbox'><div class='lb'>Toplam Gram</div><div class='vl'>" + fN(topGram,1) + " gr</div></div>";
  h += "<div class='sbox'><div class='lb'>Toplam Kar</div><div class='vl gn'>" + fN(topKar,4) + " has</div></div>";
  h += "<div class='sbox'><div class='lb'>Hurda</div><div class='vl rd'>" + toplamHurda + " adet</div></div>";
  h += "</div>";

  h += "<table><thead><tr><th></th><th>Kod</th><th>Model</th><th class='r'>Adet</th><th class='r'>Gram</th><th class='r'>Kar Has</th><th class='r'>Hurda</th></tr></thead><tbody>";
  const maxAdet = sirali[0]?.[1]?.adet || 1;
  sirali.forEach(([id,d]) => {
    h += "<tr>";
    h += "<td>" + (d.foto ? "<img src='"+d.foto+"' style='width:36px;height:36px;object-fit:cover;border-radius:5px'/>" : "<div style='width:36px;height:36px;background:#f0f0f0;border-radius:5px'></div>") + "</td>";
    h += "<td style='color:#c9a84c;font-weight:800'>" + (d.kod||"—") + "</td>";
    h += "<td><div style='font-weight:700'>" + d.ad + "</div><div class='bar'><div style='width:"+Math.round(d.adet/maxAdet*100)+"%'></div></div></td>";
    h += "<td class='r' style='font-weight:800;font-size:13px'>" + d.adet + "</td>";
    h += "<td class='r'>" + fN(d.gram,1) + " gr</td>";
    h += "<td class='r' style='color:#2d8a4e;font-weight:700'>" + fN(d.kar,4) + "</td>";
    h += "<td class='r' style='color:" + (d.hurda>0?"#e85a4f":"#ccc") + ";font-weight:" + (d.hurda>0?"800":"400") + "'>" + (d.hurda>0?d.hurda:"-") + "</td>";
    h += "</tr>";
  });
  h += "<tr class='tot'><td colspan='3' style='text-align:right'>TOPLAM</td><td class='r'>" + topAdet + "</td><td class='r'>" + fN(topGram,1) + " gr</td><td class='r' style='color:#2d8a4e'>" + fN(topKar,4) + " has</td><td class='r' style='color:#e85a4f'>" + (toplamHurda>0?toplamHurda:"-") + "</td></tr>";
  h += "</tbody></table>";
  h += "</div><button class='np pb' onclick='window.print()'>Yazdir / PDF</button></body></html>";
  return h;
}

// ═══ MÜŞTERİ DETAY PDF ═══
function buildMusteriDetayHTML(musAd, musKod, siparisler) {
  const musSiparisler = siparisler.filter(s => (s.musteri||"Isimsiz").trim() === musAd);
  let topKar = 0, topGram = 0, topAdet = 0;

  const css = "*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#f0f0f0;padding:16px;display:flex;justify-content:center}"
    + "@media print{.np{display:none!important}@page{size:A4;margin:8mm}body{background:#fff;padding:0;display:block}}"
    + ".wrap{background:#fff;border-radius:10px;padding:16px 20px;width:100%;max-width:720px}"
    + ".hdr{border-bottom:2px solid #c9a84c;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start}"
    + ".hdr h1{font-size:20px;font-weight:800;color:#1a1a1a;margin-bottom:2px}"
    + ".hdr .kod{font-size:11px;color:#c9a84c;font-weight:700}"
    + ".sum{display:flex;gap:10px;margin-bottom:16px}"
    + ".sbox{background:#faf5e8;border:1px solid #e8d5a0;border-radius:8px;padding:8px 14px;flex:1;text-align:center}"
    + ".sbox .lb{font-size:8px;color:#999;text-transform:uppercase;margin-bottom:2px}"
    + ".sbox .vl{font-size:15px;font-weight:800;color:#1a1a1a}"
    + ".sbox .gn{color:#2d8a4e}"
    + ".sip{margin-bottom:14px;border:1px solid #eee;border-radius:8px;overflow:hidden}"
    + ".sip-hdr{background:#faf5e8;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee}"
    + ".sip-hdr .tarih{font-size:9px;color:#999}"
    + ".sip-hdr .kar{font-size:12px;font-weight:800;color:#2d8a4e}"
    + "table{width:100%;border-collapse:collapse}"
    + "th{padding:5px 8px;font-size:8px;font-weight:700;color:#8a7d64;text-transform:uppercase;border-bottom:1px solid #eee;text-align:left;background:#fff}"
    + "td{padding:6px 8px;border-bottom:1px solid #fafafa;font-size:10px;vertical-align:middle}"
    + ".pb{position:fixed;bottom:16px;right:16px;background:#c9a84c;border:none;border-radius:10px;padding:10px 22px;color:#fff;font-size:13px;cursor:pointer}";

  let h = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Musteri: "+musAd+"</title><style>" + css + "</style></head><body><div class='wrap'>";
  h += "<div class='hdr'><div><h1>" + musAd + "</h1><div class='kod'>" + (musKod||"") + "</div></div><div style='font-size:9px;color:#999;text-align:right'>" + new Date().toLocaleDateString("tr-TR") + "<br>" + musSiparisler.length + " siparis</div></div>";

  // Özet (sonradan doldurulacak)
  const sumPlaceholder = "%%SUM%%";
  h += sumPlaceholder;

  musSiparisler.forEach(s => {
    let sipKar = 0, sipGram = 0, sipAdet = 0;
    const rows = (s.kalemler||[]).map(k => {
      const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD, s.mc);
      const kDurum = (s.kalemDurumlar||{})[k.id]||"baslanmadi";
      const adet = k.adet||1;
      sipKar  += hc.karHas * adet;
      sipGram += hc.mamulGram * adet;
      sipAdet += adet;
      topKar  += hc.karHas * adet;
      topGram += hc.mamulGram * adet;
      topAdet += adet;
      return { k, hc, adet, kDurum };
    });

    h += "<div class='sip'>";
    h += "<div class='sip-hdr'><div><span style='font-weight:700;font-size:11px'>" + (s.musKod||s.musteri) + "</span><span class='tarih'> &nbsp;·&nbsp; " + new Date(s.tarih).toLocaleDateString("tr-TR") + (s.teslimTarihi?" &nbsp;·&nbsp; Teslim: "+new Date(s.teslimTarihi).toLocaleDateString("tr-TR"):"") + " &nbsp;·&nbsp; " + sipAdet + " kalem &nbsp;·&nbsp; " + fN(sipGram,1) + " gr</span></div><span class='kar'>" + fN(sipKar,4) + " has</span></div>";
    h += "<table><thead><tr><th></th><th>Kod</th><th>Urun</th><th>Renk</th><th>Not</th><th style='text-align:right'>Adet</th><th style='text-align:right'>Gr</th></tr></thead><tbody>";
    rows.forEach(({k,hc,adet,kDurum}) => {
      const renkRenk = k.renk==="Rose"?"#c0695e":k.renk==="Beyaz"?"#888":"#b8943f";
      const hurda = kDurum==="hurda";
      h += "<tr style='" + (hurda?"background:#fff5f5;":"") + "'>";
      h += "<td>" + (k.foto?"<img src='"+k.foto+"' style='width:30px;height:30px;object-fit:cover;border-radius:4px'/>":"<div style='width:30px;height:30px;background:#f0f0f0;border-radius:4px'></div>") + "</td>";
      h += "<td style='color:#c9a84c;font-weight:700'>" + (k.kod||"—") + "</td>";
      h += "<td style='font-weight:600'>" + (k.ad||"") + "</td>";
      h += "<td style='color:"+renkRenk+";font-weight:700'>" + (k.renk||"Sari") + "</td>";
      const hurdaNeden = hurda ? ((s.kalemHurdaNeden||{})[k.id]||"") : "";
      h += "<td style='color:#555;font-size:9px'>" + (k.sipNot||"") + (hurda?" <b style='color:#e85a4f'>[HURDA" + (hurdaNeden?" - "+hurdaNeden:"") + "]</b>":"") + "</td>";
      h += "<td style='text-align:right;font-weight:800'>" + adet + "</td>";
      h += "<td style='text-align:right'>" + fN(hc.mamulGram*adet,2) + " gr</td>";
      h += "</tr>";
    });
    h += "</tbody></table></div>";
  });

  // Özeti doldur
  const sum = "<div class='sum'>"
    + "<div class='sbox'><div class='lb'>Toplam Siparis</div><div class='vl'>" + musSiparisler.length + "</div></div>"
    + "<div class='sbox'><div class='lb'>Toplam Kalem</div><div class='vl'>" + topAdet + "</div></div>"
    + "<div class='sbox'><div class='lb'>Toplam Gram</div><div class='vl'>" + fN(topGram,1) + " gr</div></div>"
    + "<div class='sbox'><div class='lb'>Toplam Kar</div><div class='vl gn'>" + fN(topKar,4) + " has</div></div>"
    + "</div>";
  h = h.replace(sumPlaceholder, sum);

  h += "</div><button class='np pb' onclick='window.print()'>Yazdir / PDF</button></body></html>";
  return h;
}

// ═══ AI İSİMLENDİRME ═══
function AiIsimlendir({ foto, onResult }) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [oneri, setOneri] = useState(null);
  const [hata, setHata] = useState("");

  const analiz = async () => {
    setYukleniyor(true); setOneri(null); setHata("");
    try {
      const base64 = foto.split(",")[1];
      const mediaType = foto.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const kat = KATEGORILER.map(k => k.id).join(", ");
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 80,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: "Bu kuyumcu takininin adini ve kategorisini JSON olarak ver. Kategori secenekleri: " + kat + ". Sadece JSON yaz, baska hicbir sey yazma. Format: {\"ad\": \"Pirlanta Kalp Yuzuk\", \"kategori\": \"yuzuk\"}" }
            ]
          }]
        })
      });
      const data = await response.json();
      const txt = data.content && data.content[0] ? data.content[0].text.trim() : "";
      const clean = txt.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.ad) setOneri(parsed);
      else setHata("Oneri alinamadi.");
    } catch (e) {
      setHata("Hata olustu.");
    }
    setYukleniyor(false);
  };

  const kategoriLabel = oneri ? (KATEGORILER.find(k => k.id === oneri.kategori)||{l:oneri.kategori}).l : "";

  return (
    <div style={{ marginTop: 6 }}>
      {!oneri && (
        <button onClick={analiz} disabled={yukleniyor} style={{ width: "100%", padding: "7px", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, color: "#a78bfa", fontSize: 11, fontWeight: 700, cursor: yukleniyor ? "wait" : "pointer" }}>
          {yukleniyor ? "AI analiz ediyor..." : "✦ AI ile Isimlendir"}
        </button>
      )}
      {oneri && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, padding: "6px 10px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>✦ {oneri.ad}</div>
            <div style={{ fontSize: 9, color: "#7a6f5a", marginTop: 2 }}>Kategori: {kategoriLabel}</div>
          </div>
          <button onClick={() => { onResult(oneri.ad, oneri.kategori); setOneri(null); }} style={{ background: "rgba(106,191,105,0.15)", border: "none", borderRadius: 6, padding: "3px 10px", color: "#6abf69", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Kullan</button>
          <button onClick={() => { setOneri(null); analiz(); }} style={{ background: "rgba(201,168,76,0.1)", border: "none", borderRadius: 6, padding: "3px 8px", color: GOLD, fontSize: 10, cursor: "pointer" }}>Tekrar</button>
          <button onClick={() => setOneri(null)} style={{ background: "none", border: "none", color: "#665d4a", fontSize: 12, cursor: "pointer" }}>X</button>
        </div>
      )}
      {hata && <div style={{ fontSize: 9, color: "#e85a4f", marginTop: 3 }}>{hata}</div>}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(170deg,#1c1a15,#15130f)", border: "1px solid rgba(201,168,76,0.14)", borderRadius: 18, padding: "22px 26px", width: "min(580px,94vw)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#e8dcc8" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "rgba(201,168,76,0.08)", border: "none", color: "#998a6e", width: 30, height: 30, borderRadius: 8, cursor: "pointer" }}>X</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Fl({ label, req, children, hint }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: "#8a7d64", marginBottom: 4, letterSpacing: ".06em", textTransform: "uppercase" }}>
        {label}{req && <span style={{ color: GOLD }}> *</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 8, color: "#665d4a", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function OnizlemeBox({ m, altinKgUSD, mc }) {
  if (!altinKgUSD || !m.gram) return null;
  const pv = hesapla(m, m.refAyar, altinKgUSD, mc);
  const hasGramUSD = altinKgUSD / 1000;
  const rows = [
    { l: "Uretim maliyeti (" + fN(pv.mamulGram) + "gr x " + mc + " mly)", v: fN(pv.maliyetHas, 4), c: "#e85a4f" },
    pv.ekMaliyetUSD > 0 && { l: "Ek maliyet (" + fUSD(pv.ekMaliyetUSD) + ")", v: fN(pv.ekMaliyetHas, 4), c: "#e85a4f" },
    { l: "--- Toplam Maliyet", v: fN(pv.topMaliyetHas, 4), c: "#e85a4f", bold: true },
    null,
    pv.tasHas > 0 && { l: "Tas has (" + fN(pv.mamulGram) + "gr x " + pv.ayarOran + ")", v: fN(pv.tasHas, 4), c: "#5b9bd5" },
    pv.iscilikHas > 0 && { l: "Iscilik (" + fN(pv.mamulGram) + "gr x " + fUSD(pv.iscilikDolarGr || m.iscilikDolar) + " / " + fUSD(hasGramUSD) + ")", v: fN(pv.iscilikHas, 4), c: "#e8833a" },
    { l: "--- Toplam Gelir", v: fN(pv.gelirHas, 4), c: "#6abf69", bold: true },
    null,
    { l: "NET KAR" + (pv.karUyari ? " ⚠" : ""), v: fN(pv.karMly||0, 3) + " mly/gr  (" + fN(pv.karHas, 4) + " has)", c: pv.karUyari ? "#e85a4f" : "#6abf69", bold: true, big: true },
  ].filter(Boolean);

  return (
    <div style={{ background: pv.karUyari ? "rgba(232,90,79,0.05)" : "rgba(201,168,76,0.04)", border: "1px solid " + (pv.karUyari ? "rgba(232,90,79,0.2)" : "rgba(201,168,76,0.1)"), borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
      <div style={{ fontSize: 8, color: GOLD, fontWeight: 700, marginBottom: 8, letterSpacing: ".05em" }}>HESAP (has gram cinsinden)</div>
      {rows.map((r, i) => r === null ? (
        <div key={i} style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
      ) : (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
          <span style={{ fontSize: r.big ? 10 : 8, color: r.c || "#998a6e", fontWeight: r.bold ? 700 : 400 }}>{r.l}</span>
          <span style={{ fontSize: r.big ? 12 : 9, color: r.c || "#e8dcc8", fontWeight: r.bold ? 800 : 600 }}>{r.v} has</span>
        </div>
      ))}
    </div>
  );
}

function GirisEkrani({ onGiris }) {
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState(false);
  const kontrol = () => {
    const aktifSifre = localStorage.getItem("atolye_sifre") || "19671967*Mm";
    if (sifre === aktifSifre) { onGiris(); }
    else setHata(true);
  };
  return (
    <div style={{ minHeight:"100vh", background:"#110f0a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',Arial,sans-serif" }}>
      <div style={{ background:"rgba(201,168,76,0.04)", border:"1px solid rgba(201,168,76,0.15)", borderRadius:16, padding:"40px 48px", textAlign:"center", maxWidth:360, width:"90%" }}>
        <div style={{ fontSize:28, marginBottom:8 }}>💎</div>
        <div style={{ fontSize:18, fontWeight:700, color:"#c9a84c", marginBottom:4 }}>Atölye Koleksiyon</div>
        <div style={{ fontSize:11, color:"#665d4a", marginBottom:28 }}>Sisteme giriş yapın</div>
        <input type="password" value={sifre} onChange={e=>{ setSifre(e.target.value); setHata(false); }}
          onKeyDown={e=>e.key==="Enter"&&kontrol()}
          placeholder="Şifre" autoFocus
          style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:"1px solid "+(hata?"#e85a4f":"rgba(201,168,76,0.2)"), borderRadius:8, padding:"10px 14px", color:"#e8dcc8", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:8 }}/>
        {hata && <div style={{ color:"#e85a4f", fontSize:11, marginBottom:8 }}>Şifre yanlış</div>}
        <button onClick={kontrol} style={{ width:"100%", background:"rgba(201,168,76,0.15)", border:"1px solid rgba(201,168,76,0.3)", borderRadius:8, padding:"10px", color:"#c9a84c", fontSize:14, fontWeight:700, cursor:"pointer" }}>Giriş Yap</button>
      </div>
    </div>
  );
}

function SifreDegistir() {
  const IS2 = { background:"rgba(0,0,0,0.25)", border:"1px solid rgba(201,168,76,0.15)", borderRadius:7, padding:"7px 10px", color:"#e8dcc8", fontSize:11, outline:"none", width:"100%" };
  const [eskiSifre,  setEskiSifre]  = useState("");
  const [yeniSifre,  setYeniSifre]  = useState("");
  const [yeniSifre2, setYeniSifre2] = useState("");
  const [mesaj,      setMesaj]      = useState(null);
  const kaydet = () => {
    const aktif = localStorage.getItem("atolye_sifre") || "19671967*Mm";
    if (eskiSifre !== aktif) { setMesaj({ok:false,txt:"Mevcut şifre yanlış!"}); return; }
    if (yeniSifre.length < 6) { setMesaj({ok:false,txt:"En az 6 karakter olmalı!"}); return; }
    if (yeniSifre !== yeniSifre2) { setMesaj({ok:false,txt:"Şifreler eşleşmiyor!"}); return; }
    localStorage.setItem("atolye_sifre", yeniSifre);
    setEskiSifre(""); setYeniSifre(""); setYeniSifre2("");
    setMesaj({ok:true,txt:"Şifre değiştirildi!"});
    setTimeout(()=>setMesaj(null), 3000);
  };
  return (
    <div style={{ background:"rgba(232,90,79,0.03)", border:"1px solid rgba(232,90,79,0.1)", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
      <div style={{ fontSize:10, fontWeight:700, color:"#e85a4f", marginBottom:12 }}>🔒 ŞİFRE DEĞİŞTİR</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, maxWidth:320 }}>
        <input type="password" value={eskiSifre}  onChange={e=>setEskiSifre(e.target.value)}  placeholder="Mevcut şifre"      style={IS2}/>
        <input type="password" value={yeniSifre}  onChange={e=>setYeniSifre(e.target.value)}  placeholder="Yeni şifre"         style={IS2}/>
        <input type="password" value={yeniSifre2} onChange={e=>setYeniSifre2(e.target.value)} placeholder="Yeni şifre (tekrar)" style={IS2}/>
        {mesaj && <div style={{ fontSize:9, color:mesaj.ok?"#6abf69":"#e85a4f", fontWeight:700 }}>{mesaj.txt}</div>}
        <button onClick={kaydet} style={{ background:"rgba(201,168,76,0.12)", border:"1px solid rgba(201,168,76,0.25)", borderRadius:7, padding:"7px 14px", color:"#c9a84c", fontSize:10, fontWeight:700, cursor:"pointer" }}>Şifreyi Değiştir</button>
      </div>
    </div>
  );
}

export default function Root() {
  const [giris, setGiris] = useState(false);
  if (!giris) return <GirisEkrani onGiris={()=>setGiris(true)} />;
  return <Atolye />;
}

function Atolye() {
  const [tema, setTema] = useState(() => {
    try { const t = localStorage.getItem("atolye_tema"); return TEMALAR[t] || TEMALAR.altin; } catch { return TEMALAR.altin; }
  });
  const T = tema; // kısa erişim
  const temaUygula = (t) => {
    setTema(t);
    try { localStorage.setItem("atolye_tema", t.id); } catch {}
  };

  const [kollar,    setKollar]    = useState([]);
  const [modeller,  setModeller]  = useState([]);
  const [siparisler,setSiparisler]= useState([]);
  const [musteriler, setMusteriler] = useState({}); // { "Ahmet": "MUS-001", ... }
  const [loaded,    setLoaded]    = useState(false);

  // Kur: kg USD fiyatı
  const [altinKg, setAltinKg]   = useState("");
  const [mc,      setMc]         = useState("0.030");

  const [sayfa,     setSayfa]     = useState("koleksiyonlar");
  const [aktifKol,  setAktifKol]  = useState(null);
  const [filtre,    setFiltre]    = useState("all");
  const [sirala,    setSirala]    = useState("varsayilan");
  const [etiketF,    setEtiketF]    = useState("");
  const [kategoriF,  setKategoriF]  = useState("");
  const [arama,     setArama]     = useState("");

  const [showKM,  setShowKM]  = useState(false);
  const [showMM,  setShowMM]  = useState(false);
  const [showYedek, setShowYedek] = useState(false);
  const [katalogSiralaModal, setKatalogSiralaModal] = useState(false);
  const [katalogSiraliModeller, setKatalogSiraliModeller] = useState([]);
  const [katalogSutun, setKatalogSutun] = useState(3);
  const [katalogKol, setKatalogKol] = useState(null);
  const [katalogAyar, setKatalogAyar] = useState("14K");
  const [yedekJson, setYedekJson] = useState("");
  const [driveYukleniyor, setDriveYukleniyor] = useState(null);
  const [hurdaModal, setHurdaModal] = useState(null); // {sipId, kalemId, kalemAd, maxAdet, mevcAdet}
  const HURDA_NEDENLER = ["İade","Çizim Hatası","Döküm Hatası","Atölyede Üretim Hatası","Taş Düşmesi","Müşteri Değişikliği","Diğer"];

  // Ayarlar
  const [ayarEtiketler, setAyarEtiketler] = useState([]); // global etiket listesi
  const [ayarKategoriler, setAyarKategoriler] = useState(["yuzuk","kolye","kupe","bilezik","bileklik","pendant","set","diger"]);
  const [ayarYeniEtiket, setAyarYeniEtiket] = useState("");
  const [ayarYeniKategori, setAyarYeniKategori] = useState("");
  const [ayarVarsAltinKg, setAyarVarsAltinKg] = useState("");
  const [ayarVarsMc, setAyarVarsMc] = useState("");
  const [ayarVarsIscilik, setAyarVarsIscilik] = useState("");
  const [ayarVarsIscilikBirim, setAyarVarsIscilikBirim] = useState("dolar");
  // Özel taş state
  const [ozelTaslar, setOzelTaslar] = useState([]); // [{sekil, boyut, gramPerAdet}]
  const [ozelTasSekil, setOzelTasSekil] = useState("ROUND");
  const [ozelTasBoyut, setOzelTasBoyut] = useState("");
  const [ozelTasGram, setOzelTasGram] = useState("");
  const [ozelTasOzelIsim, setOzelTasOzelIsim] = useState("");
  const [editK,   setEditK]   = useState(null);
  const [editM,   setEditM]   = useState(null);
  const [delOnay, setDelOnay] = useState(null);
  const [kopyalaModal, setKopyalaModal] = useState(null); // {model, hedefKolId}
  const [seciliModeller, setSeciliModeller] = useState(new Set()); // seçili model id'leri
  const [topluKopyalaModal, setTopluKopyalaModal] = useState(false);
  const [topluHedefKolId, setTopluHedefKolId] = useState("");

  const [konfList,    setKonfList]    = useState([]);
  const [konfMus,        setKonfMus]        = useState("");
  const [konfTeslim,     setKonfTeslim]     = useState("");
  const [acikSiparisler, setAcikSiparisler] = useState({});
  const [sipMusF,  setSipMusF]  = useState("");
  const [sipTarih1,setSipTarih1]= useState("");
  const [sipTarih2,setSipTarih2]= useState("");
  const [analizMusF,  setAnalizMusF]  = useState("");
  const [analizTarih1,setAnalizTarih1]= useState("");
  const [analizTarih2,setAnalizTarih2]= useState("");
  const [analizDonem, setAnalizDonem] = useState("bu_ay"); // bu_ay, gecen_ay, 3ay, 6ay, yil, ozel
  const [editMusteri, setEditMusteri] = useState(null); // {ad, kod} düzenleme
  const [konfAyarlar, setKonfAyarlar] = useState({});
  const [konfBoylar,  setKonfBoylar]  = useState({}); // id -> [{sistem, deger, adet}]
  const [konfGenelBoy, setKonfGenelBoy] = useState({ aktif: false, sistem: "US", deger: "" }); // genel boy
  const [kayitliNotlar, setKayitliNotlar] = useState([]); // kayıtlı not şablonları
  const [yeniNotSablon, setYeniNotSablon] = useState("");
  const [konfAyar,    setKonfAyar]    = useState("14K");  // tek global ayar
  const [konfRenkler, setKonfRenkler] = useState({});     // per-item renk
  const [konfAdet,    setKonfAdet]    = useState({});  // id -> adet
  const [konfNot,     setKonfNot]     = useState({});  // id -> not

  // Kol form
  const [fkAd, setFkAd] = useState("");
  const [fkAc, setFkAc] = useState("");
  const [fkOn, setFkOn] = useState("");

  // Model form
  const [fAd,          setFAd]         = useState("");
  const [fKod,         setFKod]        = useState("");
  const [fGram,        setFGram]       = useState("");
  const [fRefAyar,     setFRefAyar]    = useState("14K");
  const [fTasGram,     setFTasGram]    = useState("");
  const [fTasBoy,      setFTasBoy]     = useState("");
  const [fTaslar,      setFTaslar]     = useState([]); // [{sekil,tur,boyut,adet,gram}]
  const [fTasSekil,    setFTasSekil]   = useState("ROUND");
  const [fTasTur,      setFTasTur]     = useState("N");
  const [fTasBoyut,    setFTasBoyut]   = useState("");
  const [fTasAdet,     setFTasAdet]    = useState("");
  const [fTasOzelIsim, setFTasOzelIsim]= useState(""); // DİĞER seçilince özel isim
  const [fMadenC,      setFMadenC]     = useState("");
  const [fIscilikDolar,setFIscilikDolar] = useState("");
  const [fIscilikBirim,setFIscilikBirim] = useState("dolar");
  const [fEkMaliyet,   setFEkMaliyet]  = useState("");
  const [fKategori,    setFKategori]   = useState("yuzuk");
  const [fAc,          setFAc]         = useState("");
  const [fFoto,        setFFoto]       = useState("");
  const [fKolId,       setFKolId]      = useState("");
  const [fDurum,       setFDurum]      = useState("baslanmadi");
  const [fEtiketler,   setFEtiketler]  = useState([]);
  const [fYeniEtiket,  setFYeniEtiket] = useState("");
  const fileRef = useRef(null);

  const altinKgUSD  = Number(altinKg) || 0;
  const madenCarpan = Number(mc) || 0.25;

  useEffect(() => { (async () => {
    // Tüm eski key versiyonlarını dene
    const tryKeys = async (keys, def) => {
      for (const key of keys) {
        const r = await ld(key, null);
        if (r && r.length > 0) return r;
      }
      return def;
    };
    const tryKeysObj = async (keys, def) => {
      for (const key of keys) {
        const r = await ld(key, null);
        if (r && Object.keys(r).length > 0) return r;
      }
      return def;
    };

    const k = await tryKeys(["v7k", "v5k", "atl5-k"], []);
    // Modelleri yükle — supabase.js chunk sistemi otomatik halleder
    const m = await ld("v7m", []);
    const s = await tryKeys(["v7s", "v5s", "atl5-s"], []);
    const c = await tryKeysObj(["v7c", "v5c", "atl5-c"], {});
    const u = await tryKeys(["v7u"], {}) || {};

    // Bulduklarımızı v7 key'lerine kaydet (shared)
    if (k.length > 0) await sv("v7k", k);
    if (s.length > 0) await sv("v7s", s);

    const ay = await ld("v7ay", {});
    setKollar(k); setModeller(m); setSiparisler(s); setMusteriler(u);
    setAltinKg(c.a || ""); setMc(c.mc || "0.030");
    if (ay.kategoriler?.length) setAyarKategoriler(ay.kategoriler);
    if (ay.etiketler?.length) setAyarEtiketler(ay.etiketler);
    if (ay.varsAltinKg) setAyarVarsAltinKg(ay.varsAltinKg);
    if (ay.kayitliNotlar?.length) setKayitliNotlar(ay.kayitliNotlar);
    if (ay.ozelTaslar?.length) setOzelTaslar(ay.ozelTaslar);
    if (ay.varsMc) setAyarVarsMc(ay.varsMc);
    if (ay.varsIscilik) setAyarVarsIscilik(ay.varsIscilik);
    if (ay.varsIscilikBirim) setAyarVarsIscilikBirim(ay.varsIscilikBirim);
    setLoaded(true);
  })(); }, []);

  const svK = useCallback(async d => { setKollar(d);    await sv("v7k", d); }, []);
  // Fotoğraf sıkıştırma — kaliteyi koruyarak boyutu küçültür
  const fotoSikistir = (base64, maxW=800, quality=0.70) => new Promise(resolve => {
    if (!base64 || !base64.startsWith('data:image')) { resolve(base64); return; }
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxW/img.width, maxW/img.height, 1);
      const w = Math.round(img.width*ratio), h = Math.round(img.height*ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });

  const svM = useCallback(async d => {
    // DUPLICATE TEMİZLEME — aynı kod/ID varsa son eklenen kazanır
    const idMap = new Map();
    const kodMap = new Map();
    const temiz = [];
    for (let i = d.length - 1; i >= 0; i--) {
      const m = d[i];
      if (!m) continue;
      const kodKey = m.kod ? m.kod.trim().toUpperCase() : null;
      const idKey = m.id;
      if (kodKey && kodMap.has(kodKey)) continue;
      if (idKey && idMap.has(idKey)) continue;
      if (kodKey) kodMap.set(kodKey, true);
      if (idKey) idMap.set(idKey, true);
      temiz.unshift(m);
    }
    if (temiz.length !== d.length) {
      console.log("🧹 " + (d.length - temiz.length) + " duplicate temizlendi");
    }
    setModeller(temiz);
    await sv("v7m", temiz);
  }, []);
  const svS = useCallback(async d => { setSiparisler(d); await sv("v7s", d); }, []);

  // Sipariş durum geçmişini güncelle
  const sipDurumKaydet = useCallback((sipId, yeniDurum) => {
    setSiparisler(prev => {
      const yeni = prev.map(sp => {
        if (sp.id !== sipId) return sp;
        const gecmis = sp.durumGecmisi || [];
        const sonGecmis = gecmis[gecmis.length - 1];
        if (sonGecmis && sonGecmis.durum === yeniDurum) return sp; // aynı durum
        return { ...sp, durumGecmisi: [...gecmis, { durum: yeniDurum, tarih: Date.now() }] };
      });
      sv("v7s", yeni);
      return yeni;
    });
  }, []);
  const svMus = useCallback(async d => { setMusteriler(d); await sv("v7u", d); }, []);
  useEffect(() => { if (loaded) sv("v7c", { a: altinKg, mc }); }, [altinKg, mc, loaded]);

  const kodToKol = useCallback(kod => {
    if (!kod) return null;
    const p = kod.split("-")[0];
    return p ? kollar.find(k => k.on && k.on.toUpperCase() === p.toUpperCase()) || null : null;
  }, [kollar]);

  const rkf = () => { setFkAd(""); setFkAc(""); setFkOn(""); };
  const rmf = () => { setFAd(""); setFKod(""); setFGram(""); setFRefAyar("14K"); setFTasGram(""); setFTasBoy(""); setFTaslar([]); setFTasSekil("ROUND"); setFTasTur("N"); setFTasBoyut(""); setFTasAdet(""); setFTasOzelIsim(""); setFMadenC(""); setFIscilikDolar(""); setFIscilikBirim("dolar"); setFEkMaliyet(""); setFKategori("yuzuk"); setFAc(""); setFFoto(""); setFKolId(""); setFDurum("baslanmadi"); setFEtiketler([]); setFYeniEtiket(""); };

  const saveKol = () => {
    if (!fkAd.trim()) return;
    const obj = { ad: fkAd.trim(), ac: fkAc.trim(), on: fkOn.trim().toUpperCase() };
    if (editK) svK(kollar.map(k => k.id === editK.id ? { ...k, ...obj } : k));
    else svK([...kollar, { id: uid(), ...obj, t: Date.now() }]);
    setShowKM(false); rkf(); setEditK(null);
  };

  const delKol = id => {
    svK(kollar.filter(k => k.id !== id));
    svM(modeller.map(m => m.ki === id ? { ...m, ki: "" } : m));
    if (aktifKol && aktifKol.id === id) { setAktifKol(null); setSayfa("koleksiyonlar"); }
    setDelOnay(null);
  };

  const saveModel = () => {
    if (!fAd.trim()) return;
    // Taş listesinden toplam gram hesapla
    const toplamTasGram = fTaslar.reduce((acc, t) => {
      const gr = tasGramHesapla(t.sekil, t.tur, isNaN(Number(t.boyut)) ? t.boyut : Number(t.boyut), Number(t.adet)||1, ozelTaslar);
      const hesap = tasGramHesapla(t.sekil, t.tur, isNaN(Number(t.boyut)) ? t.boyut : Number(t.boyut), Number(t.adet)||1, ozelTaslar);
      // Tabloda varsa hesaplanan, yoksa satıra girilen manuel gram
      return acc + (hesap > 0 ? hesap : (Number(t.gram)||0));
    }, 0);
    // Liste varsa listeden al (manuel dahil), liste boşsa fTasGram'a bak
    const hesaplananTasGram = fTaslar.length > 0 && toplamTasGram > 0
      ? toplamTasGram
      : (Number(fTasGram)||0);
    const obj = { ad: fAd.trim(), kod: fKod.trim().toUpperCase(), kategori: fKategori, gram: Number(fGram)||0, refAyar: fRefAyar, tasGram: hesaplananTasGram, taslar: fTaslar, tasBoy: fTasBoy.trim(), tasSekil: fTasSekil, tasTur: fTasTur, tasBoyut: fTasBoyut, tasAdet: Number(fTasAdet)||0, madenCarpan: Number(fMadenC)||0, iscilikDolar: Number(fIscilikDolar)||0, iscilikBirim: fIscilikBirim, ekMaliyet: Number(fEkMaliyet)||0, ac: fAc.trim(), foto: fFoto, ki: fKolId, durum: fDurum, etiketler: fEtiketler };
    if (editM) svM(modeller.map(m => m.id === editM.id ? { ...m, ...obj } : m));
    else svM([...modeller, { id: uid(), ...obj, t: Date.now() }]);
    setShowMM(false); rmf(); setEditM(null);
  };

  const delMod = id => { svM(modeller.filter(m => m.id !== id)); setDelOnay(null); };
  const delSip = id => {
    const sip = siparisler.find(s => s.id === id);
    if (sip) {
      svM(modeller.map(m => {
        const kalem = (sip.kalemler||[]).find(k => k.id === m.id);
        if (kalem) return { ...m, satisSayisi: Math.max(0, (m.satisSayisi||0) - (kalem.adet||1)) };
        return m;
      }));
    }
    svS(siparisler.filter(s => s.id !== id));
    setDelOnay(null);
  };

  const openEK = k => { setFkAd(k.ad); setFkAc(k.ac||""); setFkOn(k.on||""); setEditK(k); setShowKM(true); };
  const openEM = m => {
    setFAd(m.ad); setFKod(m.kod||""); setFGram(String(m.gram||"")); setFRefAyar(m.refAyar||"14K");
    setFTasGram(String(m.tasGram||"")); setFTasBoy(m.tasBoy||""); setFTaslar(m.taslar||[]); setFTasSekil(m.tasSekil||"ROUND"); setFTasTur(m.tasTur||"N"); setFTasBoyut(m.tasBoyut||""); setFTasAdet(String(m.tasAdet||"")); setFMadenC(String(m.madenCarpan||""));
    setFIscilikDolar(String(m.iscilikDolar||"")); setFIscilikBirim(m.iscilikBirim||"dolar"); setFEkMaliyet(String(m.ekMaliyet||""));
    setFAc(m.ac||""); setFFoto(m.foto||""); setFKolId(m.ki||""); setFDurum(m.durum||"baslanmadi");
    setFKategori(m.kategori||"yuzuk"); setFEtiketler(m.etiketler||[]); setEditM(m); setShowMM(true);
  };

  const handleFoto = async e => { const f = e.target.files && e.target.files[0]; if (!f) return; setFFoto(await resizeImg(f)); };
  const handleKod  = v => {
    setFKod(v);
    const es = kodToKol(v);
    if (es) setFKolId(es.id);
  };

  // Kod kontrol: tekrar var mı, ana model var mı, versiyon önerileri
  const kodKontrol = useMemo(() => {
    if (!fKod.trim()) return null;
    const kod = fKod.trim().toUpperCase();
    const eslesme = modeller.find(m => m.kod === kod && m.id !== (editM?.id));
    if (eslesme) {
      // Versiyon önerileri: -R, -B, -Y, -2, -3
      const versiyonlar = ["-R","-B","-Y","-2","-3","-V2","-V3"].map(s => kod+s).filter(v => !modeller.find(m => m.kod===v));
      // Ana model bilgileri
      return { tip:"tekrar", eslesme, versiyonlar };
    }
    // Suffix varsa ana modeli bul
    const suffiksSiz = kod.replace(/[-_](R|B|Y|V?\d+)$/i, "");
    if (suffiksSiz !== kod) {
      const anaModel = modeller.find(m => m.kod === suffiksSiz && m.id !== (editM?.id));
      if (anaModel) return { tip:"versiyon", anaModel };
    }
    return null;
  }, [fKod, modeller, editM]);
  const addEtiket  = () => { const e = fYeniEtiket.trim().toLowerCase(); if (!e || fEtiketler.includes(e)) return; setFEtiketler([...fEtiketler, e]); setFYeniEtiket(""); };

  const tumEtiketler = useMemo(() => { const s = new Set(); modeller.forEach(m => (m.etiketler||[]).forEach(e => s.add(e))); return [...s].sort(); }, [modeller]);
  const aktMod = useMemo(() => aktifKol ? modeller.filter(m => m.ki === aktifKol.id) : modeller, [modeller, aktifKol]);
  const gorunen = useMemo(() => {
    let r = aktMod;
    if (filtre !== "all") r = r.filter(m => (m.durum||"baslanmadi") === filtre);
    if (etiketF) r = r.filter(m => (m.etiketler||[]).includes(etiketF));
    if (kategoriF) r = r.filter(m => (m.kategori||"") === kategoriF);
    if (arama.trim()) { const q = arama.toLowerCase(); r = r.filter(m => (m.ad||"").toLowerCase().includes(q) || (m.kod||"").toLowerCase().includes(q) || (m.etiketler||[]).some(e => e.includes(q))); }
    const kodSirala = (a,b) => {
      const ka=a.kod||"", kb=b.kod||"";
      // "ALT79", "ALT80", "ALT80-A", "ALT100" → ["ALT", 79, ""], ["ALT", 80, ""], ["ALT", 80, "-A"], ["ALT", 100, ""]
      const ma=ka.match(/^([A-Za-zÇĞİÖŞÜçğışöşü\-]*)(\d+)(.*)$/);
      const mb=kb.match(/^([A-Za-zÇĞİÖŞÜçğışöşü\-]*)(\d+)(.*)$/);
      if (ma && mb) {
        // Önce prefix karşılaştır
        const prefCmp = ma[1].localeCompare(mb[1],"tr");
        if (prefCmp !== 0) return prefCmp;
        // Sonra ana sayı
        const numCmp = Number(ma[2]) - Number(mb[2]);
        if (numCmp !== 0) return numCmp;
        // Sayı aynıysa suffix (ALT80 < ALT80-A < ALT80-B)
        return ma[3].localeCompare(mb[3],"tr");
      }
      return ka.localeCompare(kb,"tr");
    };
    if (sirala==="kar_desc" && altinKgUSD>0) r=[...r].sort((a,b)=>{ const ha=hesapla(a,a.refAyar,altinKgUSD,madenCarpan),hb=hesapla(b,b.refAyar,altinKgUSD,madenCarpan); return hb.karHas-ha.karHas; });
    else if (sirala==="kar_asc" && altinKgUSD>0) r=[...r].sort((a,b)=>{ const ha=hesapla(a,a.refAyar,altinKgUSD,madenCarpan),hb=hesapla(b,b.refAyar,altinKgUSD,madenCarpan); return ha.karHas-hb.karHas; });
    else if (sirala==="gram_asc") r=[...r].sort((a,b)=>(Number(a.gram)||0)-(Number(b.gram)||0));
    else if (sirala==="gram_desc") r=[...r].sort((a,b)=>(Number(b.gram)||0)-(Number(a.gram)||0));
    else if (sirala==="cok_satilan") r=[...r].sort((a,b)=>(b.satisSayisi||0)-(a.satisSayisi||0));
    else r=[...r].sort(kodSirala); // varsayilan ve kod — her ikisi de sayısal kod sırası
    return r;
  }, [aktMod, filtre, etiketF, kategoriF, arama, sirala, altinKgUSD, madenCarpan]);

  const togKonf     = m => setKonfList(p => p.find(x => x.id === m.id) ? p.filter(x => x.id !== m.id) : [...p, m]);
  const konfAyarSec  = (id, ayar) => setKonfAyarlar(p => ({ ...p, [id]: ayar }));
  const konfRenkSec  = (id, renk) => setKonfRenkler(p => ({ ...p, [id]: renk }));
  const konfAdetSec  = (id, val) => setKonfAdet(p => ({ ...p, [id]: Math.max(1, Number(val)||1) }));
  const konfNotSec   = (id, val) => setKonfNot(p => ({ ...p, [id]: val }));
  const konfBoySet   = (id, val) => setKonfBoylar(p => ({ ...p, [id]: val }));
  const konfBoyEkle  = (id, kategori) => {
    let def;
    if (kategori==="yuzuk") def = { sistem:"US", deger:"", adet:1 };
    else if (kategori==="kolye" || kategori==="bileklik") def = { uzunluk:"", birim:"cm", gram:"", adet:1 };
    else def = { sistem:"mm (iç çap)", deger:"", adet:1 };
    setKonfBoylar(p => ({ ...p, [id]: [...(p[id]||[]), def] }));
  };
  const konfBoySil   = (id, idx) => setKonfBoylar(p => ({ ...p, [id]: (p[id]||[]).filter((_,i)=>i!==idx) }));
  const konfBoyGuncelle = (id, idx, alan, deger) => setKonfBoylar(p => ({
    ...p, [id]: (p[id]||[]).map((b,i) => i===idx ? {...b, [alan]:deger} : b)
  }));
  const konfKalemler = useMemo(() => {
    const satirlar = [];
    konfList.forEach(m => {
      const boylar = konfBoylar[m.id] || [];
      const genelBoyAktif = konfGenelBoy.aktif && konfGenelBoy.deger;
      const temel = { ...m, secilenAyar: konfAyar, renk: konfRenkler[m.id]||"Sari", sipNot: konfNot[m.id]||"" };
      
      // Kolye ve bileklik: tek satır, boyListesi içeride
      if ((m.kategori==="kolye" || m.kategori==="bileklik") && boylar.length > 0) {
        const topAdet = boylar.reduce((s,b)=>s+(Number(b.adet)||1),0);
        const topGram = boylar.reduce((s,b)=>s+(Number(b.gram)||Number(m.gram)||0)*(Number(b.adet)||1),0);
        // Ortalama gram (toplam/adet)
        const ortGram = topAdet > 0 ? topGram/topAdet : (Number(m.gram)||0);
        satirlar.push({ ...temel, adet: topAdet, boyListesi: boylar, gram: ortGram, boy: null });
      }
      // Yüzük: her boy için ayrı satır (mevcut davranış)
      else if (boylar.length > 0) {
        boylar.forEach((b, bi) => satirlar.push({ ...temel, adet: b.adet||1, boy: b, _boyIdx: bi }));
      } else if (genelBoyAktif) {
        satirlar.push({ ...temel, adet: konfAdet[m.id]||1, boy: konfGenelBoy });
      } else {
        satirlar.push({ ...temel, adet: konfAdet[m.id]||1, boy: null });
      }
    });
    return satirlar;
  }, [konfList, konfAyar, konfRenkler, konfAdet, konfNot, konfBoylar, konfGenelBoy]);

  const kTop = useMemo(() => {
    let gelir = 0, maliyet = 0, topGram = 0;
    konfKalemler.forEach(m => { const h = hesapla(m, m.secilenAyar, altinKgUSD, madenCarpan); const adet = m.adet||1; gelir += h.gelirHas * adet; maliyet += h.topMaliyetHas * adet; topGram += h.mamulGram * adet; });
    return { gelir, maliyet, kar: gelir - maliyet, topGram };
  }, [konfKalemler, altinKgUSD, madenCarpan]);

  const konfKaydet = () => {
    if (konfKalemler.length === 0) return;
    const musAd = konfMus.trim() || "Isimsiz";
    let yeniMusteriler = { ...musteriler };
    if (!yeniMusteriler[musAd]) {
      const no = String(Object.keys(yeniMusteriler).length + 1).padStart(3, "0");
      yeniMusteriler[musAd] = "MUS-" + no;
      svMus(yeniMusteriler);
    }
    const musKod = yeniMusteriler[musAd];
    const yeni = { id: uid(), musteri: musAd, musKod, tarih: Date.now(), teslimTarihi: konfTeslim||"", altinKgUSD, mc: madenCarpan, kalemler: konfKalemler, gelir: kTop.gelir, maliyet: kTop.maliyet, kar: kTop.kar };
    svS([...siparisler, yeni]);
    svM(modeller.map(m => { const k = konfKalemler.find(x => x.id === m.id); return k ? { ...m, satisSayisi: (m.satisSayisi||0)+1 } : m; }));
    setKonfList([]); setKonfAyarlar({}); setKonfRenkler({}); setKonfAdet({}); setKonfNot({}); setKonfMus(""); setKonfTeslim(""); setKonfAyar("14K");
    alert("Siparis kaydedildi!");
  };

  const analiz = useMemo(() => {
    const mSatis = {}, kSatis = {}, aSatis = {}, musteriSatis = {}, hurdaSatis = {};
    let tGelir = 0, tKar = 0;
    // Dönem hesapla
    const simdi = new Date();
    const donemBaslangic = (() => {
      if (analizDonem === "bu_ay") return new Date(simdi.getFullYear(), simdi.getMonth(), 1).getTime();
      if (analizDonem === "gecen_ay") return new Date(simdi.getFullYear(), simdi.getMonth()-1, 1).getTime();
      if (analizDonem === "3ay") return new Date(simdi.getFullYear(), simdi.getMonth()-2, 1).getTime();
      if (analizDonem === "6ay") return new Date(simdi.getFullYear(), simdi.getMonth()-5, 1).getTime();
      if (analizDonem === "yil") return new Date(simdi.getFullYear(), 0, 1).getTime();
      return analizTarih1 ? new Date(analizTarih1).getTime() : 0;
    })();
    const donemBitis = (() => {
      if (analizDonem === "gecen_ay") return new Date(simdi.getFullYear(), simdi.getMonth(), 0, 23, 59, 59).getTime();
      if (analizDonem === "ozel") return analizTarih2 ? new Date(analizTarih2).getTime()+86399999 : Date.now();
      return Date.now();
    })();

    const filtreli = siparisler.filter(s => {
      if (analizMusF) { const q = analizMusF.toLowerCase(); if (!(s.musteri||"").toLowerCase().includes(q) && !(s.musKod||"").toLowerCase().includes(q)) return false; }
      if (analizDonem !== "ozel") {
        if (s.tarih < donemBaslangic) return false;
        if (s.tarih > donemBitis) return false;
      } else {
        if (analizTarih1 && s.tarih < new Date(analizTarih1).getTime()) return false;
        if (analizTarih2 && s.tarih > new Date(analizTarih2).getTime()+86399999) return false;
      }
      return true;
    });
    filtreli.forEach(s => {
      const mus = (s.musteri||"Isimsiz").trim();
      if (!musteriSatis[mus]) musteriSatis[mus] = { ad:mus, siparisSayisi:0, kalemSayisi:0, topGram:0, topKar:0, sonTarih:0 };
      musteriSatis[mus].siparisSayisi++;
      musteriSatis[mus].sonTarih = Math.max(musteriSatis[mus].sonTarih, s.tarih||0);
      let sipTamamKar = 0;
      (s.kalemler||[]).forEach(k => {
        musteriSatis[mus].kalemSayisi += k.adet||1;
        const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD, s.mc);
        const kDurum = (s.kalemDurumlar||{})[k.id] || k.durum || "baslanmadi";
        const hurdaAdet = ((s.kalemHurda)||{})[k.id] || 0;
        const tamamAdet = (k.adet||1) - hurdaAdet;
        // Sadece tamamlanan veya teslim edilenler analize girer
        const sayilsin = ["tamam","teslim"].includes(kDurum);
        musteriSatis[mus].kalemSayisi += sayilsin ? tamamAdet : hurdaAdet > 0 ? hurdaAdet : 0;
        musteriSatis[mus].topGram += sayilsin ? hc.mamulGram * tamamAdet : 0;
        if (hurdaAdet > 0) {
          const kid = k.id;
          if (!hurdaSatis[kid]) hurdaSatis[kid] = { ad: k.ad, kod: k.kod||"", sayi: 0, gram: 0 };
          hurdaSatis[kid].sayi += hurdaAdet;
          hurdaSatis[kid].gram += hc.mamulGram * hurdaAdet;
        }
        if (!mSatis[k.id]) mSatis[k.id] = { ad: k.ad, sayi: 0, adet: 0, kar: 0, topGram: 0, foto: k.foto||"" };
        if (kDurum !== "hurda" && tamamAdet > 0) {
          mSatis[k.id].sayi++;
          mSatis[k.id].adet += tamamAdet;
          mSatis[k.id].kar += hc.karHas * tamamAdet;
          mSatis[k.id].topGram += hc.mamulGram * tamamAdet;
        }
        if (sayilsin) sipTamamKar += hc.karHas * tamamAdet;
        const kol = kollar.find(c => c.id === k.ki);
        if (kol && kDurum !== "hurda") { if (!kSatis[kol.id]) kSatis[kol.id]={ ad: kol.ad, sayi:0, kar:0 }; kSatis[kol.id].sayi++; kSatis[kol.id].kar += hc.karHas * tamamAdet; }
        const ay = k.secilenAyar||k.refAyar||"?";
        if (!aSatis[ay]) aSatis[ay] = { sayi:0 }; if (kDurum !== "hurda") aSatis[ay].sayi++;
      });
      tGelir += sipTamamKar; tKar += sipTamamKar;
      musteriSatis[mus].topKar += sipTamamKar;
    });
    const topMusteriler = Object.entries(musteriSatis).sort((a,b)=>b[1].topKar-a[1].topKar);
    const topHurda = Object.entries(hurdaSatis).sort((a,b)=>b[1].sayi-a[1].sayi);
    // Aylık dağılım
    const aylikKar = {};
    filtreli.forEach(s => {
      const ay = new Date(s.tarih).toLocaleDateString("tr-TR", { year:"numeric", month:"short" });
      if (!aylikKar[ay]) aylikKar[ay] = { kar:0, gelir:0, siparis:0, gram:0 };
      aylikKar[ay].siparis++;
      (s.kalemler||[]).forEach(k => {
        const kDurum = (s.kalemDurumlar||{})[k.id] || k.durum || "baslanmadi";
        const sayilsin = ["tamam","teslim"].includes(kDurum);
        if (!sayilsin) return;
        const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD, s.mc);
        const hurdaAdet = ((s.kalemHurda)||{})[k.id] || 0;
        const netAdet = (k.adet||1) - hurdaAdet;
        aylikKar[ay].kar += hc.karHas * netAdet;
        aylikKar[ay].gram += hc.mamulGram * netAdet;
      });
    });

    return { tGelir, tKar, siparisSayisi: filtreli.length, topModeller: Object.entries(mSatis).sort((a,b)=>b[1].sayi-a[1].sayi).slice(0,10), topKollar: Object.entries(kSatis).sort((a,b)=>b[1].kar-a[1].kar).slice(0,5), topAyarlar: Object.entries(aSatis).sort((a,b)=>b[1].sayi-a[1].sayi), topMusteriler, topHurda, aylikKar };
  }, [siparisler, kollar, analizMusF, analizTarih1, analizTarih2]);

  if (!loaded) return <div style={{ minHeight:"100vh", background:DARK, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ color:GOLD, fontSize:16 }}>Yukleniyor...</div></div>;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"sans-serif" }}>
      <style>{"@keyframes fadein{from{opacity:0}to{opacity:1}}@keyframes cardin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(201,168,76,.15);border-radius:2px}select option{background:#1c1a15;color:#e8dcc8}"}</style>

      {/* HEADER */}
      <div style={{ padding:"14px 14px 10px", background:"rgba(201,168,76,0.04)", borderBottom:"1px solid rgba(201,168,76,0.07)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:10 }}>
            <h1 style={{ margin:0, fontSize:"clamp(13px,2vw,18px)", fontWeight:700, color:GOLD }}>Atolye Koleksiyon Sistemi</h1>
            <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
              {["koleksiyonlar","modeller","konfirmasyon","siparisler","musteriler","analiz","ayarlar"].map(n => (
                <button key={n} onClick={() => { setSayfa(n); if (n==="koleksiyonlar") setAktifKol(null); }}
                  style={{ ...GH, background:sayfa===n?"rgba(201,168,76,0.18)":"rgba(201,168,76,0.04)", borderColor:sayfa===n?"rgba(201,168,76,0.35)":"rgba(201,168,76,0.1)", fontSize:9, padding:"5px 9px", position:"relative" }}>
                  {n.charAt(0).toUpperCase()+n.slice(1)}
                  {n==="konfirmasyon" && konfList.length>0 && <span style={{ position:"absolute", top:-4, right:-4, background:GOLD, color:DARK, width:13, height:13, borderRadius:7, fontSize:7, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{konfList.length}</span>}
                </button>
              ))}
            </div>
          </div>
          {/* KUR */}
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", background:"rgba(201,168,76,0.04)", border:"1px solid rgba(201,168,76,0.1)", borderRadius:10, padding:"7px 12px" }}>
            <span style={{ fontSize:8, color:"#8a7d64", fontWeight:700 }}>ALTIN FIYATI:</span>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:8, color:"#998a6e" }}>$/kg</span>
              <input type="number" value={altinKg} onChange={e => setAltinKg(e.target.value)} placeholder="96000" style={{ ...IS, width:90, padding:"4px 7px", fontSize:12, textAlign:"center", fontWeight:700 }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:8, color:"#998a6e" }}>Uretim mly/gr</span>
              <input type="number" value={mc} onChange={e => setMc(e.target.value)} placeholder="0.25" style={{ ...IS, width:65, padding:"4px 7px", fontSize:12, textAlign:"center", fontWeight:700 }} />
            </div>
            {altinKgUSD > 0 && <span style={{ fontSize:8, color:"#6abf69", fontWeight:700 }}>1 has gr = {fUSD(altinKgUSD/1000)}</span>}
            <span style={{ fontSize:7, color:"#e85a4f", fontWeight:600 }}>Min karlılık: {MIN_MLY} mly/gr</span>
            <div style={{ marginLeft:"auto", display:"flex", gap:5, flexWrap:"wrap" }}>
              {/* PC'YE İNDİR */}
              <button onClick={async () => {
                setDriveYukleniyor("yedek");
                try {
                  const k = await ld("v7k", []);
                  // Modelleri state'den al — Supabase chunk sorununu önler
                  const m = modeller; 
                  const s = await ld("v7s", []);
                  const u = await ld("v7u", {});
                  const ay = {
                    kategoriler: ayarKategoriler,
                    etiketler: ayarEtiketler,
                    ozelTaslar: ozelTaslar,
                    kayitliNotlar: kayitliNotlar,
                  };
                  const data = { kollar:k, modeller:m, siparisler:s, musteriler:u, ayarlar:ay, v: Date.now() };
                  const json = JSON.stringify(data, null, 2);
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "atolye-yedek-" + new Date().toISOString().slice(0,10) + "-" + m.length + "model.json";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  alert("✓ Yedek alındı!\n" + m.length + " model\n" + k.length + " koleksiyon\n" + s.length + " sipariş");
                } catch(e) { alert("Indirme hatasi: " + e.message); }
                setDriveYukleniyor(null);
              }} style={{ background: driveYukleniyor==="yedek" ? "rgba(106,191,105,0.3)" : "rgba(106,191,105,0.1)", border:"1px solid rgba(106,191,105,0.2)", borderRadius:7, padding:"4px 10px", color:"#6abf69", fontSize:9, fontWeight:700, cursor:"pointer" }}>
                {driveYukleniyor==="yedek" ? "İndiriliyor..." : "💾 PC'ye İndir (" + modeller.length + " model · " + kollar.length + " kol · " + siparisler.length + " sip)"}
              </button>
              {/* DRIVE GERİ YÜKLEfixture */}
              <button onClick={() => { setYedekJson(""); setShowYedek(true); }} style={{ background:"rgba(91,155,213,0.1)", border:"1px solid rgba(91,155,213,0.2)", borderRadius:7, padding:"4px 10px", color:"#5b9bd5", fontSize:9, fontWeight:700, cursor:"pointer" }}>Geri Yukle</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"12px 12px 60px" }}>

        {/* KOLEKSİYONLAR */}
        {sayfa==="koleksiyonlar" && (
          <div style={{ animation:"fadein .3s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:"#e8dcc8" }}>Koleksiyonlar</h2>
              <button onClick={() => { rkf(); setEditK(null); setShowKM(true); }} style={BG}>+ Koleksiyon</button>
            </div>
            {kollar.length===0 && <p style={{ color:"#665d4a", textAlign:"center", padding:"40px" }}>Henuz koleksiyon yok</p>}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16 }}>
              {kollar.map((kol,i) => {
                const km = modeller.filter(m => m.ki===kol.id);
                const ft = km.filter(m => m.foto).slice(0,4);
                return (
                  <div key={kol.id} onClick={() => { setAktifKol(kol); setSayfa("modeller"); setFiltre("all"); setEtiketF(""); setArama(""); setSirala("varsayilan"); }}
                    style={{ background:"rgba(255,255,255,0.06)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, overflow:"hidden", cursor:"pointer", transition:"all .3s ease", animation:"cardin .4s ease "+(i*.05)+"s both", boxShadow:"0 2px 16px rgba(0,0,0,0.15)" }}
                    onMouseOver={e => { e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.25)"; e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"; }}
                    onMouseOut={e  => { e.currentTarget.style.boxShadow="0 2px 16px rgba(0,0,0,0.15)"; e.currentTarget.style.transform="none"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; }}>
                    {/* FOTOĞRAF ALANI */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", height:160, background:"rgba(0,0,0,0.15)", borderRadius:"20px 20px 0 0", overflow:"hidden" }}>
                      {[0,1,2,3].map(x => (
                        <div key={x} style={{ overflow:"hidden", borderRight:x%2===0?"1px solid rgba(255,255,255,0.04)":"none", borderBottom:x<2?"1px solid rgba(255,255,255,0.04)":"none" }}>
                          {ft[x] ? <img src={ft[x].foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform .3s" }}/> : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.06)", fontSize:18 }}>◇</div>}
                        </div>
                      ))}
                    </div>
                    {/* BİLGİ ALANI */}
                    <div style={{ padding:"12px 14px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:T.text, letterSpacing:"0.02em" }}>{kol.ad}</h3>
                        {kol.on && <span style={{ background:"rgba(201,168,76,0.12)", color:GOLD, padding:"2px 8px", borderRadius:8, fontSize:8, fontWeight:700, letterSpacing:"0.05em" }}>{kol.on}</span>}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <span style={{ fontSize:10, color:T.sub, fontWeight:500 }}>{km.length} model</span>
                          {altinKgUSD > 0 && km.length > 0 && (() => {
                            const topGram = km.reduce((s,m) => s + (Number(m.gram)||0), 0);
                            const topKar  = km.reduce((s,m) => { const h = hesapla(m, m.refAyar, altinKgUSD, madenCarpan); return s + h.karHas; }, 0);
                            const milyemler = km.map(m => {
                              const h = hesapla(m, m.refAyar, altinKgUSD, madenCarpan);
                              return h.mamulGram > 0 ? h.karHas / h.mamulGram : 0;
                            }).filter(x => x > 0);
                            const ortMly = milyemler.length > 0 ? milyemler.reduce((s,x)=>s+x,0)/milyemler.length : 0;
                            const minMly = milyemler.length > 0 ? Math.min(...milyemler) : 0;
                            const maxMly = milyemler.length > 0 ? Math.max(...milyemler) : 0;
                            return (
                              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                <div style={{ display:"flex", gap:8 }}>
                                  <span style={{ fontSize:9, color:"#5b9bd5", fontWeight:600 }}>{fN(topGram,1)} gr</span>
                                  <span style={{ fontSize:9, color:"#6abf69", fontWeight:600 }}>{fN(topKar,3)} has kar</span>
                                </div>
                                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                                  <span style={{ fontSize:8, color:T.dim }}>Ort. karlılık:</span>
                                  <span style={{ fontSize:10, color:GOLD, fontWeight:800 }}>{fN(ortMly,3)}</span>
                                  <span style={{ fontSize:7, color:T.dim }}>mly/gr ({fN(minMly,3)}–{fN(maxMly,3)})</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{ display:"flex", gap:4 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEK(kol)} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"4px 10px", color:T.text, fontSize:8, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>Edit</button>
                          <button onClick={() => { setKatalogKol(kol); setKatalogSiraliModeller([]); setKatalogSutun(3); setKatalogAyar("14K"); setKatalogSiralaModal(true); }} style={{ background:"rgba(91,155,213,0.08)", border:"1px solid rgba(91,155,213,0.15)", borderRadius:8, padding:"4px 8px", color:"#5b9bd5", fontSize:8, fontWeight:700, cursor:"pointer" }}>PDF 3</button>
                          <button onClick={() => { setKatalogKol(kol); setKatalogSiraliModeller([]); setKatalogSutun(4); setKatalogAyar("14K"); setKatalogSiralaModal(true); }} style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.15)", borderRadius:8, padding:"4px 8px", color:"#a78bfa", fontSize:8, fontWeight:700, cursor:"pointer" }}>PDF 4</button>
                          <button onClick={() => setDelOnay({ type:"kol", id:kol.id })} style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.12)", borderRadius:8, padding:"4px 8px", color:"#ef4444", fontSize:8, fontWeight:600, cursor:"pointer" }}>Sil</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODELLER */}
        {sayfa==="modeller" && (
          <div style={{ animation:"fadein .3s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                {aktifKol && <button onClick={() => { setSayfa("koleksiyonlar"); setAktifKol(null); }} style={{ ...GH, padding:"4px 7px", fontSize:10 }}>{"<"}</button>}
                <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"#e8dcc8" }}>{aktifKol ? aktifKol.ad : "Tum Modeller"} <span style={{ fontSize:10, color:"#7a6f5a" }}>({gorunen.length})</span></h2>
              </div>
              <div style={{ display:"flex", gap:4 }}>
                {aktifKol && <button onClick={() => { setKatalogKol(aktifKol); setKatalogSiraliModeller([]); setKatalogSutun(3); setKatalogAyar("14K"); setKatalogSiralaModal(true); }} style={{ ...GH, fontSize:9, padding:"5px 9px" }}>PDF 3'lü</button>}
                {aktifKol && <button onClick={() => { setKatalogKol(aktifKol); setKatalogSiraliModeller([]); setKatalogSutun(4); setKatalogAyar("14K"); setKatalogSiralaModal(true); }} style={{ background:"rgba(167,139,250,0.06)", border:"1px solid rgba(167,139,250,0.15)", borderRadius:9, padding:"5px 9px", color:"#a78bfa", fontSize:9, fontWeight:700, cursor:"pointer" }}>PDF 4'lü</button>}
                {seciliModeller.size > 0 && (
                  <>
                    <button onClick={()=>{ const hepsi = new Set(gorunen.map(m=>m.id)); setSeciliModeller(hepsi); }} style={{ ...GH, fontSize:9, padding:"5px 9px" }}>Tümünü Seç ({gorunen.length})</button>
                    <button onClick={()=>setTopluKopyalaModal(true)} style={{ ...BG, fontSize:9, padding:"5px 12px" }}>📋 Kopyala ({seciliModeller.size})</button>
                    <button onClick={()=>setSeciliModeller(new Set())} style={{ ...GH, fontSize:9, padding:"5px 9px" }}>İptal</button>
                  </>
                )}
                <button onClick={() => { rmf(); setFKolId(aktifKol?aktifKol.id:""); setEditM(null); setShowMM(true); }} style={{ ...BG, padding:"7px 14px", fontSize:11 }}>+ Model</button>
              </div>
            </div>
            <input value={arama} onChange={e=>setArama(e.target.value)} placeholder="Ad, kod veya etiket ara..." style={{ ...IS, marginBottom:8, padding:"6px 10px", fontSize:11 }} />

            {/* Sıralama */}
            <div style={{ display:"flex", gap:3, marginBottom:6, overflowX:"auto", paddingBottom:2, alignItems:"center" }}>
            {/* Kategori filtresi */}
            <div style={{ display:"flex", gap:3, marginBottom:6, overflowX:"auto", paddingBottom:2, alignItems:"center" }}>
              <span style={{ fontSize:7, color:"#7a6f5a", fontWeight:700, whiteSpace:"nowrap", marginRight:2 }}>KATEGORI:</span>
              <button onClick={()=>setKategoriF("")} style={{ background:!kategoriF?"rgba(201,168,76,0.15)":"rgba(201,168,76,0.03)", border:"1px solid", borderColor:!kategoriF?"rgba(201,168,76,0.3)":"rgba(201,168,76,0.07)", borderRadius:5, padding:"3px 7px", color:!kategoriF?GOLD:"#7a6f5a", fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Tumu</button>
              {KATEGORILER.map(k => { const cnt = aktMod.filter(m => (m.kategori||"") === k.id).length; if (!cnt) return null; return (
                <button key={k.id} onClick={()=>setKategoriF(kategoriF===k.id?"":k.id)} style={{ background:kategoriF===k.id?"rgba(201,168,76,0.15)":"rgba(201,168,76,0.03)", border:"1px solid", borderColor:kategoriF===k.id?"rgba(201,168,76,0.3)":"rgba(201,168,76,0.07)", borderRadius:5, padding:"3px 7px", color:kategoriF===k.id?GOLD:"#7a6f5a", fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{k.l} ({cnt})</button>
              ); })}
            </div>

            {/* Sıralama */}
            <span style={{ fontSize:7, color:"#7a6f5a", fontWeight:700, whiteSpace:"nowrap", marginRight:2 }}>SIRALA:</span>
              {[
                { id:"varsayilan", l:"Varsayilan" },
                { id:"kar_desc",   l:"Karli once" },
                { id:"kar_asc",    l:"Az karli once" },
                { id:"gram_asc",   l:"Hafif once" },
                { id:"gram_desc",  l:"Agir once" },
                { id:"kod",        l:"Koda gore" },
                { id:"cok_satilan",l:"Cok satilan" },
              ].map(s => (
                <button key={s.id} onClick={()=>setSirala(s.id)} style={{ background:sirala===s.id?"rgba(201,168,76,0.18)":"rgba(201,168,76,0.03)", border:"1px solid", borderColor:sirala===s.id?"rgba(201,168,76,0.35)":"rgba(201,168,76,0.07)", borderRadius:5, padding:"3px 7px", color:sirala===s.id?GOLD:"#7a6f5a", fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{s.l}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:3, marginBottom:6, overflowX:"auto", paddingBottom:2 }}>
              <button onClick={()=>setFiltre("all")} style={{ background:filtre==="all"?"rgba(201,168,76,0.15)":"rgba(201,168,76,0.03)", border:"1px solid", borderColor:filtre==="all"?"rgba(201,168,76,0.3)":"rgba(201,168,76,0.07)", borderRadius:5, padding:"3px 7px", color:filtre==="all"?GOLD:"#7a6f5a", fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Tumu</button>
              {DURUMLAR.map(d => { const cnt=aktMod.filter(m=>(m.durum||"baslanmadi")===d.id).length; if(!cnt)return null; return <button key={d.id} onClick={()=>setFiltre(d.id)} style={{ background:filtre===d.id?"rgba(0,0,0,0.3)":"rgba(201,168,76,0.03)", border:"1px solid", borderColor:filtre===d.id?d.c:"rgba(201,168,76,0.07)", borderRadius:5, padding:"3px 7px", color:filtre===d.id?d.c:"#7a6f5a", fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{d.l} ({cnt})</button>; })}
            </div>
            {tumEtiketler.length>0 && (
              <div style={{ display:"flex", gap:3, marginBottom:10, overflowX:"auto", paddingBottom:2 }}>
                <span style={{ fontSize:7, color:"#7a6f5a", fontWeight:700, whiteSpace:"nowrap", alignSelf:"center" }}>ETIKET:</span>
                {etiketF && <button onClick={()=>setEtiketF("")} style={{ ...RD, padding:"2px 6px", fontSize:7 }}>Temizle</button>}
                {tumEtiketler.map(e => <button key={e} onClick={()=>setEtiketF(e===etiketF?"":e)} style={{ background:etiketF===e?"rgba(167,139,250,0.15)":"rgba(201,168,76,0.04)", border:"1px solid", borderColor:etiketF===e?"#a78bfa":"rgba(201,168,76,0.09)", borderRadius:4, padding:"2px 6px", color:etiketF===e?"#a78bfa":"#998a6e", fontSize:7, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>#{e}</button>)}
              </div>
            )}

            {/* TOPLU KONFİRMASYONA EKLE */}
            {(etiketF || kategoriF || arama.trim()) && gorunen.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, padding:"7px 12px", background:"rgba(201,168,76,0.05)", border:"1px solid rgba(201,168,76,0.15)", borderRadius:8 }}>
                <span style={{ fontSize:9, color:"#998a6e" }}>
                  <b style={{ color:GOLD }}>{gorunen.length}</b> model filtrelendi
                  {etiketF && <span style={{ color:"#a78bfa" }}> · #{etiketF}</span>}
                  {kategoriF && <span style={{ color:GOLD }}> · {kategoriF}</span>}
                  {arama.trim() && <span style={{ color:"#5b9bd5" }}> · "{arama}"</span>}
                </span>
                <button onClick={() => {
                  // Tüm filtrelenenleri konfirmasyona ekle
                  const eklenecekler = gorunen.filter(m => !konfList.find(k=>k.id===m.id));
                  if (eklenecekler.length === 0) return;
                  setKonfList(prev => [...prev, ...eklenecekler]);
                  setSayfa("konfirmasyon");
                }} style={{ ...BG, fontSize:9, padding:"5px 12px", marginLeft:"auto", whiteSpace:"nowrap" }}>
                  ✓ Tümünü Konfirmasyona Ekle ({gorunen.filter(m=>!konfList.find(k=>k.id===m.id)).length})
                </button>
                {gorunen.some(m => konfList.find(k=>k.id===m.id)) && (
                  <span style={{ fontSize:8, color:"#6abf69" }}>
                    ({gorunen.filter(m=>konfList.find(k=>k.id===m.id)).length} zaten eklendi)
                  </span>
                )}
              </div>
            )}
            {gorunen.length===0 && <p style={{ color:"#665d4a", textAlign:"center", padding:"30px", fontSize:12 }}>Model bulunamadi</p>}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:9 }}>
              {gorunen.map((m,i) => {
                const ik  = konfList.find(x=>x.id===m.id);
                const dur = DURUMLAR.find(d=>d.id===m.durum)||DURUMLAR[0];
                const h   = altinKgUSD>0 ? hesapla(m, m.refAyar, altinKgUSD, madenCarpan) : null;
                return (
                  <div key={m.id} style={{ background:ik?"rgba(201,168,76,0.07)":"rgba(201,168,76,0.02)", border:"1px solid", borderColor:ik?"rgba(201,168,76,0.28)":"rgba(201,168,76,0.07)", borderRadius:11, overflow:"hidden", animation:"cardin .3s ease "+(i*.03)+"s both" }}>
                    <div style={{ position:"relative", height:130, background:"rgba(0,0,0,0.3)", overflow:"hidden" }}>
                      {m.foto ? <img src={m.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/> : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(201,168,76,0.1)", fontSize:24 }}>-</div>}
                      <button onClick={()=>togKonf(m)} style={{ position:"absolute", top:4, right:4, width:20, height:20, borderRadius:5, background:ik?"rgba(201,168,76,0.9)":"rgba(0,0,0,0.55)", border:"2px solid rgba(201,168,76,0.45)", color:ik?DARK:"transparent", fontSize:9, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>V</button>
                      {seciliModeller.has(m.id) && <div style={{ position:"absolute", inset:0, background:"rgba(91,155,213,0.15)", border:"2px solid rgba(91,155,213,0.5)", pointerEvents:"none" }}/>}
                      {h&&h.karUyari && <div style={{ position:"absolute", bottom:3, left:3, background:"rgba(232,90,79,0.88)", color:"#fff", padding:"1px 5px", borderRadius:3, fontSize:6, fontWeight:800 }}>⚠ {fN(h.karMly,3)} mly/gr</div>}
                      {(m.satisSayisi||0)>0 && <div style={{ position:"absolute", top:4, left:4, background:"rgba(106,191,105,0.85)", color:"#fff", padding:"1px 5px", borderRadius:3, fontSize:6, fontWeight:800 }}>{m.satisSayisi}x</div>}
                    </div>
                    <div style={{ padding:"6px 8px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                        <span style={{ background:"rgba(0,0,0,0.35)", color:dur.c, padding:"1px 5px", borderRadius:3, fontSize:7, fontWeight:700 }}>{dur.l}</span>
                        {m.kategori && <span style={{ background:"rgba(201,168,76,0.12)", color:GOLD, padding:"1px 5px", borderRadius:3, fontSize:7, fontWeight:600 }}>{(KATEGORILER.find(k=>k.id===m.kategori)||{l:m.kategori}).l}</span>}
                        {m.kod && m.kod.match(/[-_](R|B|Y|V?\d+)$/i) && <span style={{ background:"rgba(91,155,213,0.12)", color:"#5b9bd5", padding:"1px 5px", borderRadius:3, fontSize:7, fontWeight:700 }}>VERSİYON</span>}
                        {m.kod && <span style={{ fontSize:7, color:GOLD, fontWeight:700 }}>{m.kod}</span>}
                      </div>
                      <div style={{ height:2, background:"rgba(201,168,76,0.07)", borderRadius:1, overflow:"hidden", marginBottom:3 }}>
                        <div style={{ height:"100%", width:(dur.s/9*100)+"%", background:dur.c, borderRadius:1 }} />
                      </div>
                      <div style={{ fontSize:10, fontWeight:700, color:"#e8dcc8", marginBottom:2 }}>{m.ad}</div>
                      <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginBottom:2 }}>
                        {m.gram>0 && <span style={{ fontSize:6, color:"#998a6e", background:"rgba(201,168,76,0.07)", padding:"1px 3px", borderRadius:2, fontWeight:600 }}>{m.gram}gr</span>}
                        {m.refAyar && <span style={{ fontSize:6, color:"#998a6e", background:"rgba(201,168,76,0.07)", padding:"1px 3px", borderRadius:2, fontWeight:600 }}>{m.refAyar}</span>}
                        {m.tasGram>0 && <span style={{ fontSize:6, color:"#5b9bd5", background:"rgba(91,155,213,0.08)", padding:"1px 3px", borderRadius:2, fontWeight:600 }}>
                          {m.taslar?.length>0 ? m.taslar.map(t=>t.sekil+" "+t.boyut+"×"+t.adet).join(" + ")+" = "+fN(m.tasGram,4)+"gr" : (m.tasSekil&&m.tasBoyut&&m.tasAdet ? m.tasSekil+" "+m.tasBoyut+"mm ×"+m.tasAdet+" = "+fN(m.tasGram,4)+"gr" : "Tas:"+fN(m.tasGram,4)+"gr")}
                        </span>}
                        {m.iscilikDolar>0 && <span style={{ fontSize:6, color:"#e8833a", background:"rgba(232,131,58,0.08)", padding:"1px 3px", borderRadius:2, fontWeight:600 }}>{fUSD(m.iscilikDolar)}/gr</span>}
                        {(m.etiketler||[]).slice(0,2).map(e => <span key={e} style={{ fontSize:6, color:"#a78bfa", background:"rgba(167,139,250,0.08)", padding:"1px 3px", borderRadius:2, fontWeight:600 }}>#{e}</span>)}
                      </div>
                      {h && (
                        <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:6, padding:"4px 6px", marginTop:2 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, color:"#7a6f5a", marginBottom:1 }}>
                            <span>Tas: {fN(h.tasHas,4)} has</span>
                            <span>Isc: {fN(h.iscilikHas,4)} has</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                            <span style={{ fontSize:7, color:"#998a6e" }}>Mal: {fN(h.topMaliyetHas,4)} has</span>
                            <span style={{ fontSize:10, fontWeight:800, color:h.karUyari?"#e85a4f":"#6abf69" }}>{h.mamulGram>0 ? fN(h.karMly||h.karHas/h.mamulGram,3)+" mly/gr" : fN(h.karHas,4)+" has"}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:1 }}>
                            <span style={{ fontSize:7, color:h.karUyari?"#e85a4f":"#6abf69", opacity:0.8 }}>
                              {h.mamulGram>0 ? "("+fN(h.karHas,4)+" has)" : ""}
                            </span>
                          </div>
                        </div>
                      )}
                      <div style={{ display:"flex", gap:3, marginTop:4, justifyContent:"flex-end" }}>
                        <button onClick={e=>{ e.stopPropagation(); setSeciliModeller(prev=>{ const s=new Set(prev); s.has(m.id)?s.delete(m.id):s.add(m.id); return s; }); }} style={{ background:seciliModeller.has(m.id)?"rgba(91,155,213,0.2)":"rgba(91,155,213,0.06)", border:"1px solid "+(seciliModeller.has(m.id)?"rgba(91,155,213,0.5)":"rgba(91,155,213,0.15)"), borderRadius:3, padding:"2px 5px", color:"#5b9bd5", fontSize:7, fontWeight:700, cursor:"pointer" }}>{seciliModeller.has(m.id)?"✓ Seçildi":"□ Seç"}</button>
                        <button onClick={()=>setKopyalaModal({ model:m, hedefKolId:"" })} style={{ background:"rgba(91,155,213,0.09)", border:"none", borderRadius:3, padding:"2px 5px", color:"#5b9bd5", fontSize:7, fontWeight:700, cursor:"pointer" }}>Kopyala</button>
                        <button onClick={()=>openEM(m)} style={{ background:"rgba(201,168,76,0.09)", border:"none", borderRadius:3, padding:"2px 5px", color:GOLD, fontSize:7, fontWeight:700, cursor:"pointer" }}>Edit</button>
                        <button onClick={()=>setDelOnay({ type:"mod", id:m.id })} style={{ background:"rgba(232,90,79,0.07)", border:"none", borderRadius:3, padding:"2px 4px", color:"#e85a4f", fontSize:7, fontWeight:700, cursor:"pointer" }}>Sil</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ALTTA + MODEL + EKSİK KOD TESPİTİ */}
            <div style={{ marginTop:16, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
              {/* Eksik kod tespiti */}
              {aktifKol && (() => {
                const prefix = aktifKol.on;
                if (!prefix) return null;
                const kolMod = modeller.filter(m => m.ki === aktifKol.id);
                const sayilar = kolMod.map(m => {
                  const match = (m.kod||"").match(/^[A-Za-z\-]*(\d+)/);
                  return match ? Number(match[1]) : null;
                }).filter(n => n !== null).sort((a,b) => a-b);
                if (sayilar.length < 2) return null;
                const eksikler = [];
                for (let i = sayilar[0]; i <= sayilar[sayilar.length-1]; i++) {
                  if (!sayilar.includes(i)) eksikler.push(i);
                }
                return eksikler.length === 0 ? (
                  <div style={{ fontSize:9, color:"#6abf69", padding:"6px 10px", background:"rgba(106,191,105,0.06)", borderRadius:7, border:"1px solid rgba(106,191,105,0.15)" }}>
                    ✓ {sayilar[0]}–{sayilar[sayilar.length-1]} arası tüm kodlar mevcut
                  </div>
                ) : (
                  <div style={{ fontSize:9, color:"#e8833a", padding:"6px 10px", background:"rgba(232,131,58,0.06)", borderRadius:7, border:"1px solid rgba(232,131,58,0.15)", flex:1 }}>
                    <span style={{ fontWeight:700 }}>⚠ Eksik kodlar ({eksikler.length}):</span>{" "}
                    {eksikler.slice(0,20).map(n => prefix+"-"+n).join(", ")}
                    {eksikler.length > 20 ? " ..." : ""}
                  </div>
                );
              })()}
              <button onClick={() => { rmf(); setFKolId(aktifKol?aktifKol.id:""); setEditM(null); setShowMM(true); }} style={{ ...BG, padding:"10px 20px", fontSize:12, flexShrink:0 }}>+ Model Ekle</button>
            </div>

          </div>
        )}

        {/* KONFİRMASYON */}
        {sayfa==="konfirmasyon" && (
          <div style={{ animation:"fadein .3s" }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:6 }}>
              <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"#e8dcc8" }}>Konfirmasyon</h2>
              <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                <input value={konfMus} onChange={e=>setKonfMus(e.target.value)} placeholder="Musteri..." style={{ ...IS, width:130, padding:"5px 8px", fontSize:11 }} />
                <input type="date" value={konfTeslim} onChange={e=>setKonfTeslim(e.target.value)} style={{ ...IS, width:130, padding:"5px 8px", fontSize:11 }} />
                {konfList.length>0 && <>
                  <button onClick={()=>downloadPDF(buildKonfHTML({musteri:konfMus,tarih:Date.now(),kalemler:konfKalemler},altinKgUSD,madenCarpan,false),(konfMus||"siparis")+"-musteri")} style={{ ...GH, fontSize:9, padding:"5px 9px" }}>PDF Musteri</button>
                  <button onClick={()=>downloadPDF(buildKonfHTML({musteri:konfMus,tarih:Date.now(),kalemler:konfKalemler},altinKgUSD,madenCarpan,true),(konfMus||"siparis")+"-ic")} style={{ background:"rgba(232,90,79,0.08)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:9, padding:"5px 9px", color:"#e85a4f", fontSize:9, fontWeight:700, cursor:"pointer" }}>PDF Ic</button>
                  <button onClick={konfKaydet} style={{ ...BG, padding:"6px 12px", fontSize:10 }}>Kaydet</button>
                </>}
              </div>
            </div>

            {konfList.length===0 && <p style={{ color:"#665d4a", textAlign:"center", padding:"30px", fontSize:12 }}>Modeller sayfasinda V ile urun secin</p>}

            {konfList.length>0 && (
              <div>
                {/* Toplu işlem araçları */}
                <div style={{ display:"flex", gap:12, marginBottom:10, flexWrap:"wrap", alignItems:"center", background:"rgba(201,168,76,0.03)", border:"1px solid rgba(201,168,76,0.1)", borderRadius:10, padding:"8px 12px" }}>
                  {/* Global ayar */}
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:8, color:"#8a7d64", fontWeight:700, whiteSpace:"nowrap" }}>AYAR:</span>
                    {AYARLAR.map(a => (
                      <button key={a.id} onClick={()=>setKonfAyar(a.id)} style={{ background:konfAyar===a.id?"rgba(201,168,76,0.2)":"rgba(201,168,76,0.05)", border:"1px solid", borderColor:konfAyar===a.id?"rgba(201,168,76,0.4)":"rgba(201,168,76,0.1)", borderRadius:6, padding:"4px 9px", color:konfAyar===a.id?GOLD:"#7a6f5a", fontSize:10, fontWeight:konfAyar===a.id?800:400, cursor:"pointer" }}>{a.id}</button>
                    ))}
                  </div>
                  <div style={{ width:1, height:20, background:"rgba(201,168,76,0.15)" }}/>
                  {/* Genel Boy */}
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontSize:8, color:"#8a7d64", fontWeight:700, whiteSpace:"nowrap" }}>GENEL BOY:</span>
                    <button onClick={()=>setKonfGenelBoy(p=>({...p, aktif:!p.aktif}))} style={{ background:konfGenelBoy.aktif?"rgba(106,191,105,0.15)":"rgba(201,168,76,0.05)", border:"1px solid", borderColor:konfGenelBoy.aktif?"rgba(106,191,105,0.3)":"rgba(201,168,76,0.15)", borderRadius:5, padding:"3px 8px", color:konfGenelBoy.aktif?"#6abf69":"#7a6f5a", fontSize:9, fontWeight:700, cursor:"pointer" }}>
                      {konfGenelBoy.aktif ? "✓ Aktif" : "Tume Uygula"}
                    </button>
                    {konfGenelBoy.aktif && (<>
                      <select value={konfGenelBoy.sistem} onChange={e=>setKonfGenelBoy(p=>({...p,sistem:e.target.value,deger:""}))} style={{ ...IS, width:90, padding:"3px 6px", fontSize:10 }}>
                        {Object.keys(BOY_YUZUK).map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={konfGenelBoy.deger} onChange={e=>setKonfGenelBoy(p=>({...p,deger:e.target.value}))} style={{ ...IS, width:70, padding:"3px 6px", fontSize:10 }}>
                        <option value="">Boy</option>
                        {(BOY_YUZUK[konfGenelBoy.sistem]||[]).map(b=><option key={b} value={b}>{b}</option>)}
                      </select>
                      {konfGenelBoy.deger && konfGenelBoy.sistem !== "mm" && (
                        <span style={{ fontSize:8, color:"#5b9bd5" }}>≈ {boyToMM(konfGenelBoy.sistem, konfGenelBoy.deger)} mm</span>
                      )}
                    </>)}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap", flex:1 }}>
                    <span style={{ fontSize:8, color:"#8a7d64", fontWeight:700, whiteSpace:"nowrap" }}>KAYITLI NOTLAR:</span>
                    {kayitliNotlar.map((n,ni) => (
                      <div key={ni} style={{ display:"flex", alignItems:"center", gap:1 }}>
                        <button onClick={()=>konfList.forEach(m=>{ const mevc=konfNot[m.id]||""; konfNotSec(m.id, mevc?mevc+", "+n:n); })} style={{ background:"rgba(91,155,213,0.08)", border:"1px solid rgba(91,155,213,0.15)", borderRadius:5, padding:"2px 7px", color:"#5b9bd5", fontSize:8, cursor:"pointer", whiteSpace:"nowrap" }}>+{n}</button>
                        <button onClick={()=>{ const yeni=kayitliNotlar.filter((_,i)=>i!==ni); setKayitliNotlar(yeni); sv("v7ay",{kategoriler:ayarKategoriler,etiketler:ayarEtiketler,varsAltinKg:ayarVarsAltinKg,varsMc:ayarVarsMc,varsIscilik:ayarVarsIscilik,varsIscilikBirim:ayarVarsIscilikBirim,kayitliNotlar:yeni}); }} style={{ background:"none", border:"none", color:"#554d3a", fontSize:9, cursor:"pointer", padding:"0 2px" }}>×</button>
                      </div>
                    ))}
                    <input value={yeniNotSablon} onChange={e=>setYeniNotSablon(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&yeniNotSablon.trim()){ const yeni=[...kayitliNotlar,yeniNotSablon.trim()]; setKayitliNotlar(yeni); setYeniNotSablon(""); sv("v7ay",{kategoriler:ayarKategoriler,etiketler:ayarEtiketler,varsAltinKg:ayarVarsAltinKg,varsMc:ayarVarsMc,varsIscilik:ayarVarsIscilik,varsIscilikBirim:ayarVarsIscilikBirim,kayitliNotlar:yeni}); }}} placeholder="+ Yeni not, Enter ile kaydet" style={{ ...IS, width:150, padding:"2px 6px", fontSize:9 }}/>
                  </div>
                </div>
                {/* Ana tablo */}
                <div style={{ background:"rgba(201,168,76,0.02)", border:"1px solid rgba(201,168,76,0.1)", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
                  {/* Başlık satırı */}
                  <div style={{ display:"grid", gridTemplateColumns:"72px 80px 1fr 100px 60px 70px 50px", gap:0, background:"rgba(201,168,76,0.08)", padding:"6px 10px", borderBottom:"1px solid rgba(201,168,76,0.12)" }}>
                    {["","Kod","Urun / Not","Renk","Adet","Top.Gr",""].map((t,i) => (
                      <div key={i} style={{ fontSize:8, fontWeight:700, color:"#8a7d64", textTransform:"uppercase", textAlign:i>2?"center":"left" }}>{t}</div>
                    ))}
                  </div>

                  {/* Ürün satırları */}
                  {konfList.map((m, idx) => {
                    const adet    = konfAdet[m.id]||1;
                    const not     = konfNot[m.id]||"";
                    const renk    = konfRenkler[m.id]||"Sari";
                    const hc      = hesapla(m, konfAyar, altinKgUSD, madenCarpan);
                    const topGram = hc.mamulGram * adet;
                    const renkRenk = renk==="Rose"?"#e8833a":renk==="Beyaz"?"#aaa":"#c9a84c";
                    return (
                      <div key={m.id} style={{ display:"grid", gridTemplateColumns:"72px 80px 1fr 100px 60px 70px 50px", gap:0, padding:"8px 10px", borderBottom: idx < konfList.length-1 ? "1px solid rgba(201,168,76,0.06)" : "none", alignItems:"center" }}>
                        {/* Foto */}
                        <div>{m.foto ? <img src={m.foto} alt="" style={{ width:64, height:64, objectFit:"cover", borderRadius:8 }}/> : <div style={{ width:64, height:64, background:"rgba(201,168,76,0.08)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(201,168,76,0.3)", fontSize:20 }}>-</div>}</div>
                        {/* Kod */}
                        <div style={{ fontSize:10, fontWeight:800, color:GOLD }}>{m.kod||"—"}</div>
                        {/* Ürün + not */}
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, color:"#e8dcc8" }}>{m.ad}</div>
                          {m.kategori && <span style={{ fontSize:7, color:"#a78bfa", background:"rgba(167,139,250,0.1)", padding:"1px 5px", borderRadius:3, fontWeight:600 }}>{m.kategori.charAt(0).toUpperCase()+m.kategori.slice(1)}</span>}
                          {/* Manuel not */}
                          <input value={not} onChange={e=>konfNotSec(m.id,e.target.value)} placeholder="Not ekle..." style={{ marginTop:4, width:"100%", background:"transparent", border:"none", borderBottom:"1px dashed rgba(201,168,76,0.2)", color:"#c9a84c", fontSize:9, outline:"none", padding:"1px 0" }}/>
                          {/* Kayıtlı not şablonları */}
                          {kayitliNotlar.length > 0 && (
                            <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginTop:3 }}>
                              {kayitliNotlar.map((k,ki) => (
                                <button key={ki} onClick={()=>konfNotSec(m.id, not ? not+", "+k : k)} style={{ background:"rgba(91,155,213,0.06)", border:"1px solid rgba(91,155,213,0.1)", borderRadius:3, padding:"1px 5px", color:"#5b9bd5", fontSize:7, cursor:"pointer", whiteSpace:"nowrap" }}>+{k}</button>
                              ))}
                            </div>
                          )}
                          {/* KOLYE/BİLEKLİK — uzunluk + gram */}
                          {(m.kategori==="kolye" || m.kategori==="bileklik") && !konfGenelBoy.aktif && (() => {
                            const boylar = konfBoylar[m.id] || [];
                            return (
                              <div style={{ marginTop:5 }}>
                                <div style={{ fontSize:7, color:"#a78bfa", fontWeight:700, marginBottom:3 }}>BOY/UZUNLUK + GRAM:</div>
                                {boylar.map((b, bi) => (
                                  <div key={bi} style={{ display:"flex", gap:4, alignItems:"center", marginBottom:3 }}>
                                    <input type="number" placeholder="Uz." value={b.uzunluk||""} onChange={e=>{e.stopPropagation();konfBoyGuncelle(m.id,bi,"uzunluk",e.target.value);}} style={{ ...IS, width:50, padding:"2px 4px", fontSize:8, textAlign:"center" }}/>
                                    <select value={b.birim||"cm"} onChange={e=>{e.stopPropagation();konfBoyGuncelle(m.id,bi,"birim",e.target.value);}} style={{ ...IS, width:42, padding:"2px 2px", fontSize:8 }}>
                                      <option value="cm">cm</option>
                                      <option value="mm">mm</option>
                                    </select>
                                    <input type="number" step="0.01" placeholder="gr" value={b.gram||""} onChange={e=>{e.stopPropagation();konfBoyGuncelle(m.id,bi,"gram",e.target.value);}} style={{ ...IS, width:55, padding:"2px 4px", fontSize:8, textAlign:"center" }}/>
                                    <span style={{ fontSize:7, color:"#665d4a" }}>×</span>
                                    <input type="number" min="1" placeholder="ad" value={b.adet||1} onChange={e=>{e.stopPropagation();konfBoyGuncelle(m.id,bi,"adet",Number(e.target.value)||1);}} style={{ ...IS, width:38, padding:"2px 4px", fontSize:8, textAlign:"center" }}/>
                                    <button onClick={e=>{e.stopPropagation();konfBoySil(m.id,bi);}} style={{ background:"none", border:"none", color:"#e85a4f", cursor:"pointer", fontSize:11, padding:0, lineHeight:1 }}>×</button>
                                  </div>
                                ))}
                                <button onClick={e=>{e.stopPropagation();konfBoyEkle(m.id, m.kategori);}} style={{ background:"rgba(167,139,250,0.08)", border:"1px dashed rgba(167,139,250,0.25)", borderRadius:5, padding:"2px 8px", color:"#a78bfa", fontSize:8, cursor:"pointer" }}>+ Boy/Uzunluk Ekle</button>
                              </div>
                            );
                          })()}
                          {/* Boy listesi — sadece yüzük için (bileklik kolye yukarıda) */}
                          {m.kategori==="yuzuk" && !konfGenelBoy.aktif && (() => {
                            const boyTablosu = BOY_YUZUK;
                            const boylar = konfBoylar[m.id] || [];
                            return (
                              <div style={{ marginTop:5 }}>
                                <div style={{ fontSize:7, color:"#a78bfa", fontWeight:700, marginBottom:3 }}>BOYLAR:</div>
                {boylar.map((b, bi) => (
                                  <div key={bi} style={{ display:"flex", gap:4, alignItems:"center", marginBottom:3 }}>
                                    <select value={b.sistem} onChange={e=>{e.stopPropagation();konfBoyGuncelle(m.id,bi,"sistem",e.target.value);}} style={{ ...IS, width:75, padding:"2px 4px", fontSize:8 }}>
                                      {Object.keys(boyTablosu).map(s=><option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <select value={b.deger} onChange={e=>{e.stopPropagation();konfBoyGuncelle(m.id,bi,"deger",e.target.value);}} style={{ ...IS, width:55, padding:"2px 4px", fontSize:8 }}>
                                      <option value="">—</option>
                                      {(boyTablosu[b.sistem]||[]).map(v=><option key={v} value={v}>{v}</option>)}
                                    </select>
                                    <input type="number" min="1" value={b.adet||1} onChange={e=>{e.stopPropagation();konfBoyGuncelle(m.id,bi,"adet",Number(e.target.value)||1);}} style={{ ...IS, width:40, padding:"2px 4px", fontSize:8, textAlign:"center" }}/>
                                    {b.deger && b.sistem!=="mm" && (
                                      <span style={{ fontSize:7, color:"#5b9bd5", whiteSpace:"nowrap" }}>≈{boyToMM(b.sistem,b.deger)}mm</span>
                                    )}
                                    <button onClick={e=>{e.stopPropagation();konfBoySil(m.id,bi);}} style={{ background:"none", border:"none", color:"#e85a4f", cursor:"pointer", fontSize:11, padding:0, lineHeight:1 }}>×</button>
                                  </div>
                                ))}
                                <button onClick={e=>{e.stopPropagation();konfBoyEkle(m.id, m.kategori);}} style={{ background:"rgba(167,139,250,0.08)", border:"1px dashed rgba(167,139,250,0.25)", borderRadius:5, padding:"2px 8px", color:"#a78bfa", fontSize:8, cursor:"pointer" }}>+ Boy Ekle</button>
                              </div>
                            );
                          })()}
                          {/* Genel boy aktifse göster */}
                          {(m.kategori==="yuzuk"||m.kategori==="bilezik") && konfGenelBoy.aktif && konfGenelBoy.deger && (
                            <div style={{ marginTop:3, fontSize:8, color:"#6abf69" }}>
                              Boy: {konfGenelBoy.sistem} {konfGenelBoy.deger}{konfGenelBoy.sistem!=="mm"?" (≈"+boyToMM(konfGenelBoy.sistem,konfGenelBoy.deger)+"mm)":""}
                            </div>
                          )}
                        </div>
                        {/* Altın rengi */}
                        <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
                          {[{id:"Sari",c:"#c9a84c"},{id:"Beyaz",c:"#b0b8c1"},{id:"Rose",c:"#d4877a"}].map(r => (
                            <button key={r.id} onClick={()=>konfRenkSec(m.id,r.id)} style={{ width:26, height:26, borderRadius:13, background:r.c, border: renk===r.id?"3px solid #fff":"2px solid transparent", cursor:"pointer", boxShadow:renk===r.id?"0 0 0 2px "+r.c:"none", fontSize:0 }} title={r.id}/>
                          ))}
                        </div>
                        {/* Adet — boylar varsa boyların toplamı, yoksa manuel */}
                        <div style={{ textAlign:"center" }}>
                          {(konfBoylar[m.id]||[]).length > 0 ? (
                            <div>
                              <div style={{ fontSize:11, fontWeight:800, color:GOLD }}>{(konfBoylar[m.id]||[]).reduce((s,b)=>s+(b.adet||1),0)}</div>
                              <div style={{ fontSize:7, color:"#665d4a" }}>{(konfBoylar[m.id]||[]).length} boy</div>
                            </div>
                          ) : (
                            <input type="number" min="1" value={adet} onChange={e=>konfAdetSec(m.id,e.target.value)} style={{ ...IS, width:"100%", padding:"4px 4px", fontSize:11, textAlign:"center", fontWeight:800 }}/>
                          )}
                        </div>
                        {/* Top gram */}
                        <div style={{ textAlign:"center", fontSize:11, fontWeight:800, color:"#e8dcc8" }}>{fN(topGram)} gr</div>
                        {/* Sil */}
                        <div style={{ textAlign:"center" }}>
                          <button onClick={()=>togKonf(m)} style={{ background:"rgba(232,90,79,0.08)", border:"1px solid rgba(232,90,79,0.15)", borderRadius:6, padding:"3px 8px", color:"#e85a4f", fontSize:9, cursor:"pointer" }}>X</button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Toplam satırı */}
                  <div style={{ display:"grid", gridTemplateColumns:"72px 80px 1fr 100px 60px 70px 50px", gap:0, padding:"8px 10px", background:"rgba(201,168,76,0.06)", borderTop:"2px solid rgba(201,168,76,0.2)", alignItems:"center" }}>
                    <div></div><div></div>
                    <div style={{ fontSize:9, fontWeight:700, color:GOLD, textAlign:"right" }}>TOPLAM</div>
                    <div></div>
                    <div style={{ textAlign:"center", fontSize:12, fontWeight:800, color:GOLD }}>{konfKalemler.reduce((s,m)=>s+(m.adet||1),0)}</div>
                    <div style={{ textAlign:"center", fontSize:12, fontWeight:800, color:"#e8dcc8" }}>{fN(kTop.topGram)} gr</div>
                    <div></div>
                  </div>
                </div>

                {/* Özet kutular */}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
                  {[
                    { l:"Toplam Gram", v:fN(kTop.topGram)+" gr", c:"#e8dcc8" },
                    { l:"Kalem",       v:konfKalemler.reduce((s,m)=>s+(m.adet||1),0)+" adet", c:GOLD },
                  ].map((b,i) => (
                    <div key={i} style={{ background:"rgba(201,168,76,0.06)", border:"1px solid rgba(201,168,76,0.15)", borderRadius:10, padding:"8px 16px", textAlign:"right" }}>
                      <div style={{ fontSize:8, color:"#998a6e", fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>{b.l}</div>
                      <div style={{ fontSize:16, fontWeight:800, color:b.c }}>{b.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SİPARİŞLER */}
        {sayfa==="siparisler" && (
          <div style={{ animation:"fadein .3s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:6 }}>
              <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"#e8dcc8" }}>Siparis Gecmisi ({siparisler.length})</h2>
              <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                <input value={sipMusF} onChange={e=>setSipMusF(e.target.value)} placeholder="Musteri ara..." style={{ ...IS, width:130, padding:"5px 8px", fontSize:10 }}/>
                <input type="date" value={sipTarih1} onChange={e=>setSipTarih1(e.target.value)} style={{ ...IS, width:120, padding:"5px 8px", fontSize:10 }}/>
                <span style={{ color:"#665d4a", fontSize:10 }}>—</span>
                <input type="date" value={sipTarih2} onChange={e=>setSipTarih2(e.target.value)} style={{ ...IS, width:120, padding:"5px 8px", fontSize:10 }}/>
                {(sipMusF||sipTarih1||sipTarih2) && <button onClick={()=>{setSipMusF("");setSipTarih1("");setSipTarih2("");}} style={{ ...RD, fontSize:9, padding:"4px 8px" }}>Temizle</button>}
              </div>
            </div>
            {siparisler.length===0 && <p style={{ color:"#665d4a", textAlign:"center", padding:"30px", fontSize:12 }}>Henuz siparis kaydi yok</p>}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[...siparisler].reverse()
                .filter(s => {
                  if (sipMusF) { const q = sipMusF.toLowerCase(); if (!(s.musteri||"").toLowerCase().includes(q) && !(s.musKod||"").toLowerCase().includes(q)) return false; }
                  if (sipTarih1 && s.tarih < new Date(sipTarih1).getTime()) return false;
                  if (sipTarih2 && s.tarih > new Date(sipTarih2).getTime()+86399999) return false;
                  return true;
                })
                .map(s => {
                const kalemDurumlar = s.kalemDurumlar || {};
                const toplamKalem = (s.kalemler||[]).length;
                const hurdaKalem = (s.kalemler||[]).reduce((sum,k) => sum + (((s.kalemHurda)||{})[k.id]||0), 0);
                const aktifKalem = toplamKalem - hurdaKalem;
                const tamamlanan = (s.kalemler||[]).filter(k => ["tamam","teslim"].includes(kalemDurumlar[k.id]||k.durum||"baslanmadi")).length;
                const pct = aktifKalem > 0 ? Math.round(tamamlanan/aktifKalem*100) : 0;
                const acik = acikSiparisler[s.id] || false;

                // Tüm aktif kalemlerin mevcut en yaygın durumunu bul
                const aktifDurumlar = (s.kalemler||[])
                  .filter(k => (kalemDurumlar[k.id]||k.durum||"baslanmadi") !== "hurda")
                  .map(k => kalemDurumlar[k.id]||k.durum||"baslanmadi");
                const enYaygin = aktifDurumlar.length > 0
                  ? aktifDurumlar.sort((a,b) => aktifDurumlar.filter(v=>v===b).length - aktifDurumlar.filter(v=>v===a).length)[0]
                  : "baslanmadi";
                const enYayginIdx = DURUMLAR.findIndex(d => d.id === enYaygin);
                const sonrakiDurum = DURUMLAR.find(d => d.s === enYayginIdx + 1 && d.id !== "hurda");

                const durumGuncelle = (sipId, kalemId, yeniDurum) => {
                  svS(siparisler.map(sp => sp.id===sipId ? { ...sp, kalemDurumlar: { ...(sp.kalemDurumlar||{}), [kalemId]: yeniDurum } } : sp));
                  // Sipariş bazında genel durum değiştiyse kaydet
                  const sp = siparisler.find(x=>x.id===sipId);
                  if (sp) {
                    const yeniGenelDurum = siparisDurumHesapla({...sp, kalemDurumlar:{...(sp.kalemDurumlar||{}),[kalemId]:yeniDurum}});
                    if (sp.durumGecmisi?.length) sipDurumKaydet(sipId, yeniGenelDurum);
                  }
                };

                return (
                  <div key={s.id} style={{ background:"rgba(201,168,76,0.02)", border:"1px solid rgba(201,168,76,0.1)", borderRadius:12, overflow:"hidden" }}>
                    {/* Başlık — her zaman görünür, tıklanabilir */}
                    <div onClick={()=>setAcikSiparisler(p=>({...p,[s.id]:!acik}))} style={{ padding:"10px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        {/* Satır 1: Müşteri + aksiyon butonları */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:13, fontWeight:800, color:GOLD }}>{s.musKod||s.musteri||"Isimsiz"}</span>
                            <span style={{ fontSize:9, color:"#7a6f5a" }}>{new Date(s.tarih).toLocaleDateString("tr-TR")}</span>
                            <span style={{ fontSize:9, color:"#998a6e" }}>{toplamKalem} kalem</span>
                            <span style={{ fontSize:9, color:"#5b9bd5", fontWeight:700 }}>{fN((s.kalemler||[]).reduce((acc,k)=>{const hc=hesapla(k,k.secilenAyar||k.refAyar,s.altinKgUSD,s.mc);return acc+hc.mamulGram*(k.adet||1);},0),2)} gr</span>
                            {(() => {
                              const topKar = (s.kalemler||[]).reduce((acc,k)=>{const hc=hesapla(k,k.secilenAyar||k.refAyar,s.altinKgUSD,s.mc);return acc+hc.karHas*(k.adet||1);},0);
                              const topKarUSD = topKar * ((s.altinKgUSD||0)/1000);
                              return <span style={{ fontSize:9, color:topKar>=0?"#6abf69":"#e85a4f", fontWeight:800 }}>{fN(topKar,2)} has {topKarUSD>0?"≈"+fUSD(topKarUSD):""}</span>;
                            })()}
                            {s.teslimTarihi && <span style={{ fontSize:9, color:"#e8833a", fontWeight:700 }}>Teslim: {new Date(s.teslimTarihi).toLocaleDateString("tr-TR")}</span>}
                          </div>
                          <div style={{ display:"flex", gap:4, alignItems:"center" }} onClick={e=>e.stopPropagation()}>
                            {/* İşleme Al / Durum butonları */}
                            {!s.durumGecmisi?.length && (
                              <button onClick={() => {
                                const baslangicDurum = siparisDurumHesapla(s);
                                sipDurumKaydet(s.id, baslangicDurum);
                              }} style={{ background:"rgba(106,191,105,0.15)", border:"1px solid rgba(106,191,105,0.3)", borderRadius:7, padding:"3px 10px", color:"#6abf69", fontSize:9, fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" }}>
                                ▶ İşleme Al
                              </button>
                            )}
                            {s.durumGecmisi?.length > 0 && (() => {
                              const sonDurum = s.durumGecmisi[s.durumGecmisi.length-1].durum;
                              const sonDurumObj = DURUMLAR.find(d=>d.id===sonDurum);
                              const sure = Date.now() - s.durumGecmisi[s.durumGecmisi.length-1].tarih;
                              return (
                                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                  <span style={{ background:sonDurumObj?.c+"22", color:sonDurumObj?.c, border:"1px solid "+sonDurumObj?.c+"44", borderRadius:5, padding:"2px 7px", fontSize:8, fontWeight:700 }}>
                                    {sonDurumObj?.l||sonDurum}
                                  </span>
                                  <span style={{ fontSize:8, color:"#665d4a" }}>{sureFmt(sure)}</span>
                                </div>
                              );
                            })()}
                            <button onClick={()=>downloadPDF(buildKonfHTML(s,s.altinKgUSD||altinKgUSD,s.mc||madenCarpan,false),(s.musteri||"siparis")+"-musteri")} style={{ ...GH, fontSize:8, padding:"3px 7px" }}>PDF</button>
                            <button onClick={()=>downloadPDF(buildKonfHTML(s,s.altinKgUSD||altinKgUSD,s.mc||madenCarpan,true),(s.musteri||"siparis")+"-ic")} style={{ background:"rgba(232,90,79,0.08)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:9, padding:"3px 7px", color:"#e85a4f", fontSize:8, fontWeight:700, cursor:"pointer" }}>IC</button>
                            <button onClick={()=>{
                              if (!window.confirm("Sipariş silinip konfirmasyona geri alınacak. Emin misiniz?")) return;
                              // Kalemlerden benzersiz modelleri konfirmasyona al
                              const benzersizModeller = [];
                              const goruldu = new Set();
                              (s.kalemler||[]).forEach(k => {
                                if (!goruldu.has(k.id)) {
                                  goruldu.add(k.id);
                                  benzersizModeller.push(k);
                                }
                              });
                              setKonfList(benzersizModeller);
                              setKonfMus(s.musteri||"");
                              setKonfTeslim(s.teslimTarihi||"");
                              setKonfAyar(s.kalemler?.[0]?.secilenAyar||"14K");
                              // Adetleri, notları, renkleri geri yükle
                              const yeniAdet = {}, yeniNot = {}, yeniRenk = {};
                              (s.kalemler||[]).forEach(k => {
                                yeniAdet[k.id] = k.adet||1;
                                yeniNot[k.id] = k.sipNot||"";
                                yeniRenk[k.id] = k.renk||"Sari";
                              });
                              setKonfAdet(yeniAdet);
                              setKonfNot(yeniNot);
                              setKonfRenkler(yeniRenk);
                              delSip(s.id);
                              setSayfa("konfirmasyon");
                            }} style={{ background:"rgba(232,131,58,0.1)", border:"1px solid rgba(232,131,58,0.2)", borderRadius:9, padding:"3px 7px", color:"#e8833a", fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>↩ Düzenle</button>
                            <button onClick={()=>setDelOnay({ type:"siparis", id:s.id })} style={{ ...RD, fontSize:8, padding:"3px 7px" }}>Sil</button>
                            <span style={{ fontSize:10, color:"#665d4a", marginLeft:4 }}>{acik?"▲":"▼"}</span>
                          </div>
                        </div>
                        {/* İlerleme çubuğu */}
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                          <div style={{ flex:1, height:5, background:"rgba(201,168,76,0.1)", borderRadius:3, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:pct+"%", background:pct===100?"#6abf69":pct>50?"#c9a84c":"#e8833a", borderRadius:3, transition:"width .3s" }}/>
                          </div>
                          <span style={{ fontSize:8, color:pct===100?"#6abf69":GOLD, fontWeight:700, whiteSpace:"nowrap" }}>{tamamlanan}/{aktifKalem}{hurdaKalem>0?<span style={{color:"#e85a4f"}}> +{hurdaKalem}H</span>:""}</span>
                          {/* Kalem durum noktaları */}
                          <div style={{ display:"flex", gap:2 }}>
                            {(s.kalemler||[]).map(k => {
                              const d = DURUMLAR.find(d=>d.id===(kalemDurumlar[k.id]||k.durum||"baslanmadi"))||DURUMLAR[0];
                              return <div key={k.id} title={(k.kod||k.ad)+" - "+d.l} style={{ width:8, height:8, borderRadius:4, background:d.c, flexShrink:0 }}/>;
                            })}
                          </div>
                        </div>
                        {/* Toplu ilerleme butonları */}
                        <div style={{ display:"flex", gap:4, marginTop:6, alignItems:"center" }} onClick={e=>e.stopPropagation()}>
                          <span style={{ fontSize:7, color:"#665d4a", fontWeight:700 }}>TOPLU:</span>
                          {DURUMLAR.filter(d=>d.id!=="hurda").map(d => (
                            <button key={d.id} onClick={()=>svS(siparisler.map(sp=>sp.id===s.id?{...sp,kalemDurumlar:Object.fromEntries((sp.kalemler||[]).filter(k=>(sp.kalemDurumlar||{})[k.id]!=="hurda").map(k=>[k.id,d.id]).concat(Object.entries(sp.kalemDurumlar||{}).filter(([,v])=>v==="hurda")))}:sp))} title={d.l} style={{ width:12, height:12, borderRadius:6, background:enYaygin===d.id?d.c:"rgba(255,255,255,0.06)", border:enYaygin===d.id?"2px solid "+d.c:"1px solid rgba(255,255,255,0.1)", cursor:"pointer", padding:0, flexShrink:0 }}/>
                          ))}
                          {sonrakiDurum && (
                            <button onClick={()=>svS(siparisler.map(sp=>sp.id===s.id?{...sp,kalemDurumlar:Object.fromEntries((sp.kalemler||[]).map(k=>[(k.id),(sp.kalemDurumlar||{})[k.id]==="hurda"?"hurda":sonrakiDurum.id]))}:sp))} style={{ background:"rgba(201,168,76,0.1)", border:"1px solid rgba(201,168,76,0.2)", borderRadius:5, padding:"2px 8px", color:GOLD, fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", marginLeft:4 }}>→ {sonrakiDurum.l}</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Açık detay */}
                    {acik && (
                      <div style={{ padding:"2px 14px 10px", borderTop:"1px solid rgba(201,168,76,0.07)" }}>

                        {/* ZAMAN ÇİZELGESİ */}
                        {s.durumGecmisi?.length > 0 && (() => {
                          const gecmis = s.durumGecmisi;
                          const toplamSure = Date.now() - gecmis[0].tarih;
                          const sonDurumObj = DURUMLAR.find(d=>d.id===gecmis[gecmis.length-1].durum)||DURUMLAR[0];
                          const tamamlandi = ["tamam","teslim"].includes(gecmis[gecmis.length-1].durum);
                          return (
                            <div style={{ marginBottom:12, padding:"10px 12px", background:"rgba(91,155,213,0.05)", border:"1px solid rgba(91,155,213,0.12)", borderRadius:10 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                                <span style={{ fontSize:9, fontWeight:700, color:"#5b9bd5" }}>⏱ ÜRETİM TAKİBİ</span>
                                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                  <span style={{ fontSize:8, color:"#665d4a" }}>Toplam: <b style={{ color:"#e8dcc8" }}>{sureFmt(toplamSure)}</b></span>
                                  {tamamlandi && <span style={{ fontSize:8, color:"#6abf69", fontWeight:700 }}>✓ Tamamlandı</span>}
                                </div>
                              </div>

                              {/* Aşamalar — yatay scroll */}
                              <div style={{ overflowX:"auto", paddingBottom:4 }}>
                                <div style={{ display:"flex", alignItems:"flex-start", gap:0, minWidth:"max-content" }}>
                                  {gecmis.map((gec, gi) => {
                                    const durObj = DURUMLAR.find(d=>d.id===gec.durum)||DURUMLAR[0];
                                    const sonrakiGec = gecmis[gi+1];
                                    const buSure = sonrakiGec ? sonrakiGec.tarih - gec.tarih : Date.now() - gec.tarih;
                                    const aktif = gi === gecmis.length - 1;
                                    return (
                                      <div key={gi} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                                        <div style={{ textAlign:"center", width:90 }}>
                                          <div style={{ width:32, height:32, borderRadius:16, background:durObj.c+"33", border:"2px solid "+durObj.c+(aktif&&!tamamlandi?"":"99"), margin:"0 auto 4px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:aktif&&!tamamlandi?"0 0 10px "+durObj.c+"88":"none" }}>
                                            <div style={{ width:12, height:12, borderRadius:6, background:durObj.c }}/>
                                          </div>
                                          <div style={{ fontSize:8, fontWeight:700, color:durObj.c, whiteSpace:"nowrap" }}>{durObj.l}</div>
                                          <div style={{ fontSize:8, color:"#6abf69", fontWeight:600, marginTop:1 }}>{sureFmt(buSure)}</div>
                                          <div style={{ fontSize:7, color:"#554d3a" }}>{new Date(gec.tarih).toLocaleDateString("tr-TR")}</div>
                                        </div>
                                        {gi < gecmis.length - 1 && (
                                          <div style={{ width:20, height:2, background:"rgba(201,168,76,0.25)", flexShrink:0, marginBottom:22 }}/>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {/* → Sonraki aşama butonu */}
                                  {sonrakiDurum && !tamamlandi && (
                                    <div style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                                      <div style={{ width:20, height:2, background:"rgba(201,168,76,0.1)", flexShrink:0, marginBottom:22 }}/>
                                      <button onClick={e=>{
                                        e.stopPropagation();
                                        svS(siparisler.map(sp=>sp.id===s.id?{...sp,kalemDurumlar:Object.fromEntries((sp.kalemler||[]).map(k=>[(k.id),(sp.kalemDurumlar||{})[k.id]==="hurda"?"hurda":sonrakiDurum.id]))}:sp));
                                        sipDurumKaydet(s.id, sonrakiDurum.id);
                                      }} style={{ background:sonrakiDurum.c+"22", border:"2px dashed "+sonrakiDurum.c+"66", borderRadius:8, padding:"5px 10px", color:sonrakiDurum.c, fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", marginBottom:22, textAlign:"center", width:90 }}>
                                        → {sonrakiDurum.l}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Süre özeti bar */}
                              <div style={{ marginTop:8, borderTop:"1px solid rgba(91,155,213,0.1)", paddingTop:8 }}>
                                <div style={{ fontSize:7, color:"#665d4a", marginBottom:4 }}>AŞAMA SÜRELERİ</div>
                                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                  {gecmis.map((gec, gi) => {
                                    const durObj = DURUMLAR.find(d=>d.id===gec.durum)||DURUMLAR[0];
                                    const sonrakiGec = gecmis[gi+1];
                                    const buSure = sonrakiGec ? sonrakiGec.tarih - gec.tarih : Date.now() - gec.tarih;
                                    const pct = toplamSure > 0 ? Math.round(buSure/toplamSure*100) : 0;
                                    return (
                                      <div key={gi} style={{ display:"flex", alignItems:"center", gap:6 }}>
                                        <div style={{ width:60, fontSize:7, color:durObj.c, fontWeight:600, flexShrink:0 }}>{durObj.l}</div>
                                        <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.05)", borderRadius:2, overflow:"hidden" }}>
                                          <div style={{ height:"100%", width:pct+"%", background:durObj.c, borderRadius:2, opacity:0.7 }}/>
                                        </div>
                                        <div style={{ width:60, fontSize:7, color:"#998a6e", textAlign:"right", flexShrink:0 }}>{sureFmt(buSure)} ({pct}%)</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        {/* İşleme alınmamış ama açılmış */}
                        {!s.durumGecmisi?.length && (
                          <div style={{ marginBottom:10, padding:"8px 12px", background:"rgba(106,191,105,0.05)", border:"1px dashed rgba(106,191,105,0.2)", borderRadius:8, display:"flex", alignItems:"center", gap:10 }}>
                            <span style={{ fontSize:9, color:"#665d4a" }}>Bu sipariş henüz işleme alınmadı.</span>
                            <button onClick={e=>{ e.stopPropagation(); sipDurumKaydet(s.id, siparisDurumHesapla(s)); }} style={{ background:"rgba(106,191,105,0.15)", border:"1px solid rgba(106,191,105,0.3)", borderRadius:6, padding:"3px 10px", color:"#6abf69", fontSize:9, fontWeight:800, cursor:"pointer" }}>
                              ▶ İşleme Al
                            </button>
                          </div>
                        )}

                        {(s.kalemler||[]).map(k => {
                          const mevcDurum = kalemDurumlar[k.id] || k.durum || "baslanmadi";
                          const dur = DURUMLAR.find(d => d.id===mevcDurum) || DURUMLAR[0];
                          return (
                            <div key={k.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(201,168,76,0.04)" }}>
                              {k.foto ? <img src={k.foto} alt="" style={{ width:64, height:64, objectFit:"cover", borderRadius:8, flexShrink:0 }}/> : <div style={{ width:64, height:64, background:"rgba(201,168,76,0.06)", borderRadius:8, flexShrink:0 }}/>}
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:10, fontWeight:700, color:"#e8dcc8" }}>
                                  <span style={{ color:GOLD, marginRight:4 }}>{k.kod||""}</span>{k.ad}
                                  {k.renk && <span style={{ color:"#c9a84c", marginLeft:6, fontSize:9 }}>{k.renk}</span>}
                                </div>
                                <div style={{ fontSize:8, color:"#7a6f5a" }}>
                                  {k.secilenAyar||k.refAyar} · {fN(k.gram||0)} gr · {k.adet||1} adet
                                  {k.sipNot && <span style={{ color:"#5b9bd5", marginLeft:4 }}>{k.sipNot}</span>}
                                </div>
                              </div>
                              {/* Durum noktaları + hurda */}
                              <div style={{ display:"flex", gap:3, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                                {DURUMLAR.filter(d=>d.id!=="hurda").map(d => (
                                  <button key={d.id} onClick={()=>durumGuncelle(s.id,k.id,d.id)} title={d.l} style={{ width:12, height:12, borderRadius:6, background:mevcDurum===d.id?d.c:"rgba(255,255,255,0.06)", border:mevcDurum===d.id?"2px solid "+d.c:"1px solid rgba(255,255,255,0.1)", cursor:"pointer", padding:0, flexShrink:0 }}/>
                                ))}
                                <span style={{ fontSize:8, color:dur.c, fontWeight:700, marginLeft:2, whiteSpace:"nowrap" }}>{dur.l}</span>
                                {/* Hurda butonu */}
                                {(() => {
                                  const hurdaAdet = (s.kalemHurda||{})[k.id]||0;
                                  const hurdaNeden = (s.kalemHurdaNeden||{})[k.id]||"";
                                  return (
                                    <button onClick={e=>{e.stopPropagation(); setHurdaModal({sipId:s.id, kalemId:k.id, kalemAd:k.ad, maxAdet:k.adet||1, mevcAdet:hurdaAdet, mevcNeden:hurdaNeden});}}
                                      style={{ display:"flex", alignItems:"center", gap:3, marginLeft:6, background:hurdaAdet>0?"rgba(232,90,79,0.15)":"rgba(232,90,79,0.06)", border:"1px solid rgba(232,90,79,0.25)", borderRadius:6, padding:"2px 7px", cursor:"pointer" }}>
                                      <span style={{ fontSize:7, color:"#e85a4f", fontWeight:700 }}>🗑 HURDA</span>
                                      {hurdaAdet>0 && <span style={{ fontSize:9, color:"#e85a4f", fontWeight:800 }}>{hurdaAdet}/{k.adet||1}</span>}
                                      {hurdaNeden && <span style={{ fontSize:7, color:"#e85a4f", opacity:0.7, maxWidth:60, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{hurdaNeden}</span>}
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MÜŞTERİLER */}
        {sayfa==="musteriler" && (
          <div style={{ animation:"fadein .3s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"#e8dcc8" }}>Musteriler ({Object.keys(musteriler).length})</h2>
              <button onClick={()=>setEditMusteri({ad:"", yeniAd:"", yeni:true})} style={{ ...BG, padding:"6px 14px", fontSize:11 }}>+ Musteri Ekle</button>
            </div>

            {/* Yeni müşteri ekleme formu */}
            {editMusteri?.yeni && (
              <div style={{ background:"rgba(201,168,76,0.04)", border:"1px solid rgba(201,168,76,0.15)", borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
                <div style={{ fontSize:9, color:GOLD, fontWeight:700, marginBottom:8 }}>YENİ MÜŞTERİ</div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:140 }}>
                    <div style={{ fontSize:8, color:"#998a6e", marginBottom:3 }}>Müşteri Adı</div>
                    <input autoFocus value={editMusteri.yeniAd} onChange={e=>setEditMusteri(p=>({...p,yeniAd:e.target.value}))}
                      placeholder="Ad Soyad veya Firma" style={{ ...IS, padding:"6px 10px", fontSize:12 }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:8, color:"#998a6e", marginBottom:3 }}>Kod (opsiyonel)</div>
                    <input value={editMusteri.yeniKod||""} onChange={e=>setEditMusteri(p=>({...p,yeniKod:e.target.value.toUpperCase()}))}
                      placeholder="MUS-001" style={{ ...IS, width:110, padding:"6px 10px", fontSize:12 }}/>
                  </div>
                  <div style={{ display:"flex", gap:6, alignSelf:"flex-end" }}>
                    <button onClick={()=>{
                      const ad = editMusteri.yeniAd.trim();
                      if (!ad) return;
                      // Kod: girilmişse kullan, yoksa otomatik üret
                      const mevcKodlar = Object.values(musteriler);
                      let kod = editMusteri.yeniKod?.trim() ||
                        "MUS-" + String(mevcKodlar.length + 1).padStart(3,"0");
                      // Çakışma varsa sayıyı artır
                      while (mevcKodlar.includes(kod)) {
                        const n = parseInt(kod.split("-")[1]||"0") + 1;
                        kod = "MUS-" + String(n).padStart(3,"0");
                      }
                      const yeni = { ...musteriler, [ad]: kod };
                      svMus(yeni);
                      setEditMusteri(null);
                    }} style={{ ...BG, padding:"6px 14px", fontSize:11 }}>Kaydet</button>
                    <button onClick={()=>setEditMusteri(null)} style={{ ...GH, padding:"6px 10px", fontSize:11 }}>İptal</button>
                  </div>
                </div>
              </div>
            )}

            {Object.keys(musteriler).length===0 && !editMusteri?.yeni && <p style={{ color:"#665d4a", textAlign:"center", padding:"30px", fontSize:12 }}>Henuz musteri kaydi yok.</p>}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {Object.entries(musteriler).sort((a,b)=>a[1].localeCompare(b[1])).map(([ad, kod]) => {
                const musSiparisler = siparisler.filter(s=>(s.musteri||"Isimsiz").trim()===ad);
                const topKar = musSiparisler.reduce((s,x)=>s+(x.kar||0),0);
                const topGram = musSiparisler.reduce((sum,s)=>{
                  (s.kalemler||[]).forEach(k=>{ const hc=hesapla(k,k.secilenAyar||k.refAyar,s.altinKgUSD,s.mc); sum+=hc.mamulGram*(k.adet||1); });
                  return sum;
                }, 0);
                const sonTarih = musSiparisler.reduce((mx,s)=>Math.max(mx,s.tarih||0),0);
                const duzenleniyor = editMusteri?.ad===ad && !editMusteri?.yeni;
                return (
                  <div key={kod} style={{ background:"rgba(201,168,76,0.02)", border:"1px solid rgba(201,168,76,0.08)", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
                    {/* Kod badge */}
                    <div style={{ background:"rgba(201,168,76,0.12)", borderRadius:7, padding:"4px 10px", textAlign:"center", flexShrink:0 }}>
                      <div style={{ fontSize:11, fontWeight:800, color:GOLD }}>{kod}</div>
                    </div>
                    {/* İsim — düzenlenebilir */}
                    <div style={{ flex:1, minWidth:0 }}>
                      {duzenleniyor ? (
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <input autoFocus value={editMusteri.yeniAd} onChange={e=>setEditMusteri(p=>({...p,yeniAd:e.target.value}))} style={{ ...IS, padding:"4px 8px", fontSize:12, width:200 }}/>
                          <button onClick={()=>{
                            const yeniAd = editMusteri.yeniAd.trim();
                            if (!yeniAd || yeniAd===ad) { setEditMusteri(null); return; }
                            const yeni = { ...musteriler };
                            delete yeni[ad];
                            yeni[yeniAd] = kod;
                            svMus(yeni);
                            svS(siparisler.map(s=>(s.musteri||"").trim()===ad?{...s,musteri:yeniAd}:s));
                            setEditMusteri(null);
                          }} style={{ ...BG, padding:"4px 10px", fontSize:10 }}>Kaydet</button>
                          <button onClick={()=>setEditMusteri(null)} style={{ ...GH, padding:"4px 8px", fontSize:10 }}>Vazgec</button>
                        </div>
                      ) : (
                        <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:"#e8dcc8" }}>{ad}</span>
                          <button onClick={()=>setEditMusteri({ad,yeniAd:ad})} style={{ background:"none", border:"none", color:"#665d4a", fontSize:9, cursor:"pointer", textDecoration:"underline" }}>Duzenle</button>
                        </div>
                      )}
                      <div style={{ fontSize:8, color:"#7a6f5a", marginTop:2 }}>
                        {musSiparisler.length} siparis · {fN(topGram,1)} gr · son: {sonTarih?new Date(sonTarih).toLocaleDateString("tr-TR"):"—"}
                      </div>
                    </div>
                    {/* Butonlar */}
                    <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                      <button onClick={()=>downloadPDF(buildMusteriDetayHTML(ad,kod,siparisler),kod+"-detay")} style={{ ...GH, fontSize:9, padding:"5px 10px" }}>PDF</button>
                      <button onClick={()=>{
                        if (musSiparisler.length > 0) {
                          if (!window.confirm(ad+" adlı müşterinin "+musSiparisler.length+" siparişi var. Müşteriyi silmek istediğinize emin misiniz? Siparişler silinmez.")) return;
                        }
                        const yeni = { ...musteriler };
                        delete yeni[ad];
                        svMus(yeni);
                      }} style={{ ...RD, fontSize:9, padding:"5px 10px" }}>Sil</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ANALİZ */}
        {sayfa==="analiz" && (
          <div style={{ animation:"fadein .3s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:6 }}>
              <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"#e8dcc8" }}>Karlılık Analizi</h2>
              <button onClick={()=>downloadPDF(buildSatisRaporuHTML(modeller,siparisler),"satis-raporu")} style={{ ...GH, fontSize:9, padding:"5px 12px" }}>PDF Rapor</button>
            </div>

            {/* DÖNEM FİLTRELERİ */}
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center", marginBottom:12, background:"rgba(201,168,76,0.03)", border:"1px solid rgba(201,168,76,0.1)", borderRadius:10, padding:"8px 12px" }}>
              <span style={{ fontSize:8, color:"#8a7d64", fontWeight:700, marginRight:4 }}>DÖNEM:</span>
              {[
                { id:"bu_ay", l:"Bu Ay" },
                { id:"gecen_ay", l:"Geçen Ay" },
                { id:"3ay", l:"3 Aylık" },
                { id:"6ay", l:"6 Aylık" },
                { id:"yil", l:"Bu Yıl" },
                { id:"ozel", l:"Özel" },
              ].map(d => (
                <button key={d.id} onClick={()=>setAnalizDonem(d.id)} style={{ background:analizDonem===d.id?"rgba(201,168,76,0.18)":"rgba(201,168,76,0.04)", border:"1px solid", borderColor:analizDonem===d.id?"rgba(201,168,76,0.4)":"rgba(201,168,76,0.1)", borderRadius:6, padding:"4px 10px", color:analizDonem===d.id?GOLD:"#7a6f5a", fontSize:9, fontWeight:analizDonem===d.id?700:400, cursor:"pointer" }}>{d.l}</button>
              ))}
              {analizDonem==="ozel" && (
                <>
                  <input type="date" value={analizTarih1} onChange={e=>setAnalizTarih1(e.target.value)} style={{ ...IS, width:120, padding:"4px 7px", fontSize:10 }}/>
                  <span style={{ color:"#665d4a" }}>—</span>
                  <input type="date" value={analizTarih2} onChange={e=>setAnalizTarih2(e.target.value)} style={{ ...IS, width:120, padding:"4px 7px", fontSize:10 }}/>
                </>
              )}
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:8, color:"#7a6f5a" }}>Müşteri:</span>
                <input value={analizMusF} onChange={e=>setAnalizMusF(e.target.value)} placeholder="Ara..." style={{ ...IS, width:110, padding:"4px 7px", fontSize:10 }}/>
                {analizMusF && <button onClick={()=>setAnalizMusF("")} style={{ ...RD, fontSize:9, padding:"3px 7px" }}>X</button>}
              </div>
            </div>

            {/* ÖZET KARTLAR */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:8, marginBottom:16 }}>
              {[
                { l:"Sipariş", v:analiz.siparisSayisi, c:GOLD, icon:"📦" },
                { l:"Net Kâr (has)", v:fN(analiz.tKar,2), c:"#6abf69", icon:"💰" },
                { l:"Yakl. $", v:fUSD(analiz.tKar*(altinKgUSD/1000)), c:"#5b9bd5", icon:"💵" },
                { l:"Ort. Sipariş Kârı", v:analiz.siparisSayisi>0?fN(analiz.tKar/analiz.siparisSayisi,2)+" has":"—", c:"#e8833a", icon:"📊" },
              ].map((s,i) => (
                <div key={i} style={{ background:"rgba(0,0,0,0.25)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ fontSize:16, marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontSize:8, color:s.c, fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>{s.l}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* AYLIK KARLILIK ÇUBUKLARI */}
            {Object.keys(analiz.aylikKar).length > 0 && (
              <div style={{ marginBottom:16, background:"rgba(201,168,76,0.02)", border:"1px solid rgba(201,168,76,0.08)", borderRadius:12, padding:"12px 16px" }}>
                <div style={{ fontSize:10, fontWeight:700, color:GOLD, marginBottom:12 }}>📈 AYLIK KARLILIK</div>
                {(() => {
                  const aylar = Object.entries(analiz.aylikKar).sort((a,b)=>a[0].localeCompare(b[0],"tr"));
                  const maxKar = Math.max(...aylar.map(([,d])=>d.kar), 0.001);
                  return (
                    <div style={{ display:"flex", gap:8, alignItems:"flex-end", overflowX:"auto", paddingBottom:4, minHeight:100 }}>
                      {aylar.map(([ay, d]) => {
                        const pct = Math.max((d.kar/maxKar)*100, 2);
                        const karUSD = d.kar * (altinKgUSD/1000);
                        return (
                          <div key={ay} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:60, flex:1 }}>
                            <div style={{ fontSize:8, color:"#6abf69", fontWeight:700, whiteSpace:"nowrap" }}>{fN(d.kar,1)} has</div>
                            <div style={{ fontSize:7, color:"#5b9bd5" }}>{fUSD(karUSD)}</div>
                            <div style={{ width:"100%", borderRadius:"4px 4px 0 0", background:"linear-gradient(180deg,#6abf69,#4a9a4a)", height:Math.round(pct)+"px", minHeight:4, transition:"height .4s" }}/>
                            <div style={{ fontSize:7, color:"#998a6e", textAlign:"center", whiteSpace:"nowrap" }}>{ay}</div>
                            <div style={{ fontSize:7, color:"#665d4a" }}>{d.siparis} sip.</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              {/* EN KARLI MODELLER */}
              {analiz.topModeller.length>0 && (
                <div style={{ background:"rgba(201,168,76,0.02)", border:"1px solid rgba(201,168,76,0.07)", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:GOLD, marginBottom:10 }}>🏆 EN ÇOK SİPARİŞ EDİLEN</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {analiz.topModeller.slice(0,7).map(([id,d],i) => {
                      const m = modeller.find(x=>x.id===id);
                      const maxKar = Math.max(...analiz.topModeller.map(([,x])=>x.kar), 0.001);
                      return (
                        <div key={id} style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <div style={{ fontSize:9, fontWeight:800, color:i<3?GOLD:"#665d4a", minWidth:16 }}>{i+1}</div>
                          {(m?.foto||d.foto) && <img src={m?.foto||d.foto} alt="" style={{ width:64, height:64, objectFit:"cover", borderRadius:8, flexShrink:0 }}/>}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:"#e8dcc8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.ad}</div>
                            <div style={{ height:3, background:"rgba(201,168,76,0.1)", borderRadius:2, marginTop:2, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:(d.kar/maxKar*100)+"%", background:GOLD, borderRadius:2 }}/>
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontSize:9, fontWeight:800, color:"#6abf69" }}>{fN(d.kar,2)} has</div>
                            <div style={{ fontSize:7, color:"#665d4a" }}>{d.adet} adet</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MÜŞTERİ BAZLI KARLILIK */}
              {analiz.topMusteriler.length>0 && (
                <div style={{ background:"rgba(201,168,76,0.02)", border:"1px solid rgba(201,168,76,0.07)", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:GOLD, marginBottom:10 }}>👤 MÜŞTERİ KARLILIĞI</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {analiz.topMusteriler.slice(0,7).map(([mus,d],i) => {
                      const maxKar = analiz.topMusteriler[0]?.[1]?.topKar || 1;
                      return (
                        <div key={mus} style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <div style={{ fontSize:9, fontWeight:800, color:i<3?GOLD:"#665d4a", minWidth:16 }}>{i+1}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:2 }}>
                              <span style={{ fontSize:9, fontWeight:700, color:"#e8dcc8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{mus}</span>
                              <span style={{ fontSize:9, fontWeight:800, color:"#6abf69", flexShrink:0, marginLeft:6 }}>{fN(d.topKar,2)} has</span>
                            </div>
                            <div style={{ height:3, background:"rgba(201,168,76,0.1)", borderRadius:2, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:(d.topKar/maxKar*100)+"%", background:"#6abf69", borderRadius:2 }}/>
                            </div>
                            <div style={{ fontSize:7, color:"#665d4a", marginTop:1 }}>{d.siparisSayisi} siparis · {fN(d.topGram,1)} gr</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ÜRETİM SÜRE ANALİZİ */}
            {(() => {
              const islenmis = siparisler.filter(s => s.durumGecmisi?.length > 0);
              if (!islenmis.length) return null;

              // Her aşama için ortalama süre hesapla
              const asamaSureler = {};
              const tamamlananlar = [];
              islenmis.forEach(s => {
                const gecmis = s.durumGecmisi;
                const tamamlandi = ["tamam","teslim"].includes(gecmis[gecmis.length-1].durum);
                const topSure = tamamlandi
                  ? gecmis[gecmis.length-1].tarih - gecmis[0].tarih
                  : Date.now() - gecmis[0].tarih;

                if (tamamlandi) tamamlananlar.push({ id:s.id, musteri:s.musKod||s.musteri, sure:topSure, tarih:s.tarih });

                gecmis.forEach((gec, gi) => {
                  const sonrakiGec = gecmis[gi+1];
                  const buSure = sonrakiGec ? sonrakiGec.tarih - gec.tarih : (tamamlandi ? 0 : Date.now() - gec.tarih);
                  if (buSure <= 0) return;
                  if (!asamaSureler[gec.durum]) asamaSureler[gec.durum] = { toplam:0, sayi:0 };
                  asamaSureler[gec.durum].toplam += buSure;
                  asamaSureler[gec.durum].sayi++;
                });
              });

              const ortTopSure = tamamlananlar.length > 0
                ? tamamlananlar.reduce((s,x)=>s+x.sure,0) / tamamlananlar.length : 0;
              const maxOrt = Math.max(...Object.values(asamaSureler).map(x=>x.toplam/x.sayi), 1);

              return (
                <div style={{ marginBottom:16, background:"rgba(91,155,213,0.03)", border:"1px solid rgba(91,155,213,0.1)", borderRadius:12, padding:"12px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#5b9bd5" }}>⏱ ÜRETİM SÜRE ANALİZİ</div>
                    <div style={{ display:"flex", gap:12 }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:7, color:"#665d4a" }}>Takip edilen</div>
                        <div style={{ fontSize:12, fontWeight:800, color:"#5b9bd5" }}>{islenmis.length} sipariş</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:7, color:"#665d4a" }}>Ort. tamamlanma</div>
                        <div style={{ fontSize:12, fontWeight:800, color:"#6abf69" }}>{sureFmt(ortTopSure)}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:7, color:"#665d4a" }}>Tamamlanan</div>
                        <div style={{ fontSize:12, fontWeight:800, color:GOLD }}>{tamamlananlar.length}</div>
                      </div>
                    </div>
                  </div>

                  {/* Aşama ortalama süreleri */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:8, color:"#8a7d64", fontWeight:700, marginBottom:6 }}>AŞAMA BAŞINA ORT. SÜRE</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {Object.entries(asamaSureler)
                        .sort((a,b) => DURUMLAR.findIndex(d=>d.id===a[0]) - DURUMLAR.findIndex(d=>d.id===b[0]))
                        .map(([durum, data]) => {
                          const durObj = DURUMLAR.find(d=>d.id===durum)||DURUMLAR[0];
                          const ort = data.toplam / data.sayi;
                          const pct = Math.round(ort/maxOrt*100);
                          return (
                            <div key={durum} style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ width:70, fontSize:8, color:durObj.c, fontWeight:600, flexShrink:0 }}>{durObj.l}</div>
                              <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:pct+"%", background:durObj.c, borderRadius:3, opacity:0.75, transition:"width .4s" }}/>
                              </div>
                              <div style={{ width:80, fontSize:8, color:"#998a6e", textAlign:"right", flexShrink:0 }}>
                                {sureFmt(ort)} · {data.sayi}x
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* En hızlı / en yavaş */}
                  {tamamlananlar.length > 0 && (
                    <div style={{ display:"flex", gap:10 }}>
                      <div style={{ flex:1, padding:"6px 10px", background:"rgba(106,191,105,0.06)", borderRadius:7, border:"1px solid rgba(106,191,105,0.12)" }}>
                        <div style={{ fontSize:7, color:"#6abf69", fontWeight:700, marginBottom:3 }}>⚡ EN HIZLI</div>
                        {[...tamamlananlar].sort((a,b)=>a.sure-b.sure).slice(0,3).map((x,i) => (
                          <div key={i} style={{ fontSize:8, color:"#e8dcc8", marginBottom:2 }}>
                            <span style={{ color:GOLD, fontWeight:700 }}>{x.musteri}</span> · {sureFmt(x.sure)}
                          </div>
                        ))}
                      </div>
                      <div style={{ flex:1, padding:"6px 10px", background:"rgba(232,131,58,0.06)", borderRadius:7, border:"1px solid rgba(232,131,58,0.12)" }}>
                        <div style={{ fontSize:7, color:"#e8833a", fontWeight:700, marginBottom:3 }}>🐢 EN UZUN</div>
                        {[...tamamlananlar].sort((a,b)=>b.sure-a.sure).slice(0,3).map((x,i) => (
                          <div key={i} style={{ fontSize:8, color:"#e8dcc8", marginBottom:2 }}>
                            <span style={{ color:GOLD, fontWeight:700 }}>{x.musteri}</span> · {sureFmt(x.sure)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* HURDA TAKİBİ */}
            {analiz.topHurda.length>0 && (
              <div style={{ background:"rgba(232,90,79,0.03)", border:"1px solid rgba(232,90,79,0.1)", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#e85a4f", marginBottom:10 }}>🗑 HURDA TAKİBİ</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {analiz.topHurda.slice(0,5).map(([id,d]) => {
                    const m = modeller.find(x=>x.id===id);
                    return (
                      <div key={id} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(232,90,79,0.05)", borderRadius:8, padding:"6px 10px" }}>
                        {m?.foto && <img src={m.foto} alt="" style={{ width:64, height:64, objectFit:"cover", borderRadius:8 }}/>}
                        <div>
                          <div style={{ fontSize:9, fontWeight:700, color:"#e8dcc8" }}>{d.ad}</div>
                          <div style={{ fontSize:8, color:"#e85a4f" }}>{d.sayi} hurda</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {analiz.siparisSayisi===0 && <p style={{ color:"#665d4a", textAlign:"center", padding:"40px", fontSize:12 }}>Bu dönemde tamamlanan sipariş yok.</p>}
          </div>
        )}


        {/* AYARLAR */}
        {sayfa==="ayarlar" && (
          <div style={{ animation:"fadein .3s", maxWidth:700 }}>
            <h2 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>⚙ Ayarlar</h2>

            {/* TEMA SEÇİCİ */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:16, padding:"16px 18px", marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.gold, marginBottom:14, letterSpacing:"0.03em" }}>🎨 UYGULAMA TEMASI</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {Object.values(TEMALAR).map(t => (
                  <button key={t.id} onClick={()=>temaUygula(t)} style={{
                    background: t.bg, border: tema.id===t.id ? "2px solid "+t.accent : "1px solid "+t.border,
                    borderRadius:14, padding:0, cursor:"pointer", overflow:"hidden", textAlign:"left",
                    transition:"all .25s", opacity: tema.id===t.id ? 1 : 0.75,
                    boxShadow: tema.id===t.id ? "0 0 20px "+t.accent+"44" : "0 2px 8px rgba(0,0,0,0.1)"
                  }}>
                    {/* Mini önizleme */}
                    <div style={{ display:"flex", gap:4, padding:"8px 10px 4px" }}>
                      <div style={{ width:22, height:16, borderRadius:4, background:t.card, border:"1px solid "+t.border }}/>
                      <div style={{ width:22, height:16, borderRadius:4, background:t.card, border:"1px solid "+t.border }}/>
                      <div style={{ width:22, height:16, borderRadius:4, background:t.card, border:"1px solid "+t.border }}/>
                    </div>
                    <div style={{ padding:"4px 10px 8px" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:t.text }}>{t.l}</div>
                      <div style={{ fontSize:8, color:t.sub, marginTop:2 }}>{t.ac}</div>
                    </div>
                    {tema.id===t.id && <div style={{ background:t.accent, padding:"2px 0", textAlign:"center", fontSize:8, fontWeight:700, color:t.bg2, letterSpacing:"0.05em" }}>AKTİF</div>}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:8, color:T.dim, marginTop:10, textAlign:"center" }}>Tema seçimi tarayıcıya kaydedilir</div>
            </div>

            {/* ŞİFRE DEĞİŞTİR */}
            <SifreDegistir />

            {/* VARSAYILAN DEGERLER */}
            <div style={{ background:"rgba(201,168,76,0.04)", border:"1px solid rgba(201,168,76,0.1)", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:GOLD, marginBottom:12 }}>💰 VARSAYILAN DEGERLER</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                <div style={{ flex:1 }}><Fl label="Altin $/kg">
                  <input type="number" value={ayarVarsAltinKg} onChange={e=>setAyarVarsAltinKg(e.target.value)} placeholder="152000" style={IS}/>
                </Fl></div>
                <div style={{ flex:1 }}><Fl label="Uretim mly/gr">
                  <input type="number" value={ayarVarsMc} onChange={e=>setAyarVarsMc(e.target.value)} placeholder="0.030" style={IS}/>
                </Fl></div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                <div style={{ flex:"0 0 130px" }}>
                  <Fl label="Iscilik birimi">
                    <select value={ayarVarsIscilikBirim} onChange={e=>setAyarVarsIscilikBirim(e.target.value)} style={{ ...IS, padding:"8px 6px" }}>
                      <option value="dolar">$ / gr</option>
                      <option value="milyem">milyem / gr</option>
                    </select>
                  </Fl>
                </div>
                <div style={{ flex:1 }}><Fl label="Iscilik tutari">
                  <input type="number" value={ayarVarsIscilik} onChange={e=>setAyarVarsIscilik(e.target.value)} placeholder="2.75" style={IS}/>
                </Fl></div>
              </div>
              <button onClick={() => {
                const yeniAy = { kategoriler:ayarKategoriler, etiketler:ayarEtiketler, varsAltinKg:ayarVarsAltinKg, varsMc:ayarVarsMc, varsIscilik:ayarVarsIscilik, varsIscilikBirim:ayarVarsIscilikBirim };
                sv("v7ay", yeniAy);
                if (ayarVarsAltinKg) setAltinKg(ayarVarsAltinKg);
                if (ayarVarsMc) setMc(ayarVarsMc);
                alert("Ayarlar kaydedildi!");
              }} style={{ ...BG, fontSize:10, padding:"6px 16px" }}>Kaydet ve Uygula</button>
            </div>

            {/* ETİKET YÖNETİMİ */}
            <div style={{ background:"rgba(167,139,250,0.04)", border:"1px solid rgba(167,139,250,0.1)", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#a78bfa", marginBottom:10 }}>🏷 ETİKET YÖNETİMİ</div>
              <div style={{ fontSize:9, color:"#665d4a", marginBottom:8 }}>Modellerde kullanilan tum etiketler:</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                {tumEtiketler.length === 0 && <span style={{ fontSize:9, color:"#665d4a" }}>Henuz etiket yok</span>}
                {tumEtiketler.map(e => (
                  <span key={e} style={{ background:"rgba(167,139,250,0.1)", color:"#a78bfa", padding:"3px 8px", borderRadius:5, fontSize:9, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                    #{e}
                    <button onClick={() => {
                      // Tüm modellerde bu etiketi kaldır
                      if (window.confirm && !window.confirm("'"+e+"' etiketini tum modellerden kaldir?")) return;
                      svM(modeller.map(m => ({ ...m, etiketler: (m.etiketler||[]).filter(x => x!==e) })));
                    }} style={{ background:"none", border:"none", color:"#e85a4f", cursor:"pointer", fontSize:10, padding:0, lineHeight:1 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <input value={ayarYeniEtiket} onChange={e=>setAyarYeniEtiket(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&ayarYeniEtiket.trim()){ setAyarYeniEtiket(""); }}} placeholder="yeni-etiket-adi..." style={{ ...IS, flex:1, padding:"6px 10px", fontSize:11 }}/>
              </div>
            </div>

            {/* KATEGORİ YÖNETİMİ */}
            <div style={{ background:"rgba(91,155,213,0.04)", border:"1px solid rgba(91,155,213,0.1)", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#5b9bd5", marginBottom:10 }}>📂 KATEGORİ YÖNETİMİ</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                {ayarKategoriler.map(k => (
                  <span key={k} style={{ background:"rgba(91,155,213,0.1)", color:"#5b9bd5", padding:"3px 8px", borderRadius:5, fontSize:9, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                    {k}
                    {ayarKategoriler.length > 1 && (
                      <button onClick={() => {
                        const yeni = ayarKategoriler.filter(x => x!==k);
                        setAyarKategoriler(yeni);
                        sv("v7ay", { kategoriler:yeni, etiketler:ayarEtiketler, varsAltinKg:ayarVarsAltinKg, varsMc:ayarVarsMc, varsIscilik:ayarVarsIscilik, varsIscilikBirim:ayarVarsIscilikBirim });
                      }} style={{ background:"none", border:"none", color:"#e85a4f", cursor:"pointer", fontSize:10, padding:0, lineHeight:1 }}>×</button>
                    )}
                  </span>
                ))}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <input value={ayarYeniKategori} onChange={e=>setAyarYeniKategori(e.target.value)} placeholder="yeni-kategori..." style={{ ...IS, flex:1, padding:"6px 10px", fontSize:11 }}/>
                <button onClick={() => {
                  const k = ayarYeniKategori.trim().toLowerCase().replace(/\s+/g,"-");
                  if (!k || ayarKategoriler.includes(k)) return;
                  const yeni = [...ayarKategoriler, k];
                  setAyarKategoriler(yeni);
                  setAyarYeniKategori("");
                  sv("v7ay", { kategoriler:yeni, etiketler:ayarEtiketler, varsAltinKg:ayarVarsAltinKg, varsMc:ayarVarsMc, varsIscilik:ayarVarsIscilik, varsIscilikBirim:ayarVarsIscilikBirim });
                }} style={{ ...GH, padding:"6px 12px", fontSize:10 }}>+ Ekle</button>
              </div>
            </div>

            {/* ÖZEL TAŞ YÖNETİMİ */}
            <div style={{ background:"rgba(91,155,213,0.04)", border:"1px solid rgba(91,155,213,0.12)", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#5b9bd5", marginBottom:10 }}>💎 ÖZEL TAŞ BOYUTLARI</div>
              <div style={{ fontSize:9, color:"#665d4a", marginBottom:10 }}>Tabloda olmayan taş boyutlarını buraya ekleyin. Model formunda otomatik kullanılır.</div>

              {/* Mevcut özel taşlar */}
              {ozelTaslar.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {ozelTaslar.map((t, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:"rgba(91,155,213,0.06)", borderRadius:7 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:"#5b9bd5", minWidth:70 }}>{t.sekil}</span>
                        <span style={{ fontSize:10, color:"#e8dcc8", minWidth:80 }}>{t.boyut}</span>
                        <span style={{ fontSize:9, color:"#6abf69" }}>{t.gramPerAdet.toFixed(6)} gr/adet</span>
                        <span style={{ fontSize:8, color:"#665d4a" }}>({Math.round(1/t.gramPerAdet)} adet/gr)</span>
                        <button onClick={() => {
                          const yeni = ozelTaslar.filter((_,j)=>j!==i);
                          setOzelTaslar(yeni);
                          sv("v7ay",{kategoriler:ayarKategoriler,etiketler:ayarEtiketler,varsAltinKg:ayarVarsAltinKg,varsMc:ayarVarsMc,varsIscilik:ayarVarsIscilik,varsIscilikBirim:ayarVarsIscilikBirim,kayitliNotlar,ozelTaslar:yeni});
                        }} style={{ marginLeft:"auto", background:"rgba(232,90,79,0.1)", border:"none", borderRadius:4, padding:"2px 7px", color:"#e85a4f", fontSize:9, cursor:"pointer" }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Yeni özel taş ekle */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"flex-end" }}>
                <div>
                  <div style={{ fontSize:8, color:"#8a7d64", marginBottom:3 }}>Şekil</div>
                  <select value={ozelTasSekil} onChange={e=>setOzelTasSekil(e.target.value)} style={{ ...IS, width:110, padding:"6px 8px", fontSize:11 }}>
                    {["ROUND","OVAL","DAMLA","MARKİZ","TRAPEZ","BAGET","KARE","KALP"].map(s=><option key={s} value={s}>{s}</option>)}
                    <option value="DİĞER">DİĞER (özel isim)</option>
                  </select>
                </div>
                {/* DİĞER seçilince özel isim alanı */}
                {ozelTasSekil==="DİĞER" && (
                  <div>
                    <div style={{ fontSize:8, color:"#8a7d64", marginBottom:3 }}>Taş adı (örn: OCTAGON)</div>
                    <input value={ozelTasOzelIsim||""} onChange={e=>setOzelTasOzelIsim(e.target.value.toUpperCase())} placeholder="OCTAGON, TRILLIANT..." style={{ ...IS, width:140, padding:"6px 8px", fontSize:11 }} autoFocus/>
                  </div>
                )}
                <div>
                  <div style={{ fontSize:8, color:"#8a7d64", marginBottom:3 }}>Boyut (örn: 3X2, 2mm)</div>
                  <input value={ozelTasBoyut} onChange={e=>setOzelTasBoyut(e.target.value)} placeholder="örn: 3X2" style={{ ...IS, width:110, padding:"6px 8px", fontSize:11 }}/>
                </div>
                <div>
                  <div style={{ fontSize:8, color:"#8a7d64", marginBottom:3 }}>Gram / adet</div>
                  <input type="number" value={ozelTasGram} onChange={e=>setOzelTasGram(e.target.value)} placeholder="0.0100" style={{ ...IS, width:110, padding:"6px 8px", fontSize:11 }}/>
                </div>
                <button onClick={() => {
                  if (!ozelTasBoyut.trim() || !ozelTasGram) return;
                  const gercekSekil = ozelTasSekil==="DİĞER" ? (ozelTasOzelIsim||"").trim().toUpperCase() : ozelTasSekil;
                  if (!gercekSekil) return;
                  const yeniTas = { sekil:gercekSekil, boyut:ozelTasBoyut.trim(), gramPerAdet:Number(ozelTasGram) };
                  const yeni = [...ozelTaslar.filter(t=>!(t.sekil===yeniTas.sekil&&t.boyut===yeniTas.boyut)), yeniTas];
                  setOzelTaslar(yeni);
                  setOzelTasBoyut(""); setOzelTasGram(""); if(ozelTasSekil==="DİĞER") setOzelTasOzelIsim("");
                  sv("v7ay",{kategoriler:ayarKategoriler,etiketler:ayarEtiketler,varsAltinKg:ayarVarsAltinKg,varsMc:ayarVarsMc,varsIscilik:ayarVarsIscilik,varsIscilikBirim:ayarVarsIscilikBirim,kayitliNotlar,ozelTaslar:yeni});
                }} style={{ ...BG, padding:"8px 14px", fontSize:10, alignSelf:"flex-end" }}>+ Ekle</button>
              </div>

              {ozelTasBoyut && ozelTasGram && (
                <div style={{ marginTop:6, fontSize:9, color:"#6abf69" }}>
                  → {ozelTasSekil} {ozelTasBoyut}: {Number(ozelTasGram).toFixed(6)} gr/adet · yakl. {Math.round(1/Number(ozelTasGram))} adet/gr
                </div>
              )}
            </div>

            {/* KOD YÖNETİMİ */}
            <div style={{ background:"rgba(106,191,105,0.04)", border:"1px solid rgba(106,191,105,0.1)", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#6abf69", marginBottom:10 }}>🔑 KOLEKSIYON KOD ONEKLERİ</div>
              <div style={{ fontSize:9, color:"#665d4a", marginBottom:10 }}>Mevcut koleksiyonlar ve kod onekleri:</div>
              {kollar.length === 0 && <p style={{ fontSize:9, color:"#665d4a" }}>Henuz koleksiyon yok</p>}
              {kollar.map(kol => {
                const kolModeller = modeller.filter(m => m.ki === kol.id);
                return (
                  <div key={kol.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, padding:"8px 10px", background:"rgba(0,0,0,0.15)", borderRadius:8 }}>
                    <div style={{ background:"rgba(201,168,76,0.15)", color:GOLD, padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:800, minWidth:50, textAlign:"center" }}>{kol.on||"—"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#e8dcc8" }}>{kol.ad}</div>
                      <div style={{ fontSize:8, color:"#665d4a" }}>{kolModeller.length} model · Ornek: {kol.on||"XX"}-001, {kol.on||"XX"}-002...</div>
                    </div>
                    <button onClick={() => { setSayfa("koleksiyonlar"); }} style={{ ...GH, fontSize:8, padding:"3px 8px" }}>Duzenle</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* TOPLU KOPYALA MODAL */}
      {topluKopyalaModal && (
        <Modal open={topluKopyalaModal} onClose={()=>{ setTopluKopyalaModal(false); setTopluHedefKolId(""); }} title={"Toplu Kopyala ("+seciliModeller.size+" model)"}>
          <div style={{ fontSize:9, color:"#998a6e", marginBottom:10 }}>
            Seçilen modeller aşağıdaki koleksiyona kopyalanacak. Kodlar otomatik atanır.
          </div>
          {/* Seçili modeller özeti */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:12, maxHeight:100, overflowY:"auto" }}>
            {[...seciliModeller].map(id => {
              const m = modeller.find(x=>x.id===id);
              if (!m) return null;
              return (
                <span key={id} style={{ background:"rgba(91,155,213,0.1)", color:"#5b9bd5", padding:"2px 7px", borderRadius:5, fontSize:9, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                  {m.foto && <img src={m.foto} style={{ width:14, height:14, objectFit:"cover", borderRadius:2 }}/>}
                  {m.kod} · {m.ad}
                </span>
              );
            })}
          </div>
          {/* Hedef koleksiyon */}
          <Fl label="Hedef Koleksiyon">
            <select
              value={topluHedefKolId}
              onChange={e=>setTopluHedefKolId(e.target.value)}
              style={{ ...IS, padding:"8px 10px" }}>
              <option value="">-- Koleksiyon seçin --</option>
              {kollar.map(k=>(
                <option key={k.id} value={k.id}>{k.on?"["+k.on+"] ":""}{k.ad}</option>
              ))}
            </select>
          </Fl>
          <button
            disabled={!topluHedefKolId}
            onClick={() => {
              const hedefKol = kollar.find(k=>k.id===topluHedefKolId);
              const mevcKodlar = modeller.filter(m=>m.ki===topluHedefKolId);
              let sayac = mevcKodlar.length + 1;
              const yeniModeller = [...modeller];
              [...seciliModeller].forEach(id => {
                const m = modeller.find(x=>x.id===id);
                if (!m) return;
                let yeniKod = hedefKol?.on
                  ? hedefKol.on + "-" + String(sayac).padStart(3,"0")
                  : m.kod + "-K" + sayac;
                while (yeniModeller.find(x=>x.kod===yeniKod)) {
                  sayac++;
                  yeniKod = hedefKol?.on
                    ? hedefKol.on + "-" + String(sayac).padStart(3,"0")
                    : m.kod + "-K" + sayac;
                }
                yeniModeller.push({ ...m, id:uid(), kod:yeniKod, ki:topluHedefKolId, t:Date.now(), durum:"baslanmadi" });
                sayac++;
              });
              svM(yeniModeller);
              setTopluKopyalaModal(false);
              setTopluHedefKolId("");
              setSeciliModeller(new Set());
              if (hedefKol) { setAktifKol(hedefKol); setSayfa("modeller"); }
            }}
            style={{ ...BG, width:"100%", marginTop:10, opacity:topluHedefKolId?1:0.4 }}>
            {seciliModeller.size} Modeli Kopyala
          </button>
        </Modal>
      )}

      {/* KOPYALA MODAL */}
      {kopyalaModal && (
        <Modal open={!!kopyalaModal} onClose={()=>setKopyalaModal(null)} title="Modeli Kopyala">
          {/* Kaynak model bilgisi */}
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14, padding:"8px 10px", background:"rgba(201,168,76,0.05)", borderRadius:8 }}>
            {kopyalaModal.model.foto && <img src={kopyalaModal.model.foto} alt="" style={{ width:48, height:48, objectFit:"cover", borderRadius:6 }}/>}
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:GOLD }}>{kopyalaModal.model.kod}</div>
              <div style={{ fontSize:11, color:"#e8dcc8" }}>{kopyalaModal.model.ad}</div>
              <div style={{ fontSize:9, color:"#998a6e" }}>{kopyalaModal.model.gram}gr · {kopyalaModal.model.refAyar}</div>
            </div>
          </div>

          {/* Hedef koleksiyon seç */}
          <Fl label="Hangi koleksiyona kopyalansın?">
            <select value={kopyalaModal.hedefKolId} onChange={e=>setKopyalaModal(p=>({...p,hedefKolId:e.target.value}))}
              style={{ ...IS, padding:"8px 10px" }}>
              <option value="">-- Koleksiyon seçin --</option>
              {kollar.filter(k=>k.id!==kopyalaModal.model.ki).map(k=>(
                <option key={k.id} value={k.id}>{k.on ? "["+k.on+"] " : ""}{k.ad}</option>
              ))}
            </select>
          </Fl>

          {/* Yeni kod */}
          {kopyalaModal.hedefKolId && (() => {
            const hedefKol = kollar.find(k=>k.id===kopyalaModal.hedefKolId);
            const mevcKodlar = modeller.filter(m=>m.ki===kopyalaModal.hedefKolId).map(m=>m.kod);
            const oneri = hedefKol?.on
              ? hedefKol.on + "-" + String(mevcKodlar.length+1).padStart(3,"0")
              : kopyalaModal.model.kod + "-K";
            return (
              <Fl label="Yeni kod" hint="Kopya için farklı bir kod">
                <input value={kopyalaModal.yeniKod ?? oneri}
                  onChange={e=>setKopyalaModal(p=>({...p,yeniKod:e.target.value.toUpperCase()}))}
                  style={{ ...IS, padding:"8px 10px", fontSize:12 }}/>
              </Fl>
            );
          })()}

          <button
            disabled={!kopyalaModal.hedefKolId}
            onClick={() => {
              const hedefKol = kollar.find(k=>k.id===kopyalaModal.hedefKolId);
              const mevcKodlar = modeller.filter(m=>m.ki===kopyalaModal.hedefKolId).map(m=>m.kod);
              const oneriKod = hedefKol?.on
                ? hedefKol.on + "-" + String(mevcKodlar.length+1).padStart(3,"0")
                : kopyalaModal.model.kod + "-K";
              const yeniKod = (kopyalaModal.yeniKod ?? oneriKod).trim().toUpperCase();
              const kopya = {
                ...kopyalaModal.model,
                id: uid(),
                kod: yeniKod,
                ki: kopyalaModal.hedefKolId,
                t: Date.now(),
                durum: "baslanmadi",
              };
              svM([...modeller, kopya]);
              setKopyalaModal(null);
              // Kopyalanınan koleksiyona git
              const hedef = kollar.find(k=>k.id===kopyalaModal.hedefKolId);
              if (hedef) { setAktifKol(hedef); setSayfa("modeller"); }
            }}
            style={{ ...BG, width:"100%", marginTop:10, opacity:kopyalaModal.hedefKolId?1:0.4 }}>
            Kopyala
          </button>
        </Modal>
      )}

      {/* HURDA MODAL */}
      {hurdaModal && (
        <Modal open={!!hurdaModal} onClose={()=>setHurdaModal(null)} title="Hurda Kaydı">
          <div style={{ fontSize:11, fontWeight:700, color:"#e8dcc8", marginBottom:12 }}>
            {hurdaModal.kalemAd}
          </div>
          {/* Hurda adedi */}
          <Fl label={"Hurda Adedi (max "+hurdaModal.maxAdet+")"}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {Array.from({length:hurdaModal.maxAdet+1},(_,i)=>i).map(n => (
                <button key={n} onClick={()=>setHurdaModal(p=>({...p,mevcAdet:n}))}
                  style={{ background:hurdaModal.mevcAdet===n?"rgba(232,90,79,0.25)":"rgba(232,90,79,0.06)", border:"1px solid", borderColor:hurdaModal.mevcAdet===n?"rgba(232,90,79,0.5)":"rgba(232,90,79,0.15)", borderRadius:6, padding:"5px 10px", color:hurdaModal.mevcAdet===n?"#e85a4f":"#998a6e", fontSize:12, fontWeight:hurdaModal.mevcAdet===n?800:400, cursor:"pointer", minWidth:36 }}>
                  {n}
                </button>
              ))}
            </div>
          </Fl>
          {/* Hazır neden şablonları */}
          <Fl label="Hurda Nedeni">
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
              {HURDA_NEDENLER.map(n => (
                <button key={n} onClick={()=>setHurdaModal(p=>({...p,mevcNeden:n}))}
                  style={{ background:hurdaModal.mevcNeden===n?"rgba(232,90,79,0.2)":"rgba(232,90,79,0.05)", border:"1px solid", borderColor:hurdaModal.mevcNeden===n?"rgba(232,90,79,0.4)":"rgba(232,90,79,0.12)", borderRadius:6, padding:"4px 10px", color:hurdaModal.mevcNeden===n?"#e85a4f":"#998a6e", fontSize:9, fontWeight:hurdaModal.mevcNeden===n?700:400, cursor:"pointer" }}>
                  {n}
                </button>
              ))}
            </div>
            <input value={hurdaModal.mevcNeden} onChange={e=>setHurdaModal(p=>({...p,mevcNeden:e.target.value}))}
              placeholder="veya manuel yaz..." style={{ ...IS, width:"100%", padding:"6px 10px", fontSize:11 }}/>
          </Fl>
          {/* Kaydet */}
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <button onClick={()=>{
              svS(siparisler.map(sp => sp.id===hurdaModal.sipId ? {
                ...sp,
                kalemHurda: { ...(sp.kalemHurda||{}), [hurdaModal.kalemId]: hurdaModal.mevcAdet },
                kalemHurdaNeden: { ...(sp.kalemHurdaNeden||{}), [hurdaModal.kalemId]: hurdaModal.mevcNeden },
              } : sp));
              setHurdaModal(null);
            }} style={{ ...BG, flex:1, padding:"8px 0" }}>Kaydet</button>
            {hurdaModal.mevcAdet > 0 && (
              <button onClick={()=>{
                svS(siparisler.map(sp => sp.id===hurdaModal.sipId ? {
                  ...sp,
                  kalemHurda: { ...(sp.kalemHurda||{}), [hurdaModal.kalemId]: 0 },
                  kalemHurdaNeden: { ...(sp.kalemHurdaNeden||{}), [hurdaModal.kalemId]: "" },
                } : sp));
                setHurdaModal(null);
              }} style={{ ...RD, padding:"8px 16px", fontSize:10 }}>Temizle</button>
            )}
          </div>
        </Modal>
      )}

      {/* YEDEK MODAL */}
      {/* KATALOG SIRALAMA ÖNİZLEME */}
      <Modal open={katalogSiralaModal} onClose={()=>setKatalogSiralaModal(false)} title={"Katalog — " + (katalogKol?.ad||"")}>
        {/* AYAR SEÇİCİ */}
        <div style={{ display:"flex", gap:6, marginBottom:10, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ fontSize:9, color:T.sub, fontWeight:700 }}>Ayar:</span>
          {["8K","10K","14K","18K","22K","925"].map(a => (
            <button key={a} onClick={()=>setKatalogAyar(a)} style={{
              background: katalogAyar===a ? T.gold : T.btnBg, border:"1px solid "+(katalogAyar===a?T.gold:T.btnBorder),
              borderRadius:6, padding:"3px 10px", fontSize:9, fontWeight:katalogAyar===a?800:400,
              color:katalogAyar===a?T.bg2:T.text, cursor:"pointer"
            }}>{a}</button>
          ))}
        </div>

        {/* HIZLI FİLTRE */}
        <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:9, color:T.sub, fontWeight:700 }}>Filtre:</span>
          {/* Tümünü seç/kaldır */}
          <button onClick={() => {
            if (katalogKol) {
              const km = modeller.filter(m => m.ki===katalogKol.id);
              setKatalogSiraliModeller([...km].sort(dogalSirala));
            }
          }} style={{ background:"rgba(106,191,105,0.1)", border:"1px solid rgba(106,191,105,0.2)", borderRadius:6, padding:"3px 10px", color:"#6abf69", fontSize:9, fontWeight:700, cursor:"pointer" }}>✓ Tümünü Ekle</button>
          <button onClick={() => setKatalogSiraliModeller([])} style={{ background:"rgba(232,90,79,0.1)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:6, padding:"3px 10px", color:"#e85a4f", fontSize:9, fontWeight:700, cursor:"pointer" }}>✕ Tümünü Kaldır</button>
          {/* Kategoriye göre */}
          {["yuzuk","kolye","bileklik","kupe","pendant","set"].map(kat => {
            const km = modeller.filter(m => m.ki===katalogKol?.id && m.kategori===kat);
            if (km.length === 0) return null;
            return (
              <button key={kat} onClick={() => {
                const mevcutIdler = new Set(katalogSiraliModeller.map(m => m.id));
                const eklenecekler = km.filter(m => !mevcutIdler.has(m.id));
                setKatalogSiraliModeller([...katalogSiraliModeller, ...eklenecekler].sort(dogalSirala));
              }} style={{ background:T.btnBg, border:"1px solid "+T.btnBorder, borderRadius:6, padding:"3px 10px", color:T.text, fontSize:9, cursor:"pointer" }}>
                + {kat} ({km.length})
              </button>
            );
          })}
        </div>

        {/* ETİKET FİLTRESİ */}
        {(() => {
          const tumEtiketler = [...new Set((modeller.filter(m=>m.ki===katalogKol?.id)).flatMap(m=>m.etiketler||[]))];
          if (tumEtiketler.length === 0) return null;
          return (
            <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:9, color:T.sub, fontWeight:700 }}>Etiket:</span>
              {tumEtiketler.map(et => {
                const km = modeller.filter(m => m.ki===katalogKol?.id && (m.etiketler||[]).includes(et));
                return (
                  <button key={et} onClick={() => {
                    const mevcutIdler = new Set(katalogSiraliModeller.map(m => m.id));
                    const eklenecekler = km.filter(m => !mevcutIdler.has(m.id));
                    setKatalogSiraliModeller([...katalogSiraliModeller, ...eklenecekler].sort(dogalSirala));
                  }} style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.15)", borderRadius:6, padding:"2px 8px", color:"#a78bfa", fontSize:8, cursor:"pointer" }}>
                    #{et} ({km.length})
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* SEÇİLİ MODEL SAYISI */}
        <div style={{ fontSize:9, color:T.sub, marginBottom:6, display:"flex", justifyContent:"space-between" }}>
          <span><b style={{ color:T.gold }}>{katalogSiraliModeller.length}</b> model seçili — PDF'e girecek</span>
          <button onClick={() => setKatalogSiraliModeller([...katalogSiraliModeller].sort(dogalSirala))} style={{ background:"rgba(91,155,213,0.1)", border:"1px solid rgba(91,155,213,0.2)", borderRadius:5, padding:"2px 8px", color:"#5b9bd5", fontSize:8, fontWeight:700, cursor:"pointer" }}>A-Z Sırala</button>
        </div>

        {/* MODEL LİSTESİ */}
        <div style={{ maxHeight:320, overflowY:"auto", marginBottom:10, border:"1px solid "+T.border, borderRadius:8 }}>
          {katalogSiraliModeller.length === 0 && (
            <div style={{ padding:"20px", textAlign:"center", color:T.dim, fontSize:10 }}>Henüz model seçilmedi — yukarıdan ekleyin</div>
          )}
          {katalogSiraliModeller.map((m, i) => (
            <div key={m.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 8px", background: i%2===0 ? T.card : "transparent", borderBottom:"1px solid "+T.border }}>
              <span style={{ fontSize:8, color:T.dim, width:22, textAlign:"right", flexShrink:0 }}>{i+1}.</span>
              {m.foto && <img src={m.foto} style={{ width:28, height:28, objectFit:"cover", borderRadius:4, flexShrink:0 }}/>}
              <span style={{ fontSize:9, color:T.gold, fontWeight:700, width:70, flexShrink:0 }}>{m.kod || "—"}</span>
              <span style={{ fontSize:8, color:T.sub, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.ad || ""}</span>
              <span style={{ fontSize:7, color:T.dim, flexShrink:0 }}>{m.kategori||""}</span>
              <button onClick={() => {
                const y = [...katalogSiraliModeller]; [y[i-1], y[i]] = [y[i], y[i-1]]; setKatalogSiraliModeller(y);
              }} disabled={i===0} style={{ background:"none", border:"1px solid "+T.btnBorder, borderRadius:3, color:T.text, cursor:"pointer", fontSize:9, padding:"1px 4px", opacity:i===0?0.3:1, flexShrink:0 }}>↑</button>
              <button onClick={() => {
                const y = [...katalogSiraliModeller]; [y[i], y[i+1]] = [y[i+1], y[i]]; setKatalogSiraliModeller(y);
              }} disabled={i===katalogSiraliModeller.length-1} style={{ background:"none", border:"1px solid "+T.btnBorder, borderRadius:3, color:T.text, cursor:"pointer", fontSize:9, padding:"1px 4px", opacity:i===katalogSiraliModeller.length-1?0.3:1, flexShrink:0 }}>↓</button>
              <button onClick={() => setKatalogSiraliModeller(katalogSiraliModeller.filter((_,j)=>j!==i))} style={{ background:"rgba(232,90,79,0.08)", border:"1px solid rgba(232,90,79,0.15)", borderRadius:3, color:"#e85a4f", cursor:"pointer", fontSize:9, padding:"1px 5px", flexShrink:0 }}>✕</button>
            </div>
          ))}
        </div>

        {/* PDF AL */}
        <button onClick={() => {
          if (katalogSiraliModeller.length === 0) { alert("Hiç model seçilmedi!"); return; }
          downloadPDF(buildKatalogHTML(katalogKol, katalogSiraliModeller, katalogSutun, katalogAyar), katalogKol.ad+"-"+katalogAyar+"-katalog");
          setKatalogSiralaModal(false);
        }} style={{ background:T.gold, border:"none", borderRadius:8, padding:"8px 0", color:T.bg2, fontSize:12, fontWeight:800, cursor:"pointer", width:"100%" }}>
          📄 PDF Al — {katalogSutun}'lü · {katalogAyar} · {katalogSiraliModeller.length} model
        </button>
      </Modal>

      <Modal open={showYedek} onClose={()=>setShowYedek(false)} title="Geri Yukle">
        <div style={{ fontSize:10, color:"#998a6e", marginBottom:10 }}>
          PC'ye indirdiğiniz JSON dosyasını seçin (kopyala-yapıştır gerekmez!).
        </div>
        <input
          type="file"
          accept=".json,application/json"
          onChange={e => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = ev => {
              setYedekJson(ev.target.result);
            };
            reader.readAsText(f);
          }}
          style={{ display:"block", width:"100%", padding:12, background:"rgba(91,155,213,0.06)", border:"2px dashed rgba(91,155,213,0.3)", borderRadius:8, color:"#5b9bd5", fontSize:11, cursor:"pointer", marginBottom:10 }}
        />
        {yedekJson.length > 10 && (() => {
          try {
            const d = JSON.parse(yedekJson);
            return (
              <div style={{ fontSize:9, color:"#6abf69", margin:"6px 0", padding:"5px 8px", background:"rgba(106,191,105,0.08)", borderRadius:5 }}>
                ✓ Geçerli — <b>{d.modeller?.length||0} model</b> · <b>{d.kollar?.length||0} koleksiyon</b> · <b>{d.siparisler?.length||0} sipariş</b> · <b>{d.musteriler ? Object.keys(d.musteriler).length : 0} müşteri</b>
              </div>
            );
          } catch(e) {
            return <div style={{ fontSize:9, color:"#e85a4f", margin:"6px 0" }}>✗ {e.message}</div>;
          }
        })()}
        <button
          onClick={async () => {
            try {
              const d = JSON.parse(yedekJson);
              setDriveYukleniyor("yukle");
              // Sırayla kaydet — hepsini bekle
              if (d.kollar)     await svK(d.kollar);
              if (d.siparisler) await svS(d.siparisler);
              if (d.musteriler) await svMus(d.musteriler);
              // Modelleri parça parça kaydet
              if (d.modeller) {
                await svM(d.modeller);
              }
              // Ayarlar
              if (d.ayarlar) {
                await sv("v7ay", d.ayarlar);
                if (d.ayarlar.ozelTaslar?.length) setOzelTaslar(d.ayarlar.ozelTaslar);
                if (d.ayarlar.kategoriler?.length) setAyarKategoriler(d.ayarlar.kategoriler);
                if (d.ayarlar.etiketler?.length) setAyarEtiketler(d.ayarlar.etiketler);
                if (d.ayarlar.kayitliNotlar?.length) setKayitliNotlar(d.ayarlar.kayitliNotlar);
                if (d.ayarlar.varsAltinKg) setAyarVarsAltinKg(d.ayarlar.varsAltinKg);
                if (d.ayarlar.varsMc) setAyarVarsMc(d.ayarlar.varsMc);
                if (d.ayarlar.varsIscilik) setAyarVarsIscilik(d.ayarlar.varsIscilik);
                if (d.ayarlar.varsIscilikBirim) setAyarVarsIscilikBirim(d.ayarlar.varsIscilikBirim);
              }
              setDriveYukleniyor(null);
              setShowYedek(false);
              setYedekJson("");
              alert("✓ Yükleme tamamlandı! " + (d.modeller?.length||0) + " model Supabase'e kaydedildi.");
            } catch(e) {
              setDriveYukleniyor(null);
              alert("Hata: " + e.message);
            }
          }}
          disabled={(() => { try { JSON.parse(yedekJson); return false; } catch { return true; } })()}
          style={{ ...BG, width:"100%", marginTop:8, opacity: (() => { try { JSON.parse(yedekJson); return 1; } catch { return 0.3; } })() }}
        >
          {driveYukleniyor==="yukle" ? "Supabase'e kaydediliyor..." : "Yukle"}
        </button>
      </Modal>

      {/* KOL MODAL */}
      <Modal open={showKM} onClose={()=>{setShowKM(false);setEditK(null);}} title={editK?"Koleksiyonu Duzenle":"Yeni Koleksiyon"}>
        <Fl label="Koleksiyon Adi" req><input value={fkAd} onChange={e=>setFkAd(e.target.value)} placeholder="2025 Nisan Serisi" style={IS}/></Fl>
        <Fl label="Kod Oneki" hint={(fkOn||"XX")+"-001 girilince otomatik eslesir"}><input value={fkOn} onChange={e=>setFkOn(e.target.value.toUpperCase())} placeholder="NS" style={IS}/></Fl>
        <Fl label="Aciklama"><textarea value={fkAc} onChange={e=>setFkAc(e.target.value)} rows={2} style={{ ...IS, resize:"vertical" }}/></Fl>
        <button onClick={saveKol} disabled={!fkAd.trim()} style={{ ...BG, width:"100%", opacity:fkAd.trim()?1:0.4 }}>{editK?"Kaydet":"Olustur"}</button>
      </Modal>

      {/* MODEL MODAL */}
      <Modal open={showMM} onClose={()=>{setShowMM(false);setEditM(null);}} title={editM?"Modeli Duzenle":"Yeni Model"}>
        {/* Foto */}
        <div style={{ marginBottom:10 }}>
          <div onClick={()=>fileRef.current&&fileRef.current.click()} style={{ width:"100%", height:120, borderRadius:10, overflow:"hidden", cursor:"pointer", background:fFoto?"transparent":"rgba(201,168,76,0.04)", border:"2px dashed "+(fFoto?"rgba(201,168,76,0.2)":"rgba(201,168,76,0.13)"), display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
            {fFoto ? <img src={fFoto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ textAlign:"center", color:"#7a6f5a" }}><div style={{ fontSize:20 }}>+</div><div style={{ fontSize:9 }}>Fotograf yukleyin</div></div>}
            {fFoto && <button onClick={e=>{e.stopPropagation();setFFoto("");}} style={{ position:"absolute", top:4, right:4, background:"rgba(0,0,0,0.6)", border:"none", borderRadius:4, width:18, height:18, color:"#fff", fontSize:9, cursor:"pointer" }}>X</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display:"none" }}/>
          {fFoto && (
            <AiIsimlendir foto={fFoto} onResult={(ad, kat) => { setFAd(ad); if (kat) setFKategori(kat); }} />
          )}
        </div>

        <div style={{ display:"flex", gap:7 }}>
          <div style={{ flex:1 }}>
            <Fl label="Urun Kodu" req>
              <input value={fKod} onChange={e=>handleKod(e.target.value)} placeholder="NS-001" style={{ ...IS, borderColor: kodKontrol?.tip==="tekrar" ? "rgba(232,90,79,0.4)" : "rgba(201,168,76,0.12)" }}/>
            </Fl>
          </div>
          <div style={{ flex:1 }}><Fl label="Koleksiyon"><select value={fKolId} onChange={e=>setFKolId(e.target.value)} style={IS}><option value="">-- Sec --</option>{kollar.map(k=><option key={k.id} value={k.id}>{k.on?"["+k.on+"] ":""}{k.ad}</option>)}</select></Fl></div>
        </div>

        {/* Kod uyarısı */}
        {kodKontrol?.tip==="tekrar" && (
          <div style={{ background:"rgba(232,90,79,0.06)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:8, padding:"8px 10px", marginTop:-4, marginBottom:6 }}>
            <div style={{ fontSize:9, color:"#e85a4f", fontWeight:700, marginBottom:3 }}>⚠ Bu kod zaten mevcut: {kodKontrol.eslesme.ad}</div>
            <div style={{ fontSize:8, color:"#998a6e", marginBottom:6 }}>Ne yapmak istersiniz?</div>
            <div style={{ display:"flex", gap:6, marginBottom:6 }}>
              {/* Üzerine yaz */}
              <button onClick={() => {
                const m = kodKontrol.eslesme;
                setEditM(m);
                // Mevcut modelin bilgilerini forma doldur ama kodu değiştirme
              }} style={{ background:"rgba(232,90,79,0.15)", border:"1px solid rgba(232,90,79,0.3)", borderRadius:6, padding:"4px 12px", color:"#e85a4f", fontSize:9, fontWeight:700, cursor:"pointer" }}
              onClick={() => {
                // Mevcut modeli düzenle moduna al
                const m = kodKontrol.eslesme;
                setEditM(m);
                setFAd(m.ad||""); setFKod(m.kod||""); setFGram(String(m.gram||"")); setFRefAyar(m.refAyar||"14K");
                setFTasGram(String(m.tasGram||"")); setFTasBoy(m.tasBoy||""); setFIscilikDolar(String(m.iscilikDolar||""));
                setFEkMaliyet(String(m.ekMaliyet||"")); setFMadenC(String(m.madenCarpan||""));
                setFKategori(m.kategori||"yuzuk"); setFKolId(m.ki||""); setFDurum(m.durum||"baslanmadi");
                setFEtiketler(m.etiketler||[]); setFFoto(m.foto||"");
              }}>✏ Mevcut modeli düzenle</button>
            </div>
            <div style={{ fontSize:8, color:"#998a6e", marginBottom:4 }}>Veya versiyon olarak kaydet:</div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {kodKontrol.versiyonlar.slice(0,5).map(v => (
                <button key={v} onClick={()=>{
                  handleKod(v);
                  const a = kodKontrol.eslesme;
                  setFAd(a.ad);
                  setFGram(String(a.gram||""));
                  setFRefAyar(a.refAyar||"14K");
                  setFTasGram(String(a.tasGram||""));
                  setFTasBoy(a.tasBoy||"");
                  setFIscilikDolar(String(a.iscilikDolar||""));
                  setFEkMaliyet(String(a.ekMaliyet||""));
                  setFMadenC(String(a.madenCarpan||""));
                  setFKategori(a.kategori||"yuzuk");
                  setFKolId(a.ki||"");
                  setFDurum(a.durum||"baslanmadi");
                  setFEtiketler(a.etiketler||[]);
                }} style={{ background:"rgba(232,90,79,0.1)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:6, padding:"3px 10px", color:"#e85a4f", fontSize:9, fontWeight:700, cursor:"pointer" }}>{v}</button>
              ))}
            </div>
          </div>
        )}

        {/* Versiyon bildirimi */}
        {kodKontrol?.tip==="versiyon" && (
          <div style={{ background:"rgba(106,191,105,0.06)", border:"1px solid rgba(106,191,105,0.2)", borderRadius:8, padding:"7px 10px", marginTop:-4, marginBottom:6, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:"#6abf69", fontWeight:700 }}>Ana model bulundu: {kodKontrol.anaModel.kod}</div>
              <div style={{ fontSize:8, color:"#998a6e" }}>{kodKontrol.anaModel.ad} · {kodKontrol.anaModel.gram}gr · {kodKontrol.anaModel.refAyar}</div>
            </div>
            <button onClick={()=>{
              const a = kodKontrol.anaModel;
              setFGram(String(a.gram||""));
              setFRefAyar(a.refAyar||"14K");
              setFTasGram(String(a.tasGram||""));
              setFTaslar(a.taslar||[]);
              setFTasBoy(a.tasBoy||"");
              setFTasSekil(a.tasSekil||"ROUND");
              setFTasTur(a.tasTur||"N");
              setFTasBoyut(a.tasBoyut||"");
              setFTasAdet(String(a.tasAdet||""));
              setFIscilikDolar(String(a.iscilikDolar||""));
              setFIscilikBirim(a.iscilikBirim||"dolar");
              setFEkMaliyet(String(a.ekMaliyet||""));
              setFMadenC(String(a.madenCarpan||""));
              setFKategori(a.kategori||"yuzuk");
              setFKolId(a.ki||"");
              setFDurum(a.durum||"baslanmadi");
              setFEtiketler(a.etiketler||[]);
              if (!fAd) setFAd(a.ad);
            }} style={{ background:"rgba(106,191,105,0.12)", border:"1px solid rgba(106,191,105,0.2)", borderRadius:6, padding:"4px 10px", color:"#6abf69", fontSize:9, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Tum Degerleri Kopyala</button>
          </div>
        )}

        {fKod&&kodToKol(fKod)&&<div style={{ fontSize:8, color:"#6abf69", fontWeight:600, marginTop:-6, marginBottom:6 }}>{"Otomatik: "+kodToKol(fKod).ad}</div>}

        <Fl label="Kategori" req>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {ayarKategoriler.map(k => (
              <button key={k} onClick={() => setFKategori(k)} style={{ background: fKategori===k ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.04)", border: "1px solid", borderColor: fKategori===k ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.1)", borderRadius: 7, padding: "5px 10px", color: fKategori===k ? GOLD : "#998a6e", fontSize: 11, fontWeight: fKategori===k ? 700 : 400, cursor: "pointer" }}>{k.charAt(0).toUpperCase()+k.slice(1)}</button>
            ))}
          </div>
        </Fl>
        <Fl label="Model Adi" req><input value={fAd} onChange={e=>setFAd(e.target.value)} placeholder="Pirlanta Tektas Yuzuk" style={IS}/></Fl>
        <Fl label="Uretim Durumu"><select value={fDurum} onChange={e=>setFDurum(e.target.value)} style={IS}>{DURUMLAR.map(d=><option key={d.id} value={d.id}>{d.l}</option>)}</select></Fl>

        <div style={{ display:"flex", gap:7 }}>
          <div style={{ flex:1 }}><Fl label="Gram (Ref Ayarda)"><input type="number" value={fGram} onChange={e=>setFGram(e.target.value)} placeholder="0.00" style={IS}/></Fl></div>
          <div style={{ flex:1 }}><Fl label="Ref Ayar"><select value={fRefAyar} onChange={e=>setFRefAyar(e.target.value)} style={IS}>{AYARLAR.map(a=><option key={a.id} value={a.id}>{a.l}</option>)}</select></Fl></div>
        </div>

        <div style={{ background:"rgba(91,155,213,0.04)", border:"1px solid rgba(91,155,213,0.1)", borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#5b9bd5", marginBottom:8 }}>TAŞ LİSTESİ</div>

          {/* Mevcut taş listesi */}
          {fTaslar.map((t, i) => {
            const gr = tasGramHesapla(t.sekil, t.tur, isNaN(Number(t.boyut))?t.boyut:Number(t.boyut), Number(t.adet)||1, ozelTaslar);
            const grHesap = tasGramHesapla(t.sekil, t.tur, isNaN(Number(t.boyut))?t.boyut:Number(t.boyut), Number(t.adet)||1, ozelTaslar);
            return (
              <div key={i} style={{ marginBottom:5, padding:"5px 8px", background:"rgba(91,155,213,0.08)", borderRadius:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:9, color:"#5b9bd5", fontWeight:700, flex:1 }}>
                    {t.sekil}{t.sekil==="ROUND"?" ("+t.tur+")":""} · {t.boyut}{t.sekil==="ROUND"?"mm":""} · {t.adet} adet
                    {grHesap > 0
                      ? <span style={{ color:"#6abf69", marginLeft:6 }}>= {grHesap.toFixed(4)}gr</span>
                      : <span style={{ color:"#e85a4f", marginLeft:6, fontSize:8 }}>tabloda yok — manuel gir</span>
                    }
                  </span>
                  <button onClick={() => setFTaslar(fTaslar.filter((_,j)=>j!==i))} style={{ background:"rgba(232,90,79,0.1)", border:"none", borderRadius:4, padding:"2px 6px", color:"#e85a4f", fontSize:9, cursor:"pointer" }}>×</button>
                </div>
                {grHesap === 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                    <span style={{ fontSize:8, color:"#e8833a" }}>Manuel gram:</span>
                    <input
                      type="number"
                      value={t.gram||""}
                      onChange={e => setFTaslar(fTaslar.map((x,j) => j===i ? {...x, gram:Number(e.target.value)||0} : x))}
                      placeholder="0.0000"
                      style={{ ...IS, width:90, padding:"3px 6px", fontSize:10 }}
                    />
                    {t.gram > 0 && <span style={{ fontSize:8, color:"#6abf69" }}>= {Number(t.gram).toFixed(4)}gr</span>}
                  </div>
                )}
              </div>
            );
          })}
            {fTaslar.length > 0 && (() => {
              const topTas = fTaslar.reduce((acc,t) => {
                const gr = tasGramHesapla(t.sekil,t.tur,isNaN(Number(t.boyut))?t.boyut:Number(t.boyut),Number(t.adet)||1, ozelTaslar);
                return acc+(gr>0?gr:(Number(t.gram)||0));
              }, 0);
              const gosterilen = topTas > 0 ? topTas : (Number(fTasGram)||0);
              return gosterilen > 0 ? (
                <div style={{ fontSize:9, color:"#6abf69", fontWeight:700, marginBottom:8, padding:"4px 8px", background:"rgba(106,191,105,0.08)", borderRadius:5 }}>
                  Toplam taş: {gosterilen.toFixed(4)} gr
                </div>
              ) : null;
            })()}

          {/* Yeni taş ekleme */}
          <div style={{ borderTop: fTaslar.length?"1px solid rgba(91,155,213,0.1)":"none", paddingTop: fTaslar.length?8:0 }}>
            <div style={{ fontSize:8, color:"#5b9bd5", fontWeight:700, marginBottom:6 }}>+ YENİ TAŞ EKLE</div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:6 }}>
              {/* Standart şekiller */}
              {["ROUND","OVAL","DAMLA","MARKİZ","TRAPEZ","BAGET","KARE","KALP"].map(s=>(
                <button key={s} onClick={()=>{ setFTasSekil(s); setFTasBoyut(""); }} style={{ background:fTasSekil===s?"rgba(91,155,213,0.2)":"rgba(91,155,213,0.04)", border:"1px solid", borderColor:fTasSekil===s?"rgba(91,155,213,0.4)":"rgba(91,155,213,0.1)", borderRadius:6, padding:"3px 8px", color:fTasSekil===s?"#5b9bd5":"#998a6e", fontSize:9, fontWeight:fTasSekil===s?700:400, cursor:"pointer" }}>{s}</button>
              ))}
              {/* Ayarlardan eklenen özel taş isimleri */}
              {[...new Set(ozelTaslar.map(t=>t.sekil))].filter(s=>!["ROUND","OVAL","DAMLA","MARKİZ","TRAPEZ","BAGET","KARE","KALP"].includes(s)).map(s=>(
                <button key={s} onClick={()=>{ setFTasSekil(s); setFTasBoyut(""); }} style={{ background:fTasSekil===s?"rgba(167,139,250,0.2)":"rgba(167,139,250,0.04)", border:"1px solid", borderColor:fTasSekil===s?"rgba(167,139,250,0.4)":"rgba(167,139,250,0.1)", borderRadius:6, padding:"3px 8px", color:fTasSekil===s?"#a78bfa":"#998a6e", fontSize:9, fontWeight:fTasSekil===s?700:400, cursor:"pointer" }}>{s} ✦</button>
              ))}
            </div>
            {fTasSekil==="ROUND" && (
              <div style={{ display:"flex", gap:5, marginBottom:6 }}>
                <button onClick={()=>setFTasTur("N")} style={{ background:fTasTur==="N"?"rgba(91,155,213,0.15)":"rgba(91,155,213,0.03)", border:"1px solid", borderColor:fTasTur==="N"?"rgba(91,155,213,0.3)":"rgba(91,155,213,0.08)", borderRadius:6, padding:"3px 10px", color:fTasTur==="N"?"#5b9bd5":"#998a6e", fontSize:9, cursor:"pointer" }}>Normal</button>
                <button onClick={()=>setFTasTur("H")} style={{ background:fTasTur==="H"?"rgba(91,155,213,0.15)":"rgba(91,155,213,0.03)", border:"1px solid", borderColor:fTasTur==="H"?"rgba(91,155,213,0.3)":"rgba(91,155,213,0.08)", borderRadius:6, padding:"3px 10px", color:fTasTur==="H"?"#5b9bd5":"#998a6e", fontSize:9, cursor:"pointer" }}>Heavy</button>
              </div>
            )}
            <div style={{ display:"flex", gap:6, marginBottom:6 }}>
              <div style={{ flex:2 }}>
                <select value={fTasBoyut} onChange={e=>setFTasBoyut(e.target.value)} style={{ ...IS, padding:"7px 8px", fontSize:11 }}>
                  <option value="">Boyut sec</option>
                  {/* Standart tablo boyutları */}
                  {Object.keys(TAS_GRAM[fTasSekil==="ROUND"?"ROUND_"+fTasTur:fTasSekil]||{}).map(b=>(
                    <option key={b} value={b}>{b}{fTasSekil==="ROUND"?" mm":""}</option>
                  ))}
                  {/* Özel taş boyutları — hem aynı şekil hem de farklı isimli */}
                  {ozelTaslar.filter(t=>t.sekil===fTasSekil).map(t=>(
                    <option key={t.boyut} value={t.boyut}>{t.boyut}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex:1 }}>
                <input type="number" min="1" value={fTasAdet} onChange={e=>setFTasAdet(e.target.value)} placeholder="Adet" style={{ ...IS, padding:"7px 8px", fontSize:11 }}/>
              </div>
              <button onClick={() => {
                if (!fTasBoyut || !fTasAdet) return;
                const yeniTas = { sekil:fTasSekil, tur:fTasTur, boyut:fTasBoyut, adet:Number(fTasAdet)||1, gram:0 };
                setFTaslar([...fTaslar, yeniTas]);
                setFTasBoyut(""); setFTasAdet("");
              }} disabled={!fTasBoyut || !fTasAdet} style={{ ...GH, padding:"7px 12px", fontSize:11, opacity:(!fTasBoyut||!fTasAdet)?0.4:1, flexShrink:0 }}>+ Ekle</button>
            </div>
            {fTasBoyut && fTasAdet && (() => {
              const gr = tasGramHesapla(fTasSekil, fTasTur, isNaN(Number(fTasBoyut))?fTasBoyut:Number(fTasBoyut), Number(fTasAdet)||1, ozelTaslar);
              return gr > 0
                ? <div style={{ fontSize:9, color:"#5b9bd5" }}>✓ {fTasAdet} × {fTasBoyut}{fTasSekil==="ROUND"?"mm":""} = {gr.toFixed(4)} gr</div>
                : <div style={{ fontSize:9, color:"#e8833a" }}>Tabloda yok — taş satırında manuel gram girin</div>;
            })()}
          </div>

          {/* Manuel gram — tablo dışı */}
          <div style={{ marginTop:8, borderTop:"1px solid rgba(91,155,213,0.08)", paddingTop:8 }}>
            <Fl label="Manuel Toplam Tas Gram (tablo disiysa)">
              <input type="number" value={fTasGram} onChange={e=>setFTasGram(e.target.value)} placeholder="0.00" style={IS}/>
            </Fl>
          </div>
        </div>

        <div style={{ background:"rgba(232,90,79,0.04)", border:"1px solid rgba(232,90,79,0.1)", borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#e85a4f", marginBottom:8 }}>MALIYET</div>
          <div style={{ display:"flex", gap:7 }}>
            <div style={{ flex:1 }}><Fl label={"Uretim mly/gr (varsayilan: "+madenCarpan+")"}><input type="number" value={fMadenC} onChange={e=>setFMadenC(e.target.value)} placeholder={String(madenCarpan)} style={IS}/></Fl></div>
            <div style={{ flex:1 }}><Fl label="Ek Maliyet ($) - Rodaj, kalem"><input type="number" value={fEkMaliyet} onChange={e=>setFEkMaliyet(e.target.value)} placeholder="0" style={IS}/></Fl></div>
          </div>
        </div>

        <div style={{ background:"rgba(232,131,58,0.04)", border:"1px solid rgba(232,131,58,0.1)", borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#e8833a", marginBottom:8 }}>ISCILIK</div>
          <Fl label="Iscilik birim ve tutar" hint={fGram&&fIscilikDolar ? (fIscilikBirim==="milyem" ? fN(Number(fGram))+" x "+fN(Number(fIscilikDolar),3)+" mly = "+fN(Number(fGram)*Number(fIscilikDolar),3)+" has" : fN(Number(fGram))+" x "+fUSD(Number(fIscilikDolar))+" = "+fUSD(Number(fGram)*Number(fIscilikDolar))) : ""}>
            <div style={{ display:"flex", gap:6 }}>
              <select value={fIscilikBirim} onChange={e=>setFIscilikBirim(e.target.value)} style={{ ...IS, width:130, padding:"8px 6px", fontSize:11, flexShrink:0 }}>
                <option value="dolar">$ / gr</option>
                <option value="milyem">milyem / gr</option>
              </select>
              <input type="number" value={fIscilikDolar} onChange={e=>setFIscilikDolar(e.target.value)} placeholder={fIscilikBirim==="milyem"?"0.30":"2.75"} style={IS}/>
            </div>
          </Fl>
        </div>

        {altinKgUSD>0 && Number(fGram)>0 && (
          <OnizlemeBox m={{ gram:Number(fGram), refAyar:fRefAyar, tasGram: (() => { const tl = fTaslar.reduce((acc,t)=>{const gr=tasGramHesapla(t.sekil,t.tur,isNaN(Number(t.boyut))?t.boyut:Number(t.boyut),Number(t.adet)||1,ozelTaslar);return acc+(gr>0?gr:(Number(t.gram)||0));},0); return (fTaslar.length>0&&tl>0)?tl:(Number(fTasGram)||0); })(), madenCarpan:Number(fMadenC)||0, iscilikDolar:Number(fIscilikDolar)||0, iscilikBirim:fIscilikBirim, ekMaliyet:Number(fEkMaliyet)||0 }} altinKgUSD={altinKgUSD} mc={madenCarpan} />
        )}

        <div style={{ background:"rgba(167,139,250,0.03)", border:"1px solid rgba(167,139,250,0.1)", borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#a78bfa", marginBottom:8 }}>ETIKETLER</div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
            {fEtiketler.map(e => (
              <span key={e} style={{ background:"rgba(167,139,250,0.1)", color:"#a78bfa", padding:"2px 7px", borderRadius:4, fontSize:8, fontWeight:600, display:"flex", alignItems:"center", gap:3 }}>
                #{e}<button onClick={()=>setFEtiketler(fEtiketler.filter(x=>x!==e))} style={{ background:"none", border:"none", color:"#a78bfa", cursor:"pointer", fontSize:9, padding:0, lineHeight:1 }}>x</button>
              </span>
            ))}
          </div>
          <div style={{ display:"flex", gap:5 }}>
            <input value={fYeniEtiket} onChange={e=>setFYeniEtiket(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addEtiket()} placeholder="yeni etiket..." style={{ ...IS, flex:1, padding:"5px 8px", fontSize:11 }}/>
            <button onClick={addEtiket} style={{ ...GH, padding:"5px 10px", fontSize:10 }}>+ Ekle</button>
          </div>
        </div>

        <Fl label="Aciklama"><textarea value={fAc} onChange={e=>setFAc(e.target.value)} placeholder="Detaylar..." rows={2} style={{ ...IS, resize:"vertical" }}/></Fl>
        <button onClick={saveModel} disabled={!fAd.trim()} style={{ ...BG, width:"100%", marginTop:4, opacity:fAd.trim()?1:0.4 }}>{editM?"Kaydet":"Ekle"}</button>
      </Modal>

      {/* SİLME ONAY */}
      <Modal open={!!delOnay} onClose={()=>setDelOnay(null)} title="Silme Onayi">
        <p style={{ color:"#998a6e", fontSize:13, marginBottom:18 }}>Bu ogeyi silmek istediginize emin misiniz?</p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>setDelOnay(null)} style={{ ...GH, flex:1 }}>Iptal</button>
          <button onClick={()=>{ if(delOnay.type==="kol") delKol(delOnay.id); else if(delOnay.type==="mod") delMod(delOnay.id); else delSip(delOnay.id); }} style={{ flex:1, padding:"10px", background:"linear-gradient(135deg,#e85a4f,#c94040)", border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Evet, Sil</button>
        </div>
      </Modal>
    </div>
  );
}
