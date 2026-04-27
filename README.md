# Atölye Koleksiyon Sistemi

## Kurulum

### 1. Supabase Kurulumu
1. supabase.com'a gidin, ücretsiz hesap açın
2. New Project oluşturun
3. SQL Editor'a gidin, `supabase-setup.sql` içeriğini yapıştırın ve Run edin
4. Settings → API'den URL ve anon key'i kopyalayın

### 2. Environment Variables
Vercel'de şu environment variables ekleyin:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### 3. Vercel Deploy
1. Vercel.com'a gidin
2. GitHub ile giriş yapın
3. Bu repository'yi import edin
4. Environment variables ekleyin
5. Deploy!
