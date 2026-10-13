@echo off
setlocal enabledelayedexpansion
set MYSQL=D:\xampp\mysql\bin\mysql.exe
set DB=onlinkid_parkir
echo === Schema: %DB% ===
echo.
echo --- ruas_jalan ---
"%MYSQL%" -h localhost -u root --skip-password %DB% -e "DESCRIBE ruas_jalan;" 2>&1
echo.
echo --- Sample 3 rows ruas_jalan ---
"%MYSQL%" -h localhost -u root --skip-password %DB% -e "SELECT * FROM ruas_jalan LIMIT 3\G" 2>&1
echo.
echo --- titik_parkir ---
"%MYSQL%" -h localhost -u root --skip-password %DB% -e "DESCRIBE titik_parkir;" 2>&1
echo.
echo --- Sample 3 rows titik_parkir ---
"%MYSQL%" -h localhost -u root --skip-password %DB% -e "SELECT * FROM titik_parkir LIMIT 3\G" 2>&1
echo.
echo --- wilayah_kecamatan ---
"%MYSQL%" -h localhost -u root --skip-password %DB% -e "DESCRIBE wilayah_kecamatan;" 2>&1
echo.
echo --- Sample 3 rows wilayah_kecamatan ---
"%MYSQL%" -h localhost -u root --skip-password %DB% -e "SELECT * FROM wilayah_kecamatan LIMIT 3\G" 2>&1
echo.
echo --- juru_parkir ---
"%MYSQL%" -h localhost -u root --skip-password %DB% -e "DESCRIBE juru_parkir;" 2>&1
echo.
echo --- titik_jukir ---
"%MYSQL%" -h localhost -u root --skip-password %DB% -e "DESCRIBE titik_jukir;" 2>&1
endlocal
