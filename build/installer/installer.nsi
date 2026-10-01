; =========================================================================
; LibreM - Modern SLiMS Automation Platform
; Nullsoft Scriptable Install System (NSIS) Silent & Modern Installer
; =========================================================================

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

; General Definitions
!define PRODUCT_NAME "LibreM"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "LibreM Project"
!define PRODUCT_WEB_SITE "https://github.com/LibreM"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\LibreM.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

; Installer Attributes
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "..\..\dist\LibreM_Setup_v1.0.0.exe"
InstallDir "$PROGRAMFILES64\LibreM"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show
RequestExecutionLevel admin

; UI Configuration (Dark Theme Accents)
!define MUI_ICON "LibreM.ico"
!define MUI_UNICON "LibreM.ico"
!define MUI_ABORTWARNING

; Variables for Custom Setup Page
Var Dialog
Var TxtSchoolName
Var TxtAdminUsername
Var TxtAdminPassword
Var SchoolNameVal
Var AdminUsernameVal
Var AdminPasswordVal

; -------------------------------------------------------------------------
; Pages Configuration
; -------------------------------------------------------------------------
; Step 1: License Agreement
!insertmacro MUI_PAGE_LICENSE "license.txt"

; Step 2: Choose Installation Directory
!insertmacro MUI_PAGE_DIRECTORY

; Step 3: Identitas Sekolah & Kredensial Superadmin
Page custom SetupSchoolPage SetupSchoolPageLeave

; Step 4: Installation Progress
!insertmacro MUI_PAGE_INSTFILES

; Step 5: Finish Page
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Buka Aplikasi LibreM Sekarang"
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchLibreM
!define MUI_FINISHPAGE_LINK "Katalog OPAC LibreM"
!define MUI_FINISHPAGE_LINK_LOCATION "http://localhost:8080/opac"
!insertmacro MUI_PAGE_FINISH

Function LaunchLibreM
  ; Jalankan aplikasi melalui explorer.exe agar berjalan sebagai standard user (mencegah postgres menolak hak admin)
  Exec '"$WINDIR\explorer.exe" "$INSTDIR\LibreM.exe"'
FunctionEnd

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "Indonesian"
!insertmacro MUI_LANGUAGE "English"

; -------------------------------------------------------------------------
; Custom Setup Page: Identitas Sekolah & Kredensial Superadmin
; -------------------------------------------------------------------------
Function SetupSchoolPage
  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  !insertmacro MUI_HEADER_TEXT "Konfigurasi Awal LibreM" "Masukkan identitas sekolah dan kredensial akun superadmin."

  ; Label & Input: Nama Sekolah
  ${NSD_CreateLabel} 0 0 100% 10u "Nama Sekolah / Perpustakaan:"
  Pop $0
  ${NSD_CreateText} 0 11u 100% 13u "Perpustakaan Sekolah"
  Pop $TxtSchoolName

  ; Label & Input: Username Superadmin
  ${NSD_CreateLabel} 0 28u 100% 10u "Nama Pengguna Superadmin (Username):"
  Pop $0
  ${NSD_CreateText} 0 39u 100% 13u "admin"
  Pop $TxtAdminUsername

  ; Label & Input: Password Superadmin
  ${NSD_CreateLabel} 0 56u 100% 10u "Kata Sandi Akun Superadmin:"
  Pop $0
  ${NSD_CreatePassword} 0 67u 100% 13u "admin123"
  Pop $TxtAdminPassword

  ; Info box
  ${NSD_CreateLabel} 0 88u 100% 24u "Kredensial di atas akan digunakan untuk login pertama kali. Basis data PostgreSQL portable akan dikonfigurasi dan diinisialisasi secara otomatis."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function SetupSchoolPageLeave
  ${NSD_GetText} $TxtSchoolName $SchoolNameVal
  ${NSD_GetText} $TxtAdminUsername $AdminUsernameVal
  ${NSD_GetText} $TxtAdminPassword $AdminPasswordVal

  ${If} $SchoolNameVal == ""
    StrCpy $SchoolNameVal "Perpustakaan Sekolah"
  ${EndIf}
  ${If} $AdminUsernameVal == ""
    StrCpy $AdminUsernameVal "admin"
  ${EndIf}
  ${If} $AdminPasswordVal == ""
    StrCpy $AdminPasswordVal "admin123"
  ${EndIf}
FunctionEnd

; -------------------------------------------------------------------------
; Main Installation Section
; -------------------------------------------------------------------------
Section "MainSection" SEC01
  ; Terminate previous running instance silently without any CMD popup
  nsExec::ExecToStack 'taskkill /F /IM LibreM.exe'
  nsExec::ExecToStack 'taskkill /F /IM postgres.exe'
  Sleep 500

  SetOutPath "$INSTDIR"
  SetOverwrite on

  ; 1. Core Executable & Icon
  File "..\..\LibreM.exe"
  File "LibreM.ico"

  ; 2. Embed Portable PostgreSQL Distribution
  SetOutPath "$INSTDIR\pgsql"
  File /r "..\..\pgsql\*"

  ; 3. Database Migrations
  SetOutPath "$INSTDIR\migrations"
  File /r "..\..\internal\repository\migrations\*"

  ; 4. Generate Production .env Configuration
  DetailPrint "Mempersiapkan konfigurasi environment sistem..."
  SetOutPath "$INSTDIR"
  FileOpen $0 "$INSTDIR\.env" w
  FileWrite $0 "PORT=8080$\r$\n"
  FileWrite $0 "DB_HOST=127.0.0.1$\r$\n"
  FileWrite $0 "DB_PORT=5432$\r$\n"
  FileWrite $0 "DB_USER=postgres$\r$\n"
  FileWrite $0 "DB_PASSWORD=LibremDB92342$\r$\n"
  FileWrite $0 "DB_NAME=librem_db$\r$\n"
  FileWrite $0 "DB_SSLMODE=disable$\r$\n"
  FileWrite $0 "JWT_SECRET=librem-super-secure-jwt-key-2026-production$\r$\n"
  FileWrite $0 "STORAGE_PATH=./uploads$\r$\n"
  FileWrite $0 "SCHOOL_NAME=$SchoolNameVal$\r$\n"
  FileWrite $0 "ADMIN_INITIAL_USERNAME=$AdminUsernameVal$\r$\n"
  FileWrite $0 "ADMIN_INITIAL_PASSWORD=$AdminPasswordVal$\r$\n"
  FileClose $0

  ; 5. Inisialisasi Hak Akses & Database Cluster PostgreSQL
  DetailPrint "Mengonfigurasi hak akses direktori instalasi..."
  nsExec::ExecToStack 'icacls "$INSTDIR" /grant *S-1-5-32-545:(OI)(CI)M /T /C /Q'
  nsExec::ExecToStack 'icacls "$INSTDIR" /grant *S-1-1-0:(OI)(CI)M /T /C /Q'
  Sleep 600

  DetailPrint "Mempersiapkan cluster basis data PostgreSQL portable (initdb)..."
  ${IfNot} ${FileExists} "$INSTDIR\pgdata\PG_VERSION"
    DetailPrint "Menginisialisasi penyimpanan basis data baru..."
    nsExec::ExecToStack '"$INSTDIR\pgsql\bin\initdb.exe" -D "$INSTDIR\pgdata" -U postgres --auth=trust --encoding=UTF8 --locale=C'
    Sleep 1500
  ${EndIf}

  DetailPrint "Mengonfigurasi keamanan dan hak akses basis data..."
  nsExec::ExecToStack 'icacls "$INSTDIR\pgdata" /grant *S-1-5-32-545:(OI)(CI)M /T /C /Q'
  nsExec::ExecToStack 'icacls "$INSTDIR\pgdata" /grant *S-1-1-0:(OI)(CI)M /T /C /Q'
  Sleep 800

  DetailPrint "Memverifikasi kesiapan engine sistem LibreM..."
  Sleep 1000
  SetOutPath "$INSTDIR"

  ; 6. Shortcuts
  DetailPrint "Membuat pintasan desktop dan menu aplikasi..."
  CreateDirectory "$SMPROGRAMS\LibreM"
  CreateShortcut "$SMPROGRAMS\LibreM\LibreM.lnk" "$INSTDIR\LibreM.exe" "" "$INSTDIR\LibreM.ico" 0
  CreateShortcut "$SMPROGRAMS\LibreM\Uninstall LibreM.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\LibreM.lnk" "$INSTDIR\LibreM.exe" "" "$INSTDIR\LibreM.ico" 0

  ; 7. Create Uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; 7. Windows Registry Keys
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\LibreM.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\LibreM.ico"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd

; -------------------------------------------------------------------------
; Uninstallation Section
; -------------------------------------------------------------------------
Section "Uninstall"
  ; Stop running process silently without CMD popup
  nsExec::ExecToStack 'taskkill /F /IM LibreM.exe'
  nsExec::ExecToStack 'taskkill /F /IM postgres.exe'
  Sleep 500

  ; Remove shortcuts
  Delete "$DESKTOP\LibreM.lnk"
  Delete "$SMPROGRAMS\LibreM\LibreM.lnk"
  Delete "$SMPROGRAMS\LibreM\Uninstall LibreM.lnk"
  RMDir "$SMPROGRAMS\LibreM"

  ; Remove installed files
  Delete "$INSTDIR\LibreM.exe"
  Delete "$INSTDIR\LibreM.ico"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR\migrations"
  RMDir /r "$INSTDIR\pgsql"

  ; Note: Keep pgdata and .env intact to prevent user data loss unless cleaned manually
  RMDir "$INSTDIR"

  ; Remove Registry Keys
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"

  SetAutoClose true
SectionEnd
