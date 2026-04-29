# TOKİ 2026 İstanbul Çekiliş Simülasyonu

Bu proje, TOKİ'nin 2026 İstanbul konut çekilişinde ortaya çıkan istatistiksel olarak "imkansıza yakın" durumu analiz etmek için geliştirilmiş bir **Monte Carlo Simülasyonu** uygulamasıdır.

## Problem Tanımı

İstanbul'da yapılan TOKİ çekilişine **1.072.660** aday katılmıştır. Bu adaylar arasından **100.000** kişi rastgele seçilmiştir. Ancak çekiliş sonuçları incelendiğinde ilginç bir durumla karşılaşılmıştır:

- Çekilişte çıkan en yüksek numara: **955.067**
- Son **117.593** kişiden (955.068 - 1.072.660 aralığı) **bir kişi bile** kazanamamıştır.

Bu simülasyon, 55.739. çekimden sonra tüm kategorilerin birleştiği (ana torba) noktadan itibaren yapılan **44.261** çekimde, bu 117.593 kişilik aralıktan neden hiç kimsenin çıkmadığını istatistiksel olarak sorgular.

## Teknik Özellikler

- **Pure JavaScript:** Hiçbir kütüphane (React, Vue vb.) kullanılmadan düz JS ile yazılmıştır.
- **Monte Carlo Simülasyonu:** Rastgele örnekleme yöntemiyle gerçek dünya olasılıklarını modeller.
- **Web Crypto API:** `crypto.getRandomValues()` kullanılarak kriptografik olarak güvenli rastgele sayılar üretilir.
- **Hipergeometrik Dağılım:** İstatistiksel olarak bu durumun gerçekleşme olasılığı (P(X=0)) hesaplanır.
- **Canlı Simülasyon:** Çekiliş süreci görselleştirilerek anlık olarak takip edilebilir.

## Matematiksel Arka Plan

Bu durum **Hipergeometrik Dağılım** ile modellenir. 

- $N = 1.072.660$ (Toplam aday)
- $M = 117.593$ (Dışlanan aralıktaki aday sayısı)
- $n = 44.261$ (Havuzlar birleştikten sonraki çekim sayısı)

Bu aralıktan tam olarak 0 kişinin çıkma olasılığı $P(X=0) \approx 10^{-2108}$ mertebesindedir. Bu, evrendeki atom sayısından bile kat kat küçük bir olasılıktır.

## Kurulum ve Çalıştırma

Projeyi yerelinizde çalıştırmak için sadece dosyaları bir sunucuda (veya doğrudan tarayıcıda) açmanız yeterlidir:

```bash
git clone https://github.com/iltekin/toki-2026-istanbul-simulasyon.git
cd toki-2026-istanbul-simulasyon
# Herhangi bir statik sunucu ile çalıştırabilirsiniz
python3 -m http.server 8080
```

Ardından tarayıcınızdan `http://localhost:8080` adresine giderek simülasyonu başlatabilirsiniz.

## Geliştirici

Bu proje **Sezer İltekin** tarafından geliştirilmiştir.

- **GitHub:** [iltekin](https://github.com/iltekin)
- **X (Twitter):** [@sezeriltekin](https://x.com/sezeriltekin)

---
*Not: Bu çalışma tamamen bilimsel ve eğitim amaçlıdır.*
