!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Starting Kitab installer..."
!macroend

!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Kitab installed successfully."
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Preparing to uninstall Kitab..."
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DetailPrint "Kitab uninstalled."
!macroend
