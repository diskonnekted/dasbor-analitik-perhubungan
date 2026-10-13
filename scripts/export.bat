@echo off
REM ============================================================
REM export-dishub.bat - Ekspor data perhubungan Banjarnegara
REM ============================================================
setlocal
set PHP=D:\xampp\php\php.exe
set SCRIPT=D:\xampp\htdocs\pju\public\export-geojson.php
set PHPFLAGS=-d display_errors=0 -d error_reporting=0 -d display_startup_errors=0
set OUTDIR=I:\perhubungan\public

if not exist "%OUTDIR%" mkdir "%OUTDIR%"

echo ==========================================
echo  Ekspor data Dishub Banjarnegara
echo  Out: %OUTDIR%
echo ==========================================

set COUNT=0
for %%T in (ruas titik_parkir titik_jukir choropleth) do (
  set /a COUNT+=1
  echo.
  echo [%COUNT%/4] Ekspor %%T ...
  if "%%T"=="choropleth" (
    "%PHP%" %PHPFLAGS% "%SCRIPT%" %%T > "%OUTDIR%\pju_choropleth.json" 2> "%OUTDIR%\pju_choropleth.err"
  ) else (
    "%PHP%" %PHPFLAGS% "%SCRIPT%" %%T > "%OUTDIR%\pju_%%T.geojson" 2> "%OUTDIR%\pju_%%T.err"
  )
  if errorlevel 1 (
    echo   GAGAL %%T - lihat file .err
    type "%OUTDIR%\pju_%%T.err" 2>nul
  ) else (
    echo   OK
  )
)

echo.
echo ==========================================
echo  Hasil:
dir /B "%OUTDIR%\pju_*.*" 2>nul
echo ==========================================
endlocal
