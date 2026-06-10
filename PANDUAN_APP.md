# Panduan Fitur Aplikasi SSI Smart Manufacturing (Updated)

Aplikasi web SSI Smart Manufacturing dirancang dengan pendekatan *mobile-first* bergaya *Glassmorphism* dengan dukungan multi-bahasa (Inggris, Indonesia, Jepang). Aplikasi ini membedakan fitur berdasarkan hak akses (*Role*): **Operator** (fokus pada operasional mesin) dan **Manager** (fokus pada analisis dan konfigurasi).

Berikut adalah penjelasan lengkap setiap halaman dan fitur pada versi terbaru:

### 1. Navigasi Cerdas & Fitur Khusus Operator
Desain ini disesuaikan dengan kebutuhan lantai produksi.
*   **Mobile Bottom Navigation**: Menu bawah untuk perangkat tablet/handphone. Manager memiliki tombol "Menu" ekstra yang membuka panel bawah (*Bottom Sheet*).
*   **Manual Downtime FAB (Floating Action Button)**: Tombol melayang berlogo Peringatan (Kuning/Amber) di tengah layar bawah (atau di sidebar pada Desktop). Tombol ini dikhususkan agar Operator dapat dengan cepat membuka **Downtime Modal** untuk mencatat alasan berhentinya mesin secara manual.
*   **Global Alert Bar**: Notifikasi *real-time* berwarna merah yang muncul di bagian atas layar jika ada mesin yang terdeteksi *Down*.

### 2. Overview (Halaman Tinjauan Keseluruhan)
Halaman awal untuk melihat seluruh status mesin secara ringkas.
*   Menampilkan *grid* mesin-mesin yang terhubung.
*   Berguna bagi manajer pabrik yang memantau banyak mesin compacting sekaligus.

### 3. Detailed View / Dashboard (Dasbor Detail Mesin)
Halaman pemantauan mendalam secara *Real-Time* untuk satu mesin spesifik.
*   **Machine Selector**: Memilih mesin mana yang sedang dipantau.
*   **OEE Indicator / Gauges**: Menampilkan performa mesin saat ini (Availability, Performance, Quality).
*   **Production Progress Chart**: Menampilkan rasio antara produk *Good* dan *No-Good (NG)* dibandingkan dengan target.
*   **Live Power Monitor**: Membaca sensor arus (PZEM-004T) untuk memantau kelistrikan (Ampere, Watt, Volt).
*   **Status Timeline Chart**: Grafik garis waktu (Gantt-chart) interaktif yang menunjukan durasi *Running* dan *Downtime* pada hari itu. (Tooltip dirender menggunakan React Portals agar tidak terpotong di layar HP).

### 4. History & Downtime History (Riwayat) - Khusus Manager
Halaman khusus *Manager* untuk melacak rekam jejak harian.
*   **History**: Tabel data historis akumulasi produksi per hari.
*   **Downtime History**: Daftar catatan mendetail mengenai kejadian *downtime*, durasi berhentinya mesin, dan alasan kerusakan yang diinput oleh operator dari *Downtime Modal*.

### 5. Analytics (Analitik Performa) - Khusus Manager
Halaman *dashboard* khusus bagi *Engineering* untuk menganalisa tren.
*   Menyajikan grafik komparatif, ringkasan metrics (Total OEE, Trend Produksi), dan filter rentang tanggal.

### 6. Settings (Pengaturan Sistem) - Khusus Manager
Pusat kontrol aplikasi bagi administrator.
*   **Shift Management**: Mengubah jam batas operasional *Shift* (contoh: 2 Shift, 07:25 - 19:25 dan 19:26 - 07:24).
*   **Targets Management**: Menentukan target produksi harian.
*   **User Management**: Mendaftarkan dan mengelola akun (*Operator* vs *Manager*).

---
**Fitur Tersembunyi (Keyboard Shortcuts)**:
Aplikasi mendukung penggunaan keyboard eksternal (Alt+1 s/d Alt+5 untuk pindah halaman, Alt+D untuk Downtime, 'F' untuk Fullscreen).
