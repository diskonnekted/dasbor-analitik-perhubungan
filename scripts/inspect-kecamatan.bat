@echo off
set MYSQL=D:\xampp\mysql\bin\mysql.exe
echo --- wilayah_kecamatan in kabupaten 3304 ---
"%MYSQL%" -h localhost -u root --skip-password onlinkid_parkir -e "SELECT id, nama FROM wilayah_kecamatan WHERE kabupaten_id = '3304' ORDER BY nama;" 2>&1
echo.
echo --- titik_parkir distinct id_kecamatan ---
"%MYSQL%" -h localhost -u root --skip-password onlinkid_parkir -e "SELECT DISTINCT id_kecamatan, COUNT(*) AS cnt FROM titik_parkir GROUP BY id_kecamatan ORDER BY id_kecamatan;" 2>&1
echo.
echo --- ruas_jalan by status_ruas ---
"%MYSQL%" -h localhost -u root --skip-password onlinkid_parkir -e "SELECT status_ruas, COUNT(*) AS cnt, SUM(panjang) AS total_km FROM ruas_jalan GROUP BY status_ruas;" 2>&1
echo.
echo --- titik_parkir by jenis ---
"%MYSQL%" -h localhost -u root --skip-password onlinkid_parkir -e "SELECT jenis_fasilitas, jenis_parkir_luar, COUNT(*) AS cnt FROM titik_parkir GROUP BY jenis_fasilitas, jenis_parkir_luar;" 2>&1
