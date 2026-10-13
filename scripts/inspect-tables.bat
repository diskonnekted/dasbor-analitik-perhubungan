@echo off
setlocal enabledelayedexpansion
set MYSQL=D:\xampp\mysql\bin\mysql.exe
set DBS=onlinkid_parkir spark_parking parkingclasnet
for %%D in (%DBS%) do (
  echo ============================================
  echo   DB: %%D
  echo ============================================
  call "%MYSQL%" -h localhost -u root --skip-password %%D -e "SHOW TABLES;" 2>&1
  echo.
  "%MYSQL%" -h localhost -u root --skip-password %%D -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = '%%D' ORDER BY table_rows DESC LIMIT 30;" 2>&1
  echo.
)
endlocal
