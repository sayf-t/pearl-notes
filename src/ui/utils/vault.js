import { copyTextToClipboard } from './clipboard.js'
import { getSwal } from './modal.js'
import { parseLinkString } from '../../pear-end/vault/vaultConfig.js'

export function formatVaultStatus (status) {
  if (!status) return 'Vault key: (loading...)'
  const { driveKey, connected, peersCount, lastSyncAt, writable } = status
  const keyDisplay = driveKey ? `${driveKey.slice(0, 12)}…` : '(allocating...)'
  const parts = [`Vault key: ${keyDisplay}`, connected ? 'Sync: active' : 'Sync: offline']
  parts.push(`Peers: ${peersCount ?? 0}`)
  if (typeof writable === 'boolean') {
    parts.push(`Access: ${writable ? 'write' : 'read-only'}`)
  }
  if (lastSyncAt) parts.push(`Last sync: ${new Date(lastSyncAt).toLocaleTimeString()}`)
  return parts.join(' · ')
}

export function openVaultShareModal ({ pearl, notify, refreshVaultStatus, refreshNotes, forceReloadNotes, pauseAutoRefresh, resumeAutoRefresh }) {
  const SwalLib = getSwal()
  if (!SwalLib) {
    notify('SweetAlert unavailable — cannot open share modal.', 'error')
    return
  }

  // Get current vault info to show in modal
  let currentVaultKey = null
  pearl.getCurrentVaultKey().then(key => {
    currentVaultKey = key
    // Update the current vault display if modal is still open
    const currentVaultEl = document.querySelector('[data-field="current-vault"]')
    if (currentVaultEl) {
      if (key) {
        currentVaultEl.textContent = `Current vault: ${key.slice(0, 12)}…`
        currentVaultEl.style.display = 'block'
      } else {
        currentVaultEl.style.display = 'none'
      }
    }
  }).catch(() => {
    // Ignore errors when getting current vault key
  })

  SwalLib.fire({
    title: 'Share or join a vault',
    html: renderVaultShareModalHtml(currentVaultKey),
    width: 520,
    customClass: { popup: 'pearl-swal' },
    showConfirmButton: false,
    focusConfirm: false,
    didOpen: async (popup) => {
      console.log('[Vault Modal] Modal opened')
      const messageEl = popup.querySelector('[data-field="share-message"]')
      const outputEl = popup.querySelector('[data-field="share-output"]')
      const inputEl = popup.querySelector('[data-field="share-input"]')
      const createBtn = popup.querySelector('[data-action="create-share"]')
      const copyBtn = popup.querySelector('[data-action="copy-share"]')
      const joinBtn = popup.querySelector('[data-action="join-share"]')
      const currentVaultEl = popup.querySelector('[data-field="current-vault"]')

      console.log('[Vault Modal] Elements found:', {
        messageEl: !!messageEl,
        outputEl: !!outputEl,
        inputEl: !!inputEl,
        createBtn: !!createBtn,
        copyBtn: !!copyBtn,
        joinBtn: !!joinBtn,
        currentVaultEl: !!currentVaultEl
      })

      // Reset modal state
      if (inputEl) inputEl.value = ''
      if (outputEl) outputEl.value = ''
      if (copyBtn) copyBtn.disabled = true
      if (joinBtn) joinBtn.disabled = false
      if (createBtn) createBtn.disabled = false

      const setMessage = (msg, tone = 'info') => {
        if (!messageEl) return
        messageEl.textContent = msg
        messageEl.style.color = tone === 'error' ? 'var(--danger)' : 'var(--muted)'
      }

      // Update current vault display
      try {
        const currentKey = await pearl.getCurrentVaultKey()
        if (currentKey && currentVaultEl) {
          currentVaultEl.textContent = `Current vault: ${currentKey.slice(0, 12)}…`
          currentVaultEl.style.display = 'block'
        } else if (currentVaultEl) {
          currentVaultEl.style.display = 'none'
        }
      } catch {}

      setMessage('Device A: create & copy. Device B: paste & join.')

      // Validate link format
      const validateLink = (linkString) => {
        const trimmed = linkString.trim()
        if (!trimmed) {
          return { valid: false, error: 'Please paste a vault link.' }
        }
        const result = parseLinkString(trimmed)
        if (result.error) {
          return { valid: false, error: result.error }
        }
        return { valid: true, driveKey: result.driveKey }
      }

      // Real-time validation as user types
      const handleInput = () => {
        const value = inputEl.value.trim()
        if (value) {
          const validation = validateLink(value)
          if (!validation.valid) {
            setMessage(validation.error, 'error')
          } else {
            setMessage('Link format looks good. Click "Join vault link" to switch.', 'info')
          }
        } else {
          setMessage('Paste a pearl-vault:// link to join another vault.', 'info')
        }
      }
      inputEl?.addEventListener('input', handleInput)

      createBtn?.addEventListener('click', async () => {
        setMessage('Creating share link…')
        try {
          const { linkString } = await pearl.createVaultLink()
          outputEl.value = linkString
          copyBtn.disabled = !linkString
          setMessage('Copy this link and send it to another device.')
        } catch (err) {
          console.error('Failed to create link', err)
          outputEl.value = ''
          copyBtn.disabled = true
          setMessage('Failed to create link.', 'error')
        }
      })

      copyBtn?.addEventListener('click', async () => {
        if (!outputEl.value) {
          setMessage('Create a link first.')
          outputEl.focus()
          return
        }
        const success = await copyTextToClipboard(outputEl.value)
        setMessage(success ? 'Link copied.' : 'Clipboard unavailable.', success ? 'info' : 'error')
      })

      joinBtn?.addEventListener('click', async () => {
        console.log('[Vault Modal] Join button clicked')
        const value = inputEl.value.trim()
        console.log('[Vault Modal] Input value:', value)

        if (!value) {
          setMessage('Paste a vault link first.', 'error')
          inputEl.focus()
          return
        }

        // Validate link format first
        const validation = validateLink(value)
        console.log('[Vault Modal] Validation result:', validation)
        if (!validation.valid) {
          setMessage(validation.error, 'error')
          inputEl.focus()
          return
        }

        // Disable button during join process
        if (joinBtn) joinBtn.disabled = true

        // Check if user is switching from an existing vault
        try {
          const currentKey = await pearl.getCurrentVaultKey()
          console.log('[Vault Join] Current vault key:', currentKey)
          console.log('[Vault Join] Target drive key:', validation.driveKey)

          if (currentKey && currentKey.toLowerCase() !== validation.driveKey.toLowerCase()) {
            console.log('[Vault Join] Showing confirmation dialog for vault switch')

            // Use browser confirm dialog to avoid SweetAlert2 nesting issues
            const userConfirmed = window.confirm(
              `Switch to different vault?\n\n` +
              `Current vault: ${currentKey.slice(0, 12)}…\n` +
              `New vault: ${validation.driveKey.slice(0, 12)}…\n\n` +
              `Your current vault's data will remain accessible, but you'll be viewing a different vault.`
            )

            console.log('[Vault Join] User confirmed vault switch:', userConfirmed)

            if (!userConfirmed) {
              setMessage('Vault switch cancelled.', 'info')
              if (joinBtn) joinBtn.disabled = false
              return
            }
          } else {
            console.log('[Vault Join] No vault switch needed or no current vault')
          }
        } catch (err) {
          console.warn('Could not check current vault key:', err)
        }

        // Pause automatic refresh during vault join operation
        if (pauseAutoRefresh) pauseAutoRefresh()

        setMessage('Joining vault…')
        console.log('[Vault Join] Starting join process for:', value)

        // Set up event listeners for join completion
        let joinCompleted = false
        let joinError = false

        const handleJoinSuccess = (event) => {
          console.log('[Vault Join] Join completed via event:', event.detail)
          joinCompleted = true
          cleanup()

          // Vault join successful - trigger immediate refresh and close modal
          setMessage('Vault joined! Syncing content from peers...', 'info')
          console.log('[Vault Join] Triggering immediate refresh and closing modal')

          // Trigger immediate force reload to update UI with new vault
          console.log('[Vault Join] Calling forceReloadNotes...')
          if (forceReloadNotes) {
            forceReloadNotes().catch(err => console.error('[Vault Join] Force reload failed:', err))
          } else {
            console.warn('[Vault Join] forceReloadNotes not available')
          }

          // Close modal immediately
          setTimeout(() => {
            console.log('[Vault Join] Closing modal')
            SwalLib.close()
            // Resume automatic refresh after modal closes
            if (resumeAutoRefresh) resumeAutoRefresh()
          }, 1000)
        }

        const handleJoinError = (event) => {
          console.error('[Vault Join] Join failed via event:', event.detail)
          joinError = true
          cleanup()

          const error = event.detail.error
          const errorMsg = error?.message || 'Failed to join vault link.'
          setMessage(errorMsg, 'error')

          // Re-enable the join button after error
          if (joinBtn) joinBtn.disabled = false
          // Resume automatic refresh on error
          if (resumeAutoRefresh) resumeAutoRefresh()
        }

        const cleanup = () => {
          pearl.removeVaultEventListener('vault:joined', handleJoinSuccess)
          pearl.removeVaultEventListener('vault:join-error', handleJoinError)
        }

        // Listen for vault join events
        pearl.addVaultEventListener('vault:joined', handleJoinSuccess)
        pearl.addVaultEventListener('vault:join-error', handleJoinError)

        // Start the join process (fire-and-forget)
        try {
          console.log('[Vault Join] Initiating join process...')
          await pearl.joinVaultLink(value)
          console.log('[Vault Join] Join initiated, waiting for events...')

          // Set a timeout in case events don't fire (slightly longer than backend timeout)
          setTimeout(() => {
            if (!joinCompleted && !joinError) {
              console.warn('[Vault Join] Timeout waiting for join completion events')
              cleanup()
              setMessage('Join operation timed out. Please try again.', 'error')
              if (joinBtn) joinBtn.disabled = false
              if (resumeAutoRefresh) resumeAutoRefresh()
            }
          }, 12000) // 12 second timeout (slightly longer than backend's 10s)

        } catch (err) {
          console.error('[Vault Join] Failed to initiate join:', err)
          cleanup()
          const errorMsg = err.message || 'Failed to start vault join.'
          setMessage(errorMsg, 'error')
          // Re-enable the join button after error
          if (joinBtn) joinBtn.disabled = false
          // Resume automatic refresh on error
          if (resumeAutoRefresh) resumeAutoRefresh()
        }
      })
    }
  })
}

export function openVaultManagerModal ({ pearl, notify, refreshVaultStatus, refreshNotes, exportDir }) {
  const SwalLib = getSwal()
  if (!SwalLib) {
    notify?.('SweetAlert unavailable — cannot open vault manager.', 'error')
    return
  }

  SwalLib.fire({
    title: 'Vault manager',
    html: renderVaultManagerModalHtml(),
    width: 540,
    customClass: { popup: 'pearl-swal' },
    showConfirmButton: false,
    focusConfirm: false,
    didOpen: async (popup) => {
      const messageEl = popup.querySelector('[data-field="vault-manager-message"]')
      const currentKeyEl = popup.querySelector('[data-field="vault-manager-current-key"]')
      const exportPathEl = popup.querySelector('[data-field="vault-manager-export-path"]')
      const recentsListEl = popup.querySelector('[data-field="vault-manager-recent-list"]')
      const copyKeyBtn = popup.querySelector('[data-action="vault-manager-copy-key"]')
      const copyPathBtn = popup.querySelector('[data-action="vault-manager-copy-path"]')
      const shareBtn = popup.querySelector('[data-action="vault-manager-share"]')
      const refreshBtn = popup.querySelector('[data-action="vault-manager-refresh"]')

      let currentKey = null

      const setMessage = (msg, tone = 'muted') => {
        if (!messageEl) return
        messageEl.textContent = msg
        messageEl.style.color =
          tone === 'error' ? 'var(--danger)' : tone === 'success' ? '#7be4a2' : 'var(--muted)'
      }

      const handleVaultSwitch = async (driveKey, label) => {
        if (!driveKey) return
        if (currentKey && driveKey === currentKey) {
          setMessage('Already viewing that vault.', 'muted')
          return
        }

        const confirmed = window.confirm(
          `Switch to vault ${label || driveKey.slice(0, 12) + '…'}?\n\n` +
            'Your notes stay on disk — you are simply viewing a different vault.'
        )
        if (!confirmed) {
          setMessage('Vault switch cancelled.', 'muted')
          return
        }

        setMessage('Switching vault…')
        try {
          await pearl.setCurrentVault?.(driveKey)
          await refreshVaultStatus?.()
          await refreshNotes?.()
          setMessage('Vault switched. Refreshing workspace…', 'success')
          setTimeout(() => SwalLib.close(), 800)
        } catch (err) {
          console.error('Failed to switch vault:', err)
          notify?.(err.message || 'Failed to switch vault.', 'error')
          setMessage(err.message || 'Failed to switch vault.', 'error')
        }
      }

      const renderRecentList = (recents = []) => {
        if (!recentsListEl) return
        recentsListEl.innerHTML = ''
        if (!recents.length) {
          const emptyItem = document.createElement('li')
          emptyItem.className = 'vault-manager-empty'
          emptyItem.textContent = 'No other vaults yet.'
          recentsListEl.appendChild(emptyItem)
          return
        }

        recents.forEach((vault) => {
          if (!vault?.driveKey) return
          const item = document.createElement('li')
          item.className = 'vault-manager-recent-item'
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'vault-manager-recent-btn'
          button.dataset.driveKey = vault.driveKey
          button.disabled = Boolean(currentKey && vault.driveKey === currentKey)

          const label = document.createElement('span')
          label.className = 'vault-manager-recent-label'
          const buttonLabel = vault.label || `Vault ${vault.driveKey.slice(0, 12)}…`
          label.textContent = buttonLabel

          const keyPreview = document.createElement('span')
          keyPreview.className = 'vault-manager-recent-key'
          keyPreview.textContent = vault.driveKey.slice(0, 20) + '…'

          button.setAttribute('aria-label', `Switch to ${buttonLabel}`)
          button.title = `Switch to ${buttonLabel}`

          button.appendChild(label)
          button.appendChild(keyPreview)
          button.addEventListener('click', () => handleVaultSwitch(vault.driveKey, vault.label))

          item.appendChild(button)
          recentsListEl.appendChild(item)
        })
      }

      const loadState = async () => {
        setMessage('Loading vault details…')
        try {
          const [status, recents] = await Promise.all([
            pearl.getVaultStatus?.(),
            Promise.resolve(pearl.getRecentVaults?.())
          ])

          currentKey = status?.driveKey || null
          if (currentKeyEl) {
            currentKeyEl.textContent = currentKey ? `${currentKey.slice(0, 12)}…` : 'Unavailable'
          }

          const latestExportDir = exportDir || status?.exportDir || 'Not set'
          if (exportPathEl) {
            exportPathEl.textContent = latestExportDir
          }

          renderRecentList(Array.isArray(recents) ? recents : [])

          setMessage('You can copy details, share, or switch vaults.', 'success')
        } catch (err) {
          console.error('Failed to load vault manager state:', err)
          setMessage('Unable to load vault details. Try again.', 'error')
        }
      }

      copyKeyBtn?.addEventListener('click', async () => {
        if (!currentKey) {
          setMessage('Vault key not available yet.', 'error')
          return
        }
        const success = await copyTextToClipboard(currentKey)
        setMessage(success ? 'Vault key copied.' : 'Clipboard unavailable.', success ? 'success' : 'error')
      })

      copyPathBtn?.addEventListener('click', async () => {
        const value = exportPathEl?.textContent?.trim()
        if (!value) {
          setMessage('Export path unavailable.', 'error')
          return
        }
        const success = await copyTextToClipboard(value)
        setMessage(success ? 'Export path copied.' : 'Clipboard unavailable.', success ? 'success' : 'error')
      })

      shareBtn?.addEventListener('click', () => {
        SwalLib.close()
        setTimeout(() => {
          openVaultShareModal({ pearl, notify, refreshVaultStatus, refreshNotes })
        }, 150)
      })

      refreshBtn?.addEventListener('click', loadState)

      await loadState()
    }
  })
}

function renderVaultShareModalHtml (currentVaultKey) {
  return `
    <div class="vault-share-modal">
      <p class="modal-note" data-field="current-vault" style="display: ${currentVaultKey ? 'block' : 'none'}; margin-bottom: 1em; padding: 0.5em; background: var(--bg-secondary); border-radius: 4px; font-size: 0.9em;">
        ${currentVaultKey ? `Current vault: ${currentVaultKey.slice(0, 12)}…` : ''}
      </p>
      <p class="modal-note">
        Device A: Create a link and copy it. Device B: Paste the link and join. QR is optional in this POC.
      </p>
      <div class="modal-section">
        <button class="btn btn-primary" data-action="create-share">Create share link</button>
        <textarea
          class="link-output"
          data-field="share-output"
          readonly
          placeholder="Link appears here after you create it."
        ></textarea>
        <div class="button-row">
          <button class="btn" data-action="copy-share" disabled>Copy link</button>
        </div>
      </div>
      <div class="modal-section">
        <textarea
          class="link-input"
          data-field="share-input"
          placeholder="Paste a pearl-vault:// link here"
        ></textarea>
        <div class="button-row">
          <button class="btn btn-primary" data-action="join-share">Join vault link</button>
        </div>
      </div>
      <p class="modal-hint" data-field="share-message"></p>
    </div>
  `
}

function renderVaultManagerModalHtml () {
  return `
    <style>
      .vault-manager {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .vault-manager-section {
        padding: 12px;
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.02);
      }
      .vault-manager-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 6px;
        color: var(--muted);
      }
      .vault-manager-row {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
      }
      .vault-manager-row code,
      .vault-manager-row span {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.85rem;
      }
      .vault-manager-recents {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 220px;
        overflow-y: auto;
      }
      .vault-manager-recent-btn {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.02);
        color: var(--text);
        cursor: pointer;
        transition: border-color 120ms ease, background 120ms ease;
      }
      .vault-manager-recent-btn:hover:not(:disabled),
      .vault-manager-recent-btn:focus-visible {
        border-color: var(--border-strong);
        background: rgba(255, 255, 255, 0.05);
        outline: none;
      }
      .vault-manager-recent-btn:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      .vault-manager-recent-label {
        font-weight: 600;
        font-size: 0.85rem;
      }
      .vault-manager-recent-key {
        font-size: 0.75rem;
        color: var(--muted);
        margin-left: 12px;
      }
      .vault-manager-empty {
        font-size: 0.85rem;
        color: var(--muted);
      }
      .vault-manager-actions {
        display: flex;
        justify-content: flex-end;
      }
      .vault-manager-message {
        font-size: 0.8rem;
        margin: 0;
        color: var(--muted);
      }
      .vault-manager-recents-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
    </style>
    <div class="vault-manager">
      <div class="vault-manager-section">
        <p class="vault-manager-label">Active vault</p>
        <div class="vault-manager-row">
          <code data-field="vault-manager-current-key">Loading…</code>
          <button class="btn btn-small" data-action="vault-manager-copy-key">Copy key</button>
        </div>
      </div>
      <div class="vault-manager-section">
        <p class="vault-manager-label">Local export folder</p>
        <div class="vault-manager-row">
          <span data-field="vault-manager-export-path">Checking…</span>
          <button class="btn btn-small" data-action="vault-manager-copy-path">Copy path</button>
        </div>
      </div>
      <div class="vault-manager-section">
        <div class="vault-manager-recents-header">
          <p class="vault-manager-label">Recent vaults</p>
          <button class="btn btn-small" data-action="vault-manager-refresh">Refresh</button>
        </div>
        <ul class="vault-manager-recents" data-field="vault-manager-recent-list" aria-label="Recent vaults"></ul>
      </div>
      <div class="vault-manager-section vault-manager-actions">
        <button class="btn btn-primary" data-action="vault-manager-share">Share or join via link</button>
      </div>
      <p class="vault-manager-message" data-field="vault-manager-message" role="status" aria-live="polite">
        Loading vault details…
      </p>
    </div>
  `
}

