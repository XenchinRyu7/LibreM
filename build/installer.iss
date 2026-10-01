; ============================================================================
; INNO SETUP SCRIPT FOR LIBREM (SLiMS Bulian Modern Edition)
; Generates Windows Native Installer GUI Setup (.exe)
; ============================================================================

#define MyAppName "LibreM"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "LibreM Modern Library Team"
#define MyAppURL "https://github.com/librem-team/librem"
#define MyAppExeName "LibreM.exe"

[Setup]
AppId={{E6F747AA-3765-46D9-8971-893C2A92E12F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=LibreM-v1.0.0-Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

[Languages]
Name: "indonesian"; MessagesFile: "compiler:Languages\Indonesian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startmenu"; Description: "Buat Pintasan di Start Menu"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\LibreM.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.env"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Luncurkan Layanan Server LibreM"; Flags: nowait postinstall skipifsilent
Filename: "http://localhost:8080"; Description: "Buka Dashboard LibreM di Browser"; Flags: postinstall shellexec
