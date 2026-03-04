# Panduan Fitur Aplikasi SSI Smart Manufacturing

Berikut adalah penjelasan singkat, padat, dan jelas mengenai fungsi setiap halaman dalam aplikasi web ini:

### 1. Dashboard (Dasbor Produksi)
Ini adalah halaman utama untuk pemantauan Real-Time.
*   **Production Targets**: Menampilkan target produksi hari ini vs realisasi (Good/NG) dalam bentuk grafik.
*   **Machine Status**: Menunjukkan apakah mesin sedang bekerja (Running) atau berhenti (Stop/Error) saat ini.
*   **Current/Power Monitor**: Menampilkan konsumsi listrik mesin (Ampere, Watt, Volt) secara langsung untuk mendeteksi beban kerja.

### 2. Analytics (Analisis Riwayat)
Halaman untuk melihat data masa lalu dan performa mesin.
*   **Filter Tanggal**: Anda bisa memilih tanggal dan jam tertentu (misal: "Kemarin jam 08:00 sampai 16:00").
*   **Metrics Summary**: Ringkasan total produksi Good, NG, dan nilai OEE (Overall Equipment Effectiveness) pada periode tersebut.
*   **Timeline Chart**: Grafik garis waktu yang menunjukkan kapan saja mesin menyala atau mati sepanjang hari, memudahkan pelacakan durasi downtime.

### 3. Targets (Target Produksi)
Halaman untuk perencanaan manajer.
*   **Set Target**: Mengatur jumlah target produksi untuk tanggal tertentu.
*   **List**: Melihat riwayat target yang pernah dibuat sebelumnya.

### 4. Shifts (Pengaturan Shift)
Halaman untuk mengatur jadwal kerja operator.
*   **Waktu Shift**: Menentukan jam mulai dan jam selesai untuk Shift 1, Shift 2, dst. Aplikasi akan menghitung produksi berdasarkan blok waktu ini.

### 5. Users (Manajemen Pengguna)
Halaman khusus Admin/Manajer untuk keamanan.
*   **Tambah User**: Mendaftarkan operator atau manajer baru.
*   **Role**: Mengatur hak akses (contoh: Operator hanya bisa lihat Dashboard, Manajer bisa ubah Target).

---
**Catatan**: Aplikasi ini mendukung 3 bahasa (Inggris, Indonesia, Jepang) yang dapat diganti melalui tombol di pojok kanan bawah.
