# Nexvoid Chess

Website catur statis dengan HTML, CSS, dan JavaScript. Siap diunggah ke GitHub lalu deploy ke Vercel.

## Fitur
- Loading screen dan landing/dashboard
- Pilihan mode: lawan AI, 2 Player lokal, multiplayer online (Coming Soon)
- Papan catur interaktif dan validasi langkah legal menggunakan chess.js
- AI minimax dengan alpha-beta pruning dan 3 tingkat kesulitan
- Riwayat langkah, undo, hint sederhana, flip board, suara langkah opsional
- Deteksi skak, skakmat, stalemate, dan remis
- Layout responsif untuk HP dan desktop

## Jalankan lokal
Buka `index.html` di browser. Internet diperlukan untuk memuat library chess.js dari CDN dan font Google.

## Deploy ke GitHub + Vercel
1. Upload `index.html`, `style.css`, `script.js`, dan `README.md` ke root repository GitHub.
2. Di Vercel, pilih **Add New → Project**, import repository tersebut.
3. Framework preset: **Other**. Build Command kosong, Output Directory `.` (atau kosong sesuai konfigurasi Vercel).
4. Deploy. Karena ini static site, tidak butuh backend untuk mode AI/lokal.

## Catatan
Multiplayer online sengaja berstatus Coming Soon karena membutuhkan backend/realtime room (misalnya WebSocket atau layanan realtime) untuk sinkronisasi pemain lintas perangkat. AI berjalan di browser, jadi tingkat Expert dapat lebih berat di HP lama.
