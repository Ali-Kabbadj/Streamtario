; ######################################################################
; # Streamtario Installer Script (v5.0 - Bundled Bootstrapper)
; ######################################################################

; --- MODIFIED LINE ---
; This now requests administrator privileges, which will trigger the 
; UAC prompt when the user starts the installer.
RequestExecutionLevel admin

!define PRODUCT_NAME "Streamtario"
!define PRODUCT_PUBLISHER "Streamtario"
!define PRODUCT_VERSION "1.0.0"
!define MAIN_EXE_NAME "Streamtario.exe"

Name "${PRODUCT_NAME} Installer"
OutFile "StreamtarioInstaller.exe"
InstallDir "$LOCALAPPDATA\Programs\${PRODUCT_NAME}"
SetCompressor lzma

Icon ".\Assets\app_icon.ico"
UninstallIcon ".\Assets\app_icon.ico"

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

Var I_WANT_DESKTOP_SHORTCUT
Var I_WANT_TO_LAUNCH_APP

!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP ".\Assets\header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP ".\Assets\wizard.bmp"
!define REG_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define MUI_PAGE_CUSTOMFUNCTION_SHOW FinishPageShow
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE FinishPageLeave

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE ".\Assets\license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ######################################################################
; # Installation Section
; ######################################################################
Section "Install Core Files"
  ; --- Step 1: Run the bundled WebView2 Bootstrapper ---
  ; This is now the very first action the installer takes.
  
  DetailPrint "Checking for and installing WebView2 Runtime..."
  
  ; Extract the bootstrapper you placed in 'Assets' to a temporary directory.
  ; $PLUGINSDIR is a temporary folder that NSIS cleans up automatically.
  SetOutPath "$PLUGINSDIR"
  File ".\Assets\MicrosoftEdgeWebView2Setup.exe"

  ; Execute the bootstrapper silently and wait for it to complete.
  ; It will either install the runtime or exit quickly if it's already present.
  ; We store the exit code in the $R0 variable.
  ExecWait '"$PLUGINSDIR\MicrosoftEdgeWebView2Setup.exe" /silent /install' $R0

  ; A successful exit code is 0. Check if the result is anything else.
  ${If} $R0 != "0"
     MessageBox MB_OK|MB_ICONEXCLAMATION "The required WebView2 Runtime setup failed to run correctly (Error code: $R0). Setup cannot continue. This may be due to a lack of internet connection or administrative permissions."
     Abort
  ${EndIf}

  DetailPrint "WebView2 Runtime is up to date."

  ; --- Step 2: Install the main application files ---
  ; This part only runs after the WebView2 setup is confirmed to be successful.
  
  SetOutPath $INSTDIR
  File /r "D:\Git\Personal\Streamtario\dist\win-x64\*.*"
  
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Streamtario.lnk" "$INSTDIR\${MAIN_EXE_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Streaming Server.lnk" "$INSTDIR\streaming-server.exe"
  
  WriteRegStr HKCU "${REG_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKCU "${REG_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKCU "${REG_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; ######################################################################
; # Uninstallation Section (Unchanged)
; ######################################################################
Section "Uninstall"
  ; We do not uninstall WebView2 because it's a shared component other apps might use.
  Delete "$INSTDIR\${MAIN_EXE_NAME}"
  Delete "$INSTDIR\streaming-server.exe"
  Delete "$INSTDIR\libmpv-2.dll"
  RMDir /r "$INSTDIR\www"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
  Delete "$DESKTOP\Streamtario.lnk"
  RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"
  DeleteRegKey HKCU "${REG_KEY}"
SectionEnd

; ######################################################################
; # Custom Functions for the Finish Page (Unchanged)
; ######################################################################
Function FinishPageShow
  GetDlgItem $0 $HWNDPARENT $mui.FinishPage.Text
  ShowWindow $0 ${SW_HIDE}
  ${NSD_CreateLabel} 120u 40u 180u 40u "Setup has finished installing ${PRODUCT_NAME} on your computer. Select the options below and click Finish to exit."
  ${NSD_CreateCheckbox} 120u 105u 160u 12u "Launch ${PRODUCT_NAME}"
  Pop $I_WANT_TO_LAUNCH_APP
  ${NSD_Check} $I_WANT_TO_LAUNCH_APP
  ${NSD_CreateCheckbox} 120u 125u 160u 12u "Create a desktop shortcut"
  Pop $I_WANT_DESKTOP_SHORTCUT
  ${NSD_Check} $I_WANT_DESKTOP_SHORTCUT
FunctionEnd

Function FinishPageLeave
  ${NSD_GetState} $I_WANT_TO_LAUNCH_APP $I_WANT_TO_LAUNCH_APP
  ${NSD_GetState} $I_WANT_DESKTOP_SHORTCUT $I_WANT_DESKTOP_SHORTCUT
  
  ${If} $I_WANT_DESKTOP_SHORTCUT == ${BST_CHECKED}
    CreateShortCut "$DESKTOP\Streamtario.lnk" "$INSTDIR\${MAIN_EXE_NAME}"
  ${EndIf}

  ${If} $I_WANT_TO_LAUNCH_APP == ${BST_CHECKED}
    Exec '"$INSTDIR\${MAIN_EXE_NAME}"'
  ${EndIf}
FunctionEnd