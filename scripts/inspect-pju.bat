@echo off
set MYSQL=D:\xampp\mysql\bin\mysql.exe
echo === TABLES in pju ===
"%MYSQL%" -h localhost -u root --skip-password pju -e "SHOW TABLES;" 2>&1
echo.
echo === COUNT PER TABLE ===
"%MYSQL%" -h localhost -u root --skip-password pju -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = 'pju' ORDER BY table_name;" 2>&1
