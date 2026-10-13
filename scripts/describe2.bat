@echo off
set MYSQL=D:\xampp\mysql\bin\mysql.exe
echo --- titik_jukir actual ---
"%MYSQL%" -h localhost -u root --skip-password onlinkid_parkir -e "DESCRIBE titik_jukir;" 2>&1
echo.
echo --- pengaduan actual ---
"%MYSQL%" -h localhost -u root --skip-password onlinkid_parkir -e "DESCRIBE pengaduan;" 2>&1
echo.
echo --- Sample titik_jukir ---
"%MYSQL%" -h localhost -u root --skip-password onlinkid_parkir -e "SELECT * FROM titik_jukir LIMIT 2\G" 2>&1
