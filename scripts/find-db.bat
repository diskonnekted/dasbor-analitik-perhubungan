@echo off
set MYSQL=D:\xampp\mysql\bin\mysql.exe
echo === Find any DB with 'ruas_jalan' table ===
"%MYSQL%" -h localhost -u root --skip-password -e "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'ruas_jalan';" 2>&1
echo.
echo === Find any DB with 'perlengkapan_jalan' table ===
"%MYSQL%" -h localhost -u root --skip-password -e "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'perlengkapan_jalan';" 2>&1
echo.
echo === Find any DB with 'jenis_perlengkapan' table ===
"%MYSQL%" -h localhost -u root --skip-password -e "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'jenis_perlengkapan';" 2>&1
echo.
echo === Detail pju ===
"%MYSQL%" -h localhost -u root --skip-password -e "SELECT * FROM information_schema.schemata WHERE schema_name = 'pju';" 2>&1
