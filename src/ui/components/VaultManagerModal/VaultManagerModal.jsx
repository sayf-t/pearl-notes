import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../Modal/Modal.jsx'
import { copyTextToClipboard } from '../../utils/clipboard.js'

const toneToColor = {
  error: 'var(--danger)',
  success: '#7be4a2',
  muted: 'var(--muted)'
}

export default function VaultManagerModal ({
  pearl,
  notify,
  refreshVaultStatus,
  refreshNotes,
  exportDir,
  onClose,
  onShare
}) {
  const [currentKey, setCurrentKey] = useState(null)
  const [exportPath, setExportPath] = useState(exportDir || 'Not set')
  const [recents, setRecents] = useState([])
  const [pendingKey, setPendingKey] = useState(null)
  const [message, setMessage] = useState('Loading vault details…')
  const [tone, setTone] = useState('muted')
  const [loading, setLoading] = useState(true)

  const setStatus = useCallback((text, nextTone = 'muted') => {
    setMessage(text)
    setTone(nextTone)
  }, [])

  const loadState = useCallback(async () => {
    setLoading(true)
    setStatus('Loading vault details…', 'muted')
    try {
      const [status, recentsList] = await Promise.all([
        pearl.getVaultStatus?.(),
        Promise.resolve(pearl.getRecentVaults?.())
      ])

      setCurrentKey(status?.driveKey || null)
      setExportPath(exportDir || status?.exportDir || 'Not set')
      setRecents(Array.isArray(recentsList) ? recentsList : [])
      setPendingKey(null)
      setStatus('You can copy details, share, or switch vaults.', 'success')
    } catch (err) {
      console.error('Failed to load vault manager state:', err)
      setStatus('Unable to load vault details. Try again.', 'error')
    } finally {
      setLoading(false)
    }
  }, [exportDir, pearl, setStatus])

  useEffect(() => {
    loadState()
  }, [loadState])

  const handleCopyKey = useCallback(async () => {
    if (!currentKey) {
      setStatus('Vault key not available yet.', 'error')
      return
    }
    const success = await copyTextToClipboard(currentKey)
    setStatus(success ? 'Vault key copied.' : 'Clipboard unavailable.', success ? 'success' : 'error')
  }, [currentKey, setStatus])

  const handleCopyPath = useCallback(async () => {
    if (!exportPath) {
      setStatus('Export path unavailable.', 'error')
      return
    }
    const success = await copyTextToClipboard(exportPath)
    setStatus(success ? 'Export path copied.' : 'Clipboard unavailable.', success ? 'success' : 'error')
  }, [exportPath, setStatus])

  const handleVaultSwitch = useCallback(
    async (driveKey, label) => {
      if (!driveKey) return
      if (currentKey && driveKey === currentKey) {
        setStatus('Already viewing that vault.', 'muted')
        return
      }

      if (pendingKey !== driveKey) {
        setPendingKey(driveKey)
        const targetLabel = label || `vault ${driveKey.slice(0, 12)}…`
        setStatus(`Click again to confirm switch to ${targetLabel}.`, 'muted')
        return
      }

      setPendingKey(null)
      setStatus('Switching vault…', 'muted')
      try {
        await pearl.setCurrentVault?.(driveKey)
        await refreshVaultStatus?.()
        await refreshNotes?.()
        setStatus('Vault switched. Refreshing workspace…', 'success')
        setTimeout(() => onClose?.(), 600)
      } catch (err) {
        console.error('Failed to switch vault:', err)
        notify?.(err.message || 'Failed to switch vault.', 'error')
        setStatus(err.message || 'Failed to switch vault.', 'error')
      }
    },
    [currentKey, pendingKey, pearl, refreshVaultStatus, refreshNotes, notify, setStatus, onClose]
  )

  const handleShare = useCallback(() => {
    onShare?.()
  }, [onShare])

  const toneColor = useMemo(() => toneToColor[tone] || toneToColor.muted, [tone])

  return (
    <Modal open title="Vault manager" onClose={onClose}>
      <div className="vault-manager">
        <div className="vault-manager-section">
          <p className="vault-manager-label">Active vault</p>
          <div className="vault-manager-row">
            <code data-field="vault-manager-current-key">
              {currentKey ? `${currentKey.slice(0, 12)}…` : loading ? 'Loading…' : 'Unavailable'}
            </code>
            <button className="btn btn-small" type="button" onClick={handleCopyKey} disabled={loading}>
              Copy key
            </button>
          </div>
        </div>

        <div className="vault-manager-section">
          <p className="vault-manager-label">Local export folder</p>
          <div className="vault-manager-row">
            <span data-field="vault-manager-export-path">{exportPath}</span>
            <button className="btn btn-small" type="button" onClick={handleCopyPath} disabled={loading}>
              Copy path
            </button>
          </div>
        </div>

        <div className="vault-manager-section">
          <div className="vault-manager-recents-header">
            <p className="vault-manager-label">Recent vaults</p>
            <button className="btn btn-small" type="button" onClick={loadState} disabled={loading}>
              Refresh
            </button>
          </div>
          <ul className="vault-manager-recents" data-field="vault-manager-recent-list" aria-label="Recent vaults">
            {!recents.length ? (
              <li className="vault-manager-empty">No other vaults yet.</li>
            ) : (
              recents.map((vault) => (
                <li key={vault.driveKey} className="vault-manager-recent-item">
                  <button
                    type="button"
                    className="vault-manager-recent-btn"
                    disabled={Boolean(currentKey && vault.driveKey === currentKey)}
                    data-confirming={pendingKey === vault.driveKey ? 'true' : undefined}
                    onClick={() => handleVaultSwitch(vault.driveKey, vault.label)}
                  >
                    <span className="vault-manager-recent-label">
                      {vault.label || `Vault ${vault.driveKey.slice(0, 12)}…`}
                    </span>
                    <span className="vault-manager-recent-key">{vault.driveKey.slice(0, 20)}…</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="vault-manager-section vault-manager-actions">
          <button className="btn btn-primary" type="button" onClick={handleShare} disabled={loading}>
            Share or join via link
          </button>
        </div>

        <p className="vault-manager-message" style={{ color: toneColor }} aria-live="polite">
          {message}
        </p>
      </div>
    </Modal>
  )
}

