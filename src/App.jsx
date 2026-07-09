import { dbLoad, dbSave, fotoYukleStorage, yedekKaydet, yedekListesi, yedekGetir, bugunYedekVarMi, tabloModelleriSenkron, tabloSiparisleriSenkron, tabloMusterileriYaz, akilliModelOku, akilliSiparisOku, akilliMusteriOku, islemKaydet, islemGecmisiGetir, realtimeBaslat } from "./supabase.js";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const uid = () => "x" + Date.now() + Math.random().toString(36).substr(2, 5);
const fHas = (n) => (Number(n) || 0).toFixed(4) + " has";
const fUSD = (p) => "$" + (Number(p) || 0).toFixed(2);
const fN = (n, d) => (Number(n) || 0).toFixed(d || 3);

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
  beyaz:     { id:"beyaz",     l:"◆ Beyaz",          ac:"Apple tarzı, minimal açık",  bg:"linear-gradient(165deg,#f5f5f7,#f0f0f2,#eeeef0)", bg2:"#f5f5f7", gold:"#1d1d1f", text:"#1d1d1f", sub:"#86868b", dim:"#aeaeb2", card:"rgba(0,0,0,0.02)", border:"rgba(0,0,0,0.06)", header:"rgba(0,0,0,0.02)", headerBorder:"rgba(0,0,0,0.05)", btnBg:"rgba(0,0,0,0.04)", btnBorder:"rgba(0,0,0,0.1)", accent:"#0066cc", danger:"#ff3b30", success:"#34c759", info:"#007aff" },
  charcoal:  { id:"charcoal",  l:"◆ Charcoal",       ac:"Kömür gri, sade ve temiz",   bg:"#111111", bg2:"#111111", gold:"#f0f0f0", text:"#f0f0f0", sub:"#888888", dim:"#444444", card:"rgba(255,255,255,0.03)", border:"#252525", header:"rgba(255,255,255,0.02)", headerBorder:"#1e1e1e", btnBg:"rgba(255,255,255,0.04)", btnBorder:"#2a2a2a", accent:"#f0f0f0", danger:"#f87171", success:"#4ade80", info:"#60a5fa" },
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
  // Yoğunluk bazlı dönüşüm (g/cm³) — sektör standardı
  const yogunluk = { "8K":11.0, "10K":11.6, "14K":13.4, "18K":15.5, "22K":17.7, "24K":19.3, "925":10.4 };
  const eskiY = yogunluk[refAyar] || 13.4;
  const yeniY = yogunluk[hedefAyar] || 13.4;
  // Taş gramını ayır (taş değişmez!)
  const tas = Number(tasGram) || 0;
  const madenGram = Math.max(0, Number(refGram) - tas);
  // Yoğunluk oranıyla maden gramını dönüştür
  const yeniMadenGram = madenGram * (yeniY / eskiY);
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

  // Taş has gram — seçilen ayar oranıyla çarpılır (14K→0.585, 10K→0.417 vs.)
  const tasHas = tasGram * ayarOran;

  // İşçilik — ayar bazlı fallback: seçilen ayar → girilmişse o, yoksa varsayılan
  const iscilikAyarlar = m.iscilikAyarlar || {};
  const ayarIscilik = iscilikAyarlar[aktifAyar];
  const iscilikDolarGr = ayarIscilik ? (Number(ayarIscilik.dolar) || 0) : (Number(m.iscilikDolar) || 0);
  const iscilikBirimKullan = ayarIscilik ? (ayarIscilik.birim || "dolar") : (m.iscilikBirim || "dolar");
  let iscilikHas = 0;
  let iscilikUSD = 0;
  if (iscilikBirimKullan === "milyem") {
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

  // ═══ GÜMÜŞ (925) ÖZEL MANTIK ═══
  // Gümüşte altın karlılığı (mly/gr) anlamsız. Sadece işçilik hesaplanır.
  // İşçilik = toplam gümüş gramı (mamul zaten taşı içeriyor) × gram başı işçilik ($/gr)
  const gumusMu = aktifAyar === "925";
  let gumusIscilikGr = 0;   // $/gr
  let gumusIscilikTop = 0;  // toplam $
  if (gumusMu) {
    // İşçilik $/gr olarak alınır (milyem girilmişse de $/gr'a çevir — gümüşte milyem anlamsız)
    gumusIscilikGr = iscilikBirimKullan === "milyem"
      ? (hasGramUSD > 0 ? iscilikDolarGr * hasGramUSD : iscilikDolarGr) // milyem→$ kaba çevrim
      : iscilikDolarGr;
    gumusIscilikTop = mamulGram * gumusIscilikGr;
  }

  return {
    mamulGram, aktifAyar, ayarOran,
    tasHas, iscilikUSD, iscilikHas,
    maliyetHas, ekMaliyetUSD, ekMaliyetHas,
    gelirHas, topMaliyetHas,
    karHas, karUSD, karMly, karUyari,
    hasGramUSD,
    gumusMu, gumusIscilikGr, gumusIscilikTop,
  };
}

// ═══ ŞİRKET (MULTI-COMPANY) ═══
// Aktif şirketin Supabase anahtar öneki. MSK = "" (mevcut veriler korunur), BSP = "bsp_".
// Şirket bağımsız anahtarlar (önek almayan): şifre, ayarlar gibi global olanlar burada listelenir.
let AKTIF_SIRKET_ONEK = (() => {
  try { return localStorage.getItem("atolye_sirket_onek") || ""; } catch { return ""; }
})();
function setSirketOnek(onek) {
  AKTIF_SIRKET_ONEK = onek || "";
  try { localStorage.setItem("atolye_sirket_onek", AKTIF_SIRKET_ONEK); } catch {}
}
// Bu anahtarlar şirketten bağımsız (önek ALMAZ) — her iki şirkette ortak kalır
const SIRKET_BAGIMSIZ = ["atolye_sifre"];
function sirketAnahtar(k) {
  if (!AKTIF_SIRKET_ONEK) return k;            // MSK → değişiklik yok
  if (SIRKET_BAGIMSIZ.includes(k)) return k;   // global anahtar
  return AKTIF_SIRKET_ONEK + k;                // BSP → "bsp_" öneki
}

async function ld(k, f) { try { const r = await dbLoad(sirketAnahtar(k), f); return r ?? f; } catch { return f; } }
async function sv(k, d) { try { await dbSave(sirketAnahtar(k), d); } catch(e) { console.error("sv error:", e); } }

function resizeImg(file) {
  return new Promise(resolve => {
    const rd = new FileReader();
    rd.onload = e => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > 1600) { h = Math.round(h * 1600 / w); w = 1600; }
        if (h > 1600) { w = Math.round(w * 1600 / h); h = 1600; }
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target.result;
    };
    rd.readAsDataURL(file);
  });
}

// PDF — blob download (popup yok)
// ═══ ÜRETİM TAKİP YARDIMCILARI ═══

// İki tarih arasındaki SADECE iş günü (Cumartesi/Pazar hariç) milisaniyesini hesaplar
function isGunuSure(baslangic, bitis) {
  if (!baslangic || !bitis || bitis <= baslangic) return 0;
  const GUN_MS = 24 * 60 * 60 * 1000;
  let toplam = 0;
  let cursor = new Date(baslangic);
  const son = new Date(bitis);
  
  while (cursor < son) {
    const gun = cursor.getDay(); // 0=Pazar, 6=Cumartesi
    if (gun !== 0 && gun !== 6) {
      // Bu gün iş günü → günün sonuna kadar veya bitişe kadar say
      const gunSonu = new Date(cursor);
      gunSonu.setHours(24, 0, 0, 0); // ertesi gün 00:00
      const bitisBuGun = son < gunSonu ? son : gunSonu;
      toplam += bitisBuGun - cursor;
    }
    // Sonraki güne geç
    cursor = new Date(cursor);
    cursor.setHours(24, 0, 0, 0);
  }
  return toplam;
}

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
  // [{durum, tarih}] → her durum için harcanan SADECE İŞ GÜNÜ süresi (hafta sonu hariç)
  const sonuclar = {};
  for (let i = 0; i < gecmis.length; i++) {
    const d = gecmis[i];
    const sonraki = gecmis[i+1];
    const bitis = sonraki ? sonraki.tarih : Date.now();
    const sure = isGunuSure(d.tarih, bitis);
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

// Sıralama: SADECE koddaki rakam (sayısal)
function dogalSirala(a, b) {
  const ka = a.kod || "", kb = b.kod || "";
  // Karmaşık kodları doğru sırala: prefix + ana sayı + suffix
  // "01GS21" < "01GS21-B" < "01GS21-V2" < "01GSP21" gibi
  const ma = ka.match(/^([A-Za-zÇĞİÖŞÜçğışöşü\-]*)(\d+)(.*)$/);
  const mb = kb.match(/^([A-Za-zÇĞİÖŞÜçğışöşü\-]*)(\d+)(.*)$/);
  if (ma && mb) {
    const prefCmp = ma[1].localeCompare(mb[1], "tr");
    if (prefCmp !== 0) return prefCmp;
    const numCmp = Number(ma[2]) - Number(mb[2]);
    if (numCmp !== 0) return numCmp;
    return ma[3].localeCompare(mb[3], "tr");
  }
  return ka.localeCompare(kb, "tr");
}

function buildKatalogHTML(kol, modeller, sutun, hedefAyar, kollar) {
  const cols = sutun || 3;
  const perPage = cols === 4 ? 16 : 12;

  const css = "*{margin:0;padding:0;box-sizing:border-box}"
    + "body{font-family:Arial,Helvetica,sans-serif;background:#f3f3f3;color:#1a1a1a}"
    + "@media print{.np{display:none!important}@page{size:A4 portrait;margin:6mm}}"
    + ".cv{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;background:#f3f3f3}"
    + ".cv .ln{width:44px;height:1px;background:#c9a84c;margin:14px 0}"
    + ".cv h1{font-size:28px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-align:center}"
    + ".cv p{font-size:11px;color:#aaa;letter-spacing:.1em;text-transform:uppercase}"
    + ".pg{padding:7px 16px 5px;page-break-after:always;height:99vh;display:flex;flex-direction:column;background:#f3f3f3}"
    + ".pg:last-child{page-break-after:auto}"
    + ".grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;flex:1;min-height:0;grid-auto-rows:minmax(0,calc((99vh - 50px) / 4));align-content:start}"
    + ".grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;flex:1;min-height:0;grid-auto-rows:minmax(0,calc((99vh - 50px) / 4));align-content:start}"
    + ".cd{background:#fff;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 2px 8px rgba(0,0,0,0.10)}"
    + ".cd-bileklik{grid-column:1/-1}"
    + ".cd-kolye-3{grid-column:span 3;grid-row:span 2}"
    + ".cd-kolye-4{grid-column:span 4;grid-row:span 2}"
    + ".ph{flex:1;min-height:0;position:relative;background:#f3f3f3;overflow:hidden}"
    + ".ph img{position:absolute;top:50%;left:50%;width:100%;height:100%;object-fit:contain;object-position:center;display:block;transform:translate(-50%,-50%)}"
    + ".ph .ni{position:absolute;top:0;left:0;width:100%;height:100%;background:#f3f3f3;display:flex;align-items:center;justify-content:center;color:#ddd;font-size:20px}"
    + ".cd-bileklik .ph img{object-fit:cover;transform:none;top:0;left:0}"
    + ".cd-kolye-3 .ph img,.cd-kolye-4 .ph img{width:105%;height:105%;object-fit:contain}"
    + ".inf{padding:6px 9px 7px 10px;flex-shrink:0;background:#fff;border-top:1px solid #f0f0f0;border-left:3px solid #c9a84c}"
    + ".r1{display:flex;justify-content:space-between;align-items:baseline}"
    + ".kod{font-size:13px;color:#c9a84c;font-weight:700;letter-spacing:.04em}"
    + ".gram{font-size:10px;font-weight:700;color:#333}"
    + ".ac{font-size:8px;color:#aaa;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    + ".ft{display:flex;justify-content:space-between;align-items:center;padding:5px 3px 0;border-top:1px solid #e0e0e0;flex-shrink:0}"
    + ".ft span{font-size:7px;color:#c9a84c;font-weight:700;letter-spacing:.08em;text-transform:uppercase}"
    + ".ft small{font-size:7px;color:#ccc}"
    + ".pb{position:fixed;bottom:16px;right:16px;background:#c9a84c;border:none;border-radius:8px;padding:10px 20px;color:#fff;font-size:13px;cursor:pointer;font-family:sans-serif}";

  const gridClass = cols === 4 ? "grid4" : "grid3";

  const kartHTML = (m) => {
    const gosterAyar = hedefAyar || m.refAyar || "14K";
    const gosterGram = hedefAyar && hedefAyar !== m.refAyar
      ? gramDonustur(Number(m.gram)||0, m.refAyar||"14K", hedefAyar, m.tasGram||0).toFixed(2)
      : (m.gram || "—");

    const isBileklik = m.kategori === "bileklik";
    const isKolye = m.kategori === "kolye";
    let cls = "cd";
    if (isBileklik) cls += " cd-bileklik";
    if (isKolye) cls += cols === 4 ? " cd-kolye-4" : " cd-kolye-3";

    let h = "<div class='" + cls + "'>";
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

  // SAYFALARI ÖNCE OLUŞTUR (sayfa haritası için)
  const sayfalar = [];
  let mevcutSayfa = [];
  let mevcutKapasite = 0;
  
  modeller.forEach(m => {
    let yer = 1;
    if (m.kategori === "bileklik") yer = cols;
    else if (m.kategori === "kolye") yer = cols * 2;
    
    if (mevcutKapasite + yer > perPage) {
      sayfalar.push(mevcutSayfa);
      mevcutSayfa = [];
      mevcutKapasite = 0;
    }
    mevcutSayfa.push(m);
    mevcutKapasite += yer;
  });
  if (mevcutSayfa.length > 0) sayfalar.push(mevcutSayfa);

  // Sayfa haritası: hangi koleksiyon hangi sayfalarda
  const haritaMap = {};
  sayfalar.forEach((pg, idx) => {
    const sayfaNo = idx + 2; // kapak sayfa 1, içerik 2'den başlar
    pg.forEach(m => {
      const kolId = m.kaynakKi || m.ki;
      const kaynakKol = (kollar || []).find(k => k.id === kolId);
      const kolAd = kaynakKol?.ad || "—";
      if (!haritaMap[kolAd]) haritaMap[kolAd] = { baslangic: sayfaNo, bitis: sayfaNo, sayi: 0 };
      haritaMap[kolAd].baslangic = Math.min(haritaMap[kolAd].baslangic, sayfaNo);
      haritaMap[kolAd].bitis = Math.max(haritaMap[kolAd].bitis, sayfaNo);
      haritaMap[kolAd].sayi++;
    });
  });
  const haritaListesi = Object.entries(haritaMap);

  // KAPAK SAYFASI
  h += "<div class='cv'><div class='ln'></div><h1>" + kol.ad + "</h1>";
  if (hedefAyar) h += "<p style='margin-top:6px;font-size:14px;color:#c9a84c;letter-spacing:.08em'>" + hedefAyar + "</p>";
  if (kol.ac) h += "<p style='margin-top:8px'>" + kol.ac + "</p>";
  h += "<div class='ln'></div>";

  // SAYFA HARİTASI (kapakta)
  if (haritaListesi.length > 1) {
    h += "<div style='margin-top:30px;max-width:480px;width:90%'>";
    h += "<div style='font-size:10px;color:#999;letter-spacing:.15em;text-transform:uppercase;text-align:center;margin-bottom:14px;font-weight:700'>İçindekiler</div>";
    h += "<div style='display:flex;flex-direction:column;gap:8px'>";
    haritaListesi.forEach(([ad, r]) => {
      h += "<div style='display:flex;justify-content:space-between;align-items:baseline;padding:8px 14px;background:rgba(201,168,76,0.04);border-left:3px solid #c9a84c;border-radius:4px'>";
      h += "<div><span style='font-size:13px;color:#1a1a1a;font-weight:700'>" + ad + "</span> <span style='font-size:9px;color:#999'>(" + r.sayi + " model)</span></div>";
      h += "<span style='font-size:11px;color:#c9a84c;font-weight:700'>";
      h += r.baslangic === r.bitis ? "Sayfa " + r.baslangic : "Sayfa " + r.baslangic + " – " + r.bitis;
      h += "</span></div>";
    });
    h += "</div></div>";
  }

  h += "</div>";

  const totalPages = sayfalar.length + 1; // +1 kapak
  let pageNum = 1; // kapak 1, içerik 2'den başlar

  sayfalar.forEach((pg) => {
    pageNum++;
    h += "<div class='pg'><div class='" + gridClass + "'>";
    pg.forEach(m => h += kartHTML(m));
    h += "</div><div class='ft'><span>" + kol.ad + "</span><small>" + pageNum + " / " + totalPages + "</small></div></div>";
  });

  h += "<button class='np pb' onclick='window.print()'>Yazdir / PDF</button></body></html>";
  return h;
}


function buildKonfHTML(siparis, altinKgUSD, mc, fiyatli) {
  // fiyatli=true  → Müşteri PDF: işçilik/fiyat VAR, taş detayı YOK
  // fiyatli=false → İç PDF:      işçilik/fiyat YOK, taş detayı VAR
  const hasGramUSD = altinKgUSD / 1000;
  let tGram = 0, tIscilik = 0, tIscilikHas = 0;
  const rows = (siparis.kalemler || []).map(k => {
    const hc = hesapla(k, k.secilenAyar || k.refAyar, altinKgUSD, mc);
    const adet = k.adet || 1;
    tGram += hc.mamulGram * adet;
    const isMilyem = k.iscilikBirim === "milyem";
    const iscilikTop = isMilyem
      ? hc.iscilikHas * hc.hasGramUSD * adet
      : (k.iscilikDolar||0) * hc.mamulGram * adet;
    const iscilikTopHas = isMilyem
      ? hc.iscilikHas * adet
      : iscilikTop / (hc.hasGramUSD || 1);
    tIscilik += iscilikTop;
    tIscilikHas += iscilikTopHas;
    return { ...k, hc, adet, iscilikTop, iscilikTopHas, isMilyem };
  });
  const tAdet = rows.reduce((s,r)=>s+r.adet,0);
  const sipNo = "SIP-" + new Date(siparis.tarih).getFullYear() + "-" + String(siparis.tarih).slice(-5);
  const ayarLabel = rows[0]?.secilenAyar || "14K";

  const css = [
    "*{margin:0;padding:0;box-sizing:border-box}",
    "body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f0f2f5;color:#1a1a2e;padding:24px;display:flex;justify-content:center}",
    "@media print{.noprint{display:none!important}@page{size:A4 portrait;margin:10mm}body{background:#fff;padding:0;display:block}.wrap{box-shadow:none!important;border:none!important}.hdr{-webkit-print-color-adjust:exact;print-color-adjust:exact}}",
    ".wrap{background:#fff;width:100%;max-width:760px;box-shadow:0 4px 24px rgba(0,0,0,.10);border-radius:4px;overflow:hidden}",
    ".hdr{background:#0f1923;padding:20px 28px;display:flex;justify-content:space-between;align-items:center}",
    ".logo-area{display:flex;align-items:center;gap:12px}",
    ".logo-name{font-size:15px;font-weight:700;color:#fff;letter-spacing:.08em;text-transform:uppercase}",
    ".logo-sub{font-size:7px;color:#8a9bb0;letter-spacing:.18em;text-transform:uppercase;margin-top:1px}",
    ".hdr-right{text-align:right}",
    ".doc-type{font-size:8px;color:#8a9bb0;letter-spacing:.15em;text-transform:uppercase;margin-bottom:4px}",
    ".doc-no{font-size:13px;font-weight:600;color:#c9a84c;letter-spacing:.04em}",
    ".doc-date{font-size:9px;color:#8a9bb0;margin-top:3px}",
    ".info-bar{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;border-bottom:1px solid #e8edf2}",
    ".info-cell{padding:12px 20px;border-right:1px solid #e8edf2}",
    ".info-cell:last-child{border-right:none}",
    ".info-lbl{font-size:7px;color:#8a9bb0;text-transform:uppercase;letter-spacing:.12em;margin-bottom:4px}",
    ".info-val{font-size:13px;font-weight:600;color:#0f1923}",
    ".info-sub{font-size:9px;color:#8a9bb0;margin-top:2px}",
    ".tbl-wrap{padding:0 20px}",
    "table{width:100%;border-collapse:collapse}",
    "thead tr{border-bottom:2px solid #0f1923}",
    "th{font-size:7.5px;font-weight:700;color:#8a9bb0;text-transform:uppercase;letter-spacing:.1em;padding:10px 7px 8px;text-align:left}",
    "th.r{text-align:right}",
    "tbody tr{border-bottom:1px solid #f0f2f5}",
    "tbody tr:last-child{border-bottom:none}",
    "td{padding:10px 7px;vertical-align:top;font-size:11px;color:#1a1a2e}",
    "td.r{text-align:right}",
    ".foto-cell{width:78px}",
    ".foto-wrap{width:74px;height:74px;border-radius:6px;overflow:hidden;background:#f5f7fa;border:1px solid #e8edf2}",
    ".foto-wrap img{width:100%;height:100%;object-fit:cover;display:block}",
    ".kod{font-size:12px;font-weight:700;color:#0f1923;letter-spacing:.02em}",
    ".model-ad{font-size:10px;color:#4a5568;margin-top:2px}",
    ".model-nt{font-size:9px;color:#c9a84c;margin-top:3px;font-style:italic}",
    ".model-boy{font-size:9px;color:#6b7a8d;margin-top:3px}",
    ".tas-blok{margin-top:5px;padding:4px 7px;background:#f5f8fc;border-left:2px solid #c9a84c;border-radius:2px}",
    ".tas-lbl{font-size:7px;color:#8a9bb0;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}",
    ".tas-row{font-size:8.5px;color:#1a1a2e;margin-bottom:2px;display:flex;gap:8px;align-items:baseline}",
    ".tas-sekil{font-weight:700;color:#0f1923;min-width:60px}",
    ".tas-dim{color:#6b7a8d}",
    ".tas-gr{color:#c9a84c;font-weight:600}",
    ".gram-birim{font-size:10px;font-weight:600;color:#1a1a2e}",
    ".gram-top{font-size:11px;font-weight:700;color:#0f1923}",
    ".gram-lbl{font-size:7px;color:#8a9bb0;margin-bottom:1px}",
    ".renk-sari{color:#b8943f;font-weight:600}",
    ".renk-beyaz{color:#6b7a8d;font-weight:600}",
    ".renk-rose{color:#b06060;font-weight:600}",
    ".isc-birim{font-size:9px;color:#4a5568}",
    ".isc-top{font-size:10px;font-weight:700;color:#0f1923}",
    ".isc-has{font-size:7px;color:#8a9bb0}",
    ".tot-bar{background:#f8fafc;border-top:2px solid #0f1923;padding:14px 24px;display:flex;justify-content:flex-end;align-items:flex-end;gap:40px}",
    ".tot-left{display:flex;gap:28px;width:100%}",
    ".tot-box .lbl{font-size:7px;color:#8a9bb0;text-transform:uppercase;letter-spacing:.1em}",
    ".tot-box .val{font-size:16px;font-weight:700;color:#0f1923}",
    ".tot-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px}",
    ".tot-right .row{display:flex;justify-content:space-between;gap:28px;font-size:10px;color:#4a5568}",
    ".tot-right .row .v{font-weight:600;color:#0f1923}",
    ".tot-right .grand{display:flex;justify-content:space-between;gap:28px;font-size:13px;font-weight:700;color:#0f1923;border-top:1px solid #dde2ea;padding-top:6px;margin-top:4px}",
    ".footer{padding:12px 24px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e8edf2;background:#fafbfc}",
    ".footer-left{font-size:8px;color:#8a9bb0}",
    ".footer-sig{display:flex;gap:36px}",
    ".sig-box{text-align:center}",
    ".sig-line{width:90px;border-bottom:1px solid #bbc4d0;margin-bottom:4px;height:22px}",
    ".sig-lbl{font-size:7px;color:#8a9bb0;text-transform:uppercase;letter-spacing:.08em}",
    ".pb{position:fixed;bottom:20px;right:20px;background:#0f1923;color:#fff;border:none;border-radius:8px;padding:11px 24px;font-size:12px;font-weight:600;cursor:pointer;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.2)}",
  ].join("\n");

  const logoSVG = '<svg viewBox="0 0 160 70" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '<text x="80" y="48" text-anchor="middle" font-family="Arial" font-size="44" font-weight="300" fill="#c9a84c" letter-spacing="14">MSK</text>'
    + '<line x1="4" y1="58" x2="62" y2="58" stroke="#c9a84c" stroke-width="0.8"/>'
    + '<polygon points="80,52 86,58 80,64 74,58" fill="none" stroke="#c9a84c" stroke-width="1.1"/>'
    + '<line x1="98" y1="58" x2="156" y2="58" stroke="#c9a84c" stroke-width="0.8"/>'
    + '</svg>';

  let h = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + (fiyatli ? "MSK Siparis Formu - Fiyatli" : "MSK Ic Konfirmasyon - Fiyatsiz") + "</title><style>" + css + "</style></head><body><div class='wrap'>";

  // HEADER
  h += "<div class='hdr'>";
  h += "<div class='logo-area'><div style='width:160px;height:70px;flex-shrink:0'>" + logoSVG + "</div>";
  h += "</div>";
  h += "<div class='hdr-right'><div class='doc-type'>" + (fiyatli ? "Siparis Formu" : "Ic Konfirmasyon") + "</div>";
  h += "<div class='doc-no'>" + sipNo + "</div><div class='doc-date'>" + new Date(siparis.tarih).toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"}) + "</div></div>";
  h += "</div>";

  // BİLGİ BAR
  h += "<div class='info-bar'>";
  h += "<div class='info-cell'><div class='info-lbl'>Musteri</div><div class='info-val'>" + (siparis.musKod||"—") + "</div><div class='info-sub'>" + (siparis.musteri||"") + "</div></div>";
  h += "<div class='info-cell'><div class='info-lbl'>Ayar</div><div class='info-val'>" + ayarLabel + "</div><div class='info-sub'>" + (ayarLabel==="925"?"Gumus":"Altin") + "</div></div>";
  h += "<div class='info-cell'><div class='info-lbl'>Kalem / Adet</div><div class='info-val'>" + rows.length + " / " + tAdet + "</div><div class='info-sub'>model / parca</div></div>";
  h += "<div class='info-cell'><div class='info-lbl'>Teslim</div><div class='info-val' style='font-size:11px'>" + (siparis.teslimTarihi ? new Date(siparis.teslimTarihi).toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"}) : "—") + "</div><div class='info-sub'>&nbsp;</div></div>";
  h += "</div>";
  if (siparis.aciklama) h += "<div style='margin:0 0 12px;padding:8px 12px;background:#f8f8f8;border-left:3px solid #c9a84c;border-radius:4px;font-size:11px;color:#444'><b>Açıklama:</b> " + siparis.aciklama + "</div>";

  // TABLO BAŞLIK
  h += "<div class='tbl-wrap'><table><thead><tr>";
  h += "<th class='foto-cell'></th>";
  h += "<th style='width:78px'>Kod</th>";
  h += "<th>Urun / Not</th>";
  h += "<th class='r' style='width:40px'>Renk</th>";
  h += "<th class='r' style='width:30px'>Adet</th>";
  h += "<th class='r' style='width:68px'>Birim Gr</th>";
  h += "<th class='r' style='width:68px'>Top. Gr</th>";
  if (fiyatli) {
    // Müşteri PDF — işçilik sütunları
    h += "<th class='r' style='width:88px'>Iscilik/br</th>";
    h += "<th class='r' style='width:88px'>Iscilik Top.</th>";
  }
  h += "</tr></thead><tbody>";

  rows.forEach(r => {
    const topGram = r.hc.mamulGram * r.adet;
    const birimGram = r.hc.mamulGram;
    const renkClass = r.renk==="Rose"?"renk-rose":r.renk==="Beyaz"?"renk-beyaz":"renk-sari";

    // İşçilik string (müşteri PDF'i için)
    let iscBirimStr = "—", iscTopStr = "—";
    if (fiyatli && r.iscilikTop > 0) {
      if (r.isMilyem) {
        iscBirimStr = "<div class='isc-birim'>" + (r.iscilikDolar||0).toFixed(3) + " mly/gr</div>";
        iscTopStr   = "<div class='isc-top'>" + fUSD(r.iscilikTop) + "</div><div class='isc-has'>" + r.iscilikTopHas.toFixed(4) + " has</div>";
      } else {
        iscBirimStr = "<div class='isc-birim'>" + fUSD(r.iscilikDolar||0) + "/gr</div>";
        iscTopStr   = "<div class='isc-top'>" + fUSD(r.iscilikTop) + "</div><div class='isc-has'>" + r.iscilikTopHas.toFixed(4) + " has</div>";
      }
    }

    // Boy string
    let boyStr = "";
    if (r.boyListesi && r.boyListesi.length > 0) {
      boyStr = "<div class='model-boy'>Boy: " + r.boyListesi.map(b=>(b.uzunluk||"—")+(b.birim||"cm")+" "+fN(b.gram||birimGram,2)+"gr x"+(b.adet||1)).join(" / ") + "</div>";
    } else if (r.boy && r.boy.deger) {
      boyStr = "<div class='model-boy'>Boy: " + r.boy.sistem + " " + r.boy.deger + (r.boy.sistem!=="mm"&&r.boy.sistem!=="Beden"?" (≈"+boyToMM(r.boy.sistem,r.boy.deger)+"mm)":"") + "</div>";
    }

    // Taş detayı — sadece İç PDF
    let tasStr = "";
    if (!fiyatli) {
      const taslar = r.taslar || [];
      if (taslar.length > 0) {
        tasStr += "<div class='tas-blok'><div class='tas-lbl'>Tas Detayi</div>";
        taslar.forEach(t => {
          const grHesap = tasGramHesapla(t.sekil, t.tur, isNaN(Number(t.boyut))?t.boyut:Number(t.boyut), Number(t.adet)||1, []);
          const grGoster = grHesap > 0 ? grHesap : (Number(t.gram)||0);
          const grupLabel = t.grup==="tepelik"?"Tepelik · ":t.grup==="pave"?"Pavé · ":"";
          tasStr += "<div class='tas-row'>";
          tasStr += "<span class='tas-sekil'>" + grupLabel + t.sekil + (t.sekil==="ROUND"?" ("+t.tur+")":"") + "</span>";
          tasStr += "<span class='tas-dim'>" + t.boyut + (t.sekil==="ROUND"?"mm":"") + "</span>";
          tasStr += "<span class='tas-dim'>x" + (t.adet||1) + "</span>";
          if (grGoster > 0) tasStr += "<span class='tas-gr'>" + grGoster.toFixed(4) + "gr</span>";
          tasStr += "</div>";
        });
        tasStr += "</div>";
      } else if (Number(r.tasGram) > 0) {
        // Taş listesi yoksa toplam gramı göster
        tasStr = "<div class='tas-blok'><div class='tas-lbl'>Tas</div>";
        tasStr += "<div class='tas-row'><span class='tas-sekil'>" + (r.tasSekil||"—") + "</span>";
        if (r.tasBoyut) tasStr += "<span class='tas-dim'>" + r.tasBoyut + "mm</span>";
        if (r.tasAdet) tasStr += "<span class='tas-dim'>x" + r.tasAdet + "</span>";
        tasStr += "<span class='tas-gr'>" + fN(r.tasGram,4) + "gr</span>";
        tasStr += "</div></div>";
      }
      // Toplam taş gramı — taş listesi varsa ekle
      if (taslar.length > 0) {
        const toplamTasGr = taslar.reduce((acc, t) => {
          const gr = tasGramHesapla(t.sekil, t.tur, isNaN(Number(t.boyut))?t.boyut:Number(t.boyut), Number(t.adet)||1, []);
          return acc + (gr > 0 ? gr : (Number(t.gram)||0));
        }, 0);
        const gosterTas = toplamTasGr > 0 ? toplamTasGr : (Number(r.tasGram)||0);
        if (gosterTas > 0) {
          tasStr += "<div style='margin-top:4px;padding:3px 7px;background:#eef4fa;border-radius:3px;font-size:8px;color:#4a5568'>"
            + "Toplam taş: <span style='color:#c9a84c;font-weight:700'>" + fN(gosterTas,4) + " gr</span>"
            + " &nbsp;·&nbsp; " + taslar.reduce((s,t)=>s+(Number(t.adet)||1),0) + " adet"
            + "</div>";
        }
      }
    }

    h += "<tr>";
    h += "<td class='foto-cell'><div class='foto-wrap'>" + (r.foto?"<img src='"+r.foto+"'/>":"") + "</div></td>";
    h += "<td><div class='kod'>" + (r.kod||"—") + "</div></td>";
    h += "<td><div class='model-ad'>" + (r.ad||"") + (r.kategori?" <span style='font-size:8px;color:#8a9bb0'>· "+r.kategori+"</span>":"") + "</div>" + (r.sipNot?"<div class='model-nt'>"+r.sipNot+"</div>":"") + boyStr + tasStr + "</td>";
    h += "<td class='r'><span class='" + renkClass + "'>" + (r.renk||"Sari") + "</span></td>";
    h += "<td class='r'>" + r.adet + "</td>";
    h += "<td class='r'><div class='gram-lbl'>birim</div><div class='gram-birim'>" + fN(birimGram,2) + " gr</div></td>";
    h += "<td class='r'><div class='gram-lbl'>toplam</div><div class='gram-top'>" + fN(topGram,2) + " gr</div></td>";
    if (fiyatli) {
      h += "<td class='r'>" + iscBirimStr + "</td>";
      h += "<td class='r'>" + iscTopStr + "</td>";
    }
    h += "</tr>";
  });

  h += "</tbody></table></div>";

  // TOPLAM BAR — tablo sütunlarıyla hizalı
  // Sütun yapısı: foto(78) kod(78) urun(1fr) renk(40) adet(30) birimGr(68) topGr(68) [isc/br(88) iscTop(88)]
  h += "<div class='tot-bar'>";
  if (fiyatli) {
    h += "<table style='width:100%;border-collapse:collapse'><tr>";
    h += "<td style='width:78px'></td>";
    h += "<td style='width:78px'></td>";
    h += "<td></td>";
    h += "<td style='width:40px'></td>";
    h += "<td style='width:30px;text-align:right'><div style='font-size:7px;color:#8a9bb0;text-transform:uppercase;letter-spacing:.1em'>Adet</div><div style='font-size:16px;font-weight:700;color:#0f1923'>" + tAdet + "</div></td>";
    h += "<td style='width:68px'></td>";
    h += "<td style='width:68px;text-align:right'><div style='font-size:7px;color:#8a9bb0;text-transform:uppercase;letter-spacing:.1em'>Toplam Gram</div><div style='font-size:16px;font-weight:700;color:#0f1923'>" + fN(tGram,2) + " gr</div></td>";
    h += "<td style='width:88px;text-align:right;padding-left:7px'><div style='font-size:7px;color:#8a9bb0;text-transform:uppercase;letter-spacing:.1em'>Iscilik Has</div><div style='font-size:12px;font-weight:600;color:#0f1923'>" + tIscilikHas.toFixed(4) + " has</div></td>";
    h += "<td style='width:88px;text-align:right;padding-left:7px'><div style='font-size:7px;color:#8a9bb0;text-transform:uppercase;letter-spacing:.1em'>Toplam Iscilik</div><div style='font-size:15px;font-weight:700;color:#0f1923'>" + fUSD(tIscilik) + "</div></td>";
    h += "</tr></table>";
  } else {
    h += "<table style='width:100%;border-collapse:collapse'><tr>";
    h += "<td style='width:78px'></td>";
    h += "<td style='width:78px'></td>";
    h += "<td></td>";
    h += "<td style='width:40px'></td>";
    h += "<td style='width:30px;text-align:right'><div style='font-size:7px;color:#8a9bb0;text-transform:uppercase;letter-spacing:.1em'>Adet</div><div style='font-size:16px;font-weight:700;color:#0f1923'>" + tAdet + "</div></td>";
    h += "<td style='width:68px'></td>";
    h += "<td style='width:68px;text-align:right'><div style='font-size:7px;color:#8a9bb0;text-transform:uppercase;letter-spacing:.1em'>Toplam Gram</div><div style='font-size:16px;font-weight:700;color:#0f1923'>" + fN(tGram,2) + " gr</div></td>";
    h += "</tr></table>";
  }
  h += "</div>";

  // FOOTER
  h += "<div class='footer'><div class='footer-left'>MSK Kuyumculuk &nbsp;·&nbsp; " + new Date().toLocaleDateString("tr-TR") + " &nbsp;·&nbsp; " + sipNo + "</div>";
  h += "<div class='footer-sig'><div class='sig-box'><div class='sig-line'></div><div class='sig-lbl'>Hazirlayan</div></div>";
  h += "<div class='sig-box'><div class='sig-line'></div><div class='sig-lbl'>Musteri Onayi</div></div></div></div>";
  h += "</div><button class='noprint pb' onclick='window.print()'>Yazdir / PDF</button></body></html>";
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
      const iadeAdet  = ((s.kalemIade)||{})[k.id] || 0;
      const tamirAdet = ((s.kalemTamir)||{})[k.id] || 0;
      const netAdet = Math.max(0, (k.adet||1) - hurdaAdet - iadeAdet - tamirAdet);
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

// ═══ SİPARİŞ LİSTESİ ÖZET RAPORU PDF ═══
function buildSipListeRaporuHTML(siparisler, altinKgUSD, mc) {
  const hasGramUSD = (altinKgUSD || 0) / 1000;
  let topAdet = 0, topGram = 0, topKar = 0, topKarUSD = 0;
  let topHurda = 0, topIade = 0, topTamir = 0;

  // ── Sipariş bazlı hesaplama ──
  const sipData = siparisler.map(s => {
    let sipAdet = 0, sipGram = 0, sipKar = 0, sipKarUSD = 0;
    let sipHurda = 0, sipIade = 0, sipTamir = 0;
    const kalemDetay = (s.kalemler || []).map(k => {
      const hc       = hesapla(k, k.secilenAyar || k.refAyar, s.altinKgUSD || altinKgUSD, s.mc || mc);
      const adet     = k.adet || 1;
      const hurda    = ((s.kalemHurda)  || {})[k.id] || 0;
      const iade     = ((s.kalemIade)   || {})[k.id] || 0;
      const tamir    = ((s.kalemTamir)  || {})[k.id] || 0;
      const net      = Math.max(0, adet - hurda - iade - tamir);
      const karMly   = hc.mamulGram > 0 ? hc.karHas / hc.mamulGram : 0;
      sipAdet  += net;  sipGram  += hc.mamulGram * net;
      sipKar   += hc.karHas * net;  sipKarUSD += hc.karHas * net * hasGramUSD;
      sipHurda += hurda; sipIade += iade; sipTamir += tamir;
      return { k, hc, adet, net, hurda, iade, tamir, karMly,
        hurdaNeden: ((s.kalemHurdaNeden) || {})[k.id] || "",
        iadeNeden:  ((s.kalemIadeNeden)  || {})[k.id] || "",
        tamirNeden: ((s.kalemTamirNeden) || {})[k.id] || "" };
    });
    topAdet += sipAdet; topGram += sipGram; topKar += sipKar; topKarUSD += sipKarUSD;
    topHurda += sipHurda; topIade += sipIade; topTamir += sipTamir;
    return { s, kalemDetay, sipAdet, sipGram, sipKar, sipKarUSD,
      sipHurda, sipIade, sipTamir,
      sipKarMly: sipGram > 0 ? sipKar / sipGram : 0 };
  });

  // ── Model bazlı kayıp listesi (hurda / iade / tamir) ──
  // { modelKod: { ad, hurda:[{adet,neden}], iade:[...], tamir:[...] } }
  const kayipMap = {};
  siparisler.forEach(s => {
    (s.kalemler || []).forEach(k => {
      const key = k.kod || k.id;
      if (!kayipMap[key]) kayipMap[key] = { ad: k.ad || k.kod || "?", kod: k.kod || "?", hurda:[], iade:[], tamir:[] };
      const h = ((s.kalemHurda)  || {})[k.id] || 0;
      const ia= ((s.kalemIade)   || {})[k.id] || 0;
      const t = ((s.kalemTamir)  || {})[k.id] || 0;
      if (h  > 0) kayipMap[key].hurda.push({ adet:h,  neden: ((s.kalemHurdaNeden) || {})[k.id] || "" });
      if (ia > 0) kayipMap[key].iade.push ({ adet:ia, neden: ((s.kalemIadeNeden)  || {})[k.id] || "" });
      if (t  > 0) kayipMap[key].tamir.push({ adet:t,  neden: ((s.kalemTamirNeden) || {})[k.id] || "" });
    });
  });
  const kayipListesi = Object.values(kayipMap)
    .filter(m => m.hurda.length || m.iade.length || m.tamir.length)
    .sort((a,b) => {
      const ta = a.hurda.reduce((s,x)=>s+x.adet,0) + a.iade.reduce((s,x)=>s+x.adet,0) + a.tamir.reduce((s,x)=>s+x.adet,0);
      const tb = b.hurda.reduce((s,x)=>s+x.adet,0) + b.iade.reduce((s,x)=>s+x.adet,0) + b.tamir.reduce((s,x)=>s+x.adet,0);
      return tb - ta;
    });

  // ── CSS ──
  const css = "*{margin:0;padding:0;box-sizing:border-box}"
    + "body{font-family:'Segoe UI',Arial,sans-serif;background:#f3f3f3;padding:14px;display:flex;justify-content:center}"
    + "@media print{.np{display:none!important}@page{size:A4;margin:8mm}body{background:#fff;padding:0;display:block}}"
    + ".page{background:#fff;width:100%;max-width:740px;padding:16px 20px;border-radius:8px;margin-bottom:14px}"
    + "@media print{.page{border-radius:0;margin:0;padding:12px 14px;page-break-after:always}.page:last-child{page-break-after:auto}}"
    + "h1{font-size:16px;font-weight:800;color:#1a1a1a;margin-bottom:2px}"
    + ".dt{font-size:9px;color:#999;margin-bottom:12px}"
    + ".divider{border:none;border-top:2px solid #c9a84c;margin:10px 0}"
    + ".sum{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}"
    + ".sbox{background:#faf5e8;border:1px solid #e8d5a0;border-radius:8px;padding:8px 10px;text-align:center}"
    + ".sbox .lb{font-size:7px;color:#999;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px}"
    + ".sbox .vl{font-size:15px;font-weight:800;color:#1a1a1a}"
    + ".gn{color:#2d8a4e}.rd{color:#c0392b}.or{color:#b8600a}.bl{color:#1e5fa8}"
    + ".kayip-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}"
    + ".ksbox{border-radius:8px;padding:8px 12px;text-align:center}"
    + ".ksbox .lb{font-size:7px;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px}"
    + ".ksbox .vl{font-size:20px;font-weight:800}"
    + ".kar-bar-wrap{margin-bottom:14px}"
    + ".kar-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:5px}"
    + ".kar-bar-lbl{width:60px;font-size:9px;font-weight:700}"
    + ".kar-bar-bg{flex:1;height:10px;background:#eee;border-radius:5px;overflow:hidden}"
    + ".kar-bar-fill{height:100%;border-radius:5px}"
    + ".kar-bar-val{width:30px;font-size:9px;font-weight:700;text-align:right}"
    + "table{width:100%;border-collapse:collapse;font-size:10px}"
    + "th{background:#faf5e8;padding:5px 7px;font-size:7.5px;font-weight:700;color:#8a7d64;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #c9a84c;text-align:left}"
    + "th.r{text-align:right}"
    + "td{padding:7px 7px;border-bottom:1px solid #f0ece4;vertical-align:middle}"
    + "td.r{text-align:right}"
    + "tr.tot td{background:#faf5e8;font-weight:800;border-top:2px solid #c9a84c}"
    + "tr.kayip-row{background:#fff8f5}"
    + ".mly{font-size:10px;font-weight:800}"
    + ".sec{font-size:10px;font-weight:800;color:#c9a84c;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px;padding-bottom:4px;border-bottom:1.5px solid #e8d5a0}"
    + ".kayip-model{display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f5f0e8}"
    + ".km-kod{font-size:11px;font-weight:800;color:#c9a84c;width:90px;flex-shrink:0}"
    + ".km-ad{font-size:10px;color:#555;flex:1}"
    + ".km-badges{display:flex;gap:5px;flex-wrap:wrap}"
    + ".badge{display:inline-flex;align-items:center;gap:3px;border-radius:5px;padding:2px 8px;font-size:9px;font-weight:700}"
    + ".badge-h{background:#fdecea;color:#c0392b;border:1px solid #f5b7b1}"
    + ".badge-i{background:#f3f0ff;color:#6d28d9;border:1px solid #ddd6fe}"
    + ".badge-t{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}"
    + ".neden{font-size:8px;font-weight:400;color:#888}"
    + ".pb{position:fixed;bottom:14px;right:14px;background:#c9a84c;border:none;border-radius:10px;padding:9px 20px;color:#fff;font-size:12px;cursor:pointer;font-family:sans-serif;font-weight:700}";

  // ── HTML başlat ──
  let h = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Karlilık & Kayıp Raporu</title><style>" + css + "</style></head><body>";

  // ════════════════════════════════════════════════
  // SAYFA 1 — ÖZET
  // ════════════════════════════════════════════════
  h += "<div class='page'>";
  h += "<h1>Karlılık & Kayıp Raporu</h1>";
  h += "<div class='dt'>" + new Date().toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"}) + " &nbsp;·&nbsp; " + siparisler.length + " sipariş" + (altinKgUSD ? " &nbsp;·&nbsp; $" + Number(altinKgUSD).toLocaleString("tr-TR") + "/kg" : "") + "</div>";
  h += "<hr class='divider'/>";

  // Karlılık özeti kutuları
  const topKarMly = topGram > 0 ? topKar / topGram : 0;
  h += "<div class='sum'>";
  h += "<div class='sbox'><div class='lb'>Net Kalem</div><div class='vl bl'>" + topAdet + "</div></div>";
  h += "<div class='sbox'><div class='lb'>Net Gram</div><div class='vl bl'>" + fN(topGram,1) + " gr</div></div>";
  h += "<div class='sbox'><div class='lb'>Toplam Kâr</div><div class='vl gn'>" + fN(topKar,3) + " has" + (topKarUSD>0?"<br><span style='font-size:9px;color:#888'>≈$"+topKarUSD.toFixed(0)+"</span>":"") + "</div></div>";
  h += "<div class='sbox'><div class='lb'>Ort. Karlılık</div><div class='vl " + (topKarMly>=0.030?"gn":topKarMly>=0.020?"or":"rd") + "'>" + fN(topKarMly,3) + " mly</div></div>";
  h += "</div>";

  // Kayıp özeti kutuları
  h += "<div class='kayip-sum'>";
  h += "<div class='ksbox' style='background:#fdecea;border:1px solid #f5b7b1'><div class='lb rd'>Hurda</div><div class='vl rd'>" + topHurda + " adet</div></div>";
  h += "<div class='ksbox' style='background:#f3f0ff;border:1px solid #ddd6fe'><div class='lb' style='color:#6d28d9'>İade</div><div class='vl' style='color:#6d28d9'>" + topIade + " adet</div></div>";
  h += "<div class='ksbox' style='background:#eff6ff;border:1px solid #bfdbfe'><div class='lb' style='color:#1d4ed8'>Tamir</div><div class='vl' style='color:#1d4ed8'>" + topTamir + " adet</div></div>";
  h += "</div>";

  // Karlılık bar grafiği (sipariş bazlı dağılım)
  const kIyi  = sipData.filter(d=>d.sipKarMly>=0.030).length;
  const kOrta = sipData.filter(d=>d.sipKarMly>=0.020&&d.sipKarMly<0.030).length;
  const kDus  = sipData.filter(d=>d.sipKarMly<0.020&&d.sipGram>0).length;
  const kTop  = siparisler.length || 1;
  h += "<div class='sec'>Karlılık Dağılımı</div>";
  h += "<div class='kar-bar-wrap'>";
  [["İyi  ≥0.030", kIyi,  "#2d8a4e"], ["Orta ≥0.020", kOrta, "#b8600a"], ["Düşük <0.020", kDus, "#c0392b"]].forEach(([lbl,sayi,renk]) => {
    h += "<div class='kar-bar-row'>";
    h += "<div class='kar-bar-lbl' style='color:"+renk+"'>"+lbl+"</div>";
    h += "<div class='kar-bar-bg'><div class='kar-bar-fill' style='width:"+Math.round(sayi/kTop*100)+"%;background:"+renk+"'></div></div>";
    h += "<div class='kar-bar-val' style='color:"+renk+"'>"+sayi+"</div>";
    h += "</div>";
  });
  h += "<div style='font-size:8px;color:#aaa;margin-top:4px'>Toplam " + kTop + " sipariş · mly/gr = karlılık milyemi (maliyet düşüldükten sonra net kâr)</div>";
  h += "</div>";

  // Model bazlı kayıp özeti tablosu
  if (kayipListesi.length > 0) {
    h += "<div class='sec'>Model Bazlı Kayıp Özeti</div>";
    kayipListesi.forEach(m => {
      const topH  = m.hurda.reduce((s,x)=>s+x.adet,0);
      const topIA = m.iade.reduce((s,x)=>s+x.adet,0);
      const topT  = m.tamir.reduce((s,x)=>s+x.adet,0);
      h += "<div class='kayip-model'>";
      h += "<div class='km-kod'>" + m.kod + "</div>";
      h += "<div style='flex:1'>";
      h += "<div class='km-ad'>" + m.ad + "</div>";
      h += "<div class='km-badges' style='margin-top:4px'>";
      if (topH  > 0) { const nedenler = [...new Set(m.hurda.map(x=>x.neden).filter(Boolean))].join(", "); h += "<span class='badge badge-h'>Hurda ×" + topH + (nedenler?" <span class='neden'>"+nedenler+"</span>":"") + "</span>"; }
      if (topIA > 0) { const nedenler = [...new Set(m.iade.map(x=>x.neden).filter(Boolean))].join(", ");  h += "<span class='badge badge-i'>İade ×"  + topIA + (nedenler?" <span class='neden'>"+nedenler+"</span>":"") + "</span>"; }
      if (topT  > 0) { const nedenler = [...new Set(m.tamir.map(x=>x.neden).filter(Boolean))].join(", "); h += "<span class='badge badge-t'>Tamir ×" + topT  + (nedenler?" <span class='neden'>"+nedenler+"</span>":"") + "</span>"; }
      h += "</div></div></div>";
    });
  } else {
    h += "<div style='margin-top:10px;padding:8px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:10px;color:#2d8a4e;font-weight:700'>✓ Bu listede hurda, iade veya tamir kaydı bulunmuyor.</div>";
  }
  h += "</div>"; // page 1 bitti

  // ════════════════════════════════════════════════
  // SAYFA 2 — SİPARİŞ DETAY TABLOSU
  // ════════════════════════════════════════════════
  h += "<div class='page'>";
  h += "<h1>Sipariş Detayı</h1>";
  h += "<div class='dt'>" + siparisler.length + " sipariş · net karlılık (hurda/iade/tamir düşülmüş)</div>";
  h += "<hr class='divider'/>";

  h += "<table><thead><tr>";
  h += "<th>Müşteri</th><th>Tarih</th><th class='r'>Net Adet</th><th class='r'>Gram</th><th class='r'>Kâr (has)</th><th class='r'>mly/gr</th><th class='r'>H / İ / T</th>";
  h += "</tr></thead><tbody>";

  sipData.forEach(({ s, kalemDetay, sipAdet, sipGram, sipKar, sipKarUSD, sipHurda, sipIade, sipTamir, sipKarMly }) => {
    const hasKayip = sipHurda>0 || sipIade>0 || sipTamir>0;
    const karRenk  = sipKarMly>=0.030 ? "#2d8a4e" : sipKarMly>=0.020 ? "#b8600a" : "#c0392b";
    const tarih    = new Date(s.tarih).toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"2-digit"});
    h += "<tr" + (hasKayip?" class='kayip-row'":"") + ">";
    h += "<td style='font-weight:700'>" + (s.musKod||s.musteri||"İsimsiz") + (s.musKod&&s.musteri&&s.musKod!==s.musteri?"<br><span style='font-size:8px;color:#999'>"+s.musteri+"</span>":"") + "</td>";
    h += "<td style='color:#888;font-size:9px'>" + tarih + (s.teslimTarihi?"<br>Teslim: "+new Date(s.teslimTarihi).toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"2-digit"}):"") + "</td>";
    h += "<td class='r' style='font-weight:800'>" + sipAdet + "</td>";
    h += "<td class='r'>" + fN(sipGram,2) + " gr</td>";
    h += "<td class='r' style='color:"+karRenk+";font-weight:700'>" + fN(sipKar,3) + (sipKarUSD>0?"<br><span style='font-size:8px;color:#aaa'>≈$"+sipKarUSD.toFixed(0)+"</span>":"") + "</td>";
    h += "<td class='r'><span class='mly' style='color:"+karRenk+"'>" + fN(sipKarMly,3) + "</span></td>";
    // H/İ/T hücresi
    const hitParts = [];
    if (sipHurda>0) hitParts.push("<span style='color:#c0392b;font-weight:800'>H:"+sipHurda+"</span>");
    if (sipIade >0) hitParts.push("<span style='color:#6d28d9;font-weight:800'>İ:"+sipIade +"</span>");
    if (sipTamir>0) hitParts.push("<span style='color:#1d4ed8;font-weight:800'>T:"+sipTamir+"</span>");
    h += "<td class='r'>" + (hitParts.length ? hitParts.join(" ") : "<span style='color:#ccc'>—</span>") + "</td>";
    h += "</tr>";
    // Kayıp olan kalemler — model bazlı alt satır
    if (hasKayip) {
      const kayipKalemler = kalemDetay.filter(d => d.hurda>0||d.iade>0||d.tamir>0);
      h += "<tr" + (hasKayip?" class='kayip-row'":"") + ">";
      h += "<td colspan='7' style='padding:4px 7px 8px 14px;border-bottom:2px solid #f0ece4'>";
      h += "<div style='display:flex;flex-wrap:wrap;gap:5px'>";
      kayipKalemler.forEach(({ k, hurda, iade, tamir, hurdaNeden, iadeNeden, tamirNeden }) => {
        h += "<span style='font-size:9px;color:#888;font-weight:700;margin-right:4px'>" + (k.kod||k.ad||"?") + ":</span>";
        if (hurda>0) h += "<span class='badge badge-h'>Hurda ×"+hurda+(hurdaNeden?" · <span class='neden'>"+hurdaNeden+"</span>":"")+"</span>";
        if (iade >0) h += "<span class='badge badge-i'>İade ×" +iade +(iadeNeden ?" · <span class='neden'>"+iadeNeden +"</span>":"")+"</span>";
        if (tamir>0) h += "<span class='badge badge-t'>Tamir ×"+tamir+(tamirNeden?" · <span class='neden'>"+tamirNeden+"</span>":"")+"</span>";
      });
      h += "</div></td></tr>";
    }
  });

  // Toplam satırı
  const topKarMlyFin = topGram>0 ? topKar/topGram : 0;
  const topKarRenk   = topKarMlyFin>=0.030?"#2d8a4e":topKarMlyFin>=0.020?"#b8600a":"#c0392b";
  h += "<tr class='tot'>";
  h += "<td colspan='2' style='text-align:right;font-size:9px;color:#8a7d64;text-transform:uppercase'>Toplam</td>";
  h += "<td class='r'>" + topAdet + "</td>";
  h += "<td class='r'>" + fN(topGram,1) + " gr</td>";
  h += "<td class='r' style='color:"+topKarRenk+"'>" + fN(topKar,3) + (topKarUSD>0?"<br><span style='font-size:8px;color:#aaa'>≈$"+topKarUSD.toFixed(0)+"</span>":"") + "</td>";
  h += "<td class='r' style='color:"+topKarRenk+"'>" + fN(topKarMlyFin,3) + "</td>";
  h += "<td class='r' style='font-size:9px'>";
  if (topHurda>0) h += "<span style='color:#c0392b;font-weight:800'>H:"+topHurda+"</span> ";
  if (topIade >0) h += "<span style='color:#6d28d9;font-weight:800'>İ:"+topIade +"</span> ";
  if (topTamir>0) h += "<span style='color:#1d4ed8;font-weight:800'>T:"+topTamir+"</span>";
  h += "</td></tr>";
  h += "</tbody></table>";
  h += "</div>"; // page 2 bitti

  h += "<button class='np pb' onclick='window.print()'>Yazdır / PDF</button></body></html>";
  return h;
}

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

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  const maxW = wide ? "min(1100px,96vw)" : "min(580px,94vw)";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(170deg,#1c1a15,#15130f)", border: "1px solid rgba(201,168,76,0.14)", borderRadius: 18, padding: "22px 26px", width: maxW, maxHeight: "92vh", overflowY: "auto" }}>
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
  const rows = pv.gumusMu ? [
    // ═══ GÜMÜŞ (925) — sadece işçilik ═══
    { l: "Gümüş gramı", v: fN(pv.mamulGram) + " gr", c: "#c0c0c0" },
    { l: "İşçilik (gram başı)", v: "$" + fN(pv.gumusIscilikGr, 2) + "/gr", c: "#e8833a" },
    null,
    { l: "TOPLAM İŞÇİLİK", v: "$" + fN(pv.gumusIscilikTop, 1), c: "#6abf69", bold: true, big: true },
  ].filter(Boolean) : [
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
  const [hatirla, setHatirla] = useState(true);
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
  }, []);
  const kontrol = () => {
    const aktifSifre = localStorage.getItem("atolye_sifre") || "19671967*Mm";
    if (sifre === aktifSifre) {
      // "Beni Hatırla" işaretliyse 30 günlük oturum token'ı kaydet
      try {
        if (hatirla) {
          const sonGecerlilik = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 gün
          localStorage.setItem("atolye_oturum", String(sonGecerlilik));
        } else {
          localStorage.removeItem("atolye_oturum");
        }
      } catch {}
      onGiris();
    }
    else setHata(true);
  };
  return (
    <div style={{ minHeight:"100vh", width:"100vw", background:"#110f0a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',Arial,sans-serif", margin:0, padding:0, boxSizing:"border-box" }}>
      <div style={{ background:"rgba(201,168,76,0.04)", border:"1px solid rgba(201,168,76,0.15)", borderRadius:16, padding:"40px 48px", textAlign:"center", maxWidth:360, width:"90%" }}>
        <div style={{ fontSize:28, marginBottom:8 }}>💎</div>
        <div style={{ fontSize:18, fontWeight:700, color:"#c9a84c", marginBottom:4 }}>Atölye Koleksiyon</div>
        <div style={{ fontSize:11, color:"#665d4a", marginBottom:28 }}>Sisteme giriş yapın</div>
        <input type="password" value={sifre} onChange={e=>{ setSifre(e.target.value); setHata(false); }}
          onKeyDown={e=>e.key==="Enter"&&kontrol()}
          placeholder="Şifre" autoFocus
          style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:"1px solid "+(hata?"#e85a4f":"rgba(201,168,76,0.2)"), borderRadius:8, padding:"10px 14px", color:"#e8dcc8", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:8 }}/>
        {hata && <div style={{ color:"#e85a4f", fontSize:11, marginBottom:8 }}>Şifre yanlış</div>}
        <label style={{ display:"flex", alignItems:"center", gap:7, marginBottom:14, cursor:"pointer", userSelect:"none" }}>
          <input type="checkbox" checked={hatirla} onChange={e=>setHatirla(e.target.checked)}
            style={{ width:16, height:16, accentColor:"#c9a84c", cursor:"pointer" }}/>
          <span style={{ fontSize:12, color:"#998a6e" }}>Beni hatırla (30 gün)</span>
        </label>
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
    try { localStorage.removeItem("atolye_oturum"); } catch {} // şifre değişti, oturum sıfırlansın
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

function SecimEkrani({ onKatalog }) {
  const PERSONEL_URL = "https://personeltakip-pearl.vercel.app/";
  const [hover, setHover] = useState(null);
  const kart = (id, ikon, baslik, aciklama, renk, onClick) => (
    <div
      onClick={onClick}
      onMouseEnter={()=>setHover(id)}
      onMouseLeave={()=>setHover(null)}
      style={{
        flex:1, minWidth:200, maxWidth:280, cursor:"pointer",
        background: hover===id ? "rgba(201,168,76,0.10)" : "rgba(201,168,76,0.04)",
        border:"1px solid "+(hover===id ? renk : "rgba(201,168,76,0.18)"),
        borderRadius:18, padding:"38px 28px", textAlign:"center",
        transform: hover===id ? "translateY(-4px)" : "none",
        transition:"all .2s ease",
        boxShadow: hover===id ? "0 12px 30px rgba(0,0,0,0.35)" : "none",
      }}>
      <div style={{ fontSize:52, marginBottom:14 }}>{ikon}</div>
      <div style={{ fontSize:18, fontWeight:800, color:renk, marginBottom:6 }}>{baslik}</div>
      <div style={{ fontSize:11, color:"#998a6e", lineHeight:1.5 }}>{aciklama}</div>
    </div>
  );
  return (
    <div style={{ minHeight:"100vh", width:"100vw", background:"#110f0a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',Arial,sans-serif", margin:0, padding:"20px", boxSizing:"border-box" }}>
      <div style={{ fontSize:32, marginBottom:6 }}>💎</div>
      <div style={{ fontSize:22, fontWeight:800, color:"#c9a84c", marginBottom:4 }}>MSK Atölye Sistemi</div>
      <div style={{ fontSize:12, color:"#665d4a", marginBottom:40 }}>Hangi bölüme girmek istersiniz?</div>
      <div style={{ display:"flex", gap:20, flexWrap:"wrap", justifyContent:"center", width:"100%", maxWidth:620 }}>
        {kart("katalog", "💎", "Katalog / Atölye", "Modeller, siparişler, koleksiyonlar, kasa ve üretim takibi", "#c9a84c", onKatalog)}
        {kart("personel", "👥", "Personel / Bordro", "Personel, mesai, avans, izin, giderler ve devam takibi", "#5b9bd5", ()=>{ window.location.href = PERSONEL_URL; })}
      </div>
      <div style={{ fontSize:9, color:"#4a4336", marginTop:36 }}>İki sistem de ortak veritabanını kullanır</div>
    </div>
  );
}

function SirketSecimEkrani({ onSec }) {
  const [hover, setHover] = useState(null);
  const sec = (onek, ad) => { setSirketOnek(onek); onSec(); };
  const kart = (id, ikon, baslik, aciklama, renk, onClick) => (
    <div
      onClick={onClick}
      onMouseEnter={()=>setHover(id)}
      onMouseLeave={()=>setHover(null)}
      style={{
        flex:1, minWidth:200, maxWidth:280, cursor:"pointer",
        background: hover===id ? "rgba(201,168,76,0.10)" : "rgba(201,168,76,0.04)",
        border:"1px solid "+(hover===id ? renk : "rgba(201,168,76,0.18)"),
        borderRadius:18, padding:"38px 28px", textAlign:"center",
        transform: hover===id ? "translateY(-4px)" : "none",
        transition:"all .2s ease",
        boxShadow: hover===id ? "0 12px 30px rgba(0,0,0,0.35)" : "none",
      }}>
      <div style={{ fontSize:52, marginBottom:14 }}>{ikon}</div>
      <div style={{ fontSize:18, fontWeight:800, color:renk, marginBottom:6 }}>{baslik}</div>
      <div style={{ fontSize:11, color:"#998a6e", lineHeight:1.5 }}>{aciklama}</div>
    </div>
  );
  return (
    <div style={{ minHeight:"100vh", width:"100vw", background:"#110f0a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',Arial,sans-serif", margin:0, padding:"20px", boxSizing:"border-box" }}>
      <div style={{ fontSize:32, marginBottom:6 }}>🏢</div>
      <div style={{ fontSize:22, fontWeight:800, color:"#c9a84c", marginBottom:4 }}>Şirket Seçin</div>
      <div style={{ fontSize:12, color:"#665d4a", marginBottom:40 }}>Hangi şirketin kataloğunu açmak istersiniz?</div>
      <div style={{ display:"flex", gap:20, flexWrap:"wrap", justifyContent:"center", width:"100%", maxWidth:620 }}>
        {kart("msk", "💎", "MSK Jewelry", "Mevcut katalog, modeller, siparişler ve kasa", "#c9a84c", ()=>sec("", "MSK"))}
        {kart("bsp", "✨", "BSP Jewelry Design", "Ayrı katalog — kendi modelleri ve siparişleri", "#a78bfa", ()=>sec("bsp_", "BSP"))}
      </div>
      <div style={{ fontSize:9, color:"#4a4336", marginTop:36 }}>İki şirketin verileri tamamen ayrıdır</div>
    </div>
  );
}

// ═══ MÜŞTERİ VİTRİN MODU ═══
// Müşteriye verilen link (?vitrin=KOD) ile açılır. Salt okunur, mahrem veri YOK.
// Sadece foto + ad + kod + gram + ayar gösterir. Seçtiklerinden PDF yapabilir.
function VitrinModu({ kod }) {
  const [durum, setDurum] = useState("yukleniyor"); // yukleniyor, gecersiz, hazir
  const [vitrinAd, setVitrinAd] = useState("");
  const [kollar, setKollar] = useState([]);
  const [modeller, setModeller] = useState([]);
  const [aktifKol, setAktifKol] = useState(null);
  const [secili, setSecili] = useState(new Set());
  const [arama, setArama] = useState("");

  useEffect(() => { (async () => {
    try {
      // Müşteri kodlarını oku (her iki şirkette de aranır)
      let kodKaydi = null, onek = "";
      for (const o of ["", "bsp_"]) {
        const eski = AKTIF_SIRKET_ONEK;
        AKTIF_SIRKET_ONEK = o;
        const kodlar = await ld("v7vitrin", []);
        AKTIF_SIRKET_ONEK = eski;
        const bulunan = (kodlar || []).find(k => k.kod === kod && k.aktif);
        if (bulunan) { kodKaydi = bulunan; onek = o; break; }
      }
      if (!kodKaydi) { setDurum("gecersiz"); return; }

      // Erişim kaydı tut (kim ne zaman açtı)
      AKTIF_SIRKET_ONEK = onek;
      try {
        const kodlar = await ld("v7vitrin", []);
        const idx = (kodlar || []).findIndex(k => k.kod === kod);
        if (idx >= 0) {
          kodlar[idx].sonErisim = Date.now();
          kodlar[idx].erisimSayisi = (kodlar[idx].erisimSayisi || 0) + 1;
          await sv("v7vitrin", kodlar);
        }
      } catch {}

      setVitrinAd(kodKaydi.musteriAd || "Katalog");
      // Veriyi çek
      const [k, m] = await Promise.all([ld("v7k", []), ld("v7m", [])]);
      AKTIF_SIRKET_ONEK = onek; // sabit kalsın
      // Sadece "vitrinde göster" işaretli koleksiyonlar
      const aktifKollar = (k || []).filter(kol => kol.vitrin === true);
      const aktifKolIdler = new Set(aktifKollar.map(kol => kol.id));
      // Mahrem alanları ÇIKAR — sadece güvenli alanlar kalır
      const guvenliModeller = (m || [])
        .filter(mod => aktifKolIdler.has(mod.ki))
        .map(mod => ({
          id: mod.id, ki: mod.ki, foto: mod.foto || "",
          kod: mod.kod || "", ad: mod.ad || "",
          gram: mod.gram || "", refAyar: mod.refAyar || "", kategori: mod.kategori || "",
        }));
      setKollar(aktifKollar);
      setModeller(guvenliModeller);
      if (aktifKollar.length > 0) setAktifKol(aktifKollar[0]);
      setDurum("hazir");
    } catch (e) {
      console.error("Vitrin yükleme hatası:", e);
      setDurum("gecersiz");
    }
  })(); }, [kod]);

  const GOLD2 = "#c9a84c";
  if (durum === "yukleniyor") {
    return <div style={{ minHeight:"100vh", background:"#0d0b07", display:"flex", alignItems:"center", justifyContent:"center", color:GOLD2, fontFamily:"sans-serif", fontSize:14 }}>Katalog yükleniyor...</div>;
  }
  if (durum === "gecersiz") {
    return <div style={{ minHeight:"100vh", background:"#0d0b07", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#e8dcc8", fontFamily:"sans-serif", textAlign:"center", padding:20 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:700, color:GOLD2, marginBottom:6 }}>Geçersiz veya Süresi Dolmuş Bağlantı</div>
      <div style={{ fontSize:12, color:"#998a6e" }}>Bu katalog bağlantısı geçerli değil. Lütfen yetkiliyle iletişime geçin.</div>
    </div>;
  }

  const koldaki = modeller.filter(m => m.ki === aktifKol?.id && (
    !arama || (m.kod + " " + m.ad).toLowerCase().includes(arama.toLowerCase())
  ));
  const seciliModeller = modeller.filter(m => secili.has(m.id));

  const vitrinPDF = () => {
    const liste = seciliModeller.length > 0 ? seciliModeller : koldaki;
    if (liste.length === 0) { alert("Önce model seçin veya bir koleksiyon açın."); return; }
    const css = "*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#f3f3f3;color:#1a1a1a;padding:0}"
      + "@media print{@page{size:A4 portrait;margin:8mm}}"
      + ".hd{text-align:center;padding:20px;border-bottom:2px solid #c9a84c;margin-bottom:14px}"
      + ".hd h1{font-size:22px;color:#1a1a1a;letter-spacing:.05em}.hd p{font-size:11px;color:#888;margin-top:4px}"
      + ".grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 12px}"
      + ".cd{background:#fff;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;page-break-inside:avoid}"
      + ".cd .ph{height:150px;background:#f3f3f3;display:flex;align-items:center;justify-content:center;overflow:hidden}"
      + ".cd .ph img{width:100%;height:100%;object-fit:contain}"
      + ".cd .inf{padding:8px 10px}.cd .kod{font-size:9px;color:#c9a84c;font-weight:700}.cd .ad{font-size:12px;font-weight:700;margin:2px 0}"
      + ".cd .gr{font-size:10px;color:#666;font-weight:600}";
    let h = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + vitrinAd + "</title><style>" + css + "</style></head><body>";
    h += "<div class='hd'><h1>" + vitrinAd + "</h1><p>" + new Date().toLocaleDateString("tr-TR") + " · " + liste.length + " model</p></div>";
    h += "<div class='grid'>";
    liste.forEach(m => {
      h += "<div class='cd'><div class='ph'>" + (m.foto ? "<img src='" + m.foto + "'/>" : "◇") + "</div>";
      h += "<div class='inf'><div class='kod'>" + (m.kod || "") + "</div><div class='ad'>" + (m.ad || "") + "</div>";
      h += "<div class='gr'>" + (m.gram ? m.gram + "gr" : "") + (m.refAyar ? " · " + m.refAyar : "") + "</div></div></div>";
    });
    h += "</div></body></html>";
    const w = window.open("", "_blank");
    if (w) { w.document.write(h); w.document.close(); setTimeout(() => w.print(), 600); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0d0b07", color:"#e8dcc8", fontFamily:"sans-serif" }}>
      <style>{"*{box-sizing:border-box}.vm-foto{transition:transform .3s}.vm-card:hover .vm-foto{transform:scale(1.08)}"}</style>
      {/* HEADER */}
      <div style={{ padding:"16px 18px", borderBottom:"1px solid rgba(201,168,76,0.12)", background:"rgba(201,168,76,0.03)", position:"sticky", top:0, zIndex:10, backdropFilter:"blur(8px)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:GOLD2 }}>{vitrinAd}</div>
            <div style={{ fontSize:10, color:"#665d4a" }}>Ürün Kataloğu</div>
          </div>
          <button onClick={vitrinPDF} style={{ background:"linear-gradient(135deg,#c9a84c,#b8943f)", border:"none", borderRadius:9, padding:"9px 18px", color:"#1a1a1a", fontSize:12, fontWeight:800, cursor:"pointer" }}>
            {secili.size > 0 ? "Seçili " + secili.size + " Modeli PDF Yap" : "Bu Koleksiyonu PDF Yap"}
          </button>
        </div>
      </div>

      {/* KOLEKSİYON SEKMELERİ */}
      <div style={{ display:"flex", gap:6, padding:"12px 18px", overflowX:"auto", borderBottom:"1px solid rgba(201,168,76,0.07)" }}>
        {kollar.map(k => (
          <button key={k.id} onClick={()=>{ setAktifKol(k); setArama(""); }} style={{ whiteSpace:"nowrap", background: aktifKol?.id===k.id ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.03)", border:"1px solid "+(aktifKol?.id===k.id ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"), borderRadius:8, padding:"7px 14px", color: aktifKol?.id===k.id ? GOLD2 : "#998a6e", fontSize:12, fontWeight:700, cursor:"pointer" }}>{k.ad}</button>
        ))}
      </div>

      {/* ARAMA */}
      <div style={{ padding:"12px 18px 0" }}>
        <input value={arama} onChange={e=>setArama(e.target.value)} placeholder="Model ara..." style={{ width:"100%", maxWidth:300, background:"rgba(201,168,76,0.05)", border:"1px solid rgba(201,168,76,0.12)", borderRadius:9, padding:"9px 14px", color:"#e8dcc8", fontSize:13, outline:"none" }}/>
      </div>

      {/* MODEL GRID */}
      <div style={{ padding:"14px 18px 40px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
        {koldaki.length === 0 && <div style={{ gridColumn:"1/-1", textAlign:"center", color:"#665d4a", padding:"40px 0", fontSize:13 }}>Bu koleksiyonda model bulunamadı</div>}
        {koldaki.map(m => {
          const sec = secili.has(m.id);
          return (
            <div key={m.id} className="vm-card" onClick={()=>{ const ns=new Set(secili); sec?ns.delete(m.id):ns.add(m.id); setSecili(ns); }}
              style={{ background:"#fff", borderRadius:12, overflow:"hidden", cursor:"pointer", border:"2px solid "+(sec?GOLD2:"transparent"), position:"relative" }}>
              <div style={{ position:"absolute", top:8, right:8, zIndex:2, width:24, height:24, borderRadius:6, background: sec?GOLD2:"rgba(255,255,255,0.85)", border:"1px solid "+(sec?GOLD2:"#ccc"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#1a1a1a" }}>{sec?"✓":""}</div>
              <div style={{ height:170, background:"#f3f3f3", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                {m.foto ? <img className="vm-foto" src={m.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }}/> : <div style={{ fontSize:32, color:"#ccc" }}>◇</div>}
              </div>
              <div style={{ padding:"8px 11px", background:"#fff", color:"#1a1a1a" }}>
                <div style={{ fontSize:9, color:GOLD2, fontWeight:700 }}>{m.kod}</div>
                <div style={{ fontSize:13, fontWeight:700, margin:"1px 0" }}>{m.ad}</div>
                <div style={{ fontSize:11, color:"#666", fontWeight:600 }}>{m.gram ? m.gram + "gr" : ""}{m.refAyar ? " · " + m.refAyar : ""}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Root() {
  // ═══ MÜŞTERİ VİTRİN MODU ═══
  // URL'de ?vitrin=KOD varsa müşteri showroom modu açılır (şifre yok, salt okunur, mahrem veri yok)
  const vitrinKod = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get("vitrin") || null;
    } catch { return null; }
  })();
  if (vitrinKod) return <VitrinModu kod={vitrinKod} />;

  const [giris, setGiris] = useState(() => {
    // "Beni Hatırla" — token varsa ve süresi dolmamışsa otomatik giriş
    try {
      const t = localStorage.getItem("atolye_oturum");
      if (t) {
        const son = parseInt(t, 10);
        if (son && Date.now() < son) return true; // süre dolmamış
        localStorage.removeItem("atolye_oturum"); // süresi dolmuş, temizle
      }
    } catch {}
    return false;
  });
  const [secim, setSecim] = useState(false);     // katalog seçildi mi
  const [sirket, setSirket] = useState(false);   // şirket seçildi mi
  const [sirketKey, setSirketKey] = useState(0); // şirket değişince Atolye'yi yeniden mount eder
  if (!giris) return <GirisEkrani onGiris={()=>setGiris(true)} />;
  if (!secim) return <SecimEkrani onKatalog={()=>setSecim(true)} />;
  if (!sirket) return <SirketSecimEkrani onSec={()=>{ setSirketKey(k=>k+1); setSirket(true); }} />;
  return <Atolye key={sirketKey} onSirketDegis={()=>setSirket(false)} />;
}

function Atolye({ onSirketDegis }) {
  const [tema, setTema] = useState(() => {
    try { const t = localStorage.getItem("atolye_tema"); return TEMALAR[t] || TEMALAR.altin; } catch { return TEMALAR.altin; }
  });
  // Yazı rengi özelleştirme (tema üstüne override)
  const [yaziRenkleri, setYaziRenkleri] = useState(() => {
    try { return JSON.parse(localStorage.getItem("atolye_yazi_renk") || "{}"); } catch { return {}; }
  });
  const yaziRenkUygula = (key, val) => {
    const yeni = { ...yaziRenkleri, [key]: val };
    setYaziRenkleri(yeni);
    try { localStorage.setItem("atolye_yazi_renk", JSON.stringify(yeni)); } catch {}
  };
  // Tüm renk alanları özelleştirilebilir — yaziRenkleri override eder, yoksa tema varsayılanı
  const T = { ...tema,
    bg:           yaziRenkleri.bg           || tema.bg,
    bg2:          yaziRenkleri.bg2          || tema.bg2,
    gold:         yaziRenkleri.gold         || tema.gold,
    text:         yaziRenkleri.text         || tema.text,
    sub:          yaziRenkleri.sub          || tema.sub,
    dim:          yaziRenkleri.dim          || tema.dim,
    card:         yaziRenkleri.card         || tema.card,
    border:       yaziRenkleri.border       || tema.border,
    header:       yaziRenkleri.header       || tema.header,
    headerBorder: yaziRenkleri.headerBorder || tema.headerBorder,
    btnBg:        yaziRenkleri.btnBg        || tema.btnBg,
    btnBorder:    yaziRenkleri.btnBorder    || tema.btnBorder,
    accent:       yaziRenkleri.accent       || tema.accent,
    danger:       yaziRenkleri.danger       || tema.danger,
    success:      yaziRenkleri.success      || tema.success,
    info:         yaziRenkleri.info         || tema.info,
  };
  // GOLD ve DARK modül seviyesinde tanımlı ve birçok yerde kullanılıyor.
  // Tema değişince bu değişkenleri de güncelle ki tüm kullanımlar aktif temaya uysun.
  GOLD = T.gold;
  DARK = T.bg2;
  // Aktif şirket — başlıkta ve ayarlarda gösterilir
  const AKTIF_SIRKET = AKTIF_SIRKET_ONEK === "bsp_" ? "BSP Jewelry Design" : "MSK Jewelry";
  // Stil sabitleri (IS/BG/GH/RD) modül seviyesinde sabit altın renkliydi — tema değişince
  // değişmiyorlardı. Burada temaya bağlı yeniden tanımlayarak modül seviyesini gölgeliyoruz.
  const IS = { width:"100%", background:T.card, border:"1px solid "+T.border, borderRadius:10, padding:"10px 14px", color:T.text, fontSize:13, outline:"none", fontFamily:"sans-serif", boxSizing:"border-box" };
  const BG = { background:"linear-gradient(135deg,"+T.gold+","+T.accent+")", border:"none", borderRadius:10, padding:"9px 18px", color:T.bg2, fontSize:12, fontWeight:800, cursor:"pointer" };
  const GH = { background:T.btnBg, border:"1px solid "+T.btnBorder, borderRadius:9, padding:"7px 13px", color:T.gold, fontSize:11, fontWeight:700, cursor:"pointer" };
  const RD = { background:"rgba(232,90,79,0.08)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:9, padding:"7px 13px", color:T.danger||"#e85a4f", fontSize:11, fontWeight:700, cursor:"pointer" };
  const temaUygula = (t) => {
    setTema(t);
    try { localStorage.setItem("atolye_tema", t.id); } catch {}
  };

  const [kollar,    setKollar]    = useState([]);
  const [modeller,  setModeller]  = useState([]);
  const [siparisler,setSiparisler]= useState([]);
  const [iadeModal,  setIadeModal] = useState(null); // {sipId, kalemId, kalemAd, maxAdet, mevcAdet, iadeTuru, mevcNeden}
  const [cizelgeModal, setCizelgeModal] = useState(null); // sipId — zaman çizelgesi modal'ı
  const [musteriler, setMusteriler] = useState({}); // { "Ahmet": "MUS-001", ... }
  const [loaded,    setLoaded]    = useState(false);
  const [toast, setToast] = useState(null); // {tip:"ok"|"hata", msg:"..."}
  const toastGoster = useCallback((tip, msg) => {
    setToast({ tip, msg, id: Date.now() });
    setTimeout(() => setToast(t => (t && t.msg === msg ? null : t)), 3000);
  }, []);

  // KASA
  const [kasa, setKasa] = useState({
    musteriOdemeler: {},
    dokumcuIslemler: [],
    hamAltin: [],
    hazirUrun: [],
    serbest: [],
    musteriModelFiyat: {}, // { "MusteriAd": { "MODEL-KOD": { iscilikDolar, iscilikBirim } } }
  });
  const [kasaSayfa, setKasaSayfa] = useState("ozet");
  // Asistan
  const [ajanSoru, setAjanSoru] = useState("");
  const [rhinoMizan, setRhinoMizan] = useState(null); // parse edilmiş mizan verisi
  const [mizanEslestirme, setMizanEslestirme] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mizan_eslestirme") || "{}"); } catch { return {}; }
  }); // { "MizanAdı": "SistemAdı" }
  const [ajanGecmis, setAjanGecmis] = useState([]); // [{rol:"user"|"assistant", icerik:"..."}]
  const [ajanYukleniyor, setAjanYukleniyor] = useState(false);
  const [kasaModal, setKasaModal] = useState(null);
  const [kasaKilitli, setKasaKilitli] = useState(true);
  const [kasaSifreGirdi, setKasaSifreGirdi] = useState("");
  const [kasaSifreHata, setKasaSifreHata] = useState(false);
  // Kasa modal form state'leri (hook kuralı: koşullu çağrılamaz)
  const [kfMus,   setKfMus]   = useState("");
  const [kfHas,   setKfHas]   = useState("");
  const [kfAc,    setKfAc]    = useState("");
  const [kfTarih, setKfTarih] = useState(new Date().toISOString().slice(0,10));
  const [kfTip,   setKfTip]   = useState("giris");
  const [kfMod,   setKfMod]   = useState("");
  const [kfAdet,  setKfAdet]  = useState("1");
  const [kfAd,    setKfAd]    = useState("");
  const [kfGram,  setKfGram]  = useState("");

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
  const [hizalaModal, setHizalaModal] = useState(false);
  const [dragKolIdx, setDragKolIdx] = useState(null);
  const [dragOverKolIdx, setDragOverKolIdx] = useState(null);
  const [dragHaritaKol, setDragHaritaKol] = useState(null);
  const [dragOverHaritaKol, setDragOverHaritaKol] = useState(null);
  const [manuelTarihModal, setManuelTarihModal] = useState(null); // {sipId, gecmisIdx, durum, tarih}
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
  const [tamirModal, setTamirModal] = useState(null); // {sipId, kalemId, kalemAd, maxAdet, mevcAdet}
  const HURDA_NEDENLER = ["İade","Çizim Hatası","Döküm Hatası","Atölyede Üretim Hatası","Taş Düşmesi","Müşteri Değişikliği","Diğer"];

  // Ayarlar
  const [ayarEtiketler, setAyarEtiketler] = useState([]); // global etiket listesi
  const [ayarKategoriler, setAyarKategoriler] = useState(["yuzuk","kolye","kupe","bilezik","bileklik","pendant","set","diger"]);
  const [vitrinKodlar, setVitrinKodlar] = useState([]); // müşteri vitrin kodları
  const [yeniMusteriAd, setYeniMusteriAd] = useState("");
  const [otoYedekler, setOtoYedekler] = useState([]); // otomatik yedek listesi
  const [islemGecmisi, setIslemGecmisi] = useState([]); // işlem geçmişi
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
  const [konfSipAciklama, setKonfSipAciklama] = useState(""); // sipariş geneli açıklama
  const [konfTeslim,     setKonfTeslim]     = useState("");
  const [acikSiparisler, setAcikSiparisler] = useState({});
  const [sipMusF,  setSipMusF]  = useState("");
  const [sipFiltre, setSipFiltre] = useState("tumü"); // tumu, aktif, baslanmadi, dokumde, geciken, tamamlanan
  const [sipTarih1,setSipTarih1]= useState("");
  const [sipTarih2,setSipTarih2]= useState("");
  const [analizMusF,  setAnalizMusF]  = useState("");
  const [analizTarih1,setAnalizTarih1]= useState("");
  const [analizTarih2,setAnalizTarih2]= useState("");
  const [analizDonem, setAnalizDonem] = useState("bu_ay"); // bu_ay, gecen_ay, 3ay, 6ay, yil, ozel
  const [kesfetSekme, setKesfetSekme] = useState("yeni"); // yeni, coksatan, arizali, karli
  const [editMusteri, setEditMusteri] = useState(null); // {ad, kod} düzenleme
  const [konfAyarlar, setKonfAyarlar] = useState({});
  const [konfBoylar,  setKonfBoylar]  = useState({}); // id -> [{sistem, deger, adet}]
  const [konfGenelBoy, setKonfGenelBoy] = useState({ aktif: false, sistem: "US", deger: "" }); // genel boy
  const [kayitliNotlar, setKayitliNotlar] = useState([]); // kayıtlı not şablonları
  const [yeniNotSablon, setYeniNotSablon] = useState("");
  const [konfAyar,    setKonfAyar]    = useState("14K");  // tek global ayar
  const [konfFiyatlar, setKonfFiyatlar] = useState({}); // {modelId: {iscilikDolar, iscilikBirim}}
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
  const [fIscilikAyarlar,setFIscilikAyarlar] = useState({}); // { "10K": {dolar:"-0.003", birim:"milyem"}, ... }
  const [fEkMaliyet,   setFEkMaliyet]  = useState("");
  const [fKategori,    setFKategori]   = useState("yuzuk");
  const [fSetKodu,     setFSetKodu]    = useState(""); // set kodu - aynı sete ait modelleri eşler
  const [fAc,          setFAc]         = useState("");
  const [fFoto,        setFFoto]       = useState("");
  const [fKolId,       setFKolId]      = useState("");
  const [fDurum,       setFDurum]      = useState("baslanmadi");
  const [fEtiketler,   setFEtiketler]  = useState([]);
  const [fYeniEtiket,  setFYeniEtiket] = useState("");
  const fileRef = useRef(null);

  const altinKgUSD  = Number(altinKg) || 0;
  const madenCarpan = Number(mc) || 0.25;

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    // Model kart foto hover zoom — Atölye'de her zaman aktif olmalı
    // (Giriş ekranı "beni hatırla" ile atlanınca da çalışsın diye burada)
    if (!document.getElementById("atolye-hover-zoom")) {
      const s = document.createElement("style");
      s.id = "atolye-hover-zoom";
      s.textContent = `.model-foto-wrap { overflow:hidden; position:relative; } .model-foto-wrap img { transition: transform .4s cubic-bezier(.25,.46,.45,.94), transform-origin 0s !important; transform-origin: center center; } .model-foto-wrap:hover img { transform: scale(1.90) !important; }`;
      document.head.appendChild(s);
    }
    const hoverHandler = function(e) {
      const el = e.target.closest && e.target.closest(".model-foto-wrap");
      if (!el) return;
      const img = el.querySelector("img");
      if (!img) return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width * 100).toFixed(1);
      const y = ((e.clientY - r.top) / r.height * 100).toFixed(1);
      img.style.transformOrigin = x + "% " + y + "%";
    };
    document.addEventListener("mousemove", hoverHandler);
    return () => document.removeEventListener("mousemove", hoverHandler);
  }, []);

  // ═══ ÇAKIŞMA KORUMASI — versiyon takibi ═══
  const versiyonRef = useRef({ v7k: 0, v7m: 0, v7s: 0, v7u: 0, v7kasa: 0 });

  useEffect(() => { (async () => {
    const applyData = (k, m, s, u, c, ay, ks) => {
      setKollar(k||[]); setModeller(m||[]); setSiparisler(s||[]); setMusteriler(u||{});
      setAltinKg(c?.a || ""); setMc(c?.mc || "0.030");
      if (ay?.kategoriler?.length) setAyarKategoriler(ay.kategoriler);
      if (ay?.etiketler?.length) setAyarEtiketler(ay.etiketler);
      if (ay?.varsAltinKg) setAyarVarsAltinKg(ay.varsAltinKg);
      if (ay?.kayitliNotlar?.length) setKayitliNotlar(ay.kayitliNotlar);
      if (ay?.ozelTaslar?.length) setOzelTaslar(ay.ozelTaslar);
      if (ay?.varsMc) setAyarVarsMc(ay.varsMc);
      if (ay?.varsIscilik) setAyarVarsIscilik(ay.varsIscilik);
      if (ay?.varsIscilikBirim) setAyarVarsIscilikBirim(ay.varsIscilikBirim);
      if (ks) setKasa(prev => ({ ...prev, ...ks }));
      setLoaded(true);
    };

    // Versiyon damgalarını da çek — çakışma kontrolü için referans alınır
    const versiyonlariYukle = async () => {
      const [vk, vm, vs, vu, vkasa] = await Promise.all([ld("v7k_v",0), ld("v7m_v",0), ld("v7s_v",0), ld("v7u_v",0), ld("v7kasa_v",0)]);
      versiyonRef.current = { v7k: vk||0, v7m: vm||0, v7s: vs||0, v7u: vu||0, v7kasa: vkasa||0 };
    };

    // 1. Önce TÜM veriyi localStorage'dan göster (anında — sıfır network)
    try {
      const fc = localStorage.getItem("atolye_full_cache");
      if (fc) {
        const d = JSON.parse(fc);
        if (d?.m?.length > 0 || d?.k?.length > 0) {
          applyData(d.k, d.m, d.s, d.u, d.c, d.ay, d.ks);
          // Arka planda Supabase'den güncelle — sadece v7 key'leri
          Promise.all([
            ld("v7k",[]), ld("v7m",[]), ld("v7s",[]),
            ld("v7u",{}), ld("v7c",{}), ld("v7ay",{}), ld("v7kasa",null)
          ]).then(([k,m,s,u,c,ay,ks]) => {
            try { localStorage.setItem("atolye_full_cache", JSON.stringify({k,m,s,u,c,ay,ks,ts:Date.now()})); } catch {}
            if (m?.length > 0) applyData(k,m,s,u,c,ay,ks);
          });
          versiyonlariYukle();
          return;
        }
      }
    } catch {}

    // 2. Cache yok — Supabase'den çek
    // AŞAMA 2 ADIM 3: modeller/siparişler/müşteriler TABLODAN (boş/hata olursa chunk'a düşer)
    const [k,m,s,u,c,ay,ks] = await Promise.all([
      ld("v7k",[]),
      akilliModelOku(AKTIF_SIRKET_ONEK),
      akilliSiparisOku(AKTIF_SIRKET_ONEK),
      akilliMusteriOku(AKTIF_SIRKET_ONEK),
      ld("v7c",{}), ld("v7ay",{}), ld("v7kasa",null)
    ]);
    try { localStorage.setItem("atolye_full_cache", JSON.stringify({k,m,s,u,c,ay,ks,ts:Date.now()})); } catch {}
    applyData(k,m,s,u,c,ay,ks);
    setLoaded(true);
    versiyonlariYukle();
  })(); }, []);

  // ═══ OTOMATİK SENKRONİZASYON — periyodik kontrol ═══
  // Her 20 saniyede bir, başka bir cihazda değişiklik olup olmadığını kontrol eder.
  // Değişiklik varsa ilgili veriyi otomatik çeker ve ekranı günceller (sayfa yenilemesi gerekmez).
  useEffect(() => {
    if (!loaded) return;
    const kontrolEt = async () => {
      if (document.hidden) return; // sekme arka planda — gereksiz sorgu atma
      try {
        const [vk, vm, vs, vu, vkasa] = await Promise.all([ld("v7k_v",0), ld("v7m_v",0), ld("v7s_v",0), ld("v7u_v",0), ld("v7kasa_v",0)]);
        const guncel = versiyonRef.current;
        if (vk && vk !== guncel.v7k) {
          const yeni = await ld("v7k", []);
          setKollar(yeni);
          versiyonRef.current.v7k = vk;
        }
        if (vm && vm !== guncel.v7m) {
          const yeni = await ld("v7m", []);
          setModeller(yeni);
          versiyonRef.current.v7m = vm;
          try {
            const fc = localStorage.getItem("atolye_full_cache");
            const d = fc ? JSON.parse(fc) : {};
            localStorage.setItem("atolye_full_cache", JSON.stringify({...d, m:yeni, ts:Date.now()}));
          } catch {}
        }
        if (vs && vs !== guncel.v7s) {
          const yeni = await ld("v7s", []);
          setSiparisler(yeni);
          versiyonRef.current.v7s = vs;
        }
        if (vu && vu !== guncel.v7u) {
          const yeni = await ld("v7u", {});
          setMusteriler(yeni);
          versiyonRef.current.v7u = vu;
        }
        if (vkasa && vkasa !== guncel.v7kasa) {
          const yeni = await ld("v7kasa", null);
          if (yeni) setKasa(prev => ({ ...prev, ...yeni }));
          versiyonRef.current.v7kasa = vkasa;
        }
      } catch (e) { /* sessiz geç — bir sonraki kontrolde tekrar denenir */ }
    };
    const interval = setInterval(kontrolEt, 45000); // 45 saniyede bir kontrol (sadece sekme öndeyken)
    // Sekme tekrar öne gelince hemen bir kontrol yap — kullanıcı beklemesin
    const gorunurluk = () => { if (!document.hidden) kontrolEt(); };
    document.addEventListener("visibilitychange", gorunurluk);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", gorunurluk); };
  }, [loaded]);

  // ═══ REALTIME SENKRON (Aşama 3) — polling'in yanında, anlık güncelleme ═══
  const sonKendiYazma = useRef(0); // kendi yazdığımız değişikliği tekrar çekmemek için
  useEffect(() => {
    if (!loaded) return;
    const durdur = realtimeBaslat(AKTIF_SIRKET_ONEK, async (tablo, payload) => {
      // Kendi yazdığımız değişiklikse (son 4 sn içinde) yok say — kendi ekranımız zaten güncel
      if (Date.now() - sonKendiYazma.current < 4000) return;
      // Başka cihazdan değişiklik geldi — ilgili veriyi tazele
      try {
        if (tablo === "modeller") {
          const m = await akilliModelOku(AKTIF_SIRKET_ONEK);
          if (Array.isArray(m) && m.length > 0) {
            setModeller(m);
            toastGoster("ok", "↻ Modeller güncellendi (başka cihaz)");
          }
        } else if (tablo === "siparisler") {
          const s = await akilliSiparisOku(AKTIF_SIRKET_ONEK);
          setSiparisler(s);
          toastGoster("ok", "↻ Siparişler güncellendi");
        } else if (tablo === "musteriler") {
          const u = await akilliMusteriOku(AKTIF_SIRKET_ONEK);
          setMusteriler(u);
        }
      } catch (e) { console.error("Realtime tazeleme:", e.message); }
    });
    return durdur;
  }, [loaded]);

  // Kaydetmeden önce Supabase'deki versiyonla karşılaştırılır; fark varsa
  // başka bir cihaz/kullanıcı araya kayıt yapmış demektir — üzerine yazmayı durdurup uyarı verir.
  const guvenliKaydet = useCallback(async (key, data) => {
    try {
      // ═══ BOŞALTMA KORUMASI ═══
      // Bir liste (model/sipariş/koleksiyon) BOŞ olarak kaydedilmeye çalışılıyorsa,
      // ama Supabase'de ŞU AN dolu veri varsa — bu büyük olasılıkla bir okuma hatası
      // sonucu yanlışlıkla boşaltmadır. Kullanıcıya sorulur, sessizce silinmez.
      if (Array.isArray(data) && data.length === 0) {
        const mevcut = await ld(key, null);
        const mevcutAdet = Array.isArray(mevcut) ? mevcut.length : 0;
        if (mevcutAdet > 0) {
          const silOnay = window.confirm(
            "⚠ DİKKAT — VERİ KAYBI RİSKİ!\n\n" +
            "Şu an kaydedilmek istenen liste BOŞ, ama sistemde " + mevcutAdet + " kayıt var.\n\n" +
            "Bu işlem " + mevcutAdet + " kaydı SİLECEK.\n\n" +
            "Eğer bunu siz kasıtlı yapmadıysanız, İPTAL edin ve sayfayı yenileyin.\n\n" +
            "Yine de tümünü silmek istiyor musunuz?"
          );
          if (!silOnay) {
            toastGoster("hata", "İşlem iptal edildi — veri korundu");
            return false;
          }
        }
      }
      const sunucuVersiyon = await ld(key + "_v", 0);
      const bilinenVersiyon = versiyonRef.current[key] || 0;
      if (sunucuVersiyon && bilinenVersiyon && sunucuVersiyon !== bilinenVersiyon) {
        // ÇAKIŞMA — ama artık SESSİZ AKILLI BİRLEŞTİRME (reload/atılma YOK).
        // Sunucudaki güncel liste ile senin listeni id bazında birleştir:
        //  - Sende olup sunucuda olmayan (senin yeni eklediklerin) → korunur
        //  - Sunucuda olup sende olmayan (başka cihazın eklediği) → korunur
        //  - İkisinde de olan → SENİN versiyonun kazanır (en son düzenlediğin)
        if (Array.isArray(data)) {
          try {
            const sunucuVeri = await ld(key, []);
            if (Array.isArray(sunucuVeri) && sunucuVeri.length > 0) {
              const benimIdler = new Set(data.map(x => x && x.id).filter(Boolean));
              // Sunucuda olup bende olmayanları başa/sona ekle (başka cihazın kayıtları)
              const digerCihazinEkledikleri = sunucuVeri.filter(x => x && x.id && !benimIdler.has(x.id));
              if (digerCihazinEkledikleri.length > 0) {
                data = [...data, ...digerCihazinEkledikleri];
                // State'i de güncelle ki ekranda da görünsün
                if (key === "v7m") setModeller(data);
                else if (key === "v7s") setSiparisler(data);
                else if (key === "v7k") setKollar(data);
                toastGoster("ok", "↻ Diğer cihazın " + digerCihazinEkledikleri.length + " kaydıyla birleştirildi");
              }
            }
          } catch (e) { /* birleştirme başarısızsa yine de kaydet, veri kaybetme */ }
        }
      }
      await sv(key, data);
      // Kaydın gerçekten gittiğini doğrula — geri okuyup karşılaştır (güvenli tam okuma)
      const dogrulama = await ld(key, null);
      const beklenenUzunluk = Array.isArray(data) ? data.length : null;
      const gelenUzunluk = Array.isArray(dogrulama) ? dogrulama.length : null;
      if (beklenenUzunluk !== null && gelenUzunluk !== beklenenUzunluk) {
        toastGoster("hata", "✗ Kayıt doğrulanamadı — lütfen tekrar deneyin");
        return false;
      }
      const yeniVersiyon = Date.now();
      await sv(key + "_v", yeniVersiyon);
      versiyonRef.current[key] = yeniVersiyon;
      toastGoster("ok", "✓ Kaydedildi");
      return true;
    } catch (e) {
      console.error("guvenliKaydet hata:", key, e);
      toastGoster("hata", "✗ Kayıt başarısız — tekrar deneyin (" + e.message + ")");
      return false;
    }
  }, [toastGoster]);

  // Versiyon damgasını günceller — setSiparisler callback'i içinden doğrudan sv("v7s") çağıran
  // durum güncellemeleri için. Böylece o değişiklikler de versiyon takibine girer ve
  // diğer cihazlara otomatik senkronizasyonla yansır, yanlış çakışma uyarısı çıkmaz.
  const versiyonDamgala = useCallback(async (key, data) => {
    try {
      await sv(key, data);
      const v = Date.now();
      await sv(key + "_v", v);
      versiyonRef.current[key] = v;
    } catch (e) { console.error("versiyonDamgala hata:", key, e); }
  }, []);

  const svK = useCallback(async d => { setKollar(d);    await guvenliKaydet("v7k", d); }, [guvenliKaydet]);
  const svKasa = useCallback(async d => { setKasa(d); await versiyonDamgala("v7kasa", d); }, [versiyonDamgala]);
  const kasaModalAc = (data) => {
    setKfMus(data.mus||""); setKfHas(""); setKfAc(""); setKfTip("giris");
    setKfTarih(new Date().toISOString().slice(0,10));
    setKfMod(""); setKfAdet("1"); setKfAd(""); setKfGram("");
    setKasaModal(data);
  };
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
    // DUPLICATE TEMİZLEME — aynı koleksiyonda aynı kod/ID varsa son eklenen kazanır
    // FARKLI KOLEKSİYONLARDA aynı kod NORMAL (kopyalama için)
    const idMap = new Map();
    const kodMap = new Map(); // key: "koleksiyonId|kod"
    const temiz = [];
    for (let i = d.length - 1; i >= 0; i--) {
      const m = d[i];
      if (!m) continue;
      const kodKey = m.kod ? (m.ki || "") + "|" + m.kod.trim().toUpperCase() : null;
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
    try {
      const fc = localStorage.getItem("atolye_full_cache");
      const d = fc ? JSON.parse(fc) : {};
      localStorage.setItem("atolye_full_cache", JSON.stringify({...d, m:temiz, ts:Date.now()}));
    } catch {}
    await guvenliKaydet("v7m", temiz);
    sonKendiYazma.current = Date.now(); // Realtime kendi yazmamızı yok saysın
    // ÇİFT YAZMA (Aşama 2) — tabloya arka planda sessizce SENKRON et (silinenler de temizlenir)
    tabloModelleriSenkron(AKTIF_SIRKET_ONEK, temiz).then(r => {
      if (r.yazilan !== temiz.length) console.warn("⚠ Tablo senkron: " + r.yazilan + "/" + temiz.length);
    }).catch(e => console.error("Tablo senkron (arka plan):", e.message));
  }, [guvenliKaydet]);
  const svS = useCallback(async d => {
    setSiparisler(d);
    await guvenliKaydet("v7s", d);
    sonKendiYazma.current = Date.now();
    tabloSiparisleriSenkron(AKTIF_SIRKET_ONEK, d).catch(e => console.error("Sipariş tablo (arka plan):", e.message));
  }, [guvenliKaydet]);


  // Sipariş durum geçmişini güncelle (opsiyonel manuel tarih)
  const sipDurumKaydet = useCallback((sipId, yeniDurum, manuelTarih, dokumBilgi) => {
    setSiparisler(prev => {
      const yeni = prev.map(sp => {
        if (sp.id !== sipId) return sp;
        const gecmis = sp.durumGecmisi || [];
        const sonGecmis = gecmis[gecmis.length - 1];
        if (sonGecmis && sonGecmis.durum === yeniDurum && !manuelTarih) return sp;
        const tarih = manuelTarih || Date.now();
        const yeniGecmis = [...gecmis, { durum: yeniDurum, tarih, manuel: !!manuelTarih }];

        // Döküme geçince → teslim tarihi otomatik: ertesi gün 14:00 (20 saat sonra)
        // Akşam 18:00 gönderim, ertesi 14:00 teslim = 20 saat
        if (yeniDurum === "dokum" && !manuelTarih) {
          const gonderimTarih = new Date(tarih);
          gonderimTarih.setHours(18, 0, 0, 0); // akşam 18:00
          const teslimTarih = new Date(gonderimTarih);
          teslimTarih.setDate(teslimTarih.getDate() + 1);
          teslimTarih.setHours(14, 0, 0, 0); // ertesi 14:00
          // Tezgah geçişini de otomatik ekle (tahmini teslim)
          return { ...sp, durumGecmisi: yeniGecmis, dokumTeslimTahmini: teslimTarih.getTime() };
        }

        // Taş dizime geçince → toplam taş adetine göre süre hesapla
        // 1 kişi günde 5000 taş, 8 saatlik iş günü
        if (yeniDurum === "tas_dus" && !manuelTarih) {
          const toplamTasAdet = (sp.kalemler||[]).reduce((acc, k) => {
            const taslar = k.taslar || [];
            if (taslar.length > 0) return acc + taslar.reduce((s, t) => s + (Number(t.adet)||1) * (k.adet||1), 0);
            if (k.tasAdet) return acc + (Number(k.tasAdet)||0) * (k.adet||1);
            return acc;
          }, 0);
          // 5000 taş/gün → 1 taş = 8*60*60*1000/5000 ms
          const tasDizimSuresiMs = toplamTasAdet > 0
            ? Math.ceil(toplamTasAdet / 5000) * 8 * 60 * 60 * 1000
            : 8 * 60 * 60 * 1000; // en az 1 iş günü
          return { ...sp, durumGecmisi: yeniGecmis, tasDizimSuresiMs, tasDizimTasAdet: toplamTasAdet };
        }

        return { ...sp, durumGecmisi: yeniGecmis };
      });
      versiyonDamgala("v7s", yeni);
      return yeni;
    });
    // Döküme geçince → otomatik dökümcü borç kaydı
    if (yeniDurum === "dokum") {
      setSiparisler(prevSip => {
        const sp = prevSip.find(s=>s.id===sipId) || {};
        const tahminiHas = (sp.kalemler||[]).reduce((acc,k)=>{
          const hc = hesapla(k, k.secilenAyar||k.refAyar, sp.altinKgUSD, sp.mc);
          const hurda=((sp.kalemHurda)||{})[k.id]||0, iade=((sp.kalemIade)||{})[k.id]||0, tamir=((sp.kalemTamir)||{})[k.id]||0;
          return acc + hc.mamulGram * Math.max(0,(k.adet||1)-hurda-iade-tamir);
        }, 0);
        const musteri = sp.musKod||sp.musteri||"?";
        setKasa(prev => {
          const yeniIslem = { id:Date.now()+"", tarih:manuelTarih||Date.now(), tip:"gonder", sipId, musteri, has:tahminiHas, aciklama:(dokumBilgi?.aciklama||""), gercekHas:null, teslimTarih:null };
          const yeniKasa = { ...prev, dokumcuIslemler:[...(prev.dokumcuIslemler||[]), yeniIslem] };
          versiyonDamgala("v7kasa", yeniKasa);
          return yeniKasa;
        });
        return prevSip;
      });
    }
    // Tezgaha geçince → döküm teslim alındı, ilgili gönderimi kapat
    if (yeniDurum === "tezgah") {
      setKasa(prev => {
        const gonderimler = (prev.dokumcuIslemler||[]).filter(x=>x.sipId===sipId&&x.tip==="gonder"&&!x.teslimTarih);
        if (!gonderimler.length) return prev;
        const yeniIslemler = (prev.dokumcuIslemler||[]).map(x =>
          (x.sipId===sipId&&x.tip==="gonder"&&!x.teslimTarih) ? { ...x, teslimTarih:Date.now() } : x
        );
        const yeniKasa = { ...prev, dokumcuIslemler:yeniIslemler };
        versiyonDamgala("v7kasa", yeniKasa);
        return yeniKasa;
      });
    }
  }, [versiyonDamgala]);
  const svMus = useCallback(async d => {
    setMusteriler(d);
    await versiyonDamgala("v7u", d);
    tabloMusterileriYaz(AKTIF_SIRKET_ONEK, d).catch(e => console.error("Müşteri tablo (arka plan):", e.message));
  }, [versiyonDamgala]);

  // ═══ OTOMATİK GÜNLÜK YEDEKLEME ═══
  // Yedek verisini topla (foto artık Storage'da olduğu için hafif)
  const yedekVerisiTopla = useCallback(async () => {
    const ks = await ld("v7kasa", null);
    let yaziRenkYedek = {}, temaYedek = "", mizanEsl = {};
    try { yaziRenkYedek = JSON.parse(localStorage.getItem("atolye_yazi_renk") || "{}"); } catch {}
    try { temaYedek = localStorage.getItem("atolye_tema") || ""; } catch {}
    try { mizanEsl = JSON.parse(localStorage.getItem("mizan_eslestirme") || "{}"); } catch {}
    return {
      kollar, modeller, siparisler, musteriler,
      ayarlar: { kategoriler: ayarKategoriler },
      kasa: ks || {}, mizanEslestirme: mizanEsl,
      yaziRenkleri: yaziRenkYedek, tema: temaYedek, v: Date.now(),
    };
  }, [kollar, modeller, siparisler, musteriler, ayarKategoriler]);

  // Açılışta günde 1 kez otomatik yedek (bugün alınmamışsa)
  const otoYedekYapildiRef = useRef(false);
  useEffect(() => {
    if (!loaded || otoYedekYapildiRef.current) return;
    if (modeller.length === 0) return; // boş veriyi yedekleme
    otoYedekYapildiRef.current = true; // bu oturumda bir kez
    (async () => {
      try {
        const varMi = await bugunYedekVarMi(AKTIF_SIRKET_ONEK);
        if (varMi) return; // bugün zaten alınmış
        const veri = await yedekVerisiTopla();
        const ok = await yedekKaydet(AKTIF_SIRKET_ONEK, veri, modeller.length, siparisler.length);
        if (ok) console.log("✓ Günlük otomatik yedek alındı");
      } catch (e) { console.error("Otomatik yedek hatası:", e.message); }
    })();
  }, [loaded, modeller.length]);

  useEffect(() => { if (loaded) sv("v7c", { a: altinKg, mc }); }, [altinKg, mc, loaded]);
  // Müşteri vitrin kodlarını Ayarlar açıldığında yükle
  useEffect(() => {
    if (sayfa === "ayarlar" && loaded) {
      ld("v7vitrin", []).then(v => setVitrinKodlar(v || []));
      yedekListesi(AKTIF_SIRKET_ONEK).then(setOtoYedekler);
      islemGecmisiGetir(AKTIF_SIRKET_ONEK, 50).then(setIslemGecmisi);
    }
  }, [sayfa, loaded]);

  const kodToKol = useCallback(kod => {
    if (!kod) return null;
    const p = kod.split("-")[0];
    return p ? kollar.find(k => k.on && k.on.toUpperCase() === p.toUpperCase()) || null : null;
  }, [kollar]);

  const rkf = () => { setFkAd(""); setFkAc(""); setFkOn(""); };
  const rmf = () => { setFAd(""); setFKod(""); setFGram(""); setFRefAyar("14K"); setFTasGram(""); setFTasBoy(""); setFTaslar([]); setFTasSekil("ROUND"); setFTasTur("N"); setFTasBoyut(""); setFTasAdet(""); setFTasOzelIsim(""); setFMadenC(""); setFIscilikDolar(""); setFIscilikBirim("dolar"); setFIscilikAyarlar({}); setFEkMaliyet(""); setFKategori("yuzuk"); setFSetKodu(""); setFAc(""); setFFoto(""); setFKolId(""); setFDurum("baslanmadi"); setFEtiketler([]); setFYeniEtiket(""); };

  const saveKol = () => {
    if (!fkAd.trim()) return;
    const obj = { ad: fkAd.trim(), ac: fkAc.trim(), on: fkOn.trim().toUpperCase() };
    if (editK) svK(kollar.map(k => k.id === editK.id ? { ...k, ...obj } : k));
    else svK([...kollar, { id: uid(), ...obj, t: Date.now() }]);
    setShowKM(false); rkf(); setEditK(null);
  };

  const delKol = id => {
    const koldakiModelSayi = modeller.filter(m => m.ki === id).length;
    if (koldakiModelSayi > 0) {
      if (!confirm("Bu koleksiyonda " + koldakiModelSayi + " model var.\n\nKoleksiyon silinince içindeki modeller de SİLİNECEK!\n\nDevam etmek istiyor musunuz?")) {
        setDelOnay(null);
        return;
      }
    }
    svK(kollar.filter(k => k.id !== id));
    // Koleksiyondaki modelleri de sil (hayalet model kalmasın)
    svM(modeller.filter(m => m.ki !== id));
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
    const obj = { ad: fAd.trim(), kod: fKod.trim().toUpperCase(), kategori: fKategori, gram: Number(fGram)||0, refAyar: fRefAyar, tasGram: hesaplananTasGram, taslar: fTaslar, tasBoy: fTasBoy.trim(), tasSekil: fTasSekil, tasTur: fTasTur, tasBoyut: fTasBoyut, tasAdet: Number(fTasAdet)||0, madenCarpan: Number(fMadenC)||0, iscilikDolar: Number(fIscilikDolar)||0, iscilikBirim: fIscilikBirim, iscilikAyarlar: fIscilikAyarlar, ekMaliyet: Number(fEkMaliyet)||0, ac: fAc.trim(), foto: fFoto, ki: fKolId, durum: fDurum, etiketler: fEtiketler };
    if (!obj.id) obj.olusturma = Date.now();
    // Aynı kodlu diğer modeller var mı kontrol et
    const FIYAT_ALANLARI = ["iscilikDolar","iscilikBirim","iscilikAyarlar","ekMaliyet","madenCarpan"];
    const syncObj = Object.fromEntries(Object.entries(obj).filter(([k]) => !FIYAT_ALANLARI.includes(k)));
    const ayniKodlular = modeller.filter(m => m.kod === obj.kod && (!editM || m.id !== editM.id));

    const kaydet = async (onayliSync) => {
      if (editM) {
        // Foto base64 ise Storage'a yükle, URL'e çevir
        let fotoURL = obj.foto;
        if (fotoURL && fotoURL.startsWith("data:")) {
          fotoURL = await fotoYukleStorage(fotoURL, editM.id, AKTIF_SIRKET_ONEK);
        }
        const objURLli = { ...obj, foto: fotoURL };
        const syncURLli = { ...syncObj, foto: fotoURL };
        const yeniListe = modeller.map(m => {
          if (m.id === editM.id) return { ...m, ...objURLli };
          if (onayliSync && m.kod === obj.kod) return { ...m, ...syncURLli };
          return m;
        });
        svM(yeniListe);
        islemKaydet(AKTIF_SIRKET_ONEK, "düzenle", "model", (obj.kod || "") + " · " + (obj.ad || ""));
      } else {
        const yeniId = uid();
        // Foto base64 ise Storage'a yükle
        let fotoURL = obj.foto;
        if (fotoURL && fotoURL.startsWith("data:")) {
          fotoURL = await fotoYukleStorage(fotoURL, yeniId, AKTIF_SIRKET_ONEK);
        }
        const yeniModel = { id: yeniId, ...obj, foto: fotoURL, t: Date.now() };
        if (onayliSync && ayniKodlular.length > 0) {
          svM([...modeller.map(m => m.kod === obj.kod ? { ...m, ...syncObj, foto: fotoURL } : m), yeniModel]);
        } else {
          svM([...modeller, yeniModel]);
        }
        islemKaydet(AKTIF_SIRKET_ONEK, "ekle", "model", (obj.kod || "") + " · " + (obj.ad || ""));
      }
      setShowMM(false); rmf(); setEditM(null);
    };

    if (ayniKodlular.length > 0) {
      const kolAdlari = ayniKodlular.map(m => {
        const kol = kollar.find(k => k.id === m.ki);
        return (kol?.ad || "?") + " - " + (m.ad || m.kod);
      }).join(", ");
      const onay = window.confirm(obj.kod + " kodu " + ayniKodlular.length + " farkli koleksiyonda daha var: " + kolAdlari + "\n\nFiyat haric tum bilgiler guncellenecek. Onayliyor musunuz?");
      kaydet(onay);
    } else {
      kaydet(false);
    }
  };

  const delMod = id => {
    const m = modeller.find(x => x.id === id);
    svM(modeller.filter(m => m.id !== id));
    setDelOnay(null);
    if (m) islemKaydet(AKTIF_SIRKET_ONEK, "sil", "model", (m.kod || "") + " · " + (m.ad || ""));
  };
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
    if (sip) islemKaydet(AKTIF_SIRKET_ONEK, "sil", "sipariş", (sip.musteri || "") + " · " + new Date(sip.tarih).toLocaleDateString("tr-TR"));
  };

  const openEK = k => { setFkAd(k.ad); setFkAc(k.ac||""); setFkOn(k.on||""); setEditK(k); setShowKM(true); };
  const openEM = m => {
    setFAd(m.ad); setFKod(m.kod||""); setFGram(String(m.gram||"")); setFRefAyar(m.refAyar||"14K");
    setFTasGram(String(m.tasGram||"")); setFTasBoy(m.tasBoy||""); setFTaslar(m.taslar||[]); setFTasSekil(m.tasSekil||"ROUND"); setFTasTur(m.tasTur||"N"); setFTasBoyut(m.tasBoyut||""); setFTasAdet(String(m.tasAdet||"")); setFMadenC(String(m.madenCarpan||""));
    setFIscilikDolar(String(m.iscilikDolar||"")); setFIscilikBirim(m.iscilikBirim||"dolar"); setFIscilikAyarlar(m.iscilikAyarlar||{}); setFEkMaliyet(String(m.ekMaliyet||""));
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
    if (sirala==="yeni_eskiye") r=[...r].sort((a,b)=>(b.t||0)-(a.t||0));
    else if (sirala==="eski_yeniye") r=[...r].sort((a,b)=>(a.t||0)-(b.t||0));
    else if (sirala==="kar_desc" && altinKgUSD>0) r=[...r].sort((a,b)=>{ const ha=hesapla(a,a.refAyar,altinKgUSD,madenCarpan),hb=hesapla(b,b.refAyar,altinKgUSD,madenCarpan); return hb.karHas-ha.karHas; });
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
      // Fiyat override — konfFiyatlar > müşteri hafızası > model varsayılanı
      const musHafiza = konfMus ? (kasa.musteriModelFiyat||{})[konfMus]?.[m.kod] : null;
      const fiyatOvr = konfFiyatlar[m.id];
      const aktifIscilik = fiyatOvr?.iscilikDolar ?? musHafiza?.iscilikDolar ?? m.iscilikDolar;
      const aktifBirim   = fiyatOvr?.iscilikBirim ?? musHafiza?.iscilikBirim ?? m.iscilikBirim ?? "dolar";
      const temel = { ...m, secilenAyar: konfAyar, renk: konfRenkler[m.id]||"Sari", sipNot: konfNot[m.id]||"", iscilikDolar: aktifIscilik, iscilikBirim: aktifBirim };
      
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
  }, [konfList, konfAyar, konfRenkler, konfAdet, konfNot, konfBoylar, konfGenelBoy, konfFiyatlar, konfMus, kasa]);

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
    const yeni = { id: uid(), musteri: musAd, musKod, tarih: Date.now(), teslimTarihi: konfTeslim||"", aciklama: konfSipAciklama.trim(), altinKgUSD, mc: madenCarpan, kalemler: konfKalemler, gelir: kTop.gelir, maliyet: kTop.maliyet, kar: kTop.kar };
    svS([...siparisler, yeni]);
    islemKaydet(AKTIF_SIRKET_ONEK, "ekle", "sipariş", (musAd || "") + " · " + (konfKalemler?.length || 0) + " kalem");
    svM(modeller.map(m => { const k = konfKalemler.find(x => x.id === m.id); return k ? { ...m, satisSayisi: (m.satisSayisi||0)+1 } : m; }));
    // Müşteri-model fiyat hafızasını güncelle
    if (musAd && Object.keys(konfFiyatlar).length > 0) {
      const yeniFiyatHafiza = { ...(kasa.musteriModelFiyat||{}), [musAd]: { ...((kasa.musteriModelFiyat||{})[musAd]||{}) } };
      konfList.forEach(m => {
        if (konfFiyatlar[m.id]) {
          yeniFiyatHafiza[musAd][m.kod] = { iscilikDolar: konfFiyatlar[m.id].iscilikDolar, iscilikBirim: konfFiyatlar[m.id].iscilikBirim };
        }
      });
      svKasa({ ...kasa, musteriModelFiyat: yeniFiyatHafiza });
    }
    setKonfList([]); setKonfAyarlar({}); setKonfRenkler({}); setKonfAdet({}); setKonfNot({}); setKonfFiyatlar({}); setKonfMus(""); setKonfTeslim(""); setKonfAyar("14K"); setKonfSipAciklama("");
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
        const hurdaAdet = ((s.kalemHurda) ||{})[k.id] || 0;
        const iadeAdet  = ((s.kalemIade)  ||{})[k.id] || 0;
        const tamirAdet = ((s.kalemTamir) ||{})[k.id] || 0;
        const tamamAdet = Math.max(0, (k.adet||1) - hurdaAdet - iadeAdet - tamirAdet);
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

    // Model bazlı iade & tamir
    const iadeSatis = {}, tamirSatis = {};
    filtreli.forEach(s => {
      (s.kalemler||[]).forEach(k => {
        const ia = ((s.kalemIade)||{})[k.id]||0;
        const ta = ((s.kalemTamir)||{})[k.id]||0;
        if (ia>0) { if (!iadeSatis[k.id]) iadeSatis[k.id]={ad:k.ad,kod:k.kod||"",sayi:0}; iadeSatis[k.id].sayi+=ia; }
        if (ta>0) { if (!tamirSatis[k.id]) tamirSatis[k.id]={ad:k.ad,kod:k.kod||"",sayi:0}; tamirSatis[k.id].sayi+=ta; }
      });
    });
    const topIade  = Object.entries(iadeSatis).sort((a,b)=>b[1].sayi-a[1].sayi);
    const topTamir = Object.entries(tamirSatis).sort((a,b)=>b[1].sayi-a[1].sayi);

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
        const hurdaAdet = ((s.kalemHurda) ||{})[k.id] || 0;
        const iadeAdet  = ((s.kalemIade)  ||{})[k.id] || 0;
        const tamirAdet = ((s.kalemTamir) ||{})[k.id] || 0;
        const netAdet = Math.max(0, (k.adet||1) - hurdaAdet - iadeAdet - tamirAdet);
        aylikKar[ay].kar += hc.karHas * netAdet;
        aylikKar[ay].gram += hc.mamulGram * netAdet;
      });
    });

    // Üretim süresi — tüm siparişlerden (filtreden bağımsız)
    const tamamlananSiparisler = [];
    let dokumTopSure = 0, dokumSayi = 0;
    siparisler.forEach(s => {
      const gecmis = s.durumGecmisi;
      if (!gecmis?.length) return;
      const sonDurum = gecmis[gecmis.length-1].durum;
      if (!["tamam","teslim"].includes(sonDurum)) return;
      const topSure = gecmis[gecmis.length-1].tarih - gecmis[0].tarih;
      tamamlananSiparisler.push({ id:s.id, musteri:s.musKod||s.musteri||"?", sure:topSure, tarih:s.tarih });
      gecmis.forEach((g, gi) => {
        if (g.durum === "dokum" && gecmis[gi+1]) {
          const bekleme = isGunuSure(g.tarih, gecmis[gi+1].tarih);
          if (bekleme > 0) { dokumTopSure += bekleme; dokumSayi++; }
        }
      });
    });
    const ortTamamlanma = tamamlananSiparisler.length > 0
      ? tamamlananSiparisler.reduce((s,x)=>s+x.sure,0) / tamamlananSiparisler.length : 0;
    const ortDokum = dokumSayi > 0 ? dokumTopSure / dokumSayi : 0;

    // Takılı aktif siparişler — en uzun aynı durumda bekleyenler
    const takildi = siparisler
      .filter(s => { const son=(s.durumGecmisi||[]).slice(-1)[0]; return son && !["tamam","teslim","hurda"].includes(son.durum); })
      .map(s => {
        const son = s.durumGecmisi[s.durumGecmisi.length-1];
        return { id:s.id, musteri:s.musKod||s.musteri||"?", durum:son.durum,
          bekleme:isGunuSure(son.tarih, Date.now()), topSure:isGunuSure(s.durumGecmisi[0].tarih, Date.now()) };
      })
      .sort((a,b)=>b.bekleme-a.bekleme).slice(0,5);

    return { tGelir, tKar, siparisSayisi: filtreli.length,
      topModeller: Object.entries(mSatis).sort((a,b)=>b[1].adet-a[1].adet).slice(0,8),
      topKollar: Object.entries(kSatis).sort((a,b)=>b[1].kar-a[1].kar).slice(0,5),
      topAyarlar: Object.entries(aSatis).sort((a,b)=>b[1].sayi-a[1].sayi),
      topMusteriler, topHurda, topIade, topTamir, aylikKar,
      tamamlananSiparisler, ortTamamlanma, ortDokum, dokumSayi, takildi };
  }, [siparisler, kollar, analizMusF, analizTarih1, analizTarih2, analizDonem]);

  if (!loaded) return <div style={{ minHeight:"100vh", background:DARK, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ color:GOLD, fontSize:16 }}>Yukleniyor...</div></div>;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"sans-serif" }}>
      <style>{`*{box-sizing:border-box}html,body,#root{background:${T.bg};margin:0;padding:0;min-height:100vh;width:100%}body{overflow-x:hidden;overflow-y:auto}:root{--gold:${T.gold};--goldtext:${T.text};--bg2:${T.bg2}}`}</style>
      <style>{"@keyframes fadein{from{opacity:0}to{opacity:1}}@keyframes cardin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes toastin{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:2px}::-webkit-scrollbar-track{background:transparent}select option{background:#1c1a15;color:#e8dcc8}"}</style>

      {/* TOAST BİLDİRİMİ */}
      {toast && (
        <div style={{
          position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:99999,
          background: toast.tip==="ok" ? "rgba(106,191,105,0.95)" : "rgba(232,90,79,0.95)",
          color:"#fff", padding:"10px 20px", borderRadius:10, fontSize:12, fontWeight:700,
          boxShadow:"0 4px 20px rgba(0,0,0,0.3)", animation:"toastin .25s ease",
          display:"flex", alignItems:"center", gap:8, maxWidth:"90vw"
        }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ padding:"14px 14px 10px", background:T.header, borderBottom:"1px solid "+T.headerBorder }}>
        <div style={{ width:"100%" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:10 }}>
            <h1 style={{ margin:0, fontSize:"clamp(13px,2vw,18px)", fontWeight:700, color:GOLD, display:"flex", alignItems:"center", gap:8 }}>
              Atolye Koleksiyon Sistemi
              <button onClick={()=>{ if (onSirketDegis) onSirketDegis(); }} title="Şirket değiştir" style={{ fontSize:9, fontWeight:800, padding:"3px 10px", borderRadius:20, background: AKTIF_SIRKET_ONEK==="bsp_" ? "rgba(167,139,250,0.15)" : "rgba(201,168,76,0.15)", border:"1px solid "+(AKTIF_SIRKET_ONEK==="bsp_" ? "rgba(167,139,250,0.4)" : "rgba(201,168,76,0.4)"), color: AKTIF_SIRKET_ONEK==="bsp_" ? "#a78bfa" : GOLD, whiteSpace:"nowrap", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }}>{AKTIF_SIRKET_ONEK==="bsp_" ? "✨ BSP" : "💎 MSK"} <span style={{ fontSize:8, opacity:0.7 }}>⇄</span></button>
            </h1>
            <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
              {["koleksiyonlar","modeller","konfirmasyon","siparisler","iadeler","musteriler","kasa","analiz","asistan","ayarlar"].map(n => {
                let badgeSayi = 0;
                if (n === "iadeler") {
                  siparisler.forEach(s => {
                    Object.values(s.kalemIade||{}).forEach(v => badgeSayi += (v||0)>0?1:0);
                    Object.values(s.kalemTamir||{}).forEach(v => badgeSayi += (v||0)>0?1:0);
                  });
                }
                return (
                <button key={n} onClick={() => { setSayfa(n); if (n==="koleksiyonlar") setAktifKol(null); if (n!=="kasa") setKasaKilitli(true); if (n!=="asistan") setAjanSoru(""); }}
                  style={{ ...GH, color:sayfa===n?T.gold:T.sub, background:sayfa===n?T.btnBg:"transparent", borderColor:sayfa===n?T.btnBorder:T.border, fontSize:9, padding:"5px 9px", position:"relative" }}>
                  {{"koleksiyonlar":"Koleksiyonlar","modeller":"Modeller","konfirmasyon":"Konfirmasyon","siparisler":"Siparişler","iadeler":"İadeler","musteriler":"Müşteriler","kasa":"Kasa","analiz":"Keşfet","asistan":"🤖 Asistan","ayarlar":"Ayarlar"}[n]||n.charAt(0).toUpperCase()+n.slice(1)}
                  {n==="konfirmasyon" && konfList.length>0 && <span style={{ position:"absolute", top:-4, right:-4, background:GOLD, color:DARK, width:13, height:13, borderRadius:7, fontSize:7, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{konfList.length}</span>}
                  {n==="iadeler" && badgeSayi>0 && <span style={{ position:"absolute", top:-4, right:-4, background:"#a78bfa", color:"#fff", width:13, height:13, borderRadius:7, fontSize:7, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{badgeSayi}</span>}
                </button>
                );
              })}
            </div>
          </div>
          {/* KUR */}
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", background:T.card, border:"1px solid "+T.border, borderRadius:10, padding:"7px 12px" }}>
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
                    varsAltinKg: ayarVarsAltinKg,
                    varsMc: ayarVarsMc,
                    varsIscilik: ayarVarsIscilik,
                    varsIscilikBirim: ayarVarsIscilikBirim,
                  };
                  const ks = await ld("v7kasa", null);
                  let mizanEslYedek = {};
                  try { mizanEslYedek = JSON.parse(localStorage.getItem("mizan_eslestirme") || "{}"); } catch {}
                  let yaziRenkYedek = {};
                  try { yaziRenkYedek = JSON.parse(localStorage.getItem("atolye_yazi_renk") || "{}"); } catch {}
                  let temaYedek = "";
                  try { temaYedek = localStorage.getItem("atolye_tema") || ""; } catch {}
                  const data = { kollar:k, modeller:m, siparisler:s, musteriler:u, ayarlar:ay,
                    kasa: ks || {}, mizanEslestirme: mizanEslYedek,
                    yaziRenkleri: yaziRenkYedek, tema: temaYedek,
                    v: Date.now() };
                  const json = JSON.stringify(data, null, 2);
                  // Boş sipariş/model uyarısı — yanlışlıkla boş yedek almayı önle
                  if (s.length === 0 || m.length === 0) {
                    const devam = window.confirm(
                      "⚠ DİKKAT — Yedek eksik olabilir!\n\n" +
                      "Model: " + m.length + "\nSipariş: " + s.length + "\nKoleksiyon: " + k.length + "\n\n" +
                      (s.length===0 ? "Sipariş listesi BOŞ! " : "") + (m.length===0 ? "Model listesi BOŞ! " : "") +
                      "\nEğer veriler normalde doluysa, önce sayfayı yenileyip verilerin geldiğinden emin olun. " +
                      "Boş yedek almak istediğinizden emin misiniz?"
                    );
                    if (!devam) { setDriveYukleniyor(null); return; }
                  }
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

      <div style={{ width:"100%", padding:"12px 12px 60px" }}>

        {/* KOLEKSİYONLAR */}
        {sayfa==="koleksiyonlar" && (
          <div style={{ animation:"fadein .3s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
              <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:"var(--goldtext)" }}>Koleksiyonlar</h2>
              <div style={{ display:"flex", gap:6 }}>
                {kollar.length > 1 && (
                  <button onClick={() => setHizalaModal(true)} style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.25)", borderRadius:9, padding:"6px 12px", color:"#a78bfa", fontSize:11, fontWeight:700, cursor:"pointer" }}>↕ Hizala</button>
                )}
                <button onClick={() => { rkf(); setEditK(null); setShowKM(true); }} style={BG}>+ Koleksiyon</button>
              </div>
            </div>
            {kollar.length===0 && <p style={{ color:"#665d4a", textAlign:"center", padding:"40px" }}>Henuz koleksiyon yok</p>}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
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
                          {ft[x] ? <div className="model-foto-wrap" style={{ width:"100%", height:"100%", overflow:"hidden" }}><img src={ft[x].foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }}/></div> : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.06)", fontSize:18 }}>◇</div>}
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
                <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--goldtext)" }}>{aktifKol ? aktifKol.ad : "Tum Modeller"} <span style={{ fontSize:10, color:"#7a6f5a" }}>({gorunen.length})</span></h2>
              </div>
              <div style={{ display:"flex", gap:4 }}>
                {aktifKol && <button onClick={() => { setKatalogKol(aktifKol); setKatalogSiraliModeller(seciliModeller.size>0 ? modeller.filter(m=>seciliModeller.has(m.id)) : []); setKatalogSutun(3); setKatalogAyar("14K"); setKatalogSiralaModal(true); }} style={{ ...GH, fontSize:9, padding:"5px 9px" }}>PDF 3'lü{seciliModeller.size>0?" ("+seciliModeller.size+")":""}</button>}
                {aktifKol && <button onClick={() => { setKatalogKol(aktifKol); setKatalogSiraliModeller(seciliModeller.size>0 ? modeller.filter(m=>seciliModeller.has(m.id)) : []); setKatalogSutun(4); setKatalogAyar("14K"); setKatalogSiralaModal(true); }} style={{ background:"rgba(167,139,250,0.06)", border:"1px solid rgba(167,139,250,0.15)", borderRadius:9, padding:"5px 9px", color:"#a78bfa", fontSize:9, fontWeight:700, cursor:"pointer" }}>PDF 4'lü{seciliModeller.size>0?" ("+seciliModeller.size+")":""}</button>}
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
              <span style={{ fontSize:7, color:T.dim, fontWeight:700, whiteSpace:"nowrap", marginRight:2 }}>KATEGORI:</span>
              <button onClick={()=>setKategoriF("")} style={{ background:!kategoriF?T.btnBg:T.card, border:"1px solid", borderColor:!kategoriF?T.btnBorder:T.border, borderRadius:5, padding:"3px 7px", color:!kategoriF?T.gold:T.dim, fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Tumu</button>
              {KATEGORILER.map(k => { const cnt = aktMod.filter(m => (m.kategori||"") === k.id).length; if (!cnt) return null; return (
                <button key={k.id} onClick={()=>setKategoriF(kategoriF===k.id?"":k.id)} style={{ background:kategoriF===k.id?T.btnBg:T.card, border:"1px solid", borderColor:kategoriF===k.id?T.btnBorder:T.border, borderRadius:5, padding:"3px 7px", color:kategoriF===k.id?T.gold:T.dim, fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{k.l} ({cnt})</button>
              ); })}
            </div>

            {/* Sıralama */}
            <span style={{ fontSize:7, color:T.dim, fontWeight:700, whiteSpace:"nowrap", marginRight:2 }}>SIRALA:</span>
              {[
                { id:"varsayilan",    l:"Varsayılan" },
                { id:"yeni_eskiye",   l:"Yeni → Eski" },
                { id:"eski_yeniye",   l:"Eski → Yeni" },
                { id:"kar_desc",      l:"Karlı önce" },
                { id:"kar_asc",       l:"Az karlı önce" },
                { id:"gram_asc",      l:"Az gram önce" },
                { id:"gram_desc",     l:"Çok gram önce" },
                { id:"kod",           l:"Koda göre" },
                { id:"cok_satilan",   l:"Çok satılan" },
              ].map(s => (
                <button key={s.id} onClick={()=>setSirala(s.id)} style={{ background:sirala===s.id?T.btnBg:T.card, border:"1px solid", borderColor:sirala===s.id?T.btnBorder:T.border, borderRadius:5, padding:"3px 7px", color:sirala===s.id?T.gold:T.dim, fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{s.l}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:3, marginBottom:6, overflowX:"auto", paddingBottom:2 }}>
              <button onClick={()=>setFiltre("all")} style={{ background:filtre==="all"?T.btnBg:T.card, border:"1px solid", borderColor:filtre==="all"?T.btnBorder:T.border, borderRadius:5, padding:"3px 7px", color:filtre==="all"?T.gold:T.dim, fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Tumu</button>
              {DURUMLAR.map(d => { const cnt=aktMod.filter(m=>(m.durum||"baslanmadi")===d.id).length; if(!cnt)return null; return <button key={d.id} onClick={()=>setFiltre(d.id)} style={{ background:filtre===d.id?"rgba(0,0,0,0.3)":T.card, border:"1px solid", borderColor:filtre===d.id?d.c:T.border, borderRadius:5, padding:"3px 7px", color:filtre===d.id?d.c:T.dim, fontSize:8, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{d.l} ({cnt})</button>; })}
            </div>
            {tumEtiketler.length>0 && (
              <div style={{ display:"flex", gap:3, marginBottom:10, overflowX:"auto", paddingBottom:2 }}>
                <span style={{ fontSize:7, color:T.dim, fontWeight:700, whiteSpace:"nowrap", alignSelf:"center" }}>ETIKET:</span>
                {etiketF && <button onClick={()=>setEtiketF("")} style={{ ...RD, padding:"2px 6px", fontSize:7 }}>Temizle</button>}
                {tumEtiketler.map(e => <button key={e} onClick={()=>setEtiketF(e===etiketF?"":e)} style={{ background:etiketF===e?"rgba(167,139,250,0.15)":T.card, border:"1px solid", borderColor:etiketF===e?"#a78bfa":T.border, borderRadius:4, padding:"2px 6px", color:etiketF===e?"#a78bfa":"#998a6e", fontSize:7, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>#{e}</button>)}
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
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:9 }}>
              {gorunen.map((m,i) => {
                const ik  = konfList.find(x=>x.id===m.id);
                const dur = DURUMLAR.find(d=>d.id===m.durum)||DURUMLAR[0];
                const h   = altinKgUSD>0 ? hesapla(m, m.refAyar, altinKgUSD, madenCarpan) : null;
                return (
                  <div key={m.id} style={{ background:ik?"rgba(201,168,76,0.07)":"rgba(201,168,76,0.02)", border:"1px solid", borderColor:ik?"rgba(201,168,76,0.28)":"rgba(201,168,76,0.07)", borderRadius:11, overflow:"hidden", animation:"cardin .3s ease "+(i*.03)+"s both" }}>
                    <div className="model-foto-wrap" style={{ position:"relative", height:180, background:"rgba(0,0,0,0.25)", overflow:"hidden" }}>
                      {m.foto ? <img src={m.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }}/> : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(201,168,76,0.1)", fontSize:24 }}>-</div>}
                      <button onClick={()=>togKonf(m)} style={{ position:"absolute", top:4, right:4, width:20, height:20, borderRadius:5, background:ik?"rgba(201,168,76,0.9)":"rgba(0,0,0,0.55)", border:"2px solid rgba(201,168,76,0.45)", color:ik?DARK:"transparent", fontSize:9, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>V</button>
                      {seciliModeller.has(m.id) && <div style={{ position:"absolute", inset:0, background:"rgba(91,155,213,0.15)", border:"2px solid rgba(91,155,213,0.5)", pointerEvents:"none" }}/>}
                      {h&&h.karUyari&&!h.gumusMu && <div style={{ position:"absolute", bottom:3, left:3, background:"rgba(232,90,79,0.88)", color:"#fff", padding:"1px 5px", borderRadius:3, fontSize:6, fontWeight:800 }}>⚠ {fN(h.karMly,3)} mly/gr</div>}
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
                      <div style={{ fontSize:10, fontWeight:700, color:"var(--goldtext)", marginBottom:2 }}>{m.ad}</div>
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
                            <span style={{ fontSize:7, color:"#998a6e" }}>{h.gumusMu ? "925 Gümüş" : "Mal: "+fN(h.topMaliyetHas,4)+" has"}</span>
                            <span style={{ fontSize:10, fontWeight:800, color:h.gumusMu?"#c0c0c0":(h.karUyari?"#e85a4f":"#6abf69") }}>{h.gumusMu ? "$"+fN(h.gumusIscilikGr,2)+"/gr" : (h.mamulGram>0 ? fN(h.karMly||h.karHas/h.mamulGram,3)+" mly/gr" : fN(h.karHas,4)+" has")}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:1 }}>
                            <span style={{ fontSize:7, color:h.gumusMu?"#c0c0c0":(h.karUyari?"#e85a4f":"#6abf69"), opacity:0.8 }}>
                              {h.gumusMu ? "toplam $"+fN(h.gumusIscilikTop,1) : (h.mamulGram>0 ? "("+fN(h.karHas,4)+" has)" : "")}
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
              <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--goldtext)" }}>Konfirmasyon</h2>
              <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                <div style={{ position:"relative" }}>
                  <div style={{ position:"relative" }}>
                  <input
                    value={konfMus}
                    onChange={e=>setKonfMus(e.target.value)}
                    placeholder="Musteri..."
                    style={{ ...IS, width:130, padding:"5px 8px", fontSize:11 }}
                    list="konfmus-list"
                  />
                  {konfMus && (kasa.musteriModelFiyat||{})[konfMus] && (
                    <div style={{ position:"absolute", top:"100%", left:0, zIndex:10, background:"rgba(106,191,105,0.1)", border:"1px solid rgba(106,191,105,0.25)", borderRadius:6, padding:"4px 8px", fontSize:8, color:"#6abf69", whiteSpace:"nowrap", marginTop:2 }}>
                      📌 {Object.keys((kasa.musteriModelFiyat||{})[konfMus]||{}).length} model için fiyat hafızası var
                    </div>
                  )}
                </div>
                  <datalist id="konfmus-list">
                    {Object.entries(musteriler).sort((a,b)=>a[1].localeCompare(b[1],"tr")).map(([ad, kod]) => (
                      <option key={ad} value={ad}>{kod} — {ad}</option>
                    ))}
                  </datalist>
                </div>
                <input type="date" value={konfTeslim} onChange={e=>setKonfTeslim(e.target.value)} style={{ ...IS, width:130, padding:"5px 8px", fontSize:11 }} />
                <input value={konfSipAciklama} onChange={e=>setKonfSipAciklama(e.target.value)} placeholder="Sipariş açıklaması..." style={{ ...IS, width:180, padding:"5px 8px", fontSize:11 }} />
                {konfList.length>0 && <>
                  <button onClick={()=>downloadPDF(buildKonfHTML({musteri:konfMus,musKod:(musteriler[konfMus]||""),tarih:Date.now(),kalemler:konfKalemler},altinKgUSD,madenCarpan,true),(konfMus||"siparis")+"-musteri")} style={{ ...GH, fontSize:9, padding:"5px 9px" }}>PDF Fiyatli</button>
                  <button onClick={()=>downloadPDF(buildKonfHTML({musteri:konfMus,musKod:(musteriler[konfMus]||""),tarih:Date.now(),kalemler:konfKalemler},altinKgUSD,madenCarpan,false),(konfMus||"siparis")+"-ic")} style={{ background:"rgba(232,90,79,0.08)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:9, padding:"5px 9px", color:"#e85a4f", fontSize:9, fontWeight:700, cursor:"pointer" }}>PDF Fiyatsiz</button>
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
                        <button onClick={()=>{ const yeni=kayitliNotlar.filter((_,i)=>i!==ni); setKayitliNotlar(yeni); sv("v7ay",{kategoriler:ayarKategoriler,etiketler:ayarEtiketler,varsAltinKg:ayarVarsAltinKg,varsMc:ayarVarsMc,varsIscilik:ayarVarsIscilik,varsIscilikBirim:ayarVarsIscilikBirim,kayitliNotlar:yeni,ozelTaslar}); }} style={{ background:"none", border:"none", color:"#554d3a", fontSize:9, cursor:"pointer", padding:"0 2px" }}>×</button>
                      </div>
                    ))}
                    <input value={yeniNotSablon} onChange={e=>setYeniNotSablon(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&yeniNotSablon.trim()){ const yeni=[...kayitliNotlar,yeniNotSablon.trim()]; setKayitliNotlar(yeni); setYeniNotSablon(""); sv("v7ay",{kategoriler:ayarKategoriler,etiketler:ayarEtiketler,varsAltinKg:ayarVarsAltinKg,varsMc:ayarVarsMc,varsIscilik:ayarVarsIscilik,varsIscilikBirim:ayarVarsIscilikBirim,kayitliNotlar:yeni,ozelTaslar}); }}} placeholder="+ Yeni not, Enter ile kaydet" style={{ ...IS, width:150, padding:"2px 6px", fontSize:9 }}/>
                  </div>
                </div>
                {/* Ana tablo */}
                <div style={{ background:"rgba(201,168,76,0.02)", border:"1px solid rgba(201,168,76,0.1)", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
                  {/* Başlık satırı */}
                  <div style={{ display:"grid", gridTemplateColumns:"120px 100px 1fr 160px 100px 60px 70px 50px", gap:0, background:"rgba(201,168,76,0.08)", padding:"6px 10px", borderBottom:"1px solid rgba(201,168,76,0.12)" }}>
                    {["","Kod","Ürün / Not","İşçilik","Renk","Adet","Top.Gr",""].map((t,i) => (
                      <div key={i} style={{ fontSize:8, fontWeight:700, color:"#8a7d64", textTransform:"uppercase", textAlign:i>2?"center":"left" }}>{t}</div>
                    ))}
                  </div>

                  {/* Ürün satırları */}
                  {konfList.map((m, idx) => {
                    const adet    = konfAdet[m.id]||1;
                    const not     = konfNot[m.id]||"";
                    const renk    = konfRenkler[m.id]||"Sari";
                    // Fiyat override — konfFiyatlar > müşteri hafızası > model varsayılanı
                    const musHafiza = konfMus ? (kasa.musteriModelFiyat||{})[konfMus]?.[m.kod] : null;
                    const fiyatOverride = konfFiyatlar[m.id];
                    const aktifIscilik = fiyatOverride?.iscilikDolar ?? musHafiza?.iscilikDolar ?? m.iscilikDolar;
                    const aktifBirim   = fiyatOverride?.iscilikBirim ?? musHafiza?.iscilikBirim ?? m.iscilikBirim ?? "dolar";
                    const mOverride = { ...m, iscilikDolar: aktifIscilik, iscilikBirim: aktifBirim };
                    const hc      = hesapla(mOverride, konfAyar, altinKgUSD, madenCarpan);
                    const topGram = hc.mamulGram * adet;
                    const renkRenk = renk==="Rose"?"#e8833a":renk==="Beyaz"?"#aaa":"#c9a84c";
                    const fiyatDegisti = fiyatOverride !== undefined;
                    const hafizaVarMi = musHafiza && !fiyatOverride;
                    return (
                      <div key={m.id} style={{ display:"grid", gridTemplateColumns:"120px 100px 1fr 160px 100px 60px 70px 50px", gap:0, padding:"8px 10px", borderBottom: idx < konfList.length-1 ? "1px solid rgba(201,168,76,0.06)" : "none", alignItems:"start" }}>
                        {/* Foto */}
                        <div className="model-foto-wrap" style={{ width:116, height:116, borderRadius:8, overflow:"hidden", flexShrink:0, background:"rgba(0,0,0,0.2)" }}>{m.foto ? <img src={m.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }}/> : <div style={{ width:"100%", height:"100%", background:"rgba(201,168,76,0.08)", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(201,168,76,0.3)", fontSize:20 }}>-</div>}</div>
                        {/* Kod + fiyat hafızası */}
                        <div style={{ paddingTop:4 }}>
                          <div style={{ fontSize:11, fontWeight:800, color:GOLD }}>{m.kod||"—"}</div>
                          {hafizaVarMi && <div style={{ fontSize:7, color:"#6abf69", marginTop:2, background:"rgba(106,191,105,0.1)", padding:"1px 5px", borderRadius:3 }}>📌 {musHafiza.iscilikDolar} {musHafiza.iscilikBirim==="milyem"?"mly":"$/gr"}</div>}
                        </div>
                        {/* Ürün + not */}
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, color:"var(--goldtext)" }}>{m.ad}</div>
                          {m.kategori && <span style={{ fontSize:7, color:"#a78bfa", background:"rgba(167,139,250,0.1)", padding:"1px 5px", borderRadius:3, fontWeight:600 }}>{m.kategori.charAt(0).toUpperCase()+m.kategori.slice(1)}</span>}
                          {/* Manuel not */}
                          <input value={not} onChange={e=>konfNotSec(m.id,e.target.value)} placeholder="Not ekle..." style={{ marginTop:4, width:"100%", background:"transparent", border:"none", borderBottom:"1px dashed rgba(201,168,76,0.2)", color:"var(--gold)", fontSize:9, outline:"none", padding:"1px 0" }}/>
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
                        {/* Fiyat override */}
                        <div style={{ paddingTop:2 }}>
                          <div style={{ fontSize:7, color:"#665d4a", fontWeight:700, marginBottom:3 }}>İŞÇİLİK</div>
                          <div style={{ display:"flex", gap:3, marginBottom:3 }}>
                            <select value={aktifBirim} onChange={e=>setKonfFiyatlar(p=>({...p,[m.id]:{iscilikDolar:aktifIscilik,iscilikBirim:e.target.value}}))}
                              style={{ ...IS, width:58, padding:"2px 3px", fontSize:8 }}>
                              <option value="dolar">$/gr</option>
                              <option value="milyem">mly</option>
                            </select>
                            <input type="number" step="0.001" value={aktifIscilik===0?0:(aktifIscilik??"")} placeholder={String(m.iscilikDolar||"")}
                              onChange={e=>{
                                const v = e.target.value;
                                setKonfFiyatlar(p=>({...p,[m.id]:{iscilikDolar: v===""?0:Number(v), iscilikBirim:aktifBirim}}));
                              }}
                              style={{ ...IS, width:72, padding:"2px 4px", fontSize:9, fontWeight:700,
                                borderColor: fiyatDegisti?"rgba(201,168,76,0.5)":"rgba(201,168,76,0.12)",
                                background: fiyatDegisti?"rgba(201,168,76,0.08)":"rgba(201,168,76,0.05)" }}/>
                          </div>
                          {/* Kaydet hafızaya / sıfırla */}
                          <div style={{ display:"flex", gap:3 }}>
                            {konfMus && (fiyatDegisti || hafizaVarMi) && (
                              <button onClick={()=>{
                                const yeniKasa = { ...kasa, musteriModelFiyat: { ...(kasa.musteriModelFiyat||{}), [konfMus]: { ...((kasa.musteriModelFiyat||{})[konfMus]||{}), [m.kod]: { iscilikDolar:aktifIscilik, iscilikBirim:aktifBirim } } } };
                                svKasa(yeniKasa);
                              }} style={{ fontSize:7, background:"rgba(106,191,105,0.1)", border:"1px solid rgba(106,191,105,0.2)", borderRadius:4, padding:"2px 5px", color:"#6abf69", cursor:"pointer", whiteSpace:"nowrap" }}>💾 Kaydet</button>
                            )}
                            {fiyatDegisti && (
                              <button onClick={()=>setKonfFiyatlar(p=>{ const y={...p}; delete y[m.id]; return y; })}
                                style={{ fontSize:7, background:"rgba(232,90,79,0.1)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:4, padding:"2px 5px", color:"#e85a4f", cursor:"pointer" }}>↺</button>
                            )}
                          </div>
                          {/* Karlılık göster */}
                          {altinKgUSD>0 && <div style={{ fontSize:8, color:hc.karUyari?"#e85a4f":"#6abf69", fontWeight:700, marginTop:3 }}>{fN(hc.karMly,3)} mly</div>}
                        </div>
                        {/* Altın rengi */}
                        <div style={{ display:"flex", gap:4, justifyContent:"center", paddingTop:4 }}>
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
                        <div style={{ textAlign:"center", fontSize:11, fontWeight:800, color:"var(--goldtext)" }}>{fN(topGram)} gr</div>
                        {/* Sil */}
                        <div style={{ textAlign:"center" }}>
                          <button onClick={()=>togKonf(m)} style={{ background:"rgba(232,90,79,0.08)", border:"1px solid rgba(232,90,79,0.15)", borderRadius:6, padding:"3px 8px", color:"#e85a4f", fontSize:9, cursor:"pointer" }}>X</button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Toplam satırı */}
                  <div style={{ display:"grid", gridTemplateColumns:"120px 100px 1fr 160px 100px 60px 70px 50px", gap:0, padding:"8px 10px", background:"rgba(201,168,76,0.06)", borderTop:"2px solid rgba(201,168,76,0.2)", alignItems:"center" }}>
                    <div></div><div></div>
                    <div style={{ fontSize:9, fontWeight:700, color:GOLD, textAlign:"right" }}>TOPLAM</div>
                    <div></div>
                    <div style={{ textAlign:"center", fontSize:12, fontWeight:800, color:GOLD }}>{konfKalemler.reduce((s,m)=>s+(m.adet||1),0)}</div>
                    <div style={{ textAlign:"center", fontSize:12, fontWeight:800, color:"var(--goldtext)" }}>{fN(kTop.topGram)} gr</div>
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
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:6 }}>
              <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--goldtext)" }}>Siparis Gecmisi ({siparisler.length})</h2>
              <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                <input value={sipMusF} onChange={e=>setSipMusF(e.target.value)} placeholder="Musteri ara..." style={{ ...IS, width:130, padding:"5px 8px", fontSize:10 }}/>
                <input type="date" value={sipTarih1} onChange={e=>setSipTarih1(e.target.value)} style={{ ...IS, width:120, padding:"5px 8px", fontSize:10 }}/>
                <span style={{ color:"#665d4a", fontSize:10 }}>—</span>
                <input type="date" value={sipTarih2} onChange={e=>setSipTarih2(e.target.value)} style={{ ...IS, width:120, padding:"5px 8px", fontSize:10 }}/>
                {(sipMusF||sipTarih1||sipTarih2||sipFiltre!=="tumu") && <button onClick={()=>{setSipMusF("");setSipTarih1("");setSipTarih2("");setSipFiltre("tumu");}} style={{ ...RD, fontSize:9, padding:"4px 8px" }}>Temizle</button>}
                {siparisler.length > 0 && (
                  <button onClick={() => {
                    const goruntulenecek = [...siparisler].reverse().filter(s => {
                      if (sipMusF) { const q = sipMusF.toLowerCase(); if (!(s.musteri||"").toLowerCase().includes(q) && !(s.musKod||"").toLowerCase().includes(q)) return false; }
                      if (sipTarih1 && s.tarih < new Date(sipTarih1).getTime()) return false;
                      if (sipTarih2 && s.tarih > new Date(sipTarih2).getTime()+86399999) return false;
                      return true;
                    });
                    downloadPDF(buildSipListeRaporuHTML(goruntulenecek, altinKgUSD, madenCarpan), "siparis-listesi-raporu");
                  }} style={{ background:"linear-gradient(135deg,#c9a84c,#b8943f)", border:"none", borderRadius:9, padding:"5px 11px", color:"#110f0a", fontSize:9, fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" }}>
                    📊 Rapor PDF
                  </button>
                )}
              </div>
            </div>
            {/* Hızlı filtreler */}
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
              {[
                { id:"tumu",       l:"Tümü",             cnt: siparisler.length },
                { id:"aktif",      l:"Aktif",            cnt: siparisler.filter(s=>{ const son=(s.durumGecmisi||[]).slice(-1)[0]; return son&&!["tamam","teslim","hurda"].includes(son.durum); }).length },
                { id:"baslanmadi", l:"Başlanmadı",       cnt: siparisler.filter(s=>!s.durumGecmisi?.length).length },
                { id:"dokumde",    l:"Dökümde",          cnt: siparisler.filter(s=>{ const son=(s.durumGecmisi||[]).slice(-1)[0]; return son?.durum==="dokum"; }).length },
                { id:"geciken",    l:"Geciken 7+ gün",   cnt: siparisler.filter(s=>{ const son=(s.durumGecmisi||[]).slice(-1)[0]; return son&&!["tamam","teslim","hurda"].includes(son.durum)&&isGunuSure(son.tarih,Date.now())>7*24*60*60*1000; }).length },
                { id:"tamamlanan", l:"Tamamlanan",       cnt: siparisler.filter(s=>{ const son=(s.durumGecmisi||[]).slice(-1)[0]; return ["tamam","teslim"].includes(son?.durum); }).length },
              ].map(f => (
                <button key={f.id} onClick={()=>setSipFiltre(f.id)}
                  style={{ background:sipFiltre===f.id?"rgba(201,168,76,0.18)":"rgba(201,168,76,0.04)", border:"1px solid", borderColor:sipFiltre===f.id?"rgba(201,168,76,0.4)":"rgba(201,168,76,0.1)", borderRadius:6, padding:"4px 10px", color:sipFiltre===f.id?GOLD:"#7a6f5a", fontSize:9, fontWeight:sipFiltre===f.id?700:400, cursor:"pointer" }}>
                  {f.l} <span style={{ fontSize:8, opacity:.7 }}>({f.cnt})</span>
                </button>
              ))}
            </div>
            {siparisler.length===0 && <p style={{ color:"#665d4a", textAlign:"center", padding:"30px", fontSize:12 }}>Henuz siparis kaydi yok</p>}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[...siparisler].reverse()
                .filter(s => {
                  if (sipMusF) { const q = sipMusF.toLowerCase(); if (!(s.musteri||"").toLowerCase().includes(q) && !(s.musKod||"").toLowerCase().includes(q)) return false; }
                  if (sipTarih1 && s.tarih < new Date(sipTarih1).getTime()) return false;
                  if (sipTarih2 && s.tarih > new Date(sipTarih2).getTime()+86399999) return false;
                  if (sipFiltre === "aktif") { const son=(s.durumGecmisi||[]).slice(-1)[0]; if (!son||["tamam","teslim","hurda"].includes(son.durum)) return false; }
                  if (sipFiltre === "baslanmadi") { if (s.durumGecmisi?.length) return false; }
                  if (sipFiltre === "dokumde") { const son=(s.durumGecmisi||[]).slice(-1)[0]; if (son?.durum!=="dokum") return false; }
                  if (sipFiltre === "geciken") { const son=(s.durumGecmisi||[]).slice(-1)[0]; if (!son||["tamam","teslim","hurda"].includes(son.durum)||isGunuSure(son.tarih,Date.now())<=7*24*60*60*1000) return false; }
                  if (sipFiltre === "tamamlanan") { const son=(s.durumGecmisi||[]).slice(-1)[0]; if (!["tamam","teslim"].includes(son?.durum)) return false; }
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
                            <span style={{ fontSize:9, color:"#5b9bd5", fontWeight:700 }}>{fN((s.kalemler||[]).reduce((acc,k)=>{const hc=hesapla(k,k.secilenAyar||k.refAyar,s.altinKgUSD,s.mc);const du=((s.kalemHurda)||{})[k.id]||0;const ia=((s.kalemIade)||{})[k.id]||0;const ta=((s.kalemTamir)||{})[k.id]||0;const net=Math.max(0,(k.adet||1)-du-ia-ta);return acc+hc.mamulGram*net;},0),2)} gr</span>
                            {(() => {
                              const topKar = (s.kalemler||[]).reduce((acc,k)=>{const hc=hesapla(k,k.secilenAyar||k.refAyar,s.altinKgUSD,s.mc);const du=((s.kalemHurda)||{})[k.id]||0;const ia=((s.kalemIade)||{})[k.id]||0;const ta=((s.kalemTamir)||{})[k.id]||0;const net=Math.max(0,(k.adet||1)-du-ia-ta);return acc+hc.karHas*net;},0);
                              const topKarUSD = topKar * ((s.altinKgUSD||0)/1000);
                              return <span style={{ fontSize:9, color:topKar>=0?"#6abf69":"#e85a4f", fontWeight:800 }}>{fN(topKar,2)} has {topKarUSD>0?"≈"+fUSD(topKarUSD):""}</span>;
                            })()}
                            {s.teslimTarihi && <span style={{ fontSize:9, color:"#e8833a", fontWeight:700 }}>Teslim: {new Date(s.teslimTarihi).toLocaleDateString("tr-TR")}</span>}
                            {s.aciklama && <span style={{ fontSize:9, color:"#5b9bd5", fontStyle:"italic" }}>📝 {s.aciklama}</span>}
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
                              const sure = isGunuSure(s.durumGecmisi[s.durumGecmisi.length-1].tarih, Date.now());
                              return (
                                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                  <span style={{ background:sonDurumObj?.c+"22", color:sonDurumObj?.c, border:"1px solid "+sonDurumObj?.c+"44", borderRadius:5, padding:"2px 7px", fontSize:8, fontWeight:700 }}>
                                    {sonDurumObj?.l||sonDurum}
                                  </span>
                                  <span style={{ fontSize:8, color:"#665d4a" }}>{sureFmt(sure)}</span>
                                </div>
                              );
                            })()}
                            <button onClick={()=>downloadPDF(buildKonfHTML(s,s.altinKgUSD||altinKgUSD,s.mc||madenCarpan,true),(s.musteri||"siparis")+"-fiyatli")} style={{ ...GH, fontSize:8, padding:"3px 7px" }}>Fiyatlı</button>
                            <button onClick={()=>downloadPDF(buildKonfHTML(s,s.altinKgUSD||altinKgUSD,s.mc||madenCarpan,false),(s.musteri||"siparis")+"-fiyatsiz")} style={{ background:"rgba(232,90,79,0.08)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:9, padding:"3px 7px", color:"#e85a4f", fontSize:8, fontWeight:700, cursor:"pointer" }}>Fiyatsız</button>
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
                              setKonfSipAciklama(s.aciklama||"");
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

                        {/* Mini foto şeridi — sadece kapalıyken */}
                        {!acik && (s.kalemler||[]).some(k=>k.foto) && (
                          <div style={{ display:"flex", gap:4, marginTop:8, alignItems:"center" }}>
                            {(s.kalemler||[]).filter(k=>k.foto).slice(0,6).map((k,i) => {
                              const dur = DURUMLAR.find(d=>d.id===(kalemDurumlar[k.id]||k.durum||"baslanmadi"))||DURUMLAR[0];
                              return (
                                <div key={k.id} style={{ position:"relative", flexShrink:0 }}>
                                  <img src={k.foto} alt={k.kod} style={{ width:40, height:40, objectFit:"cover", borderRadius:6, display:"block", border:"2px solid "+dur.c+"66" }}/>
                                  <div style={{ position:"absolute", bottom:2, right:2, width:6, height:6, borderRadius:3, background:dur.c }}/>
                                </div>
                              );
                            })}
                            {(s.kalemler||[]).filter(k=>k.foto).length > 6 && (
                              <div style={{ width:40, height:40, borderRadius:6, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#998a6e", flexShrink:0 }}>
                                +{(s.kalemler||[]).filter(k=>k.foto).length - 6}
                              </div>
                            )}
                            {/* Kalem kodları özeti */}
                            <div style={{ marginLeft:4, display:"flex", flexWrap:"wrap", gap:3 }}>
                              {(s.kalemler||[]).slice(0,8).map(k => (
                                <span key={k.id} style={{ fontSize:8, color:"#665d4a", background:"rgba(255,255,255,0.04)", padding:"1px 5px", borderRadius:3 }}>{k.kod||"?"}</span>
                              ))}
                              {(s.kalemler||[]).length > 8 && <span style={{ fontSize:8, color:"#554d3a" }}>+{(s.kalemler||[]).length-8}</span>}
                            </div>
                          </div>
                        )}
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

                        {/* ZAMAN ÇİZELGESİ — özet + buton (detay modal'da) */}
                        {s.durumGecmisi?.length > 0 && (() => {
                          const gecmis = s.durumGecmisi;
                          const toplamSure = isGunuSure(gecmis[0].tarih, Date.now());
                          const sonGec = gecmis[gecmis.length-1];
                          const sonDurumObj = DURUMLAR.find(d=>d.id===sonGec.durum)||DURUMLAR[0];
                          const tamamlandi = ["tamam","teslim"].includes(sonGec.durum);
                          const sonSure = isGunuSure(sonGec.tarih, Date.now());
                          return (
                            <div style={{ marginBottom:12, padding:"8px 12px", background:"rgba(91,155,213,0.05)", border:"1px solid rgba(91,155,213,0.12)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                                <span style={{ fontSize:9, fontWeight:700, color:"#5b9bd5" }}>⏱ ÜRETİM</span>
                                <span style={{ background:sonDurumObj.c+"22", color:sonDurumObj.c, border:"1px solid "+sonDurumObj.c+"55", borderRadius:5, padding:"2px 8px", fontSize:9, fontWeight:700 }}>
                                  {sonDurumObj.l}
                                </span>
                                {!tamamlandi && <span style={{ fontSize:8, color:"#998a6e" }}>{sureFmt(sonSure)} aşamada</span>}
                                <span style={{ fontSize:8, color:"#665d4a" }}>Toplam: <b style={{ color:"var(--goldtext)" }}>{sureFmt(toplamSure)}</b></span>
                                <span style={{ fontSize:8, color:"#665d4a" }}>{gecmis.length} aşama</span>
                                {tamamlandi && <span style={{ fontSize:8, color:"#6abf69", fontWeight:700 }}>✓ Tamamlandı</span>}
                              </div>
                              <button onClick={e=>{ e.stopPropagation(); setCizelgeModal(s.id); }} style={{ background:"rgba(91,155,213,0.15)", border:"1px solid rgba(91,155,213,0.3)", borderRadius:6, padding:"4px 10px", color:"#5b9bd5", fontSize:9, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                                📊 Çizelgeyi Aç
                              </button>
                              {/* Sonraki aşama butonu (hızlı erişim) */}
                              {!tamamlandi && (() => {
                                const sonrakiDurum = DURUMLAR[DURUMLAR.findIndex(d=>d.id===sonGec.durum)+1];
                                if (!sonrakiDurum) return null;
                                return (
                                  <button onClick={e=>{
                                    e.stopPropagation();
                                    svS(siparisler.map(sp=>sp.id===s.id?{...sp,kalemDurumlar:Object.fromEntries((sp.kalemler||[]).map(k=>[(k.id),(sp.kalemDurumlar||{})[k.id]==="hurda"?"hurda":sonrakiDurum.id]))}:sp));
                                    sipDurumKaydet(s.id, sonrakiDurum.id);
                                  }} style={{ background:sonrakiDurum.c+"22", border:"1px solid "+sonrakiDurum.c+"66", borderRadius:6, padding:"4px 10px", color:sonrakiDurum.c, fontSize:9, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                                    → {sonrakiDurum.l}
                                  </button>
                                );
                              })()}
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
                              <div className="model-foto-wrap" style={{ width:120, height:120, borderRadius:8, overflow:"hidden", flexShrink:0, background:"rgba(0,0,0,0.2)" }}>{k.foto ? <img src={k.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }}/> : <div style={{ width:"100%", height:"100%", background:"rgba(201,168,76,0.06)" }}/>}</div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:10, fontWeight:700, color:"var(--goldtext)" }}>
                                  <span style={{ color:GOLD, marginRight:4 }}>{k.kod||""}</span>{k.ad}
                                  {k.renk && <span style={{ color:"var(--gold)", marginLeft:6, fontSize:9 }}>{k.renk}</span>}
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
                                  const iadeAdet = (s.kalemIade||{})[k.id]||0;
                                  const tamirAdet = (s.kalemTamir||{})[k.id]||0;
                                  return (
                                    <>
                                      <button onClick={e=>{e.stopPropagation(); setHurdaModal({sipId:s.id, kalemId:k.id, kalemAd:k.ad, maxAdet:k.adet||1, mevcAdet:hurdaAdet, mevcNeden:hurdaNeden});}}
                                        style={{ display:"flex", alignItems:"center", gap:3, marginLeft:6, background:hurdaAdet>0?"rgba(232,90,79,0.15)":"rgba(232,90,79,0.06)", border:"1px solid rgba(232,90,79,0.25)", borderRadius:6, padding:"2px 7px", cursor:"pointer" }}>
                                        <span style={{ fontSize:7, color:"#e85a4f", fontWeight:700 }}>🗑 HURDA</span>
                                        {hurdaAdet>0 && <span style={{ fontSize:9, color:"#e85a4f", fontWeight:800 }}>{hurdaAdet}/{k.adet||1}</span>}
                                        {hurdaNeden && <span style={{ fontSize:7, color:"#e85a4f", opacity:0.7, maxWidth:60, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{hurdaNeden}</span>}
                                      </button>
                                      <button onClick={e=>{e.stopPropagation(); setIadeModal({sipId:s.id, kalemId:k.id, kalemAd:k.ad, kalemKod:k.kod, maxAdet:k.adet||1, mevcAdet:iadeAdet, mevcNeden:(s.kalemIadeNeden||{})[k.id]||"", iadeTuru:(s.kalemIadeTuru||{})[k.id]||"para"});}}
                                        style={{ display:"flex", alignItems:"center", gap:3, marginLeft:6, background:iadeAdet>0?"rgba(167,139,250,0.15)":"rgba(167,139,250,0.06)", border:"1px solid rgba(167,139,250,0.25)", borderRadius:6, padding:"2px 7px", cursor:"pointer" }}>
                                        <span style={{ fontSize:7, color:"#a78bfa", fontWeight:700 }}>↩ İADE</span>
                                        {iadeAdet>0 && <span style={{ fontSize:9, color:"#a78bfa", fontWeight:800 }}>{iadeAdet}/{k.adet||1}</span>}
                                      </button>
                                      <button onClick={e=>{e.stopPropagation(); setTamirModal({sipId:s.id, kalemId:k.id, kalemAd:k.ad, kalemKod:k.kod, maxAdet:k.adet||1, mevcAdet:tamirAdet, mevcNeden:(s.kalemTamirNeden||{})[k.id]||""});}}
                                        style={{ display:"flex", alignItems:"center", gap:3, marginLeft:6, background:tamirAdet>0?"rgba(91,155,213,0.15)":"rgba(91,155,213,0.06)", border:"1px solid rgba(91,155,213,0.25)", borderRadius:6, padding:"2px 7px", cursor:"pointer" }}>
                                        <span style={{ fontSize:7, color:"#5b9bd5", fontWeight:700 }}>🔧 TAMİR</span>
                                        {tamirAdet>0 && <span style={{ fontSize:9, color:"#5b9bd5", fontWeight:800 }}>{tamirAdet}/{k.adet||1}</span>}
                                      </button>
                                    </>
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
        {/* İADE & TAMİR */}
        {sayfa==="iadeler" && (() => {
          // Tüm siparişlerden iade ve tamir kaydı olan kalemleri çıkar
          const iadeKayitlar = [];
          const tamirKayitlar = [];
          siparisler.forEach(s => {
            const iade = s.kalemIade || {};
            const iadeNeden = s.kalemIadeNeden || {};
            const iadeTuru = s.kalemIadeTuru || {};
            const tamir = s.kalemTamir || {};
            const tamirNeden = s.kalemTamirNeden || {};
            (s.kalemler||[]).forEach(k => {
              if (iade[k.id] && iade[k.id] > 0) {
                iadeKayitlar.push({
                  sipId: s.id, musteri: s.musteri, kalem: k, adet: iade[k.id],
                  neden: iadeNeden[k.id] || "", tur: iadeTuru[k.id] || "para",
                  tarih: s.tarih || s.t
                });
              }
              if (tamir[k.id] && tamir[k.id] > 0) {
                tamirKayitlar.push({
                  sipId: s.id, musteri: s.musteri, kalem: k, adet: tamir[k.id],
                  neden: tamirNeden[k.id] || "", tarih: s.tarih || s.t
                });
              }
            });
          });
          
          return (
            <div style={{ animation:"fadein .3s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:"var(--goldtext)" }}>İade & Tamir Kayıtları</h2>
              </div>

              {/* İade Bölümü */}
              <div style={{ marginBottom:18 }}>
                <h3 style={{ fontSize:12, color:"#a78bfa", marginBottom:8, fontWeight:700 }}>↩ İadeler ({iadeKayitlar.length})</h3>
                {iadeKayitlar.length === 0 ? (
                  <div style={{ background:"rgba(167,139,250,0.03)", border:"1px solid rgba(167,139,250,0.1)", borderRadius:10, padding:"24px", textAlign:"center", color:"#665d4a", fontSize:11 }}>
                    İade kaydı yok
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {iadeKayitlar.map((r, i) => (
                      <div key={i} style={{ background:"rgba(167,139,250,0.04)", border:"1px solid rgba(167,139,250,0.15)", borderRadius:10, padding:"10px 12px", display:"flex", alignItems:"center", gap:10 }}>
                        <div className="model-foto-wrap" style={{ width:80, height:80, borderRadius:8, overflow:"hidden", flexShrink:0, background:"rgba(0,0,0,0.2)" }}>{r.kalem.foto ? <img src={r.kalem.foto} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }}/> : <div style={{ width:"100%", height:"100%", background:"rgba(201,168,76,0.06)" }}/>}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:"var(--goldtext)" }}>
                            <span style={{ color:GOLD, marginRight:5 }}>{r.kalem.kod||""}</span>{r.kalem.ad}
                          </div>
                          <div style={{ fontSize:9, color:"#998a6e", marginTop:2 }}>
                            Müşteri: <b style={{ color:"#c0b399" }}>{r.musteri}</b> · {new Date(r.tarih).toLocaleDateString("tr-TR")}
                          </div>
                          {r.neden && <div style={{ fontSize:9, color:"#a78bfa", marginTop:3, fontStyle:"italic" }}>"{r.neden}"</div>}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:3, alignItems:"flex-end" }}>
                          <span style={{ background:"rgba(167,139,250,0.15)", color:"#a78bfa", padding:"2px 8px", borderRadius:5, fontSize:9, fontWeight:700 }}>
                            {r.tur === "degisim" ? "🔄 Değişim" : "💵 Para"}
                          </span>
                          <span style={{ fontSize:10, color:"#a78bfa", fontWeight:800 }}>{r.adet}/{r.kalem.adet||1} adet</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tamir Bölümü */}
              <div>
                <h3 style={{ fontSize:12, color:"#5b9bd5", marginBottom:8, fontWeight:700 }}>🔧 Tamirler ({tamirKayitlar.length})</h3>
                {tamirKayitlar.length === 0 ? (
                  <div style={{ background:"rgba(91,155,213,0.03)", border:"1px solid rgba(91,155,213,0.1)", borderRadius:10, padding:"24px", textAlign:"center", color:"#665d4a", fontSize:11 }}>
                    Tamir kaydı yok
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {tamirKayitlar.map((r, i) => (
                      <div key={i} style={{ background:"rgba(91,155,213,0.04)", border:"1px solid rgba(91,155,213,0.15)", borderRadius:10, padding:"10px 12px", display:"flex", alignItems:"center", gap:10 }}>
                        <div className="model-foto-wrap" style={{ width:80, height:80, borderRadius:8, overflow:"hidden", flexShrink:0, background:"rgba(0,0,0,0.2)" }}>{r.kalem.foto ? <img src={r.kalem.foto} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }}/> : <div style={{ width:"100%", height:"100%", background:"rgba(201,168,76,0.06)" }}/>}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:"var(--goldtext)" }}>
                            <span style={{ color:GOLD, marginRight:5 }}>{r.kalem.kod||""}</span>{r.kalem.ad}
                          </div>
                          <div style={{ fontSize:9, color:"#998a6e", marginTop:2 }}>
                            Müşteri: <b style={{ color:"#c0b399" }}>{r.musteri}</b> · {new Date(r.tarih).toLocaleDateString("tr-TR")}
                          </div>
                          {r.neden && <div style={{ fontSize:9, color:"#5b9bd5", marginTop:3, fontStyle:"italic" }}>"{r.neden}"</div>}
                        </div>
                        <span style={{ fontSize:10, color:"#5b9bd5", fontWeight:800 }}>{r.adet}/{r.kalem.adet||1} adet</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {sayfa==="musteriler" && (
          <div style={{ animation:"fadein .3s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--goldtext)" }}>Musteriler ({Object.keys(musteriler).length})</h2>
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
                          <span style={{ fontSize:13, fontWeight:700, color:"var(--goldtext)" }}>{ad}</span>
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

        {/* KASA */}
        {sayfa==="kasa" && (() => {
          // ── Şifre kontrolü ──
          const kasaSifreKontrol = async () => {
            const encoder = new TextEncoder();
            const data = encoder.encode(kasaSifreGirdi);
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2,"0")).join("");
            // 348834 hash
            const dogruHash = "7c222fb2927d828af22f592134e8932480637c0d";
            if (hashHex.startsWith(dogruHash.slice(0,10)) || kasaSifreGirdi === "348834") {
              setKasaKilitli(false); setKasaSifreHata(false); setKasaSifreGirdi("");
            } else {
              setKasaSifreHata(true); setKasaSifreGirdi("");
            }
          };

          if (kasaKilitli) return (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:16 }}>
              <div style={{ fontSize:32 }}>🔐</div>
              <div style={{ fontSize:14, fontWeight:700, color:GOLD }}>Kasa & Bilanço</div>
              <div style={{ fontSize:10, color:"#665d4a" }}>Bu bölüme erişmek için şifre gerekiyor</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"center" }}>
                <input
                  type="password"
                  placeholder="Şifre"
                  value={kasaSifreGirdi}
                  onChange={e=>{ setKasaSifreGirdi(e.target.value); setKasaSifreHata(false); }}
                  onKeyDown={e=>e.key==="Enter"&&kasaSifreKontrol()}
                  style={{ ...IS, width:200, padding:"10px 14px", fontSize:16, textAlign:"center", letterSpacing:"0.2em" }}
                  autoFocus
                />
                {kasaSifreHata && <div style={{ fontSize:10, color:"#e85a4f", fontWeight:700 }}>Hatalı şifre</div>}
                <button onClick={kasaSifreKontrol} style={{ ...BG, padding:"8px 28px", fontSize:11 }}>Giriş</button>
              </div>
            </div>
          );

          // ── Canlı hesaplamalar ──
          const altinKgUSD = parseFloat(altinKg) || 0;
          const hasGramUSD = altinKgUSD / 1000;

          // Üretimdeki altın (aktif siparişler — tamam/teslim/hurda dışı)
          let uretimAltin = 0, uretimTas = 0;
          siparisler.forEach(s => {
            (s.kalemler||[]).forEach(k => {
              const dur = (s.kalemDurumlar||{})[k.id] || k.durum || "baslanmadi";
              if (["tamam","teslim","hurda"].includes(dur)) return;
              const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD, s.mc);
              const hurda = ((s.kalemHurda)||{})[k.id]||0;
              const iade  = ((s.kalemIade) ||{})[k.id]||0;
              const tamir = ((s.kalemTamir)||{})[k.id]||0;
              const net   = Math.max(0,(k.adet||1)-hurda-iade-tamir);
              uretimAltin += hc.mamulGram * net;
              uretimTas   += (Number(k.tasGram)||0) * net;
            });
          });

          // Satılmamış mamul (tamam ama teslim edilmedi) — altın + taş
          let satilmamisAltin = 0, satilmamisTas = 0;
          siparisler.forEach(s => {
            (s.kalemler||[]).forEach(k => {
              const dur = (s.kalemDurumlar||{})[k.id] || k.durum || "baslanmadi";
              if (dur !== "tamam") return;
              const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD, s.mc);
              const hurda = ((s.kalemHurda)||{})[k.id]||0;
              const iade  = ((s.kalemIade) ||{})[k.id]||0;
              const tamir = ((s.kalemTamir)||{})[k.id]||0;
              const net   = Math.max(0,(k.adet||1)-hurda-iade-tamir);
              satilmamisAltin += hc.mamulGram * net;
              satilmamisTas   += (Number(k.tasGram)||0) * net;
            });
          });

          // İade edilen malların taşları (kasada bekliyor)
          let iadeTas = 0;
          siparisler.forEach(s => {
            (s.kalemler||[]).forEach(k => {
              const iade = ((s.kalemIade)||{})[k.id]||0;
              iadeTas += (Number(k.tasGram)||0) * iade;
            });
          });

          // Hurda altın + hurda taş
          let hurdaAltin = 0, hurdaTas = 0;
          siparisler.forEach(s => {
            (s.kalemler||[]).forEach(k => {
              const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD, s.mc);
              const hurda = ((s.kalemHurda)||{})[k.id]||0;
              hurdaAltin += hc.mamulGram * hurda;
              hurdaTas   += (Number(k.tasGram)||0) * hurda;
            });
          });

          // Ham altın stoku (manuel girişlerden)
          const hamAltinGram = (kasa.hamAltin||[]).reduce((s,x) => x.tip==="giris" ? s+x.has : s-x.has, 0);

          // Hazır ürün değeri
          const hazirUrunGram = (kasa.hazirUrun||[]).reduce((s,x) => {
            const m = modeller.find(mo=>mo.id===x.modelId);
            if (!m) return s;
            const hc = hesapla(m, m.secilenAyar||m.refAyar, altinKgUSD, parseFloat(mc)||0.030);
            return s + hc.mamulGram * (x.adet||1);
          }, 0);

          // Serbest malzeme
          const serbestGram = (kasa.serbest||[]).reduce((s,x) => s + ((x.gram||0)*(x.adet||1)), 0);

          // Toplam öz sermaye
          const toplamHas = hamAltinGram + uretimAltin + satilmamisAltin + hurdaAltin + hazirUrunGram + serbestGram;
          const toplamUSD = toplamHas * hasGramUSD;

          // Müşteri bakiyeleri
          const musBakiye = {};
          // Önce tüm müşteri kayıtlarını oluştur (siparişi olmayanlar da dahil — baslangic_bakiye için)
          Object.keys(kasa.musteriOdemeler||{}).forEach(mus => {
            if (!musBakiye[mus]) musBakiye[mus] = { borc:0, odenen:0, baslangicBorc:0, siparisler:[] };
          });
          siparisler.forEach(s => {
            const mus = s.musteri || "İsimsiz";
            if (!musBakiye[mus]) musBakiye[mus] = { borc:0, odenen:0, baslangicBorc:0, siparisler:[] };
            let sipKar = 0;
            (s.kalemler||[]).forEach(k => {
              const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD, s.mc);
              const hurda = ((s.kalemHurda)||{})[k.id]||0;
              const iade  = ((s.kalemIade) ||{})[k.id]||0;
              const tamir = ((s.kalemTamir)||{})[k.id]||0;
              const net   = Math.max(0,(k.adet||1)-hurda-iade-tamir);
              sipKar += hc.karHas * net;
            });
            musBakiye[mus].borc += sipKar;
            musBakiye[mus].siparisler.push({ id:s.id, tarih:s.tarih, kar:sipKar });
          });
          // Ödemeler + başlangıç borcu ayrı ayrı hesapla
          Object.keys(musBakiye).forEach(mus => {
            const odemeler = (kasa.musteriOdemeler||{})[mus] || [];
            musBakiye[mus].baslangicBorc = odemeler.filter(x=>x.tip==="baslangic_bakiye").reduce((s,x)=>s+x.has,0);
            musBakiye[mus].borc += musBakiye[mus].baslangicBorc;
            musBakiye[mus].odenen = odemeler.filter(x=>x.tip!=="baslangic_bakiye").reduce((s,x)=>s+x.has,0);
            musBakiye[mus].odemeler = odemeler;
          });

          // Dökümcü bakiyesi
          const dokumGiden  = (kasa.dokumcuIslemler||[]).filter(x=>x.tip==="gonder"||x.tip==="baslangic_borc").reduce((s,x)=>s+x.has,0);
          const dokumOdenen = (kasa.dokumcuIslemler||[]).filter(x=>x.tip==="ode").reduce((s,x)=>s+x.has,0);
          const dokumBorc   = dokumGiden - dokumOdenen;

          const KCARD = { background:"rgba(0,0,0,0.2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"12px 16px", marginBottom:12 };
          const KSEC  = { fontSize:10, fontWeight:700, color:GOLD, marginBottom:10, letterSpacing:".04em" };
          const KIN   = { ...IS, padding:"5px 8px", fontSize:10, marginBottom:6, width:"100%" };

          return (
            <div style={{ animation:"fadein .3s" }}>
              {/* Başlık + alt sekmeler */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:6 }}>
                <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:T.text }}>💰 Kasa & Stok</h2>
              <button onClick={()=>setKasaKilitli(true)} style={{ ...RD, fontSize:9, padding:"4px 10px" }}>🔒 Kilitle</button>
              </div>
              <div style={{ display:"flex", gap:4, marginBottom:14, borderBottom:"1px solid rgba(201,168,76,0.12)", paddingBottom:8 }}>
                {[{id:"ozet",l:"Özet"},{id:"musteri",l:"Müşteri Bakiyeleri"},{id:"dokumcu",l:"Dökümcü"},{id:"stok",l:"Stok"},{id:"muhasebe",l:"Muhasebe"},{id:"bilanco",l:"Bilanço"}].map(t => (
                  <button key={t.id} onClick={()=>setKasaSayfa(t.id)} style={{ background:kasaSayfa===t.id?"rgba(201,168,76,0.15)":"transparent", border:"1px solid", borderColor:kasaSayfa===t.id?"rgba(201,168,76,0.4)":"transparent", borderRadius:7, padding:"5px 12px", color:kasaSayfa===t.id?GOLD:"#7a6f5a", fontSize:10, fontWeight:kasaSayfa===t.id?700:400, cursor:"pointer" }}>{t.l}</button>
                ))}
              </div>

              {/* ══ ÖZET ══ */}
              {kasaSayfa==="ozet" && (
                <div>
                  {/* Öz Sermaye */}
                  <div style={KCARD}>
                    <div style={KSEC}>🏦 ÖZ SERMAYE</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
                      {[
                        { l:"Ham Altın", v:hamAltinGram, c:GOLD },
                        { l:"Üretimdeki Altın", v:uretimAltin, c:"#5b9bd5" },
                        { l:"Üretimdeki Taş", v:uretimTas, c:"#a78bfa" },
                        { l:"Satılmamış Mamul (Altın)", v:satilmamisAltin, c:"#6abf69" },
                        { l:"Satılmamış Mamul (Taş)", v:satilmamisTas, c:"#7c6abf" },
                        { l:"İade Taşları", v:iadeTas, c:"#c27ba0" },
                        { l:"Hurda Altın", v:hurdaAltin, c:"#e8833a" },
                        { l:"Hurda Taş", v:hurdaTas, c:"#b86a3a" },
                        { l:"Hazır Ürün + Serbest", v:hazirUrunGram+serbestGram, c:"#e8dcc8" },
                      ].filter(x=>x.v>0).map((x,i) => (
                        <div key={i} style={{ background:"rgba(0,0,0,0.15)", borderRadius:8, padding:"8px 10px" }}>
                          <div style={{ fontSize:7, color:"#665d4a", textTransform:"uppercase", marginBottom:3 }}>{x.l}</div>
                          <div style={{ fontSize:13, fontWeight:800, color:x.c }}>{fN(x.v,3)} <span style={{ fontSize:8 }}>has</span></div>
                          {hasGramUSD>0 && <div style={{ fontSize:8, color:"#665d4a" }}>≈ {fUSD(x.v*hasGramUSD)}</div>}
                        </div>
                      ))}
                    </div>
                    <div style={{ background:"rgba(201,168,76,0.08)", border:"1px solid rgba(201,168,76,0.2)", borderRadius:8, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:10, fontWeight:700, color:GOLD }}>TOPLAM ÖZ SERMAYE</span>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:16, fontWeight:800, color:GOLD }}>{fN(toplamHas,3)} has</div>
                        {hasGramUSD>0 && <div style={{ fontSize:10, color:"#6abf69", fontWeight:700 }}>{fUSD(toplamUSD)}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Müşteri + Dökümcü özeti */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <div style={KCARD}>
                      <div style={KSEC}>👤 MÜŞTERİ ALACAKLAR</div>
                      {Object.entries(musBakiye).filter(([,d])=>(d.borc-d.odenen)>0.001).sort((a,b)=>(b[1].borc-b[1].odenen)-(a[1].borc-a[1].odenen)).slice(0,5).map(([mus,d]) => {
                        const bakiye = d.borc - d.odenen;
                        return (
                          <div key={mus} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                            <span style={{ fontSize:9, color:"var(--goldtext)", fontWeight:600 }}>{mus}</span>
                            <span style={{ fontSize:10, fontWeight:800, color:"#e85a4f" }}>{fN(bakiye,3)} has</span>
                          </div>
                        );
                      })}
                      {Object.values(musBakiye).every(d=>d.borc-d.odenen<=0.001) && <div style={{ fontSize:9, color:"#665d4a" }}>Açık bakiye yok</div>}
                      <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid rgba(201,168,76,0.1)", display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:8, color:"#8a7d64" }}>TOPLAM ALACAK</span>
                        <span style={{ fontSize:11, fontWeight:800, color:"#e85a4f" }}>{fN(Object.values(musBakiye).reduce((s,d)=>s+Math.max(0,d.borc-d.odenen),0),3)} has</span>
                      </div>
                    </div>
                    <div style={KCARD}>
                      <div style={KSEC}>🏭 DÖKÜMCÜ BORCU</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {[
                          { l:"Toplam Gönderilen", v:dokumGiden, c:"#e8833a" },
                          { l:"Toplam Ödenen",     v:dokumOdenen, c:"#6abf69" },
                          { l:"Kalan Borç",        v:dokumBorc, c:dokumBorc>0?"#e85a4f":"#6abf69" },
                        ].map((x,i) => (
                          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:i<2?"1px solid rgba(255,255,255,0.04)":"2px solid rgba(201,168,76,0.15)" }}>
                            <span style={{ fontSize:9, color:"#998a6e" }}>{x.l}</span>
                            <span style={{ fontSize:11, fontWeight:800, color:x.c }}>{fN(x.v,3)} has</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ MÜŞTERİ BAKİYELERİ ══ */}
              {kasaSayfa==="musteri" && (
                <div>
                  <div style={{ display:"flex", justifyContent:"flex-end", gap:6, marginBottom:10 }}>
                    <button onClick={()=>kasaModalAc({tip:"musBaklangic"})} style={{ ...GH, padding:"6px 14px", fontSize:10 }}>+ Başlangıç Bakiyesi</button>
                    <button onClick={()=>kasaModalAc({tip:"musOde"})} style={{ ...BG, padding:"6px 14px", fontSize:10 }}>+ Ödeme Al</button>
                  </div>
                  {Object.entries(musBakiye).sort((a,b)=>(b[1].borc-b[1].odenen)-(a[1].borc-a[1].odenen)).map(([mus,d]) => {
                    const bakiye = d.borc - d.odenen;
                    const odemeler = (kasa.musteriOdemeler||{})[mus] || [];
                    return (
                      <div key={mus} style={{ ...KCARD }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:800, color:"var(--goldtext)" }}>{mus}</div>
                            <div style={{ fontSize:8, color:"#665d4a" }}>{d.siparisler.length} sipariş</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:8, color:"#665d4a" }}>Toplam Borç</div>
                            <div style={{ fontSize:13, fontWeight:800, color:GOLD }}>{fN(d.borc,3)} has</div>
                          </div>
                        </div>
                        <div style={{ background:bakiye>0?"rgba(232,90,79,0.06)":"rgba(106,191,105,0.06)", border:"1px solid", borderColor:bakiye>0?"rgba(232,90,79,0.15)":"rgba(106,191,105,0.15)", borderRadius:9, padding:"10px 14px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div>
                            <div style={{ fontSize:7, color:"#665d4a", textTransform:"uppercase", marginBottom:2 }}>NET BAKİYE</div>
                            <div style={{ fontSize:16, fontWeight:800, color:bakiye>0?"#e85a4f":"#6abf69" }}>{fN(Math.abs(bakiye),3)} has</div>
                            <div style={{ fontSize:8, color:"#665d4a" }}>{bakiye>0?"müşteri borçlu":"müşteri alacaklı"}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            {d.baslangicBorc>0 && <div style={{ fontSize:8, color:"#a78bfa" }}>Başlangıç: {fN(d.baslangicBorc,3)} has</div>}
                            {d.siparisler.length>0 && <div style={{ fontSize:8, color:"#665d4a" }}>Sipariş: {fN(d.borc-d.baslangicBorc,3)} has</div>}
                            <div style={{ fontSize:8, color:"#6abf69" }}>Ödenen: {fN(d.odenen,3)} has</div>
                          </div>
                        </div>
                        {(d.odemeler||[]).length>0 && (
                          <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:8 }}>
                            <div style={{ fontSize:7, color:"#665d4a", fontWeight:700, marginBottom:4 }}>HAREKET GEÇMİŞİ</div>
                            {[...(d.odemeler||[])].sort((a,b)=>b.tarih-a.tarih).map(o => (
                              <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"3px 0", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                                <div>
                                  <span style={{ fontSize:8, color:"#998a6e" }}>{new Date(o.tarih).toLocaleDateString("tr-TR")}</span>
                                  {o.aciklama && <span style={{ fontSize:8, color:"#665d4a", marginLeft:6 }}>{o.aciklama}</span>}
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  <span style={{ fontSize:8, color:"#998a6e", marginRight:2 }}>{o.tip==="baslangic_bakiye"?"Başlangıç":o.tip==="ode"?"Ödeme":"?"}</span>
                                  <span style={{ fontSize:9, fontWeight:800, color:o.tip==="baslangic_bakiye"?"#a78bfa":"#6abf69" }}>{fN(o.has,3)} has</span>
                                  <button onClick={()=>{
                                    const yeni = { ...kasa };
                                    yeni.musteriOdemeler = { ...yeni.musteriOdemeler };
                                    yeni.musteriOdemeler[mus] = (yeni.musteriOdemeler[mus]||[]).filter(x=>x.id!==o.id);
                                    svKasa(yeni);
                                  }} style={{ ...RD, fontSize:8, padding:"2px 5px" }}>Sil</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button onClick={()=>kasaModalAc({tip:"musOde",mus})} style={{ ...GH, fontSize:9, padding:"4px 10px", marginTop:8 }}>+ Ödeme Al</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ══ DÖKÜMCÜ ══ */}
              {kasaSayfa==="dokumcu" && (() => {
                // Dökümde olan siparişler (otomatik kayıtlardan)
                const dokumdaOlanlar = (kasa.dokumcuIslemler||[]).filter(x=>x.tip==="gonder"&&!x.teslimTarih);
                const teslimAlinanlar = (kasa.dokumcuIslemler||[]).filter(x=>x.tip==="gonder"&&x.teslimTarih);
                return (
                <div>
                  {/* Özet */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
                    {[
                      { l:"Dökümde Bekleyen", v:dokumdaOlanlar.reduce((s,x)=>s+x.has,0), c:"#e8833a", sub:dokumdaOlanlar.length+" sipariş" },
                      { l:"Toplam Gönderilen", v:dokumGiden, c:"#5b9bd5", sub:"tüm zamanlar" },
                      { l:"Toplam Ödenen",     v:dokumOdenen, c:"#6abf69", sub:"yapılan ödemeler" },
                      { l:"Kalan Borç",        v:dokumBorc, c:dokumBorc>0?"#e85a4f":"#6abf69", sub:dokumBorc>0?"ödenmeli":"borç yok" },
                    ].map((x,i) => (
                      <div key={i} style={{ background:"rgba(0,0,0,0.2)", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
                        <div style={{ fontSize:7, color:"#665d4a", textTransform:"uppercase", marginBottom:4 }}>{x.l}</div>
                        <div style={{ fontSize:13, fontWeight:800, color:x.c }}>{fN(x.v,3)} has</div>
                        {hasGramUSD>0 && <div style={{ fontSize:8, color:"#665d4a" }}>≈ {fUSD(x.v*hasGramUSD)}</div>}
                        <div style={{ fontSize:7, color:"#665d4a", marginTop:2 }}>{x.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                    <button onClick={()=>kasaModalAc({tip:"dokumOde"})} style={{ ...BG, padding:"6px 14px", fontSize:10 }}>+ Ödeme Yap</button>
                    <button onClick={()=>kasaModalAc({tip:"dokumBorcGir"})} style={{ ...GH, padding:"6px 14px", fontSize:10 }}>+ Mevcut Borç Gir</button>
                  </div>

                  {/* Şu an dökümde bekleyen siparişler */}
                  {dokumdaOlanlar.length > 0 && (
                    <div style={KCARD}>
                      <div style={KSEC}>🔄 DÖKÜMDE BEKLEYEN</div>
                      {dokumdaOlanlar.sort((a,b)=>a.tarih-b.tarih).map(x => {
                        const beklemeSure = Math.round((Date.now()-x.tarih)/86400000);
                        return (
                          <div key={x.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ width:8, height:8, borderRadius:"50%", background:"#e8833a", flexShrink:0 }}/>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:9, fontWeight:700, color:"var(--goldtext)" }}>{x.musteri||"?"}</div>
                              <div style={{ fontSize:7, color:"#665d4a" }}>{new Date(x.tarih).toLocaleDateString("tr-TR")} · {beklemeSure} gün önce gönderildi</div>
                              {x.aciklama && <div style={{ fontSize:7, color:"#665d4a" }}>{x.aciklama}</div>}
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:10, fontWeight:800, color:"#e8833a" }}>{fN(x.has,3)} has</div>
                              <div style={{ fontSize:7, color:beklemeSure>3?"#e85a4f":"#665d4a", fontWeight:beklemeSure>3?700:400 }}>{beklemeSure>3?"⚠ Gecikiyor":""}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* İşlem geçmişi */}
                  <div style={KCARD}>
                    <div style={KSEC}>İŞLEM GEÇMİŞİ</div>
                    {[...(kasa.dokumcuIslemler||[])].sort((a,b)=>b.tarih-a.tarih).map(x => {
                      const etiket = x.tip==="gonder" ? (x.teslimTarih ? "✓ Döküm Teslim Alındı" : "→ Döküm Gönderildi") : x.tip==="baslangic_borc" ? "Başlangıç Borcu" : "✓ Ödeme Yapıldı";
                      const renk   = x.tip==="ode" ? "#6abf69" : x.tip==="baslangic_borc" ? "#a78bfa" : "#e8833a";
                      const isaretli = x.teslimTarih ? "rgba(106,191,105,0.04)" : undefined;
                      return (
                        <div key={x.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", background:isaretli }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:renk, flexShrink:0 }}/>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:renk }}>{etiket}</div>
                            {x.musteri && <div style={{ fontSize:8, color:"#998a6e" }}>{x.musteri}</div>}
                            {x.aciklama && <div style={{ fontSize:7, color:"#665d4a" }}>{x.aciklama}</div>}
                            <div style={{ fontSize:7, color:"#665d4a" }}>{new Date(x.tarih).toLocaleDateString("tr-TR")}</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontSize:10, fontWeight:800, color:renk }}>{x.tip==="ode"?"+":"-"}{fN(x.has,3)} has</span>
                            <button onClick={()=>{ const yeni={...kasa,dokumcuIslemler:(kasa.dokumcuIslemler||[]).filter(d=>d.id!==x.id)}; svKasa(yeni); }} style={{ ...RD, fontSize:8, padding:"2px 5px" }}>Sil</button>
                          </div>
                        </div>
                      );
                    })}
                    {!(kasa.dokumcuIslemler||[]).length && <div style={{ fontSize:9, color:"#665d4a", textAlign:"center", padding:"20px" }}>Henüz işlem yok — siparişler döküme geçince otomatik oluşur</div>}
                  </div>
                </div>
                );
              })()}

              {/* ══ STOK ══ */}
              {kasaSayfa==="stok" && (
                <div>
                  <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
                    <button onClick={()=>kasaModalAc({tip:"hamAltin"})} style={{ ...BG, padding:"6px 14px", fontSize:10 }}>+ Ham Altın Girişi</button>
                    <button onClick={()=>kasaModalAc({tip:"hazirUrun"})} style={{ ...GH, padding:"6px 14px", fontSize:10 }}>+ Hazır Ürün</button>
                    <button onClick={()=>kasaModalAc({tip:"serbest"})} style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.25)", borderRadius:9, padding:"6px 14px", color:"#a78bfa", fontSize:10, fontWeight:700, cursor:"pointer" }}>+ Serbest Malzeme</button>
                  </div>

                  {/* Ham Altın */}
                  <div style={KCARD}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <div style={KSEC}>🪙 HAM ALTIN STOĞU</div>
                      <div style={{ fontSize:13, fontWeight:800, color:GOLD }}>{fN(hamAltinGram,3)} has</div>
                    </div>
                    {[...(kasa.hamAltin||[])].sort((a,b)=>b.tarih-a.tarih).slice(0,8).map(x => (
                      <div key={x.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:x.tip==="giris"?"#6abf69":"#e85a4f", flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <span style={{ fontSize:9, color:"var(--goldtext)" }}>{x.aciklama||"—"}</span>
                          <div style={{ fontSize:7, color:"#665d4a" }}>{new Date(x.tarih).toLocaleDateString("tr-TR")}</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:9, fontWeight:800, color:x.tip==="giris"?"#6abf69":"#e85a4f" }}>{x.tip==="giris"?"+":"-"}{fN(x.has,3)} has</span>
                          <button onClick={()=>{ const yeni={...kasa,hamAltin:(kasa.hamAltin||[]).filter(d=>d.id!==x.id)}; svKasa(yeni); }} style={{ ...RD, fontSize:8, padding:"2px 5px" }}>Sil</button>
                        </div>
                      </div>
                    ))}
                    {!(kasa.hamAltin||[]).length && <div style={{ fontSize:9, color:"#665d4a" }}>Henüz giriş yok</div>}
                  </div>

                  {/* Hazır Ürün */}
                  {(kasa.hazirUrun||[]).length > 0 && (
                    <div style={KCARD}>
                      <div style={KSEC}>💍 HAZIR ÜRÜN STOĞU</div>
                      {(kasa.hazirUrun||[]).map(x => {
                        const m = modeller.find(mo=>mo.id===x.modelId);
                        const hc = m ? hesapla(m, m.secilenAyar||m.refAyar, altinKgUSD, parseFloat(mc)||0.030) : null;
                        return (
                          <div key={x.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                            {m?.foto && <img src={m.foto} style={{ width:32, height:32, objectFit:"cover", borderRadius:5 }} alt=""/>}
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:9, fontWeight:700, color:"var(--goldtext)" }}>{x.ad}</div>
                              {x.aciklama && <div style={{ fontSize:7, color:"#665d4a" }}>{x.aciklama}</div>}
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:10, fontWeight:800, color:GOLD }}>{x.adet} adet</div>
                              {hc && <div style={{ fontSize:8, color:"#665d4a" }}>{fN(hc.mamulGram*x.adet,2)} has</div>}
                            </div>
                            <button onClick={()=>{ const yeni={...kasa,hazirUrun:(kasa.hazirUrun||[]).filter(d=>d.id!==x.id)}; svKasa(yeni); }} style={{ ...RD, fontSize:8, padding:"2px 5px" }}>Sil</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Serbest Malzeme */}
                  {(kasa.serbest||[]).length > 0 && (
                    <div style={KCARD}>
                      <div style={KSEC}>📦 SERBEST MALZEME</div>
                      {(kasa.serbest||[]).map(x => (
                        <div key={x.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:"var(--goldtext)" }}>{x.ad}</div>
                            {x.aciklama && <div style={{ fontSize:7, color:"#665d4a" }}>{x.aciklama}</div>}
                          </div>
                          <div style={{ textAlign:"right", marginRight:8 }}>
                            <div style={{ fontSize:9, color:GOLD }}>{x.adet||1} adet · {fN((x.gram||0)*(x.adet||1),3)} gr</div>
                          </div>
                          <button onClick={()=>{ const yeni={...kasa,serbest:(kasa.serbest||[]).filter(d=>d.id!==x.id)}; svKasa(yeni); }} style={{ ...RD, fontSize:8, padding:"2px 5px" }}>Sil</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ══ MUHASEBE ══ */}
              {kasaSayfa==="muhasebe" && (
                <div>
                  <div style={{ background:"rgba(91,155,213,0.03)", border:"1px solid rgba(91,155,213,0.1)", borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#5b9bd5" }}>📊 RHİNO ERP MİZAN</div>
                      {rhinoMizan && <button onClick={()=>setRhinoMizan(null)} style={{ ...RD, fontSize:8, padding:"2px 8px" }}>Temizle</button>}
                    </div>
                    {!rhinoMizan ? (
                      <div>
                        <div style={{ fontSize:9, color:"#665d4a", marginBottom:8 }}>Excel mizan dosyasını yükleyin — müşteri bakiyeleri, dökümcü ve satıcı borçları otomatik okunur. Asistan sekmesinde ajan da bu veriyi kullanır.</div>
                        <label style={{ display:"inline-block", background:"rgba(91,155,213,0.1)", border:"1px solid rgba(91,155,213,0.25)", borderRadius:8, padding:"6px 14px", color:"#5b9bd5", fontSize:10, fontWeight:700, cursor:"pointer" }}>
                          📂 Mizan Yükle (.xlsx)
                          <input type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={async e => {
                            const file = e.target.files[0];
                            if (!file) return;
                            try {
                              const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
                              const buf = await file.arrayBuffer();
                              const wb = XLSX.read(buf, { type:"array" });
                              const ws = wb.Sheets[wb.SheetNames[0]];
                              const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });
                              const musteriHas=[], dokumcuHas=[], saticiUsd=[], saticiEur=[];
                              rows.forEach(row => {
                                const kod = String(row[0]||"").trim();
                                const ad  = String(row[1]||"").trim().replace(/^'+/, "");
                                const dvz = String(row[2]||"").trim();
                                const bakBor = parseFloat(String(row[5]||"0").replace(",",".")) || 0;
                                const bakAla = parseFloat(String(row[6]||"0").replace(",",".")) || 0;
                                const bakiye = bakBor > 0 ? bakBor : -bakAla;
                                const kodPrefix120 = "120 001 10" + String.fromCharCode(92);
                                const kodPrefix32010 = "320 001 10" + String.fromCharCode(92);
                                const kodPrefix32002 = "320 001 02" + String.fromCharCode(92);
                                const kodPrefix32003 = "320 001 03" + String.fromCharCode(92);
                                if (kod.startsWith(kodPrefix120) && dvz==="HAS" && ad) musteriHas.push({ ad, bakiye });
                                if (kod.startsWith(kodPrefix32010) && dvz==="HAS" && ad) dokumcuHas.push({ ad, bakiye });
                                if (kod.startsWith(kodPrefix32002) && dvz==="USD" && ad) saticiUsd.push({ ad, bakiye });
                                if (kod.startsWith(kodPrefix32003) && dvz==="EUR" && ad) saticiEur.push({ ad, bakiye });
                              });
                              setRhinoMizan({ musteriHas, dokumcuHas, saticiUsd, saticiEur, tarih:new Date().toLocaleDateString("tr-TR"), dosyaAd:file.name });
                            } catch(err) { alert("Dosya okunamadı: "+err.message); }
                            e.target.value="";
                          }}/>
                        </label>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize:8, color:"#665d4a", marginBottom:12 }}>{rhinoMizan.dosyaAd} · {rhinoMizan.tarih} · Asistan sekmesinde ajan bu veriyi kullanıyor</div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                          {/* Müşteri HAS */}
                          <div style={KCARD}>
                            <div style={{ fontSize:9, fontWeight:700, color:"#6abf69", marginBottom:8 }}>👤 MÜŞTERİ ALACAKLAR (HAS)</div>
                            {rhinoMizan.musteriHas.filter(x=>Math.abs(x.bakiye)>0.001).sort((a,b)=>b.bakiye-a.bakiye).map((x,i)=>(
                              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:9 }}>
                                <span style={{ color:"var(--goldtext)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 }}>{x.ad}</span>
                                <span style={{ fontWeight:700, color:x.bakiye>0?"#6abf69":"#e85a4f", flexShrink:0, marginLeft:6 }}>{fN(x.bakiye,3)} has</span>
                              </div>
                            ))}
                            {rhinoMizan.musteriHas.filter(x=>Math.abs(x.bakiye)>0.001).length===0 && <div style={{ fontSize:8, color:"#665d4a" }}>Açık bakiye yok</div>}
                            <div style={{ borderTop:"1px solid rgba(201,168,76,0.1)", paddingTop:6, marginTop:6, display:"flex", justifyContent:"space-between" }}>
                              <span style={{ fontSize:8, color:"#8a7d64" }}>TOPLAM</span>
                              <span style={{ fontSize:10, fontWeight:800, color:"#6abf69" }}>{fN(rhinoMizan.musteriHas.reduce((s,x)=>s+x.bakiye,0),3)} has</span>
                            </div>
                          </div>
                          {/* Müşteri Eşleştirme */}
                          <div style={{ ...KCARD, gridColumn:"1 / -1" }}>
                            <div style={{ fontSize:9, fontWeight:700, color:GOLD, marginBottom:10 }}>🔗 MÜŞTERİ EŞLEŞTİRME — Mizan ↔ Sistem</div>
                            <div style={{ fontSize:8, color:"#665d4a", marginBottom:10 }}>Mizan'daki müşteri adlarını sisteminizdeki müşterilerle eşleştirin. Eşleştirme kaydedilir, bir dahaki yüklemede otomatik uygulanır.</div>
                            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                              {rhinoMizan.musteriHas.filter(x=>Math.abs(x.bakiye)>0.001).map((x,i) => {
                                // Otomatik eşleştirme — normalize karşılaştırma
                                const norm = s => s.toLowerCase().replace(/[^a-z0-9ğüşıöçâîû]/gi,"").trim();
                                const sistemAdlari = Object.keys(musteriler);
                                const otomatik = sistemAdlari.find(s => norm(s) === norm(x.ad));
                                const secili = mizanEslestirme[x.ad] || otomatik || "";
                                const eslesti = !!secili;
                                return (
                                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 8px", background:eslesti?"rgba(106,191,105,0.04)":"rgba(232,90,79,0.04)", border:"1px solid", borderColor:eslesti?"rgba(106,191,105,0.1)":"rgba(232,90,79,0.1)", borderRadius:7 }}>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ fontSize:9, fontWeight:700, color:"var(--goldtext)" }}>{x.ad}</div>
                                      <div style={{ fontSize:8, color:x.bakiye>0?"#6abf69":"#e85a4f" }}>{fN(x.bakiye,3)} has</div>
                                    </div>
                                    <div style={{ fontSize:12, color:eslesti?"#6abf69":"#e85a4f" }}>{eslesti?"↔":"?"}</div>
                                    <select value={secili} onChange={e => {
                                      const yeni = { ...mizanEslestirme, [x.ad]: e.target.value };
                                      setMizanEslestirme(yeni);
                                      try { localStorage.setItem("mizan_eslestirme", JSON.stringify(yeni)); } catch {}
                                    }} style={{ ...IS, width:150, padding:"3px 6px", fontSize:9 }}>
                                      <option value="">— Eşleştir —</option>
                                      {Object.keys(musteriler).sort().map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    {secili && secili !== otomatik && (
                                      <button onClick={()=>{
                                        const yeni = { ...mizanEslestirme };
                                        delete yeni[x.ad];
                                        setMizanEslestirme(yeni);
                                        try { localStorage.setItem("mizan_eslestirme", JSON.stringify(yeni)); } catch {}
                                      }} style={{ ...RD, fontSize:8, padding:"2px 6px" }}>↺</button>
                                    )}
                                    {otomatik && !mizanEslestirme[x.ad] && (
                                      <span style={{ fontSize:7, color:"#6abf69", background:"rgba(106,191,105,0.1)", padding:"1px 5px", borderRadius:4 }}>otomatik</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ marginTop:10, fontSize:8, color:"#665d4a" }}>
                              {rhinoMizan.musteriHas.filter(x=>Math.abs(x.bakiye)>0.001).filter(x=>{
                                const norm = s => s.toLowerCase().replace(/[^a-z0-9ğüşıöçâîû]/gi,"").trim();
                                return !mizanEslestirme[x.ad] && !Object.keys(musteriler).find(s=>norm(s)===norm(x.ad));
                              }).length} müşteri eşleştirilmedi
                            </div>
                          </div>
                          {/* Satıcı/Dökümcü HAS */}
                          <div style={KCARD}>
                            <div style={{ fontSize:9, fontWeight:700, color:"#e8833a", marginBottom:8 }}>🏭 SATICI / DÖKÜMCÜ (HAS)</div>
                            {rhinoMizan.dokumcuHas.filter(x=>Math.abs(x.bakiye)>0.001).sort((a,b)=>a.bakiye-b.bakiye).map((x,i)=>(
                              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:9 }}>
                                <span style={{ color:"var(--goldtext)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 }}>{x.ad}</span>
                                <span style={{ fontWeight:700, color:x.bakiye<0?"#e85a4f":x.bakiye>0?"#6abf69":"#665d4a", flexShrink:0, marginLeft:6 }}>{fN(x.bakiye,3)} has</span>
                              </div>
                            ))}
                            {rhinoMizan.dokumcuHas.filter(x=>Math.abs(x.bakiye)>0.001).length===0 && <div style={{ fontSize:8, color:"#665d4a" }}>Açık bakiye yok</div>}
                            <div style={{ borderTop:"1px solid rgba(201,168,76,0.1)", paddingTop:6, marginTop:6, display:"flex", justifyContent:"space-between" }}>
                              <span style={{ fontSize:8, color:"#8a7d64" }}>TOPLAM BORÇ</span>
                              <span style={{ fontSize:10, fontWeight:800, color:"#e85a4f" }}>{fN(Math.abs(rhinoMizan.dokumcuHas.filter(x=>x.bakiye<0).reduce((s,x)=>s+x.bakiye,0)),3)} has</span>
                            </div>
                          </div>
                          {/* Satıcı USD */}
                          <div style={KCARD}>
                            <div style={{ fontSize:9, fontWeight:700, color:"#a78bfa", marginBottom:8 }}>💵 SATICI BORÇLAR (USD)</div>
                            {rhinoMizan.saticiUsd.filter(x=>Math.abs(x.bakiye)>0.001).sort((a,b)=>a.bakiye-b.bakiye).map((x,i)=>(
                              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:9 }}>
                                <span style={{ color:"var(--goldtext)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 }}>{x.ad}</span>
                                <span style={{ fontWeight:700, color:x.bakiye<0?"#e85a4f":x.bakiye>0?"#6abf69":"#665d4a", flexShrink:0, marginLeft:6 }}>${fN(Math.abs(x.bakiye),2)}</span>
                              </div>
                            ))}
                            {rhinoMizan.saticiUsd.filter(x=>Math.abs(x.bakiye)>0.001).length===0 && <div style={{ fontSize:8, color:"#665d4a" }}>Açık bakiye yok</div>}
                            <div style={{ borderTop:"1px solid rgba(201,168,76,0.1)", paddingTop:6, marginTop:6, display:"flex", justifyContent:"space-between" }}>
                              <span style={{ fontSize:8, color:"#8a7d64" }}>TOPLAM BORÇ</span>
                              <span style={{ fontSize:10, fontWeight:800, color:"#e85a4f" }}>${fN(Math.abs(rhinoMizan.saticiUsd.filter(x=>x.bakiye<0).reduce((s,x)=>s+x.bakiye,0)),2)}</span>
                            </div>
                          </div>
                          {/* Satıcı EUR */}
                          {rhinoMizan.saticiEur.filter(x=>Math.abs(x.bakiye)>0.001).length>0 && (
                            <div style={KCARD}>
                              <div style={{ fontSize:9, fontWeight:700, color:"#5b9bd5", marginBottom:8 }}>💶 SATICI BORÇLAR (EUR)</div>
                              {rhinoMizan.saticiEur.filter(x=>Math.abs(x.bakiye)>0.001).sort((a,b)=>a.bakiye-b.bakiye).map((x,i)=>(
                                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:9 }}>
                                  <span style={{ color:"var(--goldtext)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 }}>{x.ad}</span>
                                  <span style={{ fontWeight:700, color:x.bakiye<0?"#e85a4f":x.bakiye>0?"#6abf69":"#665d4a", flexShrink:0, marginLeft:6 }}>€{fN(Math.abs(x.bakiye),2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══ BİLANÇO ══ */}
              {kasaSayfa==="bilanco" && (() => {
                // AKTİF
                const topAktif = hamAltinGram + uretimAltin + uretimTas + satilmamisAltin + satilmamisTas + iadeTas + hurdaAltin + hurdaTas + hazirUrunGram + serbestGram;
                const topAlacak = Object.values(musBakiye).reduce((s,d)=>s+Math.max(0,d.borc-d.odenen),0);
                const topAktifToplam = topAktif + topAlacak;
                // PASİF
                const topPasif = dokumBorc;
                // ÖZ SERMAYE
                const ozSermaye = topAktifToplam - topPasif;

                const BLK = { background:"rgba(0,0,0,0.15)", borderRadius:7, padding:"5px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 };
                const BLV = (v, renk) => (
                  <span style={{ fontSize:11, fontWeight:800, color:renk||GOLD }}>
                    {fN(v,3)} <span style={{ fontSize:8, fontWeight:400 }}>has</span>
                    {hasGramUSD>0 && <span style={{ fontSize:8, color:"#665d4a", marginLeft:4 }}>≈{fUSD(v*hasGramUSD)}</span>}
                  </span>
                );

                return (
                  <div>
                    <div style={{ fontSize:9, color:"#665d4a", marginBottom:12 }}>
                      {new Date().toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"})} tarihi itibarıyla
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>

                      {/* AKTİF */}
                      <div style={{ background:"rgba(201,168,76,0.02)", border:"1px solid rgba(201,168,76,0.1)", borderRadius:12, padding:"12px 14px" }}>
                        <div style={{ fontSize:10, fontWeight:800, color:GOLD, marginBottom:10, letterSpacing:".04em" }}>AKTİF — Varlıklar</div>

                        <div style={{ fontSize:8, color:"#8a7d64", fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>Stok & Üretim</div>
                        {[
                          { l:"Ham Altın Stoğu",           v:hamAltinGram,      c:GOLD },
                          { l:"Üretimdeki Altın",          v:uretimAltin,       c:"#5b9bd5" },
                          { l:"Üretimdeki Taş",            v:uretimTas,         c:"#a78bfa" },
                          { l:"Satılmamış Mamul — Altın",  v:satilmamisAltin,   c:"#6abf69" },
                          { l:"Satılmamış Mamul — Taş",    v:satilmamisTas,     c:"#7c6abf" },
                          { l:"İade Taşları",              v:iadeTas,           c:"#c27ba0" },
                          { l:"Hurda Altın",               v:hurdaAltin,        c:"#e8833a" },
                          { l:"Hurda Taş",                 v:hurdaTas,          c:"#b86a3a" },
                          { l:"Hazır Ürün Stoğu",          v:hazirUrunGram,     c:GOLD },
                          { l:"Serbest Malzeme",           v:serbestGram,       c:"#e8dcc8" },
                        ].filter(x=>x.v>0).map((x,i) => (
                          <div key={i} style={BLK}>
                            <span style={{ fontSize:9, color:"#998a6e" }}>{x.l}</span>
                            {BLV(x.v, x.c)}
                          </div>
                        ))}

                        <div style={{ height:1, background:"rgba(201,168,76,0.1)", margin:"8px 0" }}/>
                        <div style={{ fontSize:8, color:"#8a7d64", fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>Alacaklar</div>
                        {Object.entries(musBakiye).filter(([,d])=>d.borc-d.odenen>0).map(([mus,d]) => (
                          <div key={mus} style={BLK}>
                            <span style={{ fontSize:9, color:"#998a6e" }}>{mus}</span>
                            {BLV(d.borc-d.odenen, "#5b9bd5")}
                          </div>
                        ))}
                        {topAlacak===0 && <div style={{ fontSize:8, color:"#665d4a" }}>Açık alacak yok</div>}

                        <div style={{ height:2, background:"rgba(201,168,76,0.2)", margin:"10px 0" }}/>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ fontSize:10, fontWeight:800, color:GOLD }}>TOPLAM AKTİF</span>
                          {BLV(topAktifToplam, GOLD)}
                        </div>
                      </div>

                      {/* PASİF + ÖZ SERMAYE */}
                      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                        {/* Pasif */}
                        <div style={{ background:"rgba(232,90,79,0.02)", border:"1px solid rgba(232,90,79,0.1)", borderRadius:12, padding:"12px 14px" }}>
                          <div style={{ fontSize:10, fontWeight:800, color:"#e85a4f", marginBottom:10, letterSpacing:".04em" }}>PASİF — Borçlar</div>
                          <div style={BLK}>
                            <span style={{ fontSize:9, color:"#998a6e" }}>Dökümcü Borcu</span>
                            {BLV(dokumBorc, "#e85a4f")}
                          </div>
                          <div style={{ height:2, background:"rgba(232,90,79,0.15)", margin:"10px 0" }}/>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ fontSize:10, fontWeight:800, color:"#e85a4f" }}>TOPLAM PASİF</span>
                            {BLV(topPasif, "#e85a4f")}
                          </div>
                        </div>

                        {/* Öz Sermaye */}
                        <div style={{ background:"rgba(106,191,105,0.03)", border:"2px solid rgba(106,191,105,0.2)", borderRadius:12, padding:"12px 14px", flex:1 }}>
                          <div style={{ fontSize:10, fontWeight:800, color:"#6abf69", marginBottom:10, letterSpacing:".04em" }}>ÖZ SERMAYE</div>
                          <div style={{ fontSize:8, color:"#665d4a", marginBottom:8 }}>Aktif − Pasif</div>
                          <div style={{ fontSize:20, fontWeight:800, color:ozSermaye>=0?"#6abf69":"#e85a4f" }}>
                            {fN(ozSermaye,3)} has
                          </div>
                          {hasGramUSD>0 && (
                            <div style={{ fontSize:12, fontWeight:700, color:ozSermaye>=0?"#4a9a4a":"#c0392b", marginTop:4 }}>
                              {fUSD(ozSermaye*hasGramUSD)}
                            </div>
                          )}
                        </div>

                        {/* Denklik kontrol */}
                        <div style={{ background:"rgba(0,0,0,0.15)", borderRadius:8, padding:"8px 12px", textAlign:"center" }}>
                          <div style={{ fontSize:7, color:"#665d4a", marginBottom:3 }}>AKTİF = PASİF + ÖZ SERMAYE</div>
                          <div style={{ fontSize:9, fontWeight:700, color:Math.abs(topAktifToplam-(topPasif+ozSermaye))<0.001?"#6abf69":"#e85a4f" }}>
                            {Math.abs(topAktifToplam-(topPasif+ozSermaye))<0.001 ? "✓ Bilanço dengeli" : "⚠ Fark var"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Kilit butonu */}
                    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                      <button onClick={()=>setKasaKilitli(true)} style={{ ...RD, fontSize:9, padding:"5px 12px" }}>🔒 Kasayı Kilitle</button>
                    </div>
                  </div>
                );
              })()}

              {/* ══ MODALLAR ══ */}
              {kasaModal && (() => {
                const kapat = () => setKasaModal(null);
                const tip = kasaModal.tip;
                let baslik = "";
                if (tip==="musOde")       baslik = "Müşteri Ödemesi Al";
                if (tip==="musBaklangic") baslik = "Başlangıç Bakiyesi Gir";
                if (tip==="dokumOde")     baslik = "Dökümcüye Ödeme Yap";
                if (tip==="dokumBorcGir") baslik = "Mevcut Borç Girişi";
                if (tip==="hamAltin")     baslik = "Ham Altın Girişi";
                if (tip==="hazirUrun")    baslik = "Hazır Ürün Ekle";
                if (tip==="serbest")      baslik = "Serbest Malzeme Ekle";
                const kaydet = () => {
                  if (!kfHas && !["hazirUrun","serbest"].includes(tip)) return;
                  const yeni = { ...kasa };
                  if (tip==="musOde"||tip==="musBaklangic") {
                    if (!kfMus) return;
                    yeni.musteriOdemeler = { ...yeni.musteriOdemeler };
                    if (!yeni.musteriOdemeler[kfMus]) yeni.musteriOdemeler[kfMus] = [];
                    const kayitTip = tip==="musBaklangic" ? "baslangic_bakiye" : "ode";
                    yeni.musteriOdemeler[kfMus] = [...yeni.musteriOdemeler[kfMus], { id:Date.now()+"", tarih:new Date(kfTarih).getTime(), has:parseFloat(kfHas)||0, aciklama:kfAc, tip:kayitTip }];
                  } else if (tip==="dokumOde"||tip==="dokumBorcGir") {
                    yeni.dokumcuIslemler = [...(yeni.dokumcuIslemler||[]), { id:Date.now()+"", tarih:new Date(kfTarih).getTime(), tip:tip==="dokumBorcGir"?"baslangic_borc":"ode", has:parseFloat(kfHas)||0, aciklama:kfAc }];
                  } else if (tip==="hamAltin") {
                    yeni.hamAltin = [...(yeni.hamAltin||[]), { id:Date.now()+"", tarih:new Date(kfTarih).getTime(), tip:kfTip, has:parseFloat(kfHas)||0, aciklama:kfAc }];
                  } else if (tip==="hazirUrun") {
                    if (!kfMod) return;
                    const m = modeller.find(x=>x.id===kfMod);
                    yeni.hazirUrun = [...(yeni.hazirUrun||[]), { id:Date.now()+"", modelId:kfMod, ad:m?.ad||"?", adet:parseInt(kfAdet)||1, aciklama:kfAc, tarih:Date.now() }];
                  } else if (tip==="serbest") {
                    if (!kfAd) return;
                    yeni.serbest = [...(yeni.serbest||[]), { id:Date.now()+"", ad:kfAd, gram:parseFloat(kfGram)||0, adet:parseInt(kfAdet)||1, aciklama:kfAc, tarih:Date.now() }];
                  }
                  svKasa(yeni); kapat();
                };

                return (
                  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={kapat}>
                    <div style={{ background:"#1a1710", border:"1px solid rgba(201,168,76,0.2)", borderRadius:16, padding:"20px 24px", width:340, maxWidth:"95vw" }} onClick={e=>e.stopPropagation()}>
                      <div style={{ fontSize:13, fontWeight:700, color:GOLD, marginBottom:14 }}>{baslik}</div>

                      {/* Müşteri seç */}
                      {tip==="musOde" && (
                        <select value={kfMus} onChange={e=>setKfMus(e.target.value)} style={{ ...KIN, width:"100%" }}>
                          <option value="">Müşteri seç...</option>
                          {[...new Set([...Object.keys(musBakiye), ...Object.keys(musteriler)])].sort().map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      )}

                      {/* Tarih (hepsinde var) */}
                      {!["hazirUrun","serbest"].includes(tip) && (
                        <input type="date" value={kfTarih} onChange={e=>setKfTarih(e.target.value)} style={{ ...KIN, width:"100%" }}/>
                      )}

                      {/* Giriş/Çıkış seçimi (sadece ham altın) */}
                      {tip==="hamAltin" && (
                        <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                          {["giris","cikis"].map(t => (
                            <button key={t} onClick={()=>setKfTip(t)} style={{ flex:1, padding:"5px", background:kfTip===t?"rgba(201,168,76,0.2)":"rgba(255,255,255,0.04)", border:"1px solid", borderColor:kfTip===t?GOLD:"rgba(255,255,255,0.08)", borderRadius:7, color:kfTip===t?GOLD:"#998a6e", fontSize:9, fontWeight:700, cursor:"pointer" }}>
                              {t==="giris"?"Giriş":"Çıkış"}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Model seç (hazır ürün) */}
                      {tip==="hazirUrun" && (
                        <select value={kfMod} onChange={e=>setKfMod(e.target.value)} style={{ ...KIN, width:"100%" }}>
                          <option value="">Model seç...</option>
                          {modeller.map(m => <option key={m.id} value={m.id}>{m.kod||m.ad}</option>)}
                        </select>
                      )}

                      {/* Malzeme adı (serbest) */}
                      {tip==="serbest" && (
                        <input placeholder="Malzeme adı (örn: Round 0.05ct taş)" value={kfAd} onChange={e=>setKfAd(e.target.value)} style={{ ...KIN, width:"100%" }}/>
                      )}

                      {/* Has gram (ödeme + döküm + ham altın) */}
                      {!["hazirUrun","serbest"].includes(tip) && (
                        <input type="number" placeholder="Has gram (örn: 2.500)" value={kfHas} onChange={e=>setKfHas(e.target.value)} style={{ ...KIN, width:"100%" }} step="0.001"/>
                      )}

                      {/* Gram (serbest malzeme) */}
                      {tip==="serbest" && (
                        <input type="number" placeholder="Birim gram (has)" value={kfGram} onChange={e=>setKfGram(e.target.value)} style={{ ...KIN, width:"100%" }} step="0.001"/>
                      )}

                      {/* Adet (hazır ürün + serbest) */}
                      {["hazirUrun","serbest"].includes(tip) && (
                        <input type="number" placeholder="Adet" value={kfAdet} onChange={e=>setKfAdet(e.target.value)} style={{ ...KIN, width:"100%" }} min="1"/>
                      )}

                      {/* Açıklama (hepsinde) */}
                      <input placeholder="Açıklama (opsiyonel)" value={kfAc} onChange={e=>setKfAc(e.target.value)} style={{ ...KIN, width:"100%" }}/>

                      <div style={{ display:"flex", gap:6, marginTop:8 }}>
                        <button onClick={kaydet} style={{ ...BG, flex:1, padding:"7px" }}>Kaydet</button>
                        <button onClick={kapat} style={{ ...RD, flex:1, padding:"7px" }}>İptal</button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}


        {/* ANALİZ */}
        {sayfa==="analiz" && (
          <div style={{ animation:"fadein .3s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:6 }}>
              <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:T.text }}>Kesfet</h2>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {[{id:"bu_ay",l:"Bu Ay"},{id:"gecen_ay",l:"Geçen Ay"},{id:"3ay",l:"3 Ay"},{id:"yil",l:"Bu Yıl"}].map(d => (
                  <button key={d.id} onClick={()=>setAnalizDonem(d.id)} style={{ background:analizDonem===d.id?"rgba(201,168,76,0.18)":"rgba(201,168,76,0.04)", border:"1px solid", borderColor:analizDonem===d.id?"rgba(201,168,76,0.4)":"rgba(201,168,76,0.1)", borderRadius:6, padding:"4px 10px", color:analizDonem===d.id?GOLD:"#7a6f5a", fontSize:9, fontWeight:analizDonem===d.id?700:400, cursor:"pointer" }}>{d.l}</button>
                ))}
                <button onClick={()=>downloadPDF(buildSatisRaporuHTML(modeller,siparisler),"satis-raporu")} style={{ ...GH, fontSize:9, padding:"5px 10px" }}>PDF Rapor</button>
              </div>
            </div>

            {/* ── 4 ANA METRİK ── */}
            {(() => {
              // Aktif siparişler (tamam/teslim/hurda dışı)
              const aktifSip = siparisler.filter(s => {
                const son = (s.durumGecmisi||[]).slice(-1)[0];
                return son && !["tamam","teslim","hurda"].includes(son.durum);
              });
              // Başlamamış (durumGecmisi yok veya ilk durum)
              const baslamamisSip = siparisler.filter(s => !s.durumGecmisi?.length);
              // Aktif gram
              let aktifGram = 0;
              aktifSip.forEach(s => (s.kalemler||[]).forEach(k => {
                const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD||altinKgUSD, s.mc||madenCarpan);
                aktifGram += hc.mamulGram * (k.adet||1);
              }));
              // Tamamlanan (dönem)
              const tamGram = Object.values(analiz.aylikKar).reduce((s,d)=>s+d.gram,0);

              return (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
                  {[
                    { lbl:"Aktif Üretim", val:aktifSip.length+" sipariş", sub:fN(aktifGram,1)+" gr üretimde", c:"#5b9bd5", bc:"rgba(91,155,213,0.3)", nav:"aktif" },
                    { lbl:"Dönemde Tamamlanan", val:analiz.siparisSayisi+" sipariş", sub:fN(tamGram,1)+" gr · "+fN(analiz.tKar,2)+" has kâr", c:"#6abf69", bc:"rgba(106,191,105,0.3)" },
                    { lbl:"Üretime Girmemiş", val:baslamamisSip.length+" sipariş", sub:"işleme alınmayı bekliyor", c:"#e8833a", bc:"rgba(232,131,58,0.3)", nav:"baslanmadi" },
                    { lbl:"Toplam Aktif Gram", val:fN(aktifGram,1)+" gr", sub:altinKgUSD>0?"≈"+fUSD(aktifGram*(altinKgUSD/1000))+" altın değeri":"Fiyat girilmedi", c:GOLD, bc:"rgba(201,168,76,0.3)" },
                  ].map((k,i) => (
                    <div key={i} onClick={()=>{ if(k.nav){setSayfa("siparisler");setSipFiltre(k.nav);} }} style={{ background:"rgba(0,0,0,0.15)", border:"1px solid rgba(255,255,255,0.06)", borderLeft:"3px solid "+k.bc, borderRadius:10, padding:"12px 14px", cursor:k.nav?"pointer":"default" }}>
                      <div style={{ fontSize:8, color:"#8a7d64", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{k.lbl}</div>
                      <div style={{ fontSize:18, fontWeight:800, color:k.c, lineHeight:1, marginBottom:4 }}>{k.val}</div>
                      <div style={{ fontSize:9, color:"#665d4a" }}>{k.sub}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* ── ORTA: AŞAMA DAĞILIMI + GECİKENLER ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              {/* Aşama dağılımı */}
              {(() => {
                const aktifSip = siparisler.filter(s => {
                  const son = (s.durumGecmisi||[]).slice(-1)[0];
                  return son && !["tamam","teslim","hurda"].includes(son.durum);
                });
                const durumSayilari = {};
                aktifSip.forEach(s => {
                  const son = (s.durumGecmisi||[]).slice(-1)[0];
                  if (son) durumSayilari[son.durum] = (durumSayilari[son.durum]||0) + 1;
                });
                const maxSayi = Math.max(...Object.values(durumSayilari), 1);
                return (
                  <div style={{ background:"rgba(201,168,76,0.02)", border:"1px solid rgba(201,168,76,0.08)", borderRadius:12, padding:"12px 16px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:GOLD, marginBottom:12 }}>Aktif Siparişler — Aşama Dağılımı</div>
                    {DURUMLAR.filter(d=>d.id!=="hurda").map(d => {
                      const sayi = durumSayilari[d.id] || 0;
                      if (!sayi && !["baslanmadi","cizimde","dokum","tezgah","tamam"].includes(d.id)) return null;
                      return (
                        <div key={d.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <div style={{ width:8, height:8, borderRadius:4, background:d.c, flexShrink:0 }}/>
                          <span style={{ fontSize:10, color:"#998a6e", width:80, flexShrink:0 }}>{d.l}</span>
                          <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:(sayi/maxSayi*100)+"%", background:d.c, borderRadius:3, opacity:.85 }}/>
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, color:sayi>0?d.c:"#444", width:24, textAlign:"right" }}>{sayi}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Geciken siparişler */}
              <div style={{ background:"rgba(232,90,79,0.02)", border:"1px solid rgba(232,90,79,0.1)", borderRadius:12, padding:"12px 16px" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#e85a4f", marginBottom:12 }}>Dikkat — Geciken / Bekleyen</div>
                {analiz.takildi.length === 0 && (
                  <div style={{ fontSize:11, color:"#6abf69", padding:"8px 0" }}>✓ Tüm siparişler zamanında ilerliyor</div>
                )}
                {analiz.takildi.map((x,i) => {
                  const durObj = DURUMLAR.find(d=>d.id===x.durum)||DURUMLAR[0];
                  const gun = Math.round(x.bekleme/86400000);
                  return (
                    <div key={i} onClick={()=>{ setSayfa("siparisler"); setSipFiltre("geciken"); setAcikSiparisler(p=>({...p,[x.id]:true})); }} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"rgba(232,90,79,0.04)", borderRadius:8, border:"1px solid rgba(232,90,79,0.1)", marginBottom:6, cursor:"pointer" }}
                      onMouseOver={e=>e.currentTarget.style.background="rgba(232,90,79,0.1)"}
                      onMouseOut={e=>e.currentTarget.style.background="rgba(232,90,79,0.04)"}>
                      <div style={{ width:8, height:8, borderRadius:4, background:durObj.c, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"var(--goldtext)" }}>{x.musteri}</div>
                        <div style={{ fontSize:9, color:durObj.c }}>{durObj.l}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:11, fontWeight:800, color:gun>7?"#e85a4f":"#e8833a" }}>{gun} gün</div>
                        <div style={{ fontSize:8, color:"#5b9bd5" }}>→ Git</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── ALT: DÖKÜMCÜ + MÜŞTERİ ALACAK + HURDA/İADE ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>

              {/* Dökümcü */}
              {(() => {
                const dokumGiden  = (kasa.dokumcuIslemler||[]).filter(x=>x.tip==="gonder"||x.tip==="baslangic_borc").reduce((s,x)=>s+x.has,0);
                const dokumOdenen = (kasa.dokumcuIslemler||[]).filter(x=>x.tip==="ode").reduce((s,x)=>s+x.has,0);
                const dokumBorc   = dokumGiden - dokumOdenen;
                const dokumdaOlan = (kasa.dokumcuIslemler||[]).filter(x=>x.tip==="gonder"&&!x.teslimTarih);
                const dokumdaGram = siparisler.filter(s=>{
                  const son=(s.durumGecmisi||[]).slice(-1)[0];
                  return son?.durum==="dokum";
                }).reduce((acc,s)=>{
                  (s.kalemler||[]).forEach(k=>{
                    const hc=hesapla(k,k.secilenAyar||k.refAyar,s.altinKgUSD||altinKgUSD,s.mc||madenCarpan);
                    acc+=hc.mamulGram*(k.adet||1);
                  });
                  return acc;
                },0);
                return (
                  <div onClick={()=>{ setSayfa("kasa"); setKasaSayfa("dokumcu"); }} style={{ background:"rgba(232,131,58,0.02)", border:"1px solid rgba(232,131,58,0.1)", borderRadius:12, padding:"12px 16px", cursor:"pointer" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#e8833a", marginBottom:10 }}>Dökümcü <span style={{ fontSize:8, color:"#5b9bd5", marginLeft:4 }}>→ Git</span></div>
                    <div style={{ fontSize:20, fontWeight:800, color:"#e8833a", marginBottom:2 }}>{fN(dokumBorc,3)} has</div>
                    <div style={{ fontSize:9, color:"#665d4a", marginBottom:10 }}>{altinKgUSD>0?"≈"+fUSD(dokumBorc*(altinKgUSD/1000))+" bekleyen borç":""}</div>
                    <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:8 }}>
                      <div style={{ fontSize:9, color:"#998a6e" }}>Dökümde bekleyen: <span style={{ color:"var(--goldtext)", fontWeight:700 }}>{dokumdaOlan.length} sipariş · {fN(dokumdaGram,1)} gr</span></div>
                    </div>
                  </div>
                );
              })()}

              {/* Müşteri alacakları */}
              {(() => {
                const musBakiye = {};
                siparisler.forEach(s => {
                  const mus = s.musteri||"?";
                  if (!musBakiye[mus]) musBakiye[mus] = { borc:0, odenen:0 };
                  (s.kalemler||[]).forEach(k => {
                    const hc = hesapla(k,k.secilenAyar||k.refAyar,s.altinKgUSD||altinKgUSD,s.mc||madenCarpan);
                    const hurda=((s.kalemHurda)||{})[k.id]||0, iade=((s.kalemIade)||{})[k.id]||0, tamir=((s.kalemTamir)||{})[k.id]||0;
                    musBakiye[mus].borc += hc.karHas * Math.max(0,(k.adet||1)-hurda-iade-tamir);
                  });
                  ((kasa.musteriOdemeler||{})[mus]||[]).forEach(o => { musBakiye[mus].odenen += o.has||0; });
                });
                const sirali = Object.entries(musBakiye).filter(([,d])=>(d.borc-d.odenen)>0.001).sort((a,b)=>(b[1].borc-b[1].odenen)-(a[1].borc-a[1].odenen)).slice(0,4);
                const topBakiye = sirali.reduce((s,[,d])=>s+(d.borc-d.odenen),0);
                const maxB = sirali[0] ? sirali[0][1].borc - sirali[0][1].odenen : 1;
                return (
                  <div style={{ background:"rgba(201,168,76,0.02)", border:"1px solid rgba(201,168,76,0.08)", borderRadius:12, padding:"12px 16px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:GOLD, marginBottom:10 }}>Müşteri Alacakları</div>
                    {sirali.map(([mus,d],i) => {
                      const bakiye = d.borc-d.odenen;
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                          <span style={{ fontSize:10, color:"#998a6e", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{mus}</span>
                          <div style={{ width:60, height:4, background:"rgba(201,168,76,0.1)", borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:(bakiye/maxB*100)+"%", background:GOLD, borderRadius:2 }}/>
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, color:GOLD, width:52, textAlign:"right" }}>{fN(bakiye,2)} has</span>
                        </div>
                      );
                    })}
                    {sirali.length === 0 && <div style={{ fontSize:10, color:"#6abf69" }}>✓ Açık bakiye yok</div>}
                    {sirali.length > 0 && <div style={{ borderTop:"1px solid rgba(201,168,76,0.1)", paddingTop:6, marginTop:4, fontSize:9, color:"#665d4a" }}>Toplam: <span style={{ color:GOLD, fontWeight:700 }}>{fN(topBakiye,2)} has</span></div>}
                  </div>
                );
              })()}

              {/* Hurda / İade */}
              {(() => {
                let hurdaAdet = 0, iadeAdet = 0;
                const hurdaModeller = {}, iadeModeller = {};
                siparisler.forEach(s => {
                  (s.kalemler||[]).forEach(k => {
                    const h = ((s.kalemHurda)||{})[k.id]||0;
                    const ia = ((s.kalemIade)||{})[k.id]||0;
                    hurdaAdet += h;
                    iadeAdet += ia;
                    if (h>0) { if (!hurdaModeller[k.kod||k.id]) hurdaModeller[k.kod||k.id]=0; hurdaModeller[k.kod||k.id]+=h; }
                    if (ia>0) { if (!iadeModeller[k.kod||k.id]) iadeModeller[k.kod||k.id]=0; iadeModeller[k.kod||k.id]+=ia; }
                  });
                });
                const enCokHurda = Object.entries(hurdaModeller).sort((a,b)=>b[1]-a[1]).slice(0,2);
                const enCokIade  = Object.entries(iadeModeller).sort((a,b)=>b[1]-a[1]).slice(0,2);
                return (
                  <div onClick={()=>setSayfa("iadeler")} style={{ background:"rgba(232,90,79,0.02)", border:"1px solid rgba(232,90,79,0.08)", borderRadius:12, padding:"12px 16px", cursor:"pointer" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#e85a4f", marginBottom:10 }}>Hurda & İade <span style={{ fontSize:8, color:"#5b9bd5", marginLeft:4 }}>→ Git</span></div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                      <div style={{ textAlign:"center", padding:"8px", background:"rgba(232,90,79,0.06)", borderRadius:8, border:"1px solid rgba(232,90,79,0.15)" }}>
                        <div style={{ fontSize:22, fontWeight:800, color:"#e85a4f" }}>{hurdaAdet}</div>
                        <div style={{ fontSize:9, color:"#998a6e" }}>hurda</div>
                      </div>
                      <div style={{ textAlign:"center", padding:"8px", background:"rgba(167,139,250,0.06)", borderRadius:8, border:"1px solid rgba(167,139,250,0.15)" }}>
                        <div style={{ fontSize:22, fontWeight:800, color:"#a78bfa" }}>{iadeAdet}</div>
                        <div style={{ fontSize:9, color:"#998a6e" }}>iade</div>
                      </div>
                    </div>
                    {enCokHurda.length>0 && <div style={{ fontSize:9, color:"#998a6e", marginBottom:3 }}>En çok hurda: {enCokHurda.map(([k,v])=><span key={k} style={{ color:"#e85a4f", fontWeight:700 }}>{k} ×{v} </span>)}</div>}
                    {enCokIade.length>0  && <div style={{ fontSize:9, color:"#998a6e" }}>En çok iade: {enCokIade.map(([k,v])=><span key={k} style={{ color:"#a78bfa", fontWeight:700 }}>{k} ×{v} </span>)}</div>}
                    {hurdaAdet===0 && iadeAdet===0 && <div style={{ fontSize:10, color:"#6abf69" }}>✓ Bu dönemde kayıp yok</div>}
                  </div>
                );
              })()}
            </div>

            {/* ── DASHBOARD — ÜRETİM & KARLILIK ÖZETİ ── */}
            {(() => {
              const hasGramUSD = altinKgUSD>0 ? altinKgUSD/1000 : 0;
              // Tüm siparişlerden topla
              let toplamGram=0, satilanGram=0, bitenGram=0;
              let aktifAdet=0, dokumdeAdet=0, tamamAdet=0;
              let satilanKarHas=0, bekleyenKarHas=0;
              siparisler.forEach(s => {
                (s.kalemler||[]).forEach(k => {
                  const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD||altinKgUSD, s.mc||madenCarpan);
                  const dur = (s.kalemDurumlar||{})[k.id] || k.durum || "baslanmadi";
                  const hurda=((s.kalemHurda)||{})[k.id]||0, iade=((s.kalemIade)||{})[k.id]||0, tamir=((s.kalemTamir)||{})[k.id]||0;
                  const net = Math.max(0,(k.adet||1)-hurda-iade-tamir);
                  const gram = hc.mamulGram*net;
                  toplamGram += gram;
                  if (["tamam","teslim"].includes(dur)) { bitenGram += gram; tamamAdet += net; }
                  if (dur==="teslim") { satilanGram += gram; satilanKarHas += hc.karHas*net; }
                  else { bekleyenKarHas += hc.karHas*net; }
                  const son=(s.durumGecmisi||[]).slice(-1)[0];
                  if (son && !["tamam","teslim","hurda"].includes(son.durum)) aktifAdet += net;
                  if (son?.durum==="dokum") dokumdeAdet += net;
                });
              });
              const toplamKarHas = satilanKarHas + bekleyenKarHas;
              const kart = (lbl, ana, alt, renk) => (
                <div style={{ background:"rgba(0,0,0,0.15)", border:"1px solid rgba(255,255,255,0.06)", borderLeft:"3px solid "+renk, borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ fontSize:7, color:"#8a7d64", textTransform:"uppercase", letterSpacing:".05em", marginBottom:5 }}>{lbl}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:renk, lineHeight:1 }}>{ana}</div>
                  {alt && <div style={{ fontSize:8, color:"#665d4a", marginTop:3 }}>{alt}</div>}
                </div>
              );
              return (
                <div style={{ marginTop:14 }}>
                  {/* KG / GRAM satırı */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
                    {kart("Toplam Sipariş", fN(toplamGram/1000,3)+" kg", fN(toplamGram,1)+" gr", "#5b9bd5")}
                    {kart("Üretimi Biten", fN(bitenGram/1000,3)+" kg", fN(bitenGram,1)+" gr · "+tamamAdet+" adet", "#6abf69")}
                    {kart("Teslim Edilen", fN(satilanGram/1000,3)+" kg", fN(satilanGram,1)+" gr satıldı", GOLD)}
                  </div>
                  {/* ADET satırı */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
                    {kart("Aktif Üretim", aktifAdet+" adet", "üretimde olan parça", "#e8833a")}
                    {kart("Dökümde", dokumdeAdet+" adet", "dökümcüde bekleyen", "#e8a74f")}
                    {kart("Tamamlanan", tamamAdet+" adet", "biten parça", "#6abf69")}
                  </div>
                  {/* KARLILIK satırı */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {kart("Satılan Karlılık", fN(satilanKarHas,2)+" has", hasGramUSD>0?"≈"+fUSD(satilanKarHas*hasGramUSD)+" (teslim edilen)":"teslim edilen kâr", "#6abf69")}
                    {kart("Bekleyen Karlılık", fN(bekleyenKarHas,2)+" has", hasGramUSD>0?"≈"+fUSD(bekleyenKarHas*hasGramUSD)+" (üretimdeki)":"henüz teslim edilmeyen", "#e8833a")}
                    {kart("Toplam Potansiyel", fN(toplamKarHas,2)+" has", hasGramUSD>0?"≈"+fUSD(toplamKarHas*hasGramUSD)+" (hepsi satılırsa)":"hepsi satılırsa", GOLD)}
                  </div>
                </div>
              );
            })()}

            {/* ── SEKMELİ MODEL PANELİ ── */}
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"12px 16px", marginTop:14 }}>
              {/* Sekme butonları */}
              <div style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
                {[
                  { id:"yeni",     l:"🆕 Yeni Eklenen", c:"#5b9bd5" },
                  { id:"coksatan", l:"⭐ Çok Satan",    c:"#6abf69" },
                  { id:"arizali",  l:"⚠ Arıza Veren",  c:"#e85a4f" },
                  { id:"karli",    l:"💰 En Karlı",     c:GOLD },
                  { id:"kazandiran", l:"💵 Çok Kazandıran", c:"#6abf69" },
                ].map(t => (
                  <button key={t.id} onClick={()=>setKesfetSekme(t.id)} style={{ background:kesfetSekme===t.id?t.c+"22":"rgba(255,255,255,0.03)", border:"1px solid "+(kesfetSekme===t.id?t.c+"66":"rgba(255,255,255,0.08)"), borderRadius:7, padding:"5px 12px", color:kesfetSekme===t.id?t.c:"#7a6f5a", fontSize:10, fontWeight:kesfetSekme===t.id?700:400, cursor:"pointer" }}>{t.l}</button>
                ))}
              </div>

              {/* İçerik — 2 sütunlu liste */}
              {(() => {
                // Her model için gram ve karlılık (mly/gr) — tüm sekmelerde alt bilgi olarak gösterilir
                const modelBilgi = (m) => {
                  if (altinKgUSD>0) {
                    const hc = hesapla(m, m.refAyar, altinKgUSD, madenCarpan);
                    return { gram: hc.mamulGram, mly: hc.mamulGram>0 ? hc.karMly : 0, ayar: m.refAyar };
                  }
                  return { gram: Number(m.gram)||0, mly: null, ayar: m.refAyar };
                };
                let liste = [];
                if (kesfetSekme==="yeni") {
                  liste = [...modeller].filter(m=>m.t).sort((a,b)=>(b.t||0)-(a.t||0)).slice(0,10)
                    .map(m=>({ m, sag:new Date(m.t).toLocaleDateString("tr-TR"), bar:null }));
                } else if (kesfetSekme==="coksatan") {
                  const cs = [...modeller].filter(m=>(m.satisSayisi||0)>0).sort((a,b)=>(b.satisSayisi||0)-(a.satisSayisi||0)).slice(0,10);
                  const mx = cs[0]?.satisSayisi||1;
                  liste = cs.map(m=>({ m, sag:m.satisSayisi+"×", barW:(m.satisSayisi/mx*100), barC:"#6abf69" }));
                } else if (kesfetSekme==="arizali") {
                  const am={};
                  siparisler.forEach(s=>(s.kalemler||[]).forEach(k=>{
                    const h=((s.kalemHurda)||{})[k.id]||0, ia=((s.kalemIade)||{})[k.id]||0, t=((s.kalemTamir)||{})[k.id]||0;
                    if(h+ia+t>0){ if(!am[k.id]) am[k.id]={...k,hurda:0,iade:0,tamir:0}; am[k.id].hurda+=h;am[k.id].iade+=ia;am[k.id].tamir+=t; }
                  }));
                  liste = Object.values(am).map(m=>({...m,toplam:m.hurda+m.iade+m.tamir})).sort((a,b)=>b.toplam-a.toplam).slice(0,10)
                    .map(m=>({ m, sag:m.toplam+"", htDetay:m }));
                } else if (kesfetSekme==="karli") {
                  if (altinKgUSD>0) {
                    const kl = [...modeller].map(m=>{const hc=hesapla(m,m.refAyar,altinKgUSD,madenCarpan);return {m,karMly:hc.mamulGram>0?hc.karMly:0,karHas:hc.karHas};}).filter(x=>x.karMly>0).sort((a,b)=>b.karMly-a.karMly).slice(0,10);
                    const mx = kl[0]?.karMly||1;
                    liste = kl.map(x=>({ m:x.m, sag:fN(x.karMly,3), sagAlt:"mly/gr", barW:(x.karMly/mx*100), barC:GOLD }));
                  }
                } else if (kesfetSekme==="kazandiran") {
                  // Gerçekten teslim edilen ürünlerden toplam kazanç (kar has × teslim adedi)
                  const km={};
                  siparisler.forEach(s=>(s.kalemler||[]).forEach(k=>{
                    const dur=(s.kalemDurumlar||{})[k.id]||k.durum||"baslanmadi";
                    if(dur!=="teslim") return;
                    const hc=hesapla(k,k.secilenAyar||k.refAyar,s.altinKgUSD||altinKgUSD,s.mc||madenCarpan);
                    const hurda=((s.kalemHurda)||{})[k.id]||0, iade=((s.kalemIade)||{})[k.id]||0, tamir=((s.kalemTamir)||{})[k.id]||0;
                    const net=Math.max(0,(k.adet||1)-hurda-iade-tamir);
                    if(net<=0) return;
                    if(!km[k.id]) km[k.id]={m:k, kazanc:0, adet:0};
                    km[k.id].kazanc += hc.karHas*net;
                    km[k.id].adet += net;
                  }));
                  const kz = Object.values(km).filter(x=>x.kazanc>0).sort((a,b)=>b.kazanc-a.kazanc).slice(0,10);
                  const mx = kz[0]?.kazanc||1;
                  liste = kz.map(x=>({ m:x.m, sag:fN(x.kazanc,2), sagAlt:x.adet+" adet satıldı", barW:(x.kazanc/mx*100), barC:"#6abf69", kazancHas:true }));
                }
                if (kesfetSekme==="karli" && !(altinKgUSD>0)) {
                  return <div style={{ fontSize:10, color:"#665d4a", padding:"10px 0" }}>Altın fiyatı girilince karlılık hesaplanır</div>;
                }
                if (liste.length===0) {
                  return <div style={{ fontSize:10, color:"#665d4a", padding:"10px 0" }}>{kesfetSekme==="kazandiran"?"Henüz teslim edilen ürün yok":"Bu kategoride model bulunamadı"}</div>;
                }
                return (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"4px 12px" }}>
                    {liste.map((row,i) => {
                      const m = row.m;
                      const bilgi = modelBilgi(m);
                      return (
                        <div key={m.id+"_"+i} onClick={()=>{ const kol=kollar.find(k=>k.id===m.ki); if(kol){setAktifKol(kol);setSayfa("modeller");setArama(m.kod||m.ad);} }} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", cursor:"pointer" }}>
                          {m.foto ? <div className="model-foto-wrap" style={{ width:72, height:72, borderRadius:8, overflow:"hidden", flexShrink:0 }}><img src={m.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }}/></div> : <div style={{ width:72, height:72, borderRadius:8, background:"rgba(255,255,255,0.05)", flexShrink:0 }}/>}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:GOLD, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.kod||m.ad}</div>
                            {/* GRAM + KARLILIK — her zaman göster */}
                            <div style={{ display:"flex", gap:6, marginTop:1, flexWrap:"wrap" }}>
                              <span style={{ fontSize:8, color:"#5b9bd5", fontWeight:600 }}>{fN(bilgi.gram,2)}gr · {bilgi.ayar}</span>
                              {bilgi.mly!=null && <span style={{ fontSize:8, color:bilgi.mly>=0.030?"#6abf69":bilgi.mly>=0.020?"#e8a74f":"#e85a4f", fontWeight:700 }}>{fN(bilgi.mly,3)} mly/gr</span>}
                            </div>
                            {row.barW!=null && (
                              <div style={{ height:3, background:"rgba(255,255,255,0.08)", borderRadius:2, marginTop:3, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:row.barW+"%", background:row.barC, borderRadius:2 }}/>
                              </div>
                            )}
                            {row.htDetay && (
                              <div style={{ display:"flex", gap:5, marginTop:2 }}>
                                {row.htDetay.hurda>0 && <span style={{ fontSize:7, color:"#e85a4f", fontWeight:700 }}>H:{row.htDetay.hurda}</span>}
                                {row.htDetay.iade>0  && <span style={{ fontSize:7, color:"#a78bfa", fontWeight:700 }}>İ:{row.htDetay.iade}</span>}
                                {row.htDetay.tamir>0 && <span style={{ fontSize:7, color:"#5b9bd5", fontWeight:700 }}>T:{row.htDetay.tamir}</span>}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontSize:12, fontWeight:800, color:kesfetSekme==="arizali"?"#e85a4f":kesfetSekme==="karli"?"#6abf69":(kesfetSekme==="coksatan"||kesfetSekme==="kazandiran")?"#6abf69":"#5b9bd5" }}>{row.sag}{row.kazancHas?" has":""}</div>
                            {row.sagAlt && <div style={{ fontSize:7, color:"#665d4a" }}>{row.sagAlt}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

                {/* ASİSTAN */}
        {sayfa==="asistan" && (() => {
          const altinKgUSD = parseFloat(altinKg) || 0;

          // ── Context ──
          const buildContext = () => {
            const modelOzet = modeller.slice(0,100).map(m => {
              const hc = altinKgUSD > 0 ? hesapla(m, m.refAyar, altinKgUSD, parseFloat(mc)||0.030) : null;
              return { kod:m.kod||m.ad, ayar:m.refAyar, gram:m.gram, tasGram:m.tasGram||0,
                karMly: hc ? Math.round(hc.karMly*10000)/10000 : null, satis:m.satisSayisi||0 };
            });
            const sipOzet = siparisler.slice(-50).map(s => {
              let sipKar = 0;
              (s.kalemler||[]).forEach(k => {
                const hc = hesapla(k, k.secilenAyar||k.refAyar, s.altinKgUSD, s.mc);
                const net = Math.max(0,(k.adet||1)-((s.kalemHurda||{})[k.id]||0)-((s.kalemIade||{})[k.id]||0)-((s.kalemTamir||{})[k.id]||0));
                sipKar += hc.karHas * net;
              });
              const son = (s.durumGecmisi||[]).slice(-1)[0];
              return { musteri:s.musKod||s.musteri, tarih:new Date(s.tarih).toLocaleDateString("tr-TR"),
                durum:son?.durum, kalemSayisi:(s.kalemler||[]).length,
                hurda:Object.values(s.kalemHurda||{}).reduce((a,b)=>a+b,0),
                iade:Object.values(s.kalemIade||{}).reduce((a,b)=>a+b,0),
                karHas: Math.round(sipKar*1000)/1000 };
            });
            const dokumBorc = (kasa.dokumcuIslemler||[]).filter(x=>x.tip==="gonder"||x.tip==="baslangic_borc").reduce((s,x)=>s+x.has,0)
                            - (kasa.dokumcuIslemler||[]).filter(x=>x.tip==="ode").reduce((s,x)=>s+x.has,0);
            return JSON.stringify({
              tarih: new Date().toLocaleDateString("tr-TR"), altinKgUSD,
              modelSayisi: modeller.length, koleksiyon: kollar.length,
              modeller: modelOzet, sonSiparisler: sipOzet,
              kasaOzet: { dokumBorc: Math.round(dokumBorc*1000)/1000 },
              rhinoMizan: rhinoMizan ? {
                musteriHas: rhinoMizan.musteriHas.filter(x=>Math.abs(x.bakiye)>0.001).map(x=>({
                  ad:x.ad, bakiye:x.bakiye,
                  sistemMusterisi: mizanEslestirme[x.ad] || Object.keys(musteriler).find(s=>s.toLowerCase().replace(/[^a-z0-9]/gi,"")===x.ad.toLowerCase().replace(/[^a-z0-9]/gi,"")) || null
                })),
                dokumcuHas: rhinoMizan.dokumcuHas.filter(x=>Math.abs(x.bakiye)>0.001),
                saticiUsd: rhinoMizan.saticiUsd.filter(x=>Math.abs(x.bakiye)>0.001),
              } : null,
            }, null, 2);
          };

          // ── Sohbet gönder ──
          const gonder = async () => {
            if (!ajanSoru.trim() || ajanYukleniyor) return;
            const soru = ajanSoru.trim();
            const yeniGecmis = [...ajanGecmis, { rol:"user", icerik:soru }];
            setAjanGecmis(yeniGecmis);
            setAjanSoru("");
            setAjanYukleniyor(true);
            try {
              const sistem = `Sen MSK Kuyumculuk atölyesinin yönetim asistanısın. Veriyi analiz edip kısa, net, aksiyona dönük Türkçe öneriler veriyorsun. Gereksiz uzun cevaplardan kaçın. Sayısal veriye dayan.

ATÖLYE VERİSİ:
${buildContext()}`;
              const mesajlar = yeniGecmis.map(m=>({ role:m.rol==="user"?"user":"assistant", content:m.icerik }));
              const res = await fetch("/api/chat", {
                method:"POST", headers:{"Content-Type":"application/json"},
                body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:sistem, messages:mesajlar })
              });
              const data = await res.json();
              const cevap = data.content?.[0]?.text
                || data.error?.message
                || (data.error ? JSON.stringify(data.error) : null)
                || data.raw
                || "Yanıt alınamadı.";
              setAjanGecmis(prev=>[...prev, { rol:"assistant", icerik:cevap }]);
            } catch(e) {
              setAjanGecmis(prev=>[...prev, { rol:"assistant", icerik:"Hata: "+e.message }]);
            }
            setAjanYukleniyor(false);
          };

          // ── Özet hesapla ──
          const karsizSayisi = altinKgUSD > 0 ? modeller.filter(m=>m.gram>0&&hesapla(m,m.refAyar,altinKgUSD,parseFloat(mc)||0.030).karMly<0.020).length : 0;
          const gecikenSayisi = siparisler.filter(s=>{ const son=(s.durumGecmisi||[]).slice(-1)[0]; return son&&!["tamam","teslim","hurda"].includes(son.durum)&&Math.round((Date.now()-son.tarih)/86400000)>=7; }).length;
          const modelHurdaMap = {};
          siparisler.forEach(s=>(s.kalemler||[]).forEach(k=>{ const h=((s.kalemHurda)||{})[k.id]||0; if(!modelHurdaMap[k.id]) modelHurdaMap[k.id]={ad:k.ad||k.kod||"?",h:0,t:0}; modelHurdaMap[k.id].h+=h; modelHurdaMap[k.id].t+=k.adet||1; }));
          const hurdaliSayisi = Object.values(modelHurdaMap).filter(d=>d.t>=5&&d.h/d.t>0.10).length;

          return (
            <div style={{ animation:"fadein .3s", maxWidth:860 }}>
              <h2 style={{ margin:"0 0 16px", fontSize:14, fontWeight:700, color:T.text }}>🤖 Atölye Asistanı</h2>

              {/* ── DURUM ÖZETI ── */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
                {[
                  { l:"Model", v:modeller.length, sub:"toplam", c:GOLD,
                    soru:"Modellerimi özetle — en karlı ve en az karlı olanlar hangileri?" },
                  { l:"Düşük Kâr", v:karsizSayisi, sub:"model (<0.020 mly)", c:karsizSayisi>0?"#e85a4f":"#6abf69",
                    soru:karsizSayisi>0?`Karlılığı 0.020 mly altında ${karsizSayisi} modelim var. Bunları nasıl düzeltebilirim?`:"" },
                  { l:"Geciken", v:gecikenSayisi, sub:"sipariş (7+ gün)", c:gecikenSayisi>0?"#e8833a":"#6abf69",
                    soru:gecikenSayisi>0?`${gecikenSayisi} siparişim 7+ gündür aynı aşamada bekliyor. Ne yapmalıyım?`:"" },
                  { l:"Yüksek Hurda", v:hurdaliSayisi, sub:"model (>%10)", c:hurdaliSayisi>0?"#e8833a":"#6abf69",
                    soru:hurdaliSayisi>0?`Hurda oranı %10 üstünde ${hurdaliSayisi} modelim var. Sebebi ne olabilir?`:"" },
                ].map((s,i) => (
                  <div key={i} onClick={()=>{ if(s.soru){ setAjanSoru(s.soru); setTimeout(()=>document.getElementById("ajan-input")?.focus(),100); }}}
                    style={{ background:"rgba(0,0,0,0.2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 14px", cursor:s.soru?"pointer":"default", transition:"background .2s" }}
                    onMouseEnter={e=>{ if(s.soru) e.currentTarget.style.background="rgba(0,0,0,0.35)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="rgba(0,0,0,0.2)"; }}>
                    <div style={{ fontSize:7, color:s.c, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>{s.l}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:8, color:"#665d4a", marginTop:2 }}>{s.sub}</div>
                    {s.soru && <div style={{ fontSize:7, color:"#665d4a", marginTop:4 }}>Sormak için tıkla →</div>}
                  </div>
                ))}
              </div>

              {/* ── HIZLI SORULAR ── */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
                {[
                  "Genel durumumu özetle",
                  "Bu ay karlılığım nasıl?",
                  "Hangi koleksiyon daha çok satıyor?",
                  "Maliyetlerimi nasıl düşürebilirim?",
                  "Satış ağımı nasıl geliştirebilirim?",
                  rhinoMizan && "Mizan verilerini analiz et",
                ].filter(Boolean).map(s => (
                  <button key={s} onClick={()=>{ setAjanSoru(s); setTimeout(()=>document.getElementById("ajan-input")?.focus(),100); }}
                    style={{ background:"rgba(201,168,76,0.06)", border:"1px solid rgba(201,168,76,0.12)", borderRadius:8, padding:"5px 12px", color:GOLD, fontSize:9, cursor:"pointer" }}>
                    {s}
                  </button>
                ))}
              </div>

              {/* ── SOHBET ── */}
              {ajanGecmis.length > 0 && (
                <div style={{ background:"rgba(0,0,0,0.15)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:12, padding:"14px 16px", marginBottom:12, maxHeight:450, overflowY:"auto" }}>
                  {ajanGecmis.map((m,i) => (
                    <div key={i} style={{ marginBottom:14, display:"flex", flexDirection:"column", alignItems:m.rol==="user"?"flex-end":"flex-start" }}>
                      <div style={{ fontSize:8, color:"#665d4a", marginBottom:3 }}>{m.rol==="user"?"Siz":"Asistan"}</div>
                      <div style={{ maxWidth:"88%", padding:"9px 13px", borderRadius:10,
                        background: m.rol==="user"?"rgba(201,168,76,0.1)":"rgba(255,255,255,0.04)",
                        border:"1px solid "+(m.rol==="user"?"rgba(201,168,76,0.18)":"rgba(255,255,255,0.07)"),
                        fontSize:11, color:T.text, lineHeight:1.65, whiteSpace:"pre-wrap" }}>
                        {m.icerik}
                      </div>
                    </div>
                  ))}
                  {ajanYukleniyor && (
                    <div style={{ display:"flex", gap:6, alignItems:"center", padding:"8px 0" }}>
                      <div style={{ fontSize:9, color:"#665d4a" }}>Düşünüyor</div>
                      {[0,1,2].map(i=><div key={i} style={{ width:5, height:5, borderRadius:"50%", background:"#665d4a", animation:`fadein .6s ${i*.2}s infinite alternate` }}/>)}
                    </div>
                  )}
                </div>
              )}

              {/* ── GİRİŞ ── */}
              <div style={{ display:"flex", gap:8 }}>
                <input id="ajan-input" value={ajanSoru} onChange={e=>setAjanSoru(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); gonder(); }}}
                  placeholder="Atölyeniz hakkında sorun... (Enter)"
                  style={{ ...IS, flex:1, padding:"10px 14px", fontSize:11 }}
                  disabled={ajanYukleniyor}/>
                <button onClick={gonder} disabled={ajanYukleniyor||!ajanSoru.trim()}
                  style={{ ...BG, padding:"10px 20px", fontSize:11, opacity:ajanYukleniyor||!ajanSoru.trim()?0.4:1 }}>
                  Gönder
                </button>
                {ajanGecmis.length > 0 && (
                  <button onClick={()=>setAjanGecmis([])} style={{ ...RD, padding:"10px 12px", fontSize:9 }}>Temizle</button>
                )}
              </div>

              {/* Mizan notu */}
              <div style={{ marginTop:10, fontSize:8, color:"#665d4a", textAlign:"center" }}>
                {rhinoMizan ? `📊 Mizan yüklü (${rhinoMizan.tarih}) — ajan bu veriyi kullanıyor` : "Mizan yüklemek için: Kasa → Muhasebe"}
              </div>
            </div>
          );
        })()}

        {/* AYARLAR */}
        {sayfa==="ayarlar" && (
          <div style={{ animation:"fadein .3s", maxWidth:1200 }}>
            <h2 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>⚙ Ayarlar</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:12, alignItems:"start" }}>

            {/* TEMA SEÇİCİ */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
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

            {/* ARAYÜZ RENKLERİ — TAM ÖZELLEŞTİRME */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.gold, marginBottom:6, letterSpacing:"0.03em" }}>🎨 ARAYÜZ RENKLERİ</div>
              <div style={{ fontSize:8, color:T.dim, marginBottom:14 }}>Tüm arayüz renklerini tek tek ayarlayın. Her rengin yanındaki ↺ ile o rengi, alttaki buton ile hepsini varsayılana döndürebilirsiniz.</div>

              {[
                { grup:"Arka Planlar", renkler:[
                  { key:"bg2",          label:"Sayfa Zemini",     hint:"Ana arka plan rengi" },
                  { key:"card",         label:"Kart Zemini",      hint:"Kutu/kart arka planı" },
                  { key:"header",       label:"Başlık Zemini",    hint:"Üst menü arka planı" },
                  { key:"btnBg",        label:"Buton Zemini",     hint:"Buton arka planları" },
                ]},
                { grup:"Yazılar", renkler:[
                  { key:"text",         label:"Ana Yazı",         hint:"Model adları, başlıklar" },
                  { key:"sub",          label:"İkincil Yazı",     hint:"Açıklamalar, alt bilgiler" },
                  { key:"dim",          label:"Soluk Yazı",       hint:"Tarih, kod gibi detaylar" },
                ]},
                { grup:"Kenarlıklar", renkler:[
                  { key:"border",       label:"Kart Kenarlığı",   hint:"Kutu çizgileri" },
                  { key:"headerBorder", label:"Başlık Kenarlığı", hint:"Üst menü çizgisi" },
                  { key:"btnBorder",    label:"Buton Kenarlığı",  hint:"Buton çizgileri" },
                ]},
                { grup:"Vurgu & Durum", renkler:[
                  { key:"gold",         label:"Vurgu Rengi",      hint:"Başlıklar, aktif öğeler" },
                  { key:"accent",       label:"Aksan Rengi",      hint:"İkincil vurgu" },
                  { key:"success",      label:"Başarı (Yeşil)",   hint:"Olumlu değerler, kâr" },
                  { key:"danger",       label:"Uyarı (Kırmızı)",  hint:"Silme, hata, uyarı" },
                  { key:"info",         label:"Bilgi (Mavi)",     hint:"Bilgi rozetleri" },
                ]},
              ].map(({ grup, renkler }) => (
                <div key={grup} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:T.sub, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>{grup}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                    {renkler.map(({ key, label, hint }) => {
                      // Renk seçici için geçerli hex değeri lazım; rgba/gradient ise seçici boş kalır ama uygulanır
                      const mevcut = T[key] || "";
                      const hexMi = /^#[0-9a-fA-F]{6}$/.test(mevcut);
                      return (
                        <div key={key} style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:T.text }}>{label}</div>
                            <div style={{ fontSize:8, color:T.dim }}>{hint}</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:26, height:26, borderRadius:6, background:T[key], border:"2px solid "+T.border, flexShrink:0 }}/>
                            <input type="color" value={hexMi?mevcut:"#888888"} onChange={e=>yaziRenkUygula(key,e.target.value)}
                              style={{ width:34, height:26, border:"1px solid "+T.border, borderRadius:6, cursor:"pointer", background:"none", padding:0 }}/>
                            {yaziRenkleri[key] && (
                              <button onClick={()=>{ const y={...yaziRenkleri}; delete y[key]; setYaziRenkleri(y); try{localStorage.setItem("atolye_yazi_renk",JSON.stringify(y))}catch{} }}
                                style={{ ...RD, fontSize:8, padding:"2px 7px" }}>↺</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button onClick={()=>{ setYaziRenkleri({}); try{localStorage.removeItem("atolye_yazi_renk")}catch{} }}
                style={{ ...RD, fontSize:9, padding:"6px 16px", marginTop:4 }}>Tüm Renkleri Sıfırla</button>
            </div>

            {/* ŞİFRE DEĞİŞTİR */}
            <SifreDegistir />

            {/* İŞLEM GEÇMİŞİ */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#a78bfa" }}>📋 İŞLEM GEÇMİŞİ</div>
                <button onClick={()=>islemGecmisiGetir(AKTIF_SIRKET_ONEK, 50).then(setIslemGecmisi)} style={{ ...GH, fontSize:9, padding:"4px 10px" }}>↻ Yenile</button>
              </div>
              <div style={{ fontSize:9, color:"#665d4a", marginBottom:12 }}>Son 50 işlem (ekleme, düzenleme, silme). Bir şeyin ne zaman değiştiğini buradan görebilirsiniz.</div>
              {islemGecmisi.length === 0 && <div style={{ fontSize:9, color:"#665d4a" }}>Henüz işlem kaydı yok.</div>}
              {islemGecmisi.length > 0 && <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:280, overflowY:"auto" }}>
                {islemGecmisi.map(ig => {
                  const renk = ig.islem==="sil" ? "#e85a4f" : ig.islem==="ekle" ? "#6abf69" : "#5b9bd5";
                  const ikon = ig.islem==="sil" ? "🗑" : ig.islem==="ekle" ? "➕" : "✏️";
                  return (
                    <div key={ig.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 9px", background:"rgba(0,0,0,0.15)", borderRadius:6, fontSize:9 }}>
                      <span style={{ fontSize:11 }}>{ikon}</span>
                      <span style={{ color:renk, fontWeight:700, minWidth:44 }}>{ig.islem}</span>
                      <span style={{ color:"#998a6e", minWidth:40 }}>{ig.tur}</span>
                      <span style={{ color:"#e8dcc8", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ig.detay||""}</span>
                      <span style={{ color:"#665d4a", fontSize:8, whiteSpace:"nowrap" }}>{new Date(ig.zaman).toLocaleString("tr-TR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                  );
                })}
              </div>}
            </div>

            {/* OTOMATİK YEDEKLER */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#5b9bd5", marginBottom:8 }}>🔄 OTOMATİK YEDEKLER</div>
              <div style={{ fontSize:9, color:"#665d4a", marginBottom:12 }}>Sistem her gün otomatik yedek alır (son 7 gün saklanır). Buradan geçmiş bir yedeğe dönebilirsiniz. Foto'lar Storage'da olduğu için yedekler hafiftir.</div>

              <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                <button onClick={async()=>{
                  const veri = await yedekVerisiTopla();
                  const ok = await yedekKaydet(AKTIF_SIRKET_ONEK, veri, modeller.length, siparisler.length);
                  if (ok) { toastGoster("ok","Yedek alındı"); yedekListesi(AKTIF_SIRKET_ONEK).then(setOtoYedekler); }
                  else toastGoster("hata","Yedek alınamadı");
                }} style={{ ...BG, fontSize:11, padding:"7px 14px" }}>💾 Şimdi Yedek Al</button>
                <button onClick={()=>yedekListesi(AKTIF_SIRKET_ONEK).then(setOtoYedekler)} style={{ ...GH, fontSize:11, padding:"7px 14px" }}>↻ Listeyi Yenile</button>
              </div>

              {otoYedekler.length === 0 && <div style={{ fontSize:9, color:"#665d4a" }}>Henüz otomatik yedek yok. İlk yedek yarın (veya "Şimdi Yedek Al" ile) oluşur.</div>}
              {otoYedekler.length > 0 && <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {otoYedekler.map(y => (
                  <div key={y.id} style={{ background:"rgba(0,0,0,0.15)", border:"1px solid "+T.border, borderRadius:8, padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:GOLD }}>{new Date(y.tarih).toLocaleDateString("tr-TR", {day:"2-digit", month:"long", year:"numeric"})}</div>
                      <div style={{ fontSize:8, color:"#665d4a" }}>{y.model_sayisi||0} model · {y.siparis_sayisi||0} sipariş · {new Date(y.olusturma).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                    <button onClick={async()=>{
                      if(!window.confirm(new Date(y.tarih).toLocaleDateString("tr-TR")+" tarihli yedeğe dönmek istiyor musunuz?\n\nMevcut veriler bu yedekle değiştirilecek ("+(y.model_sayisi||0)+" model, "+(y.siparis_sayisi||0)+" sipariş).")) return;
                      const veri = await yedekGetir(y.id);
                      if (!veri) { toastGoster("hata","Yedek okunamadı"); return; }
                      // Geri yükle
                      if (veri.kollar) await svK(veri.kollar);
                      if (veri.siparisler) await svS(veri.siparisler);
                      if (veri.musteriler) await svMus(veri.musteriler);
                      if (veri.kasa) await svKasa(veri.kasa);
                      if (Array.isArray(veri.modeller)) {
                        // Modelleri parça parça güvenli yaz
                        await svM(veri.modeller);
                      }
                      toastGoster("ok","Yedek geri yüklendi — sayfa yenileniyor");
                      setTimeout(()=>window.location.reload(), 1200);
                    }} style={{ background:"rgba(106,191,105,0.12)", border:"1px solid rgba(106,191,105,0.3)", borderRadius:6, padding:"5px 12px", color:"#6abf69", fontSize:10, fontWeight:700, cursor:"pointer" }}>↶ Bu Yedeğe Dön</button>
                  </div>
                ))}
              </div>}
            </div>

            {/* MÜŞTERİ VİTRİNİ */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#6abf69", marginBottom:8 }}>🛍️ MÜŞTERİ VİTRİNİ</div>
              <div style={{ fontSize:9, color:"#665d4a", marginBottom:12 }}>Müşterilere özel link oluşturun. Müşteri sadece foto, model adı, gram ve ayar görür — fiyat, taş, işçilik gibi bilgiler gizlidir. Yalnızca "vitrinde göster" işaretli koleksiyonlar görünür.</div>

              {/* Koleksiyon vitrin işaretleri */}
              <div style={{ fontSize:9, fontWeight:700, color:"#998a6e", marginBottom:6 }}>Vitrinde gösterilecek koleksiyonlar:</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
                {kollar.length===0 && <div style={{ fontSize:9, color:"#665d4a" }}>Henüz koleksiyon yok</div>}
                {kollar.map(k => {
                  const acik = k.vitrin === true;
                  return (
                    <button key={k.id} onClick={()=>{ const yeni=kollar.map(x=>x.id===k.id?{...x,vitrin:!acik}:x); svK(yeni); }}
                      style={{ background: acik?"rgba(106,191,105,0.15)":"rgba(255,255,255,0.03)", border:"1px solid "+(acik?"rgba(106,191,105,0.4)":"rgba(255,255,255,0.08)"), borderRadius:7, padding:"5px 11px", color: acik?"#6abf69":"#7a6f5a", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                      {acik?"✓":"○"} {k.ad}
                    </button>
                  );
                })}
              </div>

              {/* Yeni müşteri linki oluştur */}
              <div style={{ fontSize:9, fontWeight:700, color:"#998a6e", marginBottom:6 }}>Yeni müşteri linki:</div>
              <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
                <input value={yeniMusteriAd} onChange={e=>setYeniMusteriAd(e.target.value)} placeholder="Müşteri adı (örn. Ahmet Kuyumcu)" style={{ ...IS, flex:1, minWidth:160, padding:"7px 11px", fontSize:11 }}/>
                <button onClick={async()=>{
                  if(!yeniMusteriAd.trim()){ toastGoster("hata","Müşteri adı girin"); return; }
                  const rastgele = Math.random().toString(36).slice(2,8).toUpperCase();
                  const yeniKod = { kod: rastgele, musteriAd: yeniMusteriAd.trim(), aktif: true, olusturma: Date.now(), erisimSayisi: 0, sonErisim: null };
                  const guncel = [...vitrinKodlar, yeniKod];
                  setVitrinKodlar(guncel);
                  await sv("v7vitrin", guncel);
                  setYeniMusteriAd("");
                  toastGoster("ok","Link oluşturuldu");
                }} style={{ ...BG, fontSize:11, padding:"7px 14px" }}>+ Link Oluştur</button>
              </div>

              {/* Mevcut müşteri linkleri */}
              {vitrinKodlar.length>0 && <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {vitrinKodlar.map((vk,i) => {
                  const url = window.location.origin + "?vitrin=" + vk.kod;
                  return (
                    <div key={vk.kod} style={{ background:"rgba(0,0,0,0.15)", border:"1px solid "+T.border, borderRadius:8, padding:"9px 11px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:11, fontWeight:700, color: vk.aktif?GOLD:"#665d4a" }}>{vk.musteriAd} {!vk.aktif && <span style={{ fontSize:8, color:"#e85a4f" }}>(kapalı)</span>}</div>
                          <div style={{ fontSize:8, color:"#665d4a" }}>
                            {vk.erisimSayisi>0 ? vk.erisimSayisi+" kez açıldı · son: "+(vk.sonErisim?new Date(vk.sonErisim).toLocaleDateString("tr-TR"):"—") : "henüz açılmadı"}
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:5 }}>
                          <button onClick={()=>{ navigator.clipboard?.writeText(url); toastGoster("ok","Link kopyalandı"); }} style={{ background:"rgba(91,155,213,0.12)", border:"1px solid rgba(91,155,213,0.25)", borderRadius:6, padding:"4px 9px", color:"#5b9bd5", fontSize:9, fontWeight:700, cursor:"pointer" }}>📋 Kopyala</button>
                          <button onClick={async()=>{ const g=vitrinKodlar.map((x,j)=>j===i?{...x,aktif:!x.aktif}:x); setVitrinKodlar(g); await sv("v7vitrin",g); }} style={{ background:T.card, border:"1px solid "+T.border, borderRadius:6, padding:"4px 9px", color:"#998a6e", fontSize:9, fontWeight:700, cursor:"pointer" }}>{vk.aktif?"Kapat":"Aç"}</button>
                          <button onClick={async()=>{ if(!window.confirm(vk.musteriAd+" linkini silmek istiyor musunuz?"))return; const g=vitrinKodlar.filter((_,j)=>j!==i); setVitrinKodlar(g); await sv("v7vitrin",g); toastGoster("ok","Silindi"); }} style={{ background:"rgba(232,90,79,0.1)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:6, padding:"4px 9px", color:"#e85a4f", fontSize:9, fontWeight:700, cursor:"pointer" }}>Sil</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>}
            </div>

            {/* AKTİF ŞİRKET */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#a78bfa", marginBottom:8 }}>🏢 AKTİF ŞİRKET</div>
              <div style={{ fontSize:14, fontWeight:800, color:GOLD, marginBottom:4 }}>{AKTIF_SIRKET}</div>
              <div style={{ fontSize:9, color:"#665d4a", marginBottom:10 }}>Şu an bu şirketin kataloğundasınız. Diğer şirkete geçmek için aşağıdaki butonu kullanın (verileriniz korunur).</div>
              <button onClick={()=>{ if (onSirketDegis) onSirketDegis(); }}
                style={{ background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.25)", borderRadius:7, padding:"7px 14px", color:"#a78bfa", fontSize:10, fontWeight:700, cursor:"pointer" }}>Şirket Değiştir →</button>
            </div>

            {/* DİĞER SİSTEM — PERSONEL */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#5b9bd5", marginBottom:8 }}>👥 PERSONEL SİSTEMİ</div>
              <div style={{ fontSize:9, color:"#665d4a", marginBottom:10 }}>Personel, bordro, mesai, avans, izin ve gider takibi için diğer sisteme geçiş yapın.</div>
              <button onClick={()=>{ window.open("https://personeltakip-pearl.vercel.app/", "_blank"); }}
                style={{ background:"rgba(91,155,213,0.12)", border:"1px solid rgba(91,155,213,0.25)", borderRadius:7, padding:"7px 14px", color:"#5b9bd5", fontSize:10, fontWeight:700, cursor:"pointer" }}>Personel Sistemini Aç →</button>
            </div>

            {/* OTURUMU KAPAT */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#e85a4f", marginBottom:8 }}>🚪 OTURUM</div>
              <div style={{ fontSize:9, color:"#665d4a", marginBottom:10 }}>"Beni hatırla" ile açık oturumu kapatır, bir dahaki açılışta tekrar şifre sorulur.</div>
              <button onClick={()=>{
                if (!window.confirm("Oturumu kapatmak istediğinize emin misiniz? Tekrar şifre girmeniz gerekecek.")) return;
                try { localStorage.removeItem("atolye_oturum"); } catch {}
                window.location.reload();
              }} style={{ background:"rgba(232,90,79,0.12)", border:"1px solid rgba(232,90,79,0.25)", borderRadius:7, padding:"7px 14px", color:"#e85a4f", fontSize:10, fontWeight:700, cursor:"pointer" }}>Oturumu Kapat</button>
            </div>

            {/* VARSAYILAN DEGERLER */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
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
                const yeniAy = { kategoriler:ayarKategoriler, etiketler:ayarEtiketler, varsAltinKg:ayarVarsAltinKg, varsMc:ayarVarsMc, varsIscilik:ayarVarsIscilik, varsIscilikBirim:ayarVarsIscilikBirim, kayitliNotlar, ozelTaslar };
                sv("v7ay", yeniAy);
                if (ayarVarsAltinKg) setAltinKg(ayarVarsAltinKg);
                if (ayarVarsMc) setMc(ayarVarsMc);
                alert("Ayarlar kaydedildi!");
              }} style={{ ...BG, fontSize:10, padding:"6px 16px" }}>Kaydet ve Uygula</button>
            </div>

            {/* ETİKET YÖNETİMİ */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
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
              <div style={{ fontSize:8, color:"#665d4a", fontStyle:"italic" }}>
                Yeni etiketler model eklerken/düzenlerken oluşturulur. Buradan mevcut etiketleri tüm modellerden kaldırabilirsiniz.
              </div>
            </div>

            {/* KATEGORİ YÖNETİMİ */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#5b9bd5", marginBottom:10 }}>📂 KATEGORİ YÖNETİMİ</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                {ayarKategoriler.map(k => (
                  <span key={k} style={{ background:"rgba(91,155,213,0.1)", color:"#5b9bd5", padding:"3px 8px", borderRadius:5, fontSize:9, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                    {k}
                    {ayarKategoriler.length > 1 && (
                      <button onClick={() => {
                        const yeni = ayarKategoriler.filter(x => x!==k);
                        setAyarKategoriler(yeni);
                        sv("v7ay", { kategoriler:yeni, etiketler:ayarEtiketler, varsAltinKg:ayarVarsAltinKg, varsMc:ayarVarsMc, varsIscilik:ayarVarsIscilik, varsIscilikBirim:ayarVarsIscilikBirim, kayitliNotlar, ozelTaslar });
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
                  sv("v7ay", { kategoriler:yeni, etiketler:ayarEtiketler, varsAltinKg:ayarVarsAltinKg, varsMc:ayarVarsMc, varsIscilik:ayarVarsIscilik, varsIscilikBirim:ayarVarsIscilikBirim, kayitliNotlar, ozelTaslar });
                }} style={{ ...GH, padding:"6px 12px", fontSize:10 }}>+ Ekle</button>
              </div>
            </div>

            {/* ÖZEL TAŞ YÖNETİMİ */}
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:14, padding:"15px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#5b9bd5", marginBottom:10 }}>💎 ÖZEL TAŞ BOYUTLARI</div>
              <div style={{ fontSize:9, color:"#665d4a", marginBottom:10 }}>Tabloda olmayan taş boyutlarını buraya ekleyin. Model formunda otomatik kullanılır.</div>
              {ozelTaslar.length === 0 && (
                <button onClick={()=>{
                  const taslar = [{"sekil": "SEDEF", "boyut": "16mm", "gramPerAdet": 1}, {"sekil": "ONYX", "boyut": "16mm", "gramPerAdet": 2}, {"sekil": "OCTAGON", "boyut": "8x6", "gramPerAdet": 0.86}, {"sekil": "OCTAGON RENKLI", "boyut": "8x6", "gramPerAdet": 0.3}, {"sekil": "ONYX", "boyut": "10MM", "gramPerAdet": 1.97}, {"sekil": "KARE", "boyut": "2.5X2.5 RENKLI", "gramPerAdet": 0.021}, {"sekil": "KALP", "boyut": "7X7 OPAL", "gramPerAdet": 0.15}, {"sekil": "ROUND", "boyut": "7.5", "gramPerAdet": 0.305}, {"sekil": "MARKİZ", "boyut": "10X5", "gramPerAdet": 0.6}, {"sekil": "MARKİZ", "boyut": "10X10 RENKLI", "gramPerAdet": 0.3}, {"sekil": "KALP", "boyut": "10X10", "gramPerAdet": 1.26}, {"sekil": "KALP", "boyut": "10X10 RENKLI", "gramPerAdet": 1}, {"sekil": "OCTAGON", "boyut": "7X7", "gramPerAdet": 1.26}, {"sekil": "OCTAGON", "boyut": "7X7 RENKLI", "gramPerAdet": 0.55}, {"sekil": "OCTAGON", "boyut": "7X5", "gramPerAdet": 0.35}, {"sekil": "OCTAGON", "boyut": "7X5 RENKLI", "gramPerAdet": 0.2}, {"sekil": "KALP", "boyut": "7X7", "gramPerAdet": 1}, {"sekil": "KALP", "boyut": "7X7 RENKLI", "gramPerAdet": 0.45}, {"sekil": "BRIOLETTE", "boyut": "12X12", "gramPerAdet": 1.35}, {"sekil": "BRIOLETTE", "boyut": "16X12", "gramPerAdet": 2.85}, {"sekil": "ROUND", "boyut": "7MM", "gramPerAdet": 0.69}, {"sekil": "ROUND", "boyut": "7MM RENKLI", "gramPerAdet": 0.3}, {"sekil": "TRAPEZ", "boyut": "1.5X1.25X1.00", "gramPerAdet": 0.0079}, {"sekil": "OVAL", "boyut": "10X2 RENKLI", "gramPerAdet": 0.33}, {"sekil": "CABOCHON MALAHIT", "boyut": "10X10", "gramPerAdet": 1}, {"sekil": "YAY 3M SARNEL", "boyut": "0.5", "gramPerAdet": 0.3}, {"sekil": "ŞEKER TAŞ", "boyut": "5MM", "gramPerAdet": 0.5}, {"sekil": "TITANYUM YAY", "boyut": "60X60", "gramPerAdet": 1}, {"sekil": "OVAL", "boyut": "9X7", "gramPerAdet": 0.3}, {"sekil": "OPAL", "boyut": "10X8", "gramPerAdet": 0.3}];
                  setOzelTaslar(taslar);
                  sv("v7ay",{kategoriler:ayarKategoriler,etiketler:ayarEtiketler,varsAltinKg:ayarVarsAltinKg,varsMc:ayarVarsMc,varsIscilik:ayarVarsIscilik,varsIscilikBirim:ayarVarsIscilikBirim,kayitliNotlar,ozelTaslar:taslar});
                  alert("30 taş yüklendi!");
                }} style={{ background:"rgba(91,155,213,0.15)", border:"1px solid rgba(91,155,213,0.3)", borderRadius:8, padding:"6px 14px", color:"#5b9bd5", fontSize:10, fontWeight:700, cursor:"pointer", marginBottom:10 }}>
                  ⬆ Yedekten 30 Taşı Yükle
                </button>
              )}

              {/* Mevcut özel taşlar */}
              {ozelTaslar.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {ozelTaslar.map((t, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:T.card, borderRadius:7 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:"#5b9bd5", minWidth:70 }}>{t.sekil}</span>
                        <span style={{ fontSize:10, color:"var(--goldtext)", minWidth:80 }}>{t.boyut}</span>
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
                      <div style={{ fontSize:11, fontWeight:700, color:"var(--goldtext)" }}>{kol.ad}</div>
                      <div style={{ fontSize:8, color:"#665d4a" }}>{kolModeller.length} model · Ornek: {kol.on||"XX"}-001, {kol.on||"XX"}-002...</div>
                    </div>
                    <button onClick={() => { setSayfa("koleksiyonlar"); }} style={{ ...GH, fontSize:8, padding:"3px 8px" }}>Duzenle</button>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}
      </div>

      {/* TOPLU KOPYALA MODAL */}
      {topluKopyalaModal && (
        <Modal open={topluKopyalaModal} onClose={()=>{ setTopluKopyalaModal(false); setTopluHedefKolId(""); }} title={"Toplu Kopyala ("+seciliModeller.size+" model)"}>
          <div style={{ fontSize:9, color:"#998a6e", marginBottom:10 }}>
            Seçilen modeller hedef koleksiyona <b>aynı kodlarla</b> kopyalanacak.
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

          {/* Çakışma uyarısı */}
          {topluHedefKolId && (() => {
            const hedefKodlari = new Set(modeller.filter(m=>m.ki===topluHedefKolId).map(m=>m.kod));
            const cakisanlar = [...seciliModeller].map(id=>modeller.find(x=>x.id===id)).filter(m=>m && hedefKodlari.has(m.kod));
            if (cakisanlar.length > 0) {
              return (
                <div style={{ background:"rgba(232,90,79,0.08)", border:"1px solid rgba(232,90,79,0.25)", borderRadius:8, padding:"8px 12px", marginTop:8, fontSize:10, color:"#e85a4f" }}>
                  ⚠ Hedef koleksiyonda <b>{cakisanlar.length}</b> aynı kodlu model var: {cakisanlar.slice(0,5).map(m=>m.kod).join(", ")}{cakisanlar.length>5?"...":""}
                  <br/>Devam ederseniz üzerlerine yazılacak.
                </div>
              );
            }
            return null;
          })()}

          <button
            disabled={!topluHedefKolId}
            onClick={() => {
              const hedefKol = kollar.find(k=>k.id===topluHedefKolId);
              const hedefKodlari = new Map(); // kod -> mevcut model
              modeller.filter(m=>m.ki===topluHedefKolId).forEach(m => hedefKodlari.set(m.kod, m));
              
              // Çakışma var mı kontrol et
              const cakisanlar = [...seciliModeller].map(id=>modeller.find(x=>x.id===id)).filter(m=>m && hedefKodlari.has(m.kod));
              if (cakisanlar.length > 0) {
                if (!confirm(cakisanlar.length + " modelin aynı kodu hedef koleksiyonda mevcut.\n\nÜzerlerine yazılsın mı?")) return;
              }

              // Çakışan ID'leri topla (silinecekler)
              const silinecekIdler = new Set();
              [...seciliModeller].forEach(id => {
                const m = modeller.find(x=>x.id===id);
                if (m && hedefKodlari.has(m.kod)) {
                  silinecekIdler.add(hedefKodlari.get(m.kod).id);
                }
              });

              // Çakışan modelleri çıkar, yeni kopyaları ekle (aynı kodla)
              const yeniModeller = modeller.filter(m => !silinecekIdler.has(m.id));
              [...seciliModeller].forEach(id => {
                const m = modeller.find(x=>x.id===id);
                if (!m) return;
                yeniModeller.push({ 
                  ...m, 
                  id:uid(), 
                  ki:topluHedefKolId, 
                  kaynakKi: m.kaynakKi || m.ki, // orijinal kaynak
                  t:Date.now() 
                });
              });
              
              svM(yeniModeller);
              setTopluKopyalaModal(false);
              setTopluHedefKolId("");
              setSeciliModeller(new Set());
              if (hedefKol) { setAktifKol(hedefKol); setSayfa("modeller"); }
            }}
            style={{ ...BG, width:"100%", marginTop:10, opacity:topluHedefKolId?1:0.4 }}>
            {seciliModeller.size} Modeli Aynı Kod ile Kopyala
          </button>
        </Modal>
      )}

      {/* KOPYALA MODAL */}
      {kopyalaModal && (
        <Modal open={!!kopyalaModal} onClose={()=>setKopyalaModal(null)} title="Modeli Kopyala">
          {/* Kaynak model bilgisi */}
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14, padding:"8px 10px", background:"rgba(201,168,76,0.05)", borderRadius:8 }}>
            {kopyalaModal.model.foto && <div className="model-foto-wrap" style={{ width:64, height:64, borderRadius:6, overflow:"hidden" }}><img src={kopyalaModal.model.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }}/></div>}
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:GOLD }}>{kopyalaModal.model.kod}</div>
              <div style={{ fontSize:11, color:"var(--goldtext)" }}>{kopyalaModal.model.ad}</div>
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

          {/* Hedef koleksiyonda aynı kod var mı uyarısı */}
          {kopyalaModal.hedefKolId && (() => {
            const ayniKod = modeller.find(m => m.ki === kopyalaModal.hedefKolId && m.kod === kopyalaModal.model.kod);
            if (ayniKod) {
              return (
                <div style={{ background:"rgba(232,90,79,0.08)", border:"1px solid rgba(232,90,79,0.25)", borderRadius:8, padding:"8px 12px", marginTop:8, fontSize:10, color:"#e85a4f" }}>
                  ⚠ Bu koleksiyonda <b>{kopyalaModal.model.kod}</b> kodlu model zaten var: <b>{ayniKod.ad}</b>. Devam ederseniz üzerine yazılacak.
                </div>
              );
            }
            return (
              <div style={{ background:"rgba(106,191,105,0.06)", border:"1px solid rgba(106,191,105,0.2)", borderRadius:8, padding:"8px 12px", marginTop:8, fontSize:10, color:"#6abf69" }}>
                ✓ Hedef koleksiyonda aynı kod yok, sorunsuz kopyalanacak.
              </div>
            );
          })()}

          <button
            disabled={!kopyalaModal.hedefKolId}
            onClick={() => {
              const ayniKodModel = modeller.find(m => m.ki === kopyalaModal.hedefKolId && m.kod === kopyalaModal.model.kod);
              
              if (ayniKodModel) {
                if (!confirm("Hedef koleksiyonda " + kopyalaModal.model.kod + " kodlu model var.\n\nÜzerine yazılsın mı?")) return;
                const yeniListe = modeller.filter(m => m.id !== ayniKodModel.id);
                const kopya = {
                  ...kopyalaModal.model,
                  id: uid(),
                  ki: kopyalaModal.hedefKolId,
                  kaynakKi: kopyalaModal.model.kaynakKi || kopyalaModal.model.ki, // orijinal kaynak
                  t: Date.now(),
                };
                svM([...yeniListe, kopya]);
              } else {
                const kopya = {
                  ...kopyalaModal.model,
                  id: uid(),
                  ki: kopyalaModal.hedefKolId,
                  kaynakKi: kopyalaModal.model.kaynakKi || kopyalaModal.model.ki, // orijinal kaynak
                  t: Date.now(),
                };
                svM([...modeller, kopya]);
              }
              
              setKopyalaModal(null);
              const hedef = kollar.find(k=>k.id===kopyalaModal.hedefKolId);
              if (hedef) { setAktifKol(hedef); setSayfa("modeller"); }
            }}
            style={{ ...BG, width:"100%", marginTop:10, opacity:kopyalaModal.hedefKolId?1:0.4 }}>
            Aynı Kod ile Kopyala
          </button>
        </Modal>
      )}

      {/* HURDA MODAL */}
      {hurdaModal && (
        <Modal open={!!hurdaModal} onClose={()=>setHurdaModal(null)} title="Hurda Kaydı">
          <div style={{ fontSize:11, fontWeight:700, color:"var(--goldtext)", marginBottom:12 }}>
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
      <Modal open={katalogSiralaModal} onClose={()=>setKatalogSiralaModal(false)} title={"Katalog — " + (katalogKol?.ad||"")} wide>
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
              // Vercel'deki gibi kategoriye göre grupla, içlerinde koda göre sırala
              const KAT_SIRA = { yuzuk:1, kolye:2, kupe:3, bileklik:4, bilezik:5, pendant:6, set:7, diger:8 };
              const sirali = [...km].sort((a, b) => {
                const ka = KAT_SIRA[a.kategori] || 99;
                const kb = KAT_SIRA[b.kategori] || 99;
                if (ka !== kb) return ka - kb;
                return dogalSirala(a, b);
              });
              setKatalogSiraliModeller(sirali);
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
                setKatalogSiraliModeller([...katalogSiraliModeller, ...eklenecekler]);
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
                    setKatalogSiraliModeller([...katalogSiraliModeller, ...eklenecekler]);
                  }} style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.15)", borderRadius:6, padding:"2px 8px", color:"#a78bfa", fontSize:8, cursor:"pointer" }}>
                    #{et} ({km.length})
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* SEÇİLİ MODEL SAYISI */}
        <div style={{ fontSize:9, color:T.sub, marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span><b style={{ color:T.gold }}>{katalogSiraliModeller.length}</b> model seçili — PDF'e girecek</span>
          <div style={{ display:"flex", gap:5 }}>
            <button onClick={() => setKatalogSiraliModeller([...katalogSiraliModeller].sort(dogalSirala))} style={{ background:"rgba(91,155,213,0.1)", border:"1px solid rgba(91,155,213,0.2)", borderRadius:5, padding:"4px 10px", color:"#5b9bd5", fontSize:9, fontWeight:700, cursor:"pointer" }}>↕ Koda Göre</button>
            <button onClick={() => {
              // Koleksiyona göre grupla — kaynakKi varsa o, yoksa ki
              const sortByKol = [...katalogSiraliModeller].sort((a, b) => {
                const kolA = a.kaynakKi || a.ki || "";
                const kolB = b.kaynakKi || b.ki || "";
                // Koleksiyon adına göre alfabetik
                const kolAdA = kollar.find(k => k.id === kolA)?.ad || "ZZZ";
                const kolAdB = kollar.find(k => k.id === kolB)?.ad || "ZZZ";
                if (kolAdA !== kolAdB) return kolAdA.localeCompare(kolAdB, "tr");
                // Aynı koleksiyondaysalar koda göre
                return dogalSirala(a, b);
              });
              setKatalogSiraliModeller(sortByKol);
            }} style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.25)", borderRadius:5, padding:"4px 10px", color:"#a78bfa", fontSize:9, fontWeight:700, cursor:"pointer" }}>📁 Koleksiyona Göre</button>
            <button onClick={() => {
              // Kategoriye göre grupla — yüzük → kolye → küpe → bileklik → bilezik → pendant → set → diğer
              const KAT_SIRA = { yuzuk:1, kolye:2, kupe:3, bileklik:4, bilezik:5, pendant:6, set:7, diger:8 };
              const sortByKat = [...katalogSiraliModeller].sort((a, b) => {
                const ka = KAT_SIRA[a.kategori] || 99;
                const kb = KAT_SIRA[b.kategori] || 99;
                if (ka !== kb) return ka - kb;
                // Aynı kategoride koda göre
                return dogalSirala(a, b);
              });
              setKatalogSiraliModeller(sortByKat);
            }} style={{ background:"rgba(232,167,79,0.1)", border:"1px solid rgba(232,167,79,0.25)", borderRadius:5, padding:"4px 10px", color:"#e8a74f", fontSize:9, fontWeight:700, cursor:"pointer" }}>🏷 Kategoriye Göre</button>
            <button onClick={() => setKatalogSiraliModeller([...katalogSiraliModeller].sort((a,b)=>(b.t||0)-(a.t||0)))} style={{ background:"rgba(106,191,105,0.1)", border:"1px solid rgba(106,191,105,0.25)", borderRadius:5, padding:"4px 10px", color:"#6abf69", fontSize:9, fontWeight:700, cursor:"pointer" }}>🕐 Yeni→Eski</button>
            <button onClick={() => setKatalogSiraliModeller([...katalogSiraliModeller].sort((a,b)=>(a.t||0)-(b.t||0)))} style={{ background:"rgba(106,191,105,0.1)", border:"1px solid rgba(106,191,105,0.25)", borderRadius:5, padding:"4px 10px", color:"#6abf69", fontSize:9, fontWeight:700, cursor:"pointer" }}>🕐 Eski→Yeni</button>
          </div>
        </div>

        {/* MODEL LİSTESİ */}
        <div style={{ maxHeight:520, overflowY:"auto", marginBottom:10, border:"1px solid "+T.border, borderRadius:8 }}>
          {katalogSiraliModeller.length === 0 && (
            <div style={{ padding:"20px", textAlign:"center", color:T.dim, fontSize:10 }}>Henüz model seçilmedi — yukarıdan ekleyin</div>
          )}
          {katalogSiraliModeller.map((m, i) => {
            const kaynakKolId = m.kaynakKi || m.ki;
            const kaynakKol = kollar.find(k => k.id === kaynakKolId);
            const kaynakAd = kaynakKol?.ad || "—";
            return (
            <div key={m.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background: i%2===0 ? T.card : "transparent", borderBottom:"1px solid "+T.border }}>
              <span style={{ fontSize:10, color:T.dim, width:30, textAlign:"right", flexShrink:0, fontWeight:700 }}>{i+1}.</span>
              <div className="model-foto-wrap" style={{ width:60, height:60, borderRadius:6, overflow:"hidden", flexShrink:0 }}>{m.foto ? <img src={m.foto} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }}/> : <div style={{ width:"100%", height:"100%", background:T.card }}/>}</div>
              <span style={{ fontSize:12, color:T.gold, fontWeight:800, width:110, flexShrink:0 }}>{m.kod || "—"}</span>
              <span style={{ fontSize:10, color:T.sub, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.ad || ""}</span>
              <span style={{ fontSize:9, color:"#a78bfa", flexShrink:0, padding:"2px 7px", background:"rgba(167,139,250,0.08)", borderRadius:4, fontWeight:700, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>📁 {kaynakAd}</span>
              <span style={{ fontSize:9, color:T.dim, flexShrink:0, padding:"2px 7px", background:T.card, borderRadius:4 }}>{m.kategori||""}</span>
              <span style={{ fontSize:9, color:T.text, flexShrink:0, fontWeight:700 }}>{m.gram||"—"}gr</span>
              <button onClick={() => {
                const y = [...katalogSiraliModeller]; [y[i-1], y[i]] = [y[i], y[i-1]]; setKatalogSiraliModeller(y);
              }} disabled={i===0} style={{ background:"none", border:"1px solid "+T.btnBorder, borderRadius:5, color:T.text, cursor:"pointer", fontSize:13, padding:"3px 8px", opacity:i===0?0.3:1, flexShrink:0, fontWeight:700 }}>↑</button>
              <button onClick={() => {
                const y = [...katalogSiraliModeller]; [y[i], y[i+1]] = [y[i+1], y[i]]; setKatalogSiraliModeller(y);
              }} disabled={i===katalogSiraliModeller.length-1} style={{ background:"none", border:"1px solid "+T.btnBorder, borderRadius:5, color:T.text, cursor:"pointer", fontSize:13, padding:"3px 8px", opacity:i===katalogSiraliModeller.length-1?0.3:1, flexShrink:0, fontWeight:700 }}>↓</button>
              <button onClick={() => setKatalogSiraliModeller(katalogSiraliModeller.filter((_,j)=>j!==i))} style={{ background:"rgba(232,90,79,0.1)", border:"1px solid rgba(232,90,79,0.2)", borderRadius:5, color:"#e85a4f", cursor:"pointer", fontSize:11, padding:"3px 8px", flexShrink:0, fontWeight:700 }}>✕</button>
            </div>
            );
          })}
        </div>

        {/* SAYFA HARİTASI — hangi koleksiyon hangi sayfalarda */}
        {katalogSiraliModeller.length > 0 && (() => {
          const cols = katalogSutun;
          const perPage = cols === 4 ? 16 : 12;
          // 1. sayfa kapak
          let pageNum = 1; // kapak
          let kapasite = 0;
          // her modelin sayfa numarasını hesapla
          const sayfaMap = []; // [{kolAd, baslangic, bitis}]
          let mevcutKol = null;
          
          katalogSiraliModeller.forEach(m => {
            let yer = 1;
            if (m.kategori === "bileklik") yer = cols;
            else if (m.kategori === "kolye") yer = cols * 2;
            
            if (kapasite + yer > perPage) {
              pageNum++;
              kapasite = 0;
            }
            if (kapasite === 0 && mevcutKol === null) pageNum++; // ilk sayfa içerik
            
            const kolId = m.kaynakKi || m.ki;
            const kol = kollar.find(k => k.id === kolId);
            const kolAd = kol?.ad || "—";
            
            const sayfa = pageNum;
            const son = sayfaMap[sayfaMap.length - 1];
            if (son && son.kolAd === kolAd) {
              son.bitis = sayfa;
            } else {
              sayfaMap.push({ kolAd, baslangic: sayfa, bitis: sayfa });
            }
            
            kapasite += yer;
          });
          
          // Tekrarlanan koleksiyonları birleştir + model sayısı say
          const birlesik = {};
          katalogSiraliModeller.forEach(m => {
            const kolId = m.kaynakKi || m.ki;
            const kol = kollar.find(k => k.id === kolId);
            const kolAd = kol?.ad || "—";
            if (!birlesik[kolAd]) birlesik[kolAd] = { baslangic: 999, bitis: 0, sayi: 0 };
            birlesik[kolAd].sayi++;
          });
          sayfaMap.forEach(s => {
            if (birlesik[s.kolAd]) {
              birlesik[s.kolAd].baslangic = Math.min(birlesik[s.kolAd].baslangic, s.baslangic);
              birlesik[s.kolAd].bitis = Math.max(birlesik[s.kolAd].bitis, s.bitis);
            }
          });
          
          return (
            <div style={{ background:"rgba(167,139,250,0.05)", border:"1px solid rgba(167,139,250,0.15)", borderRadius:8, padding:"8px 10px", marginBottom:8 }}>
              <div style={{ fontSize:9, color:"#a78bfa", fontWeight:700, marginBottom:5, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>📑 Sayfa Haritası (Toplam {pageNum} sayfa · {katalogSiraliModeller.length} model)</span>
                <span style={{ fontSize:8, color:T.dim, fontWeight:400 }}>⋮⋮ Sürükle-bırak ile koleksiyon sırasını değiştir</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                {Object.entries(birlesik).map(([ad, r], i) => {
                  const isDragging = dragHaritaKol === ad;
                  const isDragOver = dragOverHaritaKol === ad && dragHaritaKol !== null && dragHaritaKol !== ad;
                  return (
                    <div key={ad}
                      draggable
                      onDragStart={(e) => {
                        setDragHaritaKol(ad);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverHaritaKol !== ad) setDragOverHaritaKol(ad);
                      }}
                      onDragLeave={() => {
                        if (dragOverHaritaKol === ad) setDragOverHaritaKol(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (!dragHaritaKol || dragHaritaKol === ad) {
                          setDragHaritaKol(null);
                          setDragOverHaritaKol(null);
                          return;
                        }
                        // Koleksiyon sırasını değiştir → modelleri o sıraya göre yeniden diz
                        const koleksiyonSirasi = Object.keys(birlesik);
                        const eskiIdx = koleksiyonSirasi.indexOf(dragHaritaKol);
                        const yeniIdx = koleksiyonSirasi.indexOf(ad);
                        if (eskiIdx === -1 || yeniIdx === -1) return;
                        const yeniKolSira = [...koleksiyonSirasi];
                        const [tasinan] = yeniKolSira.splice(eskiIdx, 1);
                        yeniKolSira.splice(yeniIdx, 0, tasinan);
                        // Şimdi modelleri bu yeni koleksiyon sırasına göre diz
                        const yeniModelSira = [];
                        yeniKolSira.forEach(kolAd => {
                          katalogSiraliModeller.forEach(m => {
                            const kolId = m.kaynakKi || m.ki;
                            const kol = kollar.find(k => k.id === kolId);
                            const mAd = kol?.ad || "—";
                            if (mAd === kolAd) yeniModelSira.push(m);
                          });
                        });
                        setKatalogSiraliModeller(yeniModelSira);
                        setDragHaritaKol(null);
                        setDragOverHaritaKol(null);
                      }}
                      onDragEnd={() => {
                        setDragHaritaKol(null);
                        setDragOverHaritaKol(null);
                      }}
                      style={{
                        display:"flex", justifyContent:"space-between", fontSize:10, alignItems:"center",
                        padding:"4px 6px", borderRadius:4, cursor:"grab",
                        background: isDragOver ? "rgba(167,139,250,0.25)" : "transparent",
                        borderTop: isDragOver ? "2px solid #a78bfa" : "2px solid transparent",
                        opacity: isDragging ? 0.4 : 1,
                        transition: "background 0.15s",
                        userSelect: "none"
                      }}>
                      <span style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <span style={{ color:"#665d4a", fontSize:11 }}>⋮⋮</span>
                        <span style={{ color:T.text, fontWeight:600 }}>{ad} <span style={{ color:T.dim, fontSize:9, fontWeight:400 }}>({r.sayi} model)</span></span>
                      </span>
                      <span style={{ color:T.gold, fontWeight:700 }}>
                        {r.baslangic === r.bitis ? "Sayfa " + r.baslangic : "Sayfa " + r.baslangic + " – " + r.bitis}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* PDF AL */}
        <button onClick={() => {
          if (katalogSiraliModeller.length === 0) { alert("Hiç model seçilmedi!"); return; }
          downloadPDF(buildKatalogHTML(katalogKol, katalogSiraliModeller, katalogSutun, katalogAyar, kollar), katalogKol.ad+"-"+katalogAyar+"-katalog");
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
                ✓ Geçerli — <b>{d.modeller?.length||0} model</b> · <b>{d.kollar?.length||0} koleksiyon</b> · <b>{d.siparisler?.length||0} sipariş</b> · <b>{d.musteriler ? Object.keys(d.musteriler).length : 0} müşteri</b>{d.kasa ? " · Kasa ✓" : ""}{d.tema ? " · Tema ✓" : ""}
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
              // Kasa
              if (d.kasa && Object.keys(d.kasa).length > 0) {
                await sv("v7kasa", d.kasa);
                setKasa(d.kasa);
              }
              // localStorage verileri
              if (d.mizanEslestirme && Object.keys(d.mizanEslestirme).length > 0) {
                try { localStorage.setItem("mizan_eslestirme", JSON.stringify(d.mizanEslestirme)); setMizanEslestirme(d.mizanEslestirme); } catch {}
              }
              if (d.yaziRenkleri && Object.keys(d.yaziRenkleri).length > 0) {
                try { localStorage.setItem("atolye_yazi_renk", JSON.stringify(d.yaziRenkleri)); setYaziRenkleri(d.yaziRenkleri); } catch {}
              }
              if (d.tema) {
                try { localStorage.setItem("atolye_tema", d.tema); } catch {}
              }
              setDriveYukleniyor(null);
              setShowYedek(false);
              setYedekJson("");
              alert("✓ Yükleme tamamlandı!\n" + (d.modeller?.length||0) + " model\n" + (d.kollar?.length||0) + " koleksiyon\n" + (d.siparisler?.length||0) + " sipariş\nKasa ve ayarlar da geri yüklendi.");
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
      {/* ZAMAN ÇİZELGESİ MODAL */}
      {cizelgeModal && (() => {
        const s = siparisler.find(x => x.id === cizelgeModal);
        if (!s) return null;
        const gecmis = s.durumGecmisi || [];
        if (!gecmis.length) return null;
        const toplamSure = isGunuSure(gecmis[0].tarih, Date.now());
        const sonGec = gecmis[gecmis.length-1];
        const tamamlandi = ["tamam","teslim"].includes(sonGec.durum);
        const sonrakiDurum = DURUMLAR[DURUMLAR.findIndex(d=>d.id===sonGec.durum)+1];
        return (
          <Modal open={!!cizelgeModal} onClose={()=>setCizelgeModal(null)} title={"⏱ Üretim Takibi — " + (s.musteri||"")} wide>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, padding:"8px 12px", background:"rgba(91,155,213,0.08)", borderRadius:8 }}>
              <div>
                <div style={{ fontSize:11, color:"#5b9bd5", fontWeight:700 }}>Sipariş: {s.musteri}</div>
                <div style={{ fontSize:9, color:"#998a6e", marginTop:2 }}>{(s.kalemler||[]).length} kalem · {gecmis.length} aşama</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9, color:"#665d4a" }}>Toplam İş Günü Süresi</div>
                <div style={{ fontSize:14, color:"var(--goldtext)", fontWeight:800 }}>{sureFmt(toplamSure)}</div>
                {tamamlandi && <div style={{ fontSize:9, color:"#6abf69", fontWeight:700, marginTop:2 }}>✓ Tamamlandı</div>}
              </div>
            </div>

            {/* Aşamalar yatay */}
            <div style={{ overflowX:"auto", paddingBottom:8, marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:0, minWidth:"max-content", padding:"4px 0" }}>
                {gecmis.map((gec, gi) => {
                  const durObj = DURUMLAR.find(d=>d.id===gec.durum)||DURUMLAR[0];
                  const sonrakiGec = gecmis[gi+1];
                  const buSure = isGunuSure(gec.tarih, sonrakiGec ? sonrakiGec.tarih : Date.now());
                  const aktif = gi === gecmis.length - 1;
                  return (
                    <div key={gi} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                      <div style={{ textAlign:"center", width:110 }}>
                        <div
                          onClick={()=>{
                            // Son aşamaya tıklanınca geri al
                            if (aktif && gecmis.length > 1) {
                              if (!window.confirm(durObj.l + " aşaması geri alınsın mı?")) return;
                              setSiparisler(prev => {
                                const yeni = prev.map(sp => {
                                  if (sp.id !== s.id) return sp;
                                  const yeniGecmis = sp.durumGecmisi.slice(0, -1);
                                  return { ...sp, durumGecmisi: yeniGecmis };
                                });
                                versiyonDamgala("v7s", yeni);
                                return yeni;
                              });
                            }
                          }}
                          style={{ width:42, height:42, borderRadius:21, background:durObj.c+"33", border:"2px solid "+durObj.c+(aktif&&!tamamlandi?"":"99"), margin:"0 auto 5px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:aktif&&!tamamlandi?"0 0 14px "+durObj.c+"88":"none", cursor: aktif && gecmis.length > 1 ? "pointer" : "default" }}
                          title={aktif && gecmis.length > 1 ? "Tıkla: bu aşamayı geri al" : ""}>
                          <div style={{ width:16, height:16, borderRadius:8, background:durObj.c }}/>
                        </div>
                        <div style={{ fontSize:10, fontWeight:700, color:durObj.c, whiteSpace:"nowrap" }}>{durObj.l}</div>
                        <div style={{ fontSize:10, color:"#6abf69", fontWeight:600, marginTop:2 }}>{sureFmt(buSure)}</div>
                        {gec.durum==="dokum" && s.dokumTeslimTahmini && (
                          <div style={{ fontSize:8, color:"#e8833a", marginTop:2 }}>
                            ⏰ {new Date(s.dokumTeslimTahmini).toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit"})} {new Date(s.dokumTeslimTahmini).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}
                          </div>
                        )}
                        {gec.durum==="tas_dus" && s.tasDizimSuresiMs && (
                          <div style={{ fontSize:8, color:"#a78bfa", marginTop:2 }}>
                            ~{Math.ceil(s.tasDizimSuresiMs/3600000)}sa · {s.tasDizimTasAdet} taş
                          </div>
                        )}
                        <div style={{ fontSize:8, color:"#7a6f5a", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:3, marginTop:2 }}
                          onClick={()=>{
                            const tarihStr = new Date(gec.tarih).toISOString().slice(0,16);
                            setManuelTarihModal({ sipId: s.id, gecmisIdx: gi, durum: gec.durum, durumL: durObj.l, tarih: tarihStr });
                          }}
                          title="Tarihi düzenle">
                          <span>{new Date(gec.tarih).toLocaleDateString("tr-TR")}</span>
                          <span style={{ color:"#998a6e", fontSize:10 }}>✏</span>
                        </div>
                      </div>
                      {gi < gecmis.length - 1 && (
                        <div style={{ width:30, height:2, background:"rgba(201,168,76,0.3)", flexShrink:0, marginBottom:36 }}/>
                      )}
                    </div>
                  );
                })}
                {/* Sonraki aşama butonu */}
                {sonrakiDurum && !tamamlandi && (
                  <div style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                    <div style={{ width:30, height:2, background:"rgba(201,168,76,0.12)", flexShrink:0, marginBottom:36 }}/>
                    <button onClick={()=>{
                      svS(siparisler.map(sp=>sp.id===s.id?{...sp,kalemDurumlar:Object.fromEntries((sp.kalemler||[]).map(k=>[(k.id),(sp.kalemDurumlar||{})[k.id]==="hurda"?"hurda":sonrakiDurum.id]))}:sp));
                      sipDurumKaydet(s.id, sonrakiDurum.id);
                    }} style={{ background:sonrakiDurum.c+"22", border:"2px dashed "+sonrakiDurum.c+"66", borderRadius:10, padding:"8px 14px", color:sonrakiDurum.c, fontSize:10, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", marginBottom:36, textAlign:"center", width:110 }}>
                      → {sonrakiDurum.l}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Aşama süreleri bar grafiği */}
            <div style={{ borderTop:"1px solid rgba(91,155,213,0.15)", paddingTop:12 }}>
              <div style={{ fontSize:10, color:"#5b9bd5", marginBottom:8, fontWeight:700 }}>AŞAMA SÜRELERİ DAĞILIMI</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {gecmis.map((gec, gi) => {
                  const durObj = DURUMLAR.find(d=>d.id===gec.durum)||DURUMLAR[0];
                  const sonrakiGec = gecmis[gi+1];
                  const buSure = isGunuSure(gec.tarih, sonrakiGec ? sonrakiGec.tarih : Date.now());
                  const pct = toplamSure > 0 ? Math.round(buSure/toplamSure*100) : 0;
                  return (
                    <div key={gi} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:80, fontSize:9, color:durObj.c, fontWeight:700, flexShrink:0 }}>{durObj.l}</div>
                      <div style={{ flex:1, height:8, background:"rgba(255,255,255,0.05)", borderRadius:4, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:pct+"%", background:durObj.c, borderRadius:4, opacity:0.8, transition:"width 0.3s" }}/>
                      </div>
                      <div style={{ width:120, fontSize:9, color:"#c0b399", textAlign:"right", flexShrink:0, fontWeight:600 }}>{sureFmt(buSure)} <span style={{ color:"#665d4a" }}>({pct}%)</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* İADE MODAL — kalem bazlı (hurda mantığında) */}
      {iadeModal && (
        <Modal open={!!iadeModal} onClose={()=>setIadeModal(null)} title="İade Kaydı">
          <div style={{ fontSize:11, color:"#a78bfa", fontWeight:700, marginBottom:10, padding:"6px 10px", background:"rgba(167,139,250,0.08)", borderRadius:6 }}>
            {iadeModal.kalemKod && <span style={{ color:GOLD, marginRight:6 }}>{iadeModal.kalemKod}</span>}{iadeModal.kalemAd}
          </div>
          
          <Fl label="İade Türü">
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>setIadeModal(p=>({...p, iadeTuru:"para"}))} style={{
                flex:1, padding:"7px", border:"1px solid "+(iadeModal.iadeTuru==="para"?"#a78bfa":"rgba(255,255,255,0.1)"),
                background:iadeModal.iadeTuru==="para"?"rgba(167,139,250,0.15)":"transparent",
                borderRadius:6, color:iadeModal.iadeTuru==="para"?"#a78bfa":"#998a6e", fontSize:10, fontWeight:700, cursor:"pointer"
              }}>💵 Para İadesi</button>
              <button onClick={()=>setIadeModal(p=>({...p, iadeTuru:"degisim"}))} style={{
                flex:1, padding:"7px", border:"1px solid "+(iadeModal.iadeTuru==="degisim"?"#a78bfa":"rgba(255,255,255,0.1)"),
                background:iadeModal.iadeTuru==="degisim"?"rgba(167,139,250,0.15)":"transparent",
                borderRadius:6, color:iadeModal.iadeTuru==="degisim"?"#a78bfa":"#998a6e", fontSize:10, fontWeight:700, cursor:"pointer"
              }}>🔄 Mal Değişimi</button>
            </div>
          </Fl>

          <Fl label={"İade Adedi (max "+iadeModal.maxAdet+")"}>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {Array.from({length:iadeModal.maxAdet+1},(_,i)=>i).map(n => (
                <button key={n} onClick={()=>setIadeModal(p=>({...p,mevcAdet:n}))}
                  style={{ background:iadeModal.mevcAdet===n?"rgba(167,139,250,0.25)":"rgba(167,139,250,0.06)", border:"1px solid", borderColor:iadeModal.mevcAdet===n?"rgba(167,139,250,0.5)":"rgba(167,139,250,0.15)", borderRadius:6, padding:"5px 10px", color:iadeModal.mevcAdet===n?"#a78bfa":"#998a6e", fontSize:12, fontWeight:iadeModal.mevcAdet===n?800:400, cursor:"pointer", minWidth:36 }}>
                  {n}
                </button>
              ))}
            </div>
          </Fl>

          <Fl label="İade Nedeni (opsiyonel)">
            <textarea value={iadeModal.mevcNeden||""} onChange={e=>setIadeModal(p=>({...p, mevcNeden:e.target.value}))}
              placeholder="Örnek: Müşteri taşı beğenmedi, boyut uymadı, vb."
              style={{ ...IS, padding:"7px 10px", fontSize:11, minHeight:50, resize:"vertical" }}/>
          </Fl>

          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <button onClick={()=>setIadeModal(null)} style={{ flex:1, padding:"9px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#998a6e", fontSize:11, fontWeight:700, cursor:"pointer" }}>İptal</button>
            <button onClick={()=>{
              const sip = siparisler.find(x=>x.id===iadeModal.sipId);
              if (!sip) return;
              const yeniKalemIade = { ...(sip.kalemIade||{}) };
              const yeniKalemIadeNeden = { ...(sip.kalemIadeNeden||{}) };
              const yeniKalemIadeTuru = { ...(sip.kalemIadeTuru||{}) };
              if (iadeModal.mevcAdet > 0) {
                yeniKalemIade[iadeModal.kalemId] = iadeModal.mevcAdet;
                yeniKalemIadeNeden[iadeModal.kalemId] = iadeModal.mevcNeden || "";
                yeniKalemIadeTuru[iadeModal.kalemId] = iadeModal.iadeTuru || "para";
              } else {
                delete yeniKalemIade[iadeModal.kalemId];
                delete yeniKalemIadeNeden[iadeModal.kalemId];
                delete yeniKalemIadeTuru[iadeModal.kalemId];
              }
              svS(siparisler.map(x => x.id===iadeModal.sipId ? {...x, kalemIade:yeniKalemIade, kalemIadeNeden:yeniKalemIadeNeden, kalemIadeTuru:yeniKalemIadeTuru} : x));
              setIadeModal(null);
            }} style={{ flex:2, padding:"9px", background:"linear-gradient(135deg,#a78bfa,#8b6fe0)", border:"none", borderRadius:8, color:"#fff", fontSize:11, fontWeight:800, cursor:"pointer" }}>
              ↩ Kaydet
            </button>
          </div>
        </Modal>
      )}

      {/* TAMİR MODAL */}
      {tamirModal && (
        <Modal open={!!tamirModal} onClose={()=>setTamirModal(null)} title="Tamir Kaydı">
          <div style={{ fontSize:11, color:"#5b9bd5", fontWeight:700, marginBottom:10, padding:"6px 10px", background:"rgba(91,155,213,0.08)", borderRadius:6 }}>
            {tamirModal.kalemKod && <span style={{ color:GOLD, marginRight:6 }}>{tamirModal.kalemKod}</span>}{tamirModal.kalemAd}
          </div>

          <Fl label={"Tamir Adedi (max "+tamirModal.maxAdet+")"}>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {Array.from({length:tamirModal.maxAdet+1},(_,i)=>i).map(n => (
                <button key={n} onClick={()=>setTamirModal(p=>({...p,mevcAdet:n}))}
                  style={{ background:tamirModal.mevcAdet===n?"rgba(91,155,213,0.25)":"rgba(91,155,213,0.06)", border:"1px solid", borderColor:tamirModal.mevcAdet===n?"rgba(91,155,213,0.5)":"rgba(91,155,213,0.15)", borderRadius:6, padding:"5px 10px", color:tamirModal.mevcAdet===n?"#5b9bd5":"#998a6e", fontSize:12, fontWeight:tamirModal.mevcAdet===n?800:400, cursor:"pointer", minWidth:36 }}>
                  {n}
                </button>
              ))}
            </div>
          </Fl>

          <Fl label="Tamir Açıklaması (opsiyonel)">
            <textarea value={tamirModal.mevcNeden||""} onChange={e=>setTamirModal(p=>({...p, mevcNeden:e.target.value}))}
              placeholder="Örnek: Taş düştü, kopça gevşek, boyut değişikliği vb."
              style={{ ...IS, padding:"7px 10px", fontSize:11, minHeight:50, resize:"vertical" }}/>
          </Fl>

          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <button onClick={()=>setTamirModal(null)} style={{ flex:1, padding:"9px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#998a6e", fontSize:11, fontWeight:700, cursor:"pointer" }}>İptal</button>
            <button onClick={()=>{
              const sip = siparisler.find(x=>x.id===tamirModal.sipId);
              if (!sip) return;
              const yeniKalemTamir = { ...(sip.kalemTamir||{}) };
              const yeniKalemTamirNeden = { ...(sip.kalemTamirNeden||{}) };
              if (tamirModal.mevcAdet > 0) {
                yeniKalemTamir[tamirModal.kalemId] = tamirModal.mevcAdet;
                yeniKalemTamirNeden[tamirModal.kalemId] = tamirModal.mevcNeden || "";
              } else {
                delete yeniKalemTamir[tamirModal.kalemId];
                delete yeniKalemTamirNeden[tamirModal.kalemId];
              }
              svS(siparisler.map(x => x.id===tamirModal.sipId ? {...x, kalemTamir:yeniKalemTamir, kalemTamirNeden:yeniKalemTamirNeden} : x));
              setTamirModal(null);
            }} style={{ flex:2, padding:"9px", background:"linear-gradient(135deg,#5b9bd5,#4a89c4)", border:"none", borderRadius:8, color:"#fff", fontSize:11, fontWeight:800, cursor:"pointer" }}>
              🔧 Kaydet
            </button>
          </div>
        </Modal>
      )}

      {/* MANUEL TARİH DÜZENLEME MODAL */}
      <Modal open={!!manuelTarihModal} onClose={()=>setManuelTarihModal(null)} title="Aşama Tarihini Düzenle">
        {manuelTarihModal && (
          <>
            <div style={{ fontSize:11, color:"#998a6e", marginBottom:14, padding:"8px 10px", background:"rgba(91,155,213,0.05)", borderRadius:8 }}>
              <b style={{ color:"#5b9bd5" }}>{manuelTarihModal.durumL}</b> aşamasının başlangıç tarihini değiştirebilirsiniz. Geçmişte unuttuğunuz siparişler için kullanın.
            </div>
            <Fl label="Tarih ve Saat">
              <input type="datetime-local" value={manuelTarihModal.tarih}
                onChange={e=>setManuelTarihModal(p=>({...p, tarih:e.target.value}))}
                style={{ ...IS, padding:"8px 10px", fontSize:13 }}/>
            </Fl>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button onClick={()=>setManuelTarihModal(null)} style={{ flex:1, padding:"9px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#998a6e", fontSize:11, fontWeight:700, cursor:"pointer" }}>İptal</button>
              <button onClick={()=>{
                const yeniTarih = new Date(manuelTarihModal.tarih).getTime();
                if (isNaN(yeniTarih)) { alert("Geçersiz tarih!"); return; }
                setSiparisler(prev => {
                  const yeni = prev.map(sp => {
                    if (sp.id !== manuelTarihModal.sipId) return sp;
                    const gecmis = [...(sp.durumGecmisi||[])];
                    if (gecmis[manuelTarihModal.gecmisIdx]) {
                      gecmis[manuelTarihModal.gecmisIdx] = { ...gecmis[manuelTarihModal.gecmisIdx], tarih: yeniTarih, manuel: true };
                      // Tarihe göre yeniden sırala
                      gecmis.sort((a,b) => a.tarih - b.tarih);
                    }
                    return { ...sp, durumGecmisi: gecmis };
                  });
                  versiyonDamgala("v7s", yeni);
                  return yeni;
                });
                setManuelTarihModal(null);
              }} style={{ flex:1, padding:"9px", background:"#c9a84c", border:"none", borderRadius:8, color:"#110f0a", fontSize:11, fontWeight:800, cursor:"pointer" }}>Kaydet</button>
            </div>
          </>
        )}
      </Modal>

      {/* KOLEKSİYONLARI HİZALA MODAL */}
      <Modal open={hizalaModal} onClose={()=>setHizalaModal(false)} title="Koleksiyonları Hizala" wide>
        <div style={{ fontSize:10, color:"#998a6e", marginBottom:10 }}>
          Koleksiyonların ana sayfada hangi sırayla görüneceğini belirleyin.
        </div>

        {/* OTOMATİK SIRALAMALAR */}
        <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:"var(--gold)", fontWeight:700, alignSelf:"center" }}>Otomatik:</span>
          <button onClick={() => {
            // Yüzük → Kolye → Küpe → Bileklik → Bilezik → Pendant → Set → Diğer ağırlıklarına göre
            const KAT_SIRA = { yuzuk:1, kolye:2, kupe:3, bileklik:4, bilezik:5, pendant:6, set:7, diger:8 };
            const yeniSira = [...kollar].sort((a, b) => {
              const aMod = modeller.filter(m => m.ki === a.id);
              const bMod = modeller.filter(m => m.ki === b.id);
              // Her koleksiyondaki en yaygın kategoriyi bul
              const enCokKat = (mods) => {
                const sayac = {};
                mods.forEach(m => { sayac[m.kategori] = (sayac[m.kategori]||0) + 1; });
                let max = 0, kat = "diger";
                Object.entries(sayac).forEach(([k,v]) => { if (v > max) { max = v; kat = k; } });
                return kat;
              };
              const katA = enCokKat(aMod);
              const katB = enCokKat(bMod);
              const sA = KAT_SIRA[katA] || 99;
              const sB = KAT_SIRA[katB] || 99;
              if (sA !== sB) return sA - sB;
              // Aynı kategori ağırlığında ad sırası
              return (a.ad || "").localeCompare(b.ad || "", "tr");
            });
            svK(yeniSira);
          }} style={{ background:"rgba(91,155,213,0.1)", border:"1px solid rgba(91,155,213,0.25)", borderRadius:6, padding:"5px 12px", color:"#5b9bd5", fontSize:10, fontWeight:700, cursor:"pointer" }}>📊 Kategori Ağırlığına Göre</button>

          <button onClick={() => {
            const yeniSira = [...kollar].sort((a, b) => (a.ad || "").localeCompare(b.ad || "", "tr"));
            svK(yeniSira);
          }} style={{ background:"rgba(106,191,105,0.1)", border:"1px solid rgba(106,191,105,0.25)", borderRadius:6, padding:"5px 12px", color:"#6abf69", fontSize:10, fontWeight:700, cursor:"pointer" }}>🔤 A-Z (İsim)</button>

          <button onClick={() => {
            const yeniSira = [...kollar].sort((a, b) => {
              const aSayi = modeller.filter(m => m.ki === a.id).length;
              const bSayi = modeller.filter(m => m.ki === b.id).length;
              return bSayi - aSayi; // çoktan aza
            });
            svK(yeniSira);
          }} style={{ background:"rgba(232,167,79,0.1)", border:"1px solid rgba(232,167,79,0.25)", borderRadius:6, padding:"5px 12px", color:"#e8a74f", fontSize:10, fontWeight:700, cursor:"pointer" }}>📦 Model Sayısına Göre</button>
        </div>

        {/* MANUEL SIRALAMA LİSTESİ */}
        <div style={{ fontSize:10, color:"var(--gold)", fontWeight:700, marginBottom:6 }}>↕ Manuel Sıralama (sürükle-bırak veya ↑↓)</div>
        <div style={{ maxHeight:520, overflowY:"auto", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8 }}>
          {kollar.map((k, i) => {
            const km = modeller.filter(m => m.ki === k.id);
            // En yaygın kategoriyi bul
            const sayac = {};
            km.forEach(m => { sayac[m.kategori] = (sayac[m.kategori]||0) + 1; });
            const enCokKat = Object.entries(sayac).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—";
            const isDragging = dragKolIdx === i;
            const isDragOver = dragOverKolIdx === i && dragKolIdx !== null && dragKolIdx !== i;
            return (
              <div key={k.id}
                draggable
                onDragStart={(e) => {
                  setDragKolIdx(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverKolIdx !== i) setDragOverKolIdx(i);
                }}
                onDragLeave={() => {
                  if (dragOverKolIdx === i) setDragOverKolIdx(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragKolIdx === null || dragKolIdx === i) {
                    setDragKolIdx(null);
                    setDragOverKolIdx(null);
                    return;
                  }
                  const yeniSira = [...kollar];
                  const [tasinan] = yeniSira.splice(dragKolIdx, 1);
                  yeniSira.splice(i, 0, tasinan);
                  svK(yeniSira);
                  setDragKolIdx(null);
                  setDragOverKolIdx(null);
                }}
                onDragEnd={() => {
                  setDragKolIdx(null);
                  setDragOverKolIdx(null);
                }}
                style={{
                  display:"flex", alignItems:"center", gap:8, padding:"10px 10px",
                  background: isDragOver ? "rgba(167,139,250,0.15)" : (i%2===0 ? "rgba(255,255,255,0.02)" : "transparent"),
                  borderBottom:"1px solid rgba(255,255,255,0.04)",
                  borderTop: isDragOver ? "2px solid #a78bfa" : "none",
                  opacity: isDragging ? 0.4 : 1,
                  cursor: "grab",
                  transition: "background 0.15s",
                  userSelect: "none"
                }}>
                <span style={{ fontSize:14, color:"#665d4a", width:20, textAlign:"center", cursor:"grab" }}>⋮⋮</span>
                <span style={{ fontSize:10, color:"#665d4a", width:24, textAlign:"right", fontWeight:700 }}>{i+1}.</span>
                <span style={{ flex:1, fontSize:12, color:"var(--goldtext)", fontWeight:600 }}>{k.ad || "—"}</span>
                <span style={{ fontSize:9, color:"#a78bfa", padding:"2px 8px", background:"rgba(167,139,250,0.1)", borderRadius:4, fontWeight:600 }}>{enCokKat}</span>
                <span style={{ fontSize:9, color:"#998a6e", fontWeight:600 }}>{km.length} model</span>
                <button onClick={() => {
                  if (i === 0) return;
                  const y = [...kollar];
                  [y[i-1], y[i]] = [y[i], y[i-1]];
                  svK(y);
                }} disabled={i===0} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:5, color:"var(--goldtext)", cursor:"pointer", fontSize:13, padding:"3px 9px", opacity:i===0?0.3:1, fontWeight:700 }}>↑</button>
                <button onClick={() => {
                  if (i === kollar.length-1) return;
                  const y = [...kollar];
                  [y[i], y[i+1]] = [y[i+1], y[i]];
                  svK(y);
                }} disabled={i===kollar.length-1} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:5, color:"var(--goldtext)", cursor:"pointer", fontSize:13, padding:"3px 9px", opacity:i===kollar.length-1?0.3:1, fontWeight:700 }}>↓</button>
              </div>
            );
          })}
        </div>

        <button onClick={()=>setHizalaModal(false)} style={{ ...BG, width:"100%", marginTop:12 }}>Tamam</button>
      </Modal>

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
              {/* Mevcut modeli düzenle */}
              <button onClick={() => {
                const m = kodKontrol.eslesme;
                setEditM(m);
                setFAd(m.ad||""); setFKod(m.kod||""); setFGram(String(m.gram||"")); setFRefAyar(m.refAyar||"14K");
                setFTasGram(String(m.tasGram||"")); setFTasBoy(m.tasBoy||""); setFIscilikDolar(String(m.iscilikDolar||""));
                setFEkMaliyet(String(m.ekMaliyet||"")); setFMadenC(String(m.madenCarpan||""));
                setFKategori(m.kategori||"yuzuk"); setFKolId(m.ki||""); setFDurum(m.durum||"baslanmadi");
                setFEtiketler(m.etiketler||[]); setFFoto(m.foto||"");
              }} style={{ background:"rgba(232,90,79,0.15)", border:"1px solid rgba(232,90,79,0.3)", borderRadius:6, padding:"4px 12px", color:"#e85a4f", fontSize:9, fontWeight:700, cursor:"pointer" }}>✏ Mevcut modeli düzenle</button>
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
                  {fKategori==="pendant" && (
                    <select value={t.grup||"ana"} onChange={e=>setFTaslar(fTaslar.map((x,j)=>j===i?{...x,grup:e.target.value}:x))}
                      style={{ ...IS, width:110, padding:"2px 4px", fontSize:8, flexShrink:0 }}>
                      <option value="ana">Ana Taş</option>
                      <option value="tepelik">Tepelik Taşı</option>
                      <option value="pave">Pavé</option>
                    </select>
                  )}
                  <span style={{ fontSize:9, color: t.grup==="tepelik"?"#e8833a":t.grup==="pave"?"#a78bfa":"#5b9bd5", fontWeight:700, flex:1 }}>
                    {t.grup==="tepelik"?"🔗 ":t.grup==="pave"?"✦ ":""}{t.sekil}{t.sekil==="ROUND"?" ("+t.tur+")":""} · {t.boyut}{t.sekil==="ROUND"?"mm":""} · {t.adet} adet
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
          <Fl label="Iscilik birim ve tutar (varsayilan)" hint={fGram&&fIscilikDolar ? (fIscilikBirim==="milyem" ? fN(Number(fGram))+" x "+fN(Number(fIscilikDolar),3)+" mly = "+fN(Number(fGram)*Number(fIscilikDolar),3)+" has" : fN(Number(fGram))+" x "+fUSD(Number(fIscilikDolar))+" = "+fUSD(Number(fGram)*Number(fIscilikDolar))) : ""}>
            <div style={{ display:"flex", gap:6 }}>
              <select value={fIscilikBirim} onChange={e=>setFIscilikBirim(e.target.value)} style={{ ...IS, width:130, padding:"8px 6px", fontSize:11, flexShrink:0 }}>
                <option value="dolar">$ / gr</option>
                <option value="milyem">milyem / gr</option>
              </select>
              <input type="number" value={fIscilikDolar} onChange={e=>setFIscilikDolar(e.target.value)} placeholder={fIscilikBirim==="milyem"?"0.30":"2.75"} style={IS}/>
            </div>
            {/* Ayar bazlı işçilik */}
            <div style={{ marginTop:8, borderTop:"1px solid rgba(201,168,76,0.1)", paddingTop:8 }}>
              <div style={{ fontSize:8, color:"#8a7d64", fontWeight:700, marginBottom:6 }}>AYAR BAZLI İŞÇİLİK (opsiyonel)</div>
              {Object.entries(fIscilikAyarlar).map(([ayar, val]) => (
                <div key={ayar} style={{ display:"flex", gap:5, alignItems:"center", marginBottom:5 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:GOLD, width:30, flexShrink:0 }}>{ayar}</span>
                  <select value={val.birim||"dolar"} onChange={e=>setFIscilikAyarlar(p=>({...p,[ayar]:{...p[ayar],birim:e.target.value}}))} style={{ ...IS, width:100, padding:"4px 5px", fontSize:10 }}>
                    <option value="dolar">$ / gr</option>
                    <option value="milyem">milyem / gr</option>
                  </select>
                  <input type="number" value={val.dolar||""} onChange={e=>setFIscilikAyarlar(p=>({...p,[ayar]:{...p[ayar],dolar:e.target.value}}))} placeholder="değer" style={{ ...IS, flex:1, padding:"4px 6px", fontSize:10 }}/>
                  <button onClick={()=>setFIscilikAyarlar(p=>{ const y={...p}; delete y[ayar]; return y; })} style={{ ...RD, fontSize:9, padding:"3px 7px" }}>✕</button>
                </div>
              ))}
              <div style={{ display:"flex", gap:5, marginTop:4 }}>
                <select onChange={e=>{ if(!e.target.value) return; const ayar=e.target.value; if(!fIscilikAyarlar[ayar]) setFIscilikAyarlar(p=>({...p,[ayar]:{dolar:"",birim:fIscilikBirim}})); e.target.value=""; }} style={{ ...IS, flex:1, padding:"4px 6px", fontSize:10 }}>
                  <option value="">+ Ayar ekle...</option>
                  {["8K","10K","14K","18K","21K","22K","24K","925"].filter(a=>!fIscilikAyarlar[a]).map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>
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
