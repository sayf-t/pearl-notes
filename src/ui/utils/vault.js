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

export function openVaultShareModal ({ pearl, notify, refreshVaultStatus, refreshNotes }) {
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
      const messageEl = popup.querySelector('[data-field="share-message"]')
      const outputEl = popup.querySelector('[data-field="share-output"]')
      const inputEl = popup.querySelector('[data-field="share-input"]')
      const createBtn = popup.querySelector('[data-action="create-share"]')
      const copyBtn = popup.querySelector('[data-action="copy-share"]')
      const joinBtn = popup.querySelector('[data-action="join-share"]')
      const currentVaultEl = popup.querySelector('[data-field="current-vault"]')

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
      inputEl?.addEventListener('input', () => {
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
      })

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
        const value = inputEl.value.trim()
        if (!value) {
          setMessage('Paste a vault link first.', 'error')
          inputEl.focus()
          return
        }

        // Validate link format first
        const validation = validateLink(value)
        if (!validation.valid) {
          setMessage(validation.error, 'error')
          inputEl.focus()
          return
        }

        // Check if user is switching from an existing vault
        try {
          const currentKey = await pearl.getCurrentVaultKey()
          if (currentKey && currentKey.toLowerCase() !== validation.driveKey.toLowerCase()) {
            // Show confirmation dialog
            const confirmResult = await SwalLib.fire({
              title: 'Switch to different vault?',
              html: `
                <p>You are currently using vault: <code>${currentKey.slice(0, 12)}…</code></p>
                <p>You are about to switch to vault: <code>${validation.driveKey.slice(0, 12)}…</code></p>
                <p style="margin-top: 1em; color: var(--muted);">
                  Your current vault's data will remain accessible, but you'll be viewing a different vault.
                </p>
              `,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Yes, switch vault',
              cancelButtonText: 'Cancel',
              customClass: { popup: 'pearl-swal' }
            })

            if (!confirmResult.isConfirmed) {
              setMessage('Vault switch cancelled.', 'info')
              return
            }
          }
        } catch (err) {
          console.warn('Could not check current vault key:', err)
        }

        setMessage('Joining vault…')
        try {
          await pearl.joinVaultLink(value)
          await refreshVaultStatus()
          await refreshNotes()
          setMessage('Successfully joined vault. Sync restarted.', 'info')
          setTimeout(() => SwalLib.close(), 1000)
        } catch (err) {
          console.error('Failed to join link', err)
          const errorMsg = err.message || 'Failed to join link.'
          setMessage(errorMsg, 'error')
        }
      })
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

