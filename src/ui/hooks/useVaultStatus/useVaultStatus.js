import { useCallback, useEffect, useMemo, useState } from 'react'
import { copyTextToClipboard } from '../../utils/clipboard.js'
import { formatVaultStatus, openVaultShareModal } from '../../utils/vault.js'

export function useVaultStatus ({ pearl, notify, uiLog, refreshNotes, forceReloadNotes, pauseAutoRefresh, resumeAutoRefresh }) {
  const [vaultStatus, setVaultStatus] = useState(null)

  const refreshVaultStatus = useCallback(async () => {
    try {
      const status = await pearl.getVaultStatus()
      setVaultStatus(status)
    } catch (err) {
      console.error('Failed to refresh vault status', err)
      notify('Vault status unavailable.', 'muted')
    }
  }, [pearl, notify])

  useEffect(() => {
    refreshVaultStatus()
    const timer = setInterval(refreshVaultStatus, 8000)
    return () => clearInterval(timer)
  }, [refreshVaultStatus])

  const handleCopyVaultKey = useCallback(async () => {
    const key = vaultStatus?.driveKey || ''
    if (!key) {
      notify('Vault key unavailable yet. Try again after sync starts.', 'muted')
      return
    }
    const success = await copyTextToClipboard(key)
    notify(success ? 'Vault key copied.' : 'Clipboard unavailable — key logged.', success ? 'success' : 'error')
    if (!success) {
      uiLog(`Clipboard unavailable; key: ${key}`, 'warn')
      console.warn('Vault key:', key)
    }
  }, [vaultStatus, notify, uiLog])

  const handleVaultShare = useCallback(() => {
    openVaultShareModal({
      notify,
      pearl,
      refreshVaultStatus,
      refreshNotes,
      forceReloadNotes,
      pauseAutoRefresh,
      resumeAutoRefresh
    })
  }, [notify, pearl, refreshVaultStatus, refreshNotes, forceReloadNotes, pauseAutoRefresh, resumeAutoRefresh])

  const syncStatusText = useMemo(() => formatVaultStatus(vaultStatus), [vaultStatus])
  const exportDir = vaultStatus?.exportDir ?? null

  return {
    vaultStatus,
    syncStatusText,
    exportDir,
    refreshVaultStatus,
    handleCopyVaultKey,
    handleVaultShare
  }
}

