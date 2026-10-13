@echo off
set MYSQL=D:\xampp\mysql\bin\mysql.exe
"%MYSQL%" -h localhost -u root --skip-password -e "SHOW DATABASES;" 2>&1
