import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Modal from '../Modal/Modal.jsx'
import { copyTextToClipboard } from '../../utils/clipboard.js'
import { parseLinkString } from '../../../pear-end/vault/vaultConfig.js'
import { needsVaultSwitchConfirmation } from '../../utils/vaultShareState.js'

const toneToColor = {
  error: 'var(--danger)',
  success: '#7be4a2',
  warn: 'var(--accent)',
  info: 'var(--muted)'
}

export default function VaultShareModal ({
  pearl,
  notify,
  refreshVaultStatus,
  refreshNotes,
  forceReloadNotes,
  pauseAutoRefresh,
  resumeAutoRefresh,
  onClose
}) {
  const [currentVaultKey, setCurrentVaultKey] = useState(null)
  const [shareLink, setShareLink] = useState('')
  const [joinInput, setJoinInput] = useState('')
  const [message, setMessage] = useState('Device A: create & copy. Device B: paste & join.')
  const [messageTone, setMessageTone] = useState('info')
  const [joining, setJoining] = useState(false)
  const [confirmationKey, setConfirmationKey] = useState(null)

  const joinTimeoutRef = useRef(null)
  const cleanupRef = useRef(null)
  const autoRefreshPausedRef = useRef(false)

  const setStatus = useCallback((text, tone = 'info') => {
    setMessage(text)
    setMessageTone(tone)
  }, [])

  const cleanupJoinListeners = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current)
      joinTimeoutRef.current = null
    }
  }, [])

  const ensureResumeAutoRefresh = useCallback(() => {
    if (autoRefreshPausedRef.current) {
      resumeAutoRefresh?.()
      autoRefreshPausedRef.current = false
    }
  }, [resumeAutoRefresh])

  const handleClose = useCallback(() => {
    cleanupJoinListeners()
    ensureResumeAutoRefresh()
    onClose?.()
  }, [cleanupJoinListeners, ensureResumeAutoRefresh, onClose])

  useEffect(() => {
    let mounted = true
    pearl
      .getCurrentVaultKey()
      .then((key) => {
        if (mounted) setCurrentVaultKey(key || null)
      })
      .catch(() => {})
    return () => {
      mounted = false
      cleanupJoinListeners()
      ensureResumeAutoRefresh()
    }
  }, [pearl, cleanupJoinListeners, ensureResumeAutoRefresh])

  const handleCreateLink = useCallback(async () => {
    setStatus('Creating share link…', 'info')
    try {
      const { linkString } = await pearl.createVaultLink()
      setShareLink(linkString)
      setStatus('Copy this link and send it to another device.', 'success')
    } catch (err) {
      console.error('Failed to create link', err)
      setShareLink('')
      setStatus(err.message || 'Failed to create link.', 'error')
    }
  }, [pearl, setStatus])

  const handleCopyLink = useCallback(async () => {
    if (!shareLink) {
      setStatus('Create a link first.', 'warn')
      return
    }
    const success = await copyTextToClipboard(shareLink)
    setStatus(success ? 'Link copied.' : 'Clipboard unavailable.', success ? 'success' : 'error')
  }, [shareLink, setStatus])

  const validateJoinInput = useCallback(() => {
    const trimmed = joinInput.trim()
    if (!trimmed) {
      setStatus('Please paste a vault link.', 'error')
      return { valid: false }
    }
    const result = parseLinkString(trimmed)
    if (result.error) {
      setStatus(result.error, 'error')
      return { valid: false }
    }
    return { valid: true, driveKey: result.driveKey }
  }, [joinInput, setStatus])

  const startJoinTimeout = useCallback(() => {
    joinTimeoutRef.current = setTimeout(() => {
      console.warn('[Vault Join] Timeout waiting for join completion events')
      cleanupJoinListeners()
      setJoining(false)
      setStatus('Join operation timed out. Please try again.', 'error')
      ensureResumeAutoRefresh()
    }, 12000)
  }, [cleanupJoinListeners, ensureResumeAutoRefresh, setStatus])

  const handleJoin = useCallback(async () => {
    if (joining) return
    const validation = validateJoinInput()
    if (!validation.valid) return
    const targetKey = validation.driveKey

    let currentKey = null
    try {
      currentKey = await pearl.getCurrentVaultKey()
    } catch (err) {
      console.warn('Could not check current vault key:', err)
    }

    const requiresConfirmation = needsVaultSwitchConfirmation({
      currentKey,
      targetKey,
      pendingKey: confirmationKey
    })

    if (requiresConfirmation) {
      setConfirmationKey(targetKey)
      setStatus(
        `Switching from ${currentKey?.slice(0, 12) || '(none)'}… to ${targetKey.slice(0, 12)}…. Click confirm to continue.`,
        'warn'
      )
      return
    }

    setConfirmationKey(null)
    pauseAutoRefresh?.()
    autoRefreshPausedRef.current = true
    setJoining(true)
    setStatus('Joining vault…', 'info')

    cleanupJoinListeners()

    const handleJoinSuccess = (event) => {
      cleanupJoinListeners()
      setJoining(false)
      setStatus('Vault joined! Syncing content from peers...', 'success')
      forceReloadNotes?.().catch((err) => console.error('[Vault Join] Force reload failed:', err))
      setTimeout(() => handleClose(), 900)
    }

    const handleJoinError = (event) => {
      cleanupJoinListeners()
      setJoining(false)
      const error = event.detail.error
      setStatus(error?.message || 'Failed to join vault link.', 'error')
      ensureResumeAutoRefresh()
    }

    pearl.addVaultEventListener('vault:joined', handleJoinSuccess)
    pearl.addVaultEventListener('vault:join-error', handleJoinError)
    cleanupRef.current = () => {
      pearl.removeVaultEventListener('vault:joined', handleJoinSuccess)
      pearl.removeVaultEventListener('vault:join-error', handleJoinError)
    }

    startJoinTimeout()

    try {
      await pearl.joinVaultLink(joinInput.trim())
    } catch (err) {
      console.error('[Vault Join] Failed to initiate join:', err)
      cleanupJoinListeners()
      setJoining(false)
      setStatus(err.message || 'Failed to start vault join.', 'error')
      ensureResumeAutoRefresh()
    }
  }, [
    joining,
    validateJoinInput,
    pearl,
    confirmationKey,
    pauseAutoRefresh,
    cleanupJoinListeners,
    startJoinTimeout,
    joinInput,
    forceReloadNotes,
    ensureResumeAutoRefresh,
    handleClose,
    setStatus
  ])

  const messageColor = useMemo(() => toneToColor[messageTone] || toneToColor.info, [messageTone])

  return (
    <Modal open title="Share or join a vault" onClose={handleClose}>
      <div className="vault-share-modal">
        {currentVaultKey ? (
          <p className="modal-note" data-field="current-vault">
            Current vault: {currentVaultKey.slice(0, 12)}…
          </p>
        ) : null}
        <p className="modal-note">
          Device A: Create a link and copy it. Device B: Paste the link and join. QR is optional in this POC.
        </p>
        <div className="modal-section">
          <button className="btn btn-primary" type="button" onClick={handleCreateLink} disabled={joining}>
            Create share link
          </button>
          <textarea
            className="link-output"
            value={shareLink}
            readOnly
            placeholder="Link appears here after you create it."
          />
          <div className="button-row">
            <button className="btn" type="button" onClick={handleCopyLink} disabled={!shareLink}>
              Copy link
            </button>
          </div>
        </div>
        <div className="modal-section">
          <textarea
            className="link-input"
            value={joinInput}
            placeholder="Paste a pearl-vault:// link here"
            onChange={(event) => {
              setJoinInput(event.target.value)
              setConfirmationKey(null)
              setStatus('Paste a pearl-vault:// link to join another vault.', 'info')
            }}
          />
          <div className="button-row">
            <button className="btn btn-primary" type="button" onClick={handleJoin} disabled={joining}>
              {joining ? 'Joining…' : confirmationKey ? 'Confirm vault switch' : 'Join vault link'}
            </button>
          </div>
        </div>
        <p className="modal-hint" style={{ color: messageColor }}>
          {message}
        </p>
      </div>
    </Modal>
  )
}

