openapi: 3.1.0
info:
  title: MSK Trend Radar Ingest
  description: >
    Kuyumculuk trend kanıtlarını MSK'nın Trend Radar veritabanına kaydeder.
    Tek başına hashtag/mention kanıt sayılmaz — somut bir ürün sayfası,
    gönderi veya stok hareketi gerekir.
  version: "1.0.0"
servers:
  - url: https://atolyekoleksiyon.com
    description: Vercel'de yayınlı MSK ERP sitesi
paths:
  /api/radar-ingest:
    post:
      operationId: kaydetTrendKaniti
      summary: Bir trend bulgusunu (kaynak + trend + kanıt) kaydeder
      security:
        - RadarApiKey: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [source, trend, evidence]
              properties:
                source:
                  type: object
                  description: Bulgunun geldiği hesap/site (Instagram, Pinterest, perakendeci sitesi, vb.)
                  required: [name, platform]
                  properties:
                    name:
                      type: string
                      description: Hesap adı veya site adı (örn. "@goldconceptsusa", "James Allen")
                    platform:
                      type: string
                      enum: [instagram, pinterest, tiktok, retailer, wholesale, editorial, fair, marketplace, search, other]
                    role:
                      type: string
                      enum: [leader, regional_retail, regional_wholesale, discovery, commercial]
                      description: leader = büyük marka/öncü; regional_retail = bölgesel perakendeci (ABD/Meksika/Panama); regional_wholesale = bölgesel toptancı; discovery = keşif amaçlı hesap; commercial = doğrudan satış odaklı
                    url:
                      type: string
                      description: Hesap/site linki
                    region:
                      type: string
                      description: "örn. USA, Mexico, Panama, Global"
                    tier:
                      type: integer
                      minimum: 1
                      maximum: 3
                      description: 1 = en yüksek öncelik/güven, 3 = en düşük
                    notes:
                      type: string
                trend:
                  type: object
                  description: Tespit edilen tasarım trendi. Aynı isimde bir trend zaten varsa güncellenir/birleştirilir.
                  required: [name]
                  properties:
                    name:
                      type: string
                      description: Kısa, tutarlı trend adı (örn. "Twisted Rope Huggie Earrings") — aynı trend için hep aynı adı kullan ki tekilleşsin
                    category:
                      type: string
                      description: "örn. ring, earring, pendant, bracelet, chain, set, other"
                    design_cluster:
                      type: string
                      description: Bu trendi tanımlayan tasarım özellikleri (motif, teknik, form)
                    region:
                      type: string
                      description: "Trendin en güçlü görüldüğü bölge, örn. USA, Mexico, Panama"
                    stage:
                      type: string
                      enum: [watch, concept, sample, archive]
                      description: "watch = yeni izleniyor (varsayılan); diğerlerini sadece Mahmut/atölye değiştirir, sen normalde 'watch' bırak"
                    production_notes:
                      type: string
                      description: Üretilebilirlik ile ilgili gözlemler (teknik, malzeme, zorluk)
                    target_grams:
                      type: string
                      description: "Gözlemlenen yaklaşık gram aralığı, örn. '2-4g'"
                    karats:
                      type: array
                      items:
                        type: string
                      description: "örn. [\"10K\",\"14K\"]"
                    cz_compatible:
                      type: boolean
                      description: Zirkon/taş ile uyumlu bir tasarım mı
                    usa_fit:
                      type: integer
                      minimum: 0
                      maximum: 5
                      description: ABD pazarına uygunluk (0-5)
                    manufacturing_fit:
                      type: integer
                      minimum: 0
                      maximum: 5
                      description: MSK/BSP mevcut üretim kapasitesine uygunluk (0-5)
                    margin_fit:
                      type: integer
                      minimum: 0
                      maximum: 5
                      description: Kâr marjı potansiyeli (0-5)
                    longevity_fit:
                      type: integer
                      minimum: 0
                      maximum: 5
                      description: Geçici moda mı, kalıcı trend mi (0-5, 5=kalıcı)
                    catalog_gap:
                      type: integer
                      minimum: 0
                      maximum: 5
                      description: Mevcut katalogda bu trende ne kadar boşluk var (0-5, 5=büyük boşluk)
                evidence:
                  type: object
                  description: Bu spesifik gözlemin kanıtı (link, tarih, ne tür bir sinyal)
                  required: [signal]
                  properties:
                    url:
                      type: string
                      description: Gönderi/ürün sayfası linki
                    observed_at:
                      type: string
                      format: date
                      description: "YYYY-MM-DD, belirtilmezse bugün"
                    signal:
                      type: string
                      enum: [new_arrival, restock, repeat, variation, customer, editorial, search, other]
                      description: >
                        new_arrival = yeni ürün eklenmiş; restock = tükenip yeniden stoklanmış
                        (güçlü sinyal); repeat = aynı tasarımın tekrarı; variation = varyasyonu;
                        customer = müşteri talebi/yorumu; editorial = basın/editoryal içerik;
                        search = arama hacmi/trend verisi; other = diğer
                    note:
                      type: string
                      description: Kısa gözlem notu
      responses:
        "200":
          description: Kaydedildi
          content:
            application/json:
              schema:
                type: object
                properties:
                  basarili:
                    type: boolean
                  kaynak_id:
                    type: string
                  trend_id:
                    type: string
                  trend_yeni_mi:
                    type: boolean
                  kanit_id:
                    type: string
        "400":
          description: Geçersiz istek
        "401":
          description: Geçersiz API anahtarı
        "500":
          description: Sunucu hatası
  /api/radar-list:
    get:
      operationId: listeleTrendler
      summary: Kaydedilmiş trendleri ve son kanıt sayılarını listeler (tekrar kaydı önlemek ve özet vermek için)
      security:
        - RadarApiKey: []
      parameters:
        - name: gun
          in: query
          required: false
          schema:
            type: integer
            default: 30
          description: Son kaç gündeki kanıtlar sayılsın (varsayılan 30)
      responses:
        "200":
          description: Trend listesi
          content:
            application/json:
              schema:
                type: object
                properties:
                  basarili:
                    type: boolean
                  gun:
                    type: integer
                  trendler:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                        category:
                          type: string
                        stage:
                          type: string
                        region:
                          type: string
                        usa_fit:
                          type: integer
                        manufacturing_fit:
                          type: integer
                        margin_fit:
                          type: integer
                        longevity_fit:
                          type: integer
                        catalog_gap:
                          type: integer
                        updated_at:
                          type: string
                        son_gun_kanit_sayisi:
                          type: integer
        "401":
          description: Geçersiz API anahtarı
        "500":
          description: Sunucu hatası
  /api/radar-catalog:
    get:
      operationId: katalogYapisiniGetir
      summary: Katalog yapısını döner (koleksiyonlar, kategori/ayar dağılımı) — fiyat/müşteri verisi yok
      description: >
        MSK/BSP kataloğunun yapısı: koleksiyon isimleri, kategori ve ayar/gram
        dağılımı. Fiyat/maliyet/müşteri verisi yok. Trend değerlendirirken
        önce bunu çağır, hangi kategoride zaten güçlü/hangi kategoride
        boşluk olduğunu anlamak için.
      security:
        - RadarApiKey: []
      responses:
        "200":
          description: Katalog yapısı
          content:
            application/json:
              schema:
                type: object
                properties:
                  basarili:
                    type: boolean
                  sirketler:
                    type: array
                    items:
                      type: object
                      properties:
                        sirket:
                          type: string
                        toplam_model:
                          type: integer
                        koleksiyon_sayisi:
                          type: integer
                        koleksiyonlar:
                          type: array
                          items:
                            type: string
                        kategori_dagilimi:
                          type: array
                          items:
                            type: object
                            properties:
                              kategori: { type: string }
                              sayi: { type: integer }
                        ayar_dagilimi:
                          type: array
                          items:
                            type: object
                            properties:
                              ayar: { type: string }
                              sayi: { type: integer }
                        gram_araligi:
                          type: object
                          properties:
                            min: { type: number }
                            max: { type: number }
                            ortalama: { type: number }
        "401":
          description: Geçersiz API anahtarı
        "500":
          description: Sunucu hatası
  /api/radar-models:
    get:
      operationId: modelleriGetir
      summary: Belirli modelleri (kod, isim, kategori, gram, ayar, FOTOĞRAF linki) listeler — maliyet/müşteri verisi yok
      description: >
        Bir kategoride veya isimde/kodda arama yaparak gerçek modelleri (fotoğraf
        linkleriyle birlikte) getirir. Bir trendi Mahmut'un mevcut ürünleriyle
        somut olarak eşleştirmek için kullan — fotoğraf linklerini açıp
        görsel olarak inceleyebilirsin.
      security:
        - RadarApiKey: []
      parameters:
        - name: sirket
          in: query
          required: false
          schema:
            type: string
            enum: [MSK, BSP]
            default: MSK
        - name: kategori
          in: query
          required: false
          schema:
            type: string
          description: "örn. yuzuk, pendant, kupe, bileklik, set, bilezik, kolye"
        - name: arama
          in: query
          required: false
          schema:
            type: string
          description: Kod veya isim içinde aranacak metin
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            default: 30
      responses:
        "200":
          description: Model listesi
          content:
            application/json:
              schema:
                type: object
                properties:
                  basarili:
                    type: boolean
                  sirket:
                    type: string
                  adet:
                    type: integer
                  modeller:
                    type: array
                    items:
                      type: object
                      properties:
                        id: { type: string }
                        kod: { type: string }
                        kategori: { type: string }
                        ad: { type: string }
                        gram: { type: number }
                        ayar: { type: string }
                        foto: { type: string }
        "401":
          description: Geçersiz API anahtarı
        "500":
          description: Sunucu hatası
components:
  schemas: {}
  securitySchemes:
    RadarApiKey:
      type: apiKey
      in: header
      name: x-radar-key
