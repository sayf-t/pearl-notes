import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AUTO_SAVE_DELAY_MS,
  NOTE_MODES,
  NOTES_AUTO_REFRESH_INTERVAL_MS
} from '../../constants.js'
import { composeMarkdownDocument, formatNoteMetaValue, snapshotFromFields } from '../../utils/markdown.js'
import { buildNoteLookup, cleanWikiTarget, normalizeWikiKey } from '../../utils/wiki.js'
import { useWikiPalette } from '../useWikiPalette'

export function useNotesWorkspace ({ pearl, markdown }) {
  const [notes, setNotes] = useState([])
  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const [noteFields, setNoteFields] = useState({ title: '', body: '' })
  const [noteMode, setNoteMode] = useState(NOTE_MODES.CREATE)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [status, setStatus] = useState({ text: 'Start typing — autosave is on.', tone: 'info' })
  const [previewMode, setPreviewMode] = useState('edit')
  const vaultKeyRef = useRef(null) // Track vault changes without triggering re-renders

  const autosaveRef = useRef(null)
  const lastSnapshotRef = useRef('')
  const autoRefreshActiveRef = useRef(true) // Track auto-refresh state without causing re-renders
  const previewRef = useRef(null)
  const bodyInputRef = useRef(null)

  const { wikiPalette, wikiSuggestions, refreshWikiPalette, closeWikiPalette, highlightNext, highlightPrevious, handleWikiOptionHover } =
    useWikiPalette({ notes })

  const notesIndex = useMemo(() => buildNoteLookup(notes), [notes])

  const previewHtml = useMemo(() => {
    const doc = composeMarkdownDocument(noteFields)
    return doc ? markdown.render(doc) : null
  }, [noteFields, markdown])

  const updateStatus = useCallback((text, tone = 'info') => {
    setStatus({ text, tone })
  }, [])

  const formatNoteMeta = useCallback(
    (note) => formatNoteMetaValue(note, markdown),
    [markdown]
  )

  const placeholderAction = useCallback(
    (message) => () => updateStatus(message, 'muted'),
    [updateStatus]
  )

  const clearEditor = useCallback(
    ({ message = 'New note (autosave ready)', skipStatus = false } = {}) => {
      setNoteFields({ title: '', body: '' })
      setSelectedNoteId(null)
      setNoteMode(NOTE_MODES.CREATE)
      closeWikiPalette()
      lastSnapshotRef.current = ''
      if (!skipStatus) updateStatus(message, 'info')
    },
    [closeWikiPalette, updateStatus]
  )

  const loadNotes = useCallback(
    async ({ silent = false, force = false } = {}) => {
      console.log('[Notes Workspace] loadNotes called, silent:', silent, 'force:', force)
      try {
        // Check current vault key to detect changes
        console.log('[Notes Workspace] About to get current vault key...')
        const currentVaultKey = await pearl.getCurrentVaultKey()
        const previousVaultKey = vaultKeyRef.current
        console.log('[Notes Workspace] Current vault key:', currentVaultKey, 'previous:', previousVaultKey)

        const vaultChanged = force || currentVaultKey !== previousVaultKey
        console.log('[Notes Workspace] Vault changed:', vaultChanged, 'force:', force)

        console.log('[Notes Workspace] Calling pearl.listNotes()...')
        const list = await pearl.listNotes()
        console.log('[Notes Workspace] Got notes list:', list.length, 'notes')

        // Update vault key and clear state when vault changes
        if (vaultChanged) {
          console.log('[Notes Workspace] Vault changed, updating key and clearing state')
          vaultKeyRef.current = currentVaultKey
          setSelectedNoteId(null)
          setNoteFields({ title: '', body: '' })
          setNoteMode(NOTE_MODES.CREATE)
        }

        setNotes(list)

        if (selectedNoteId) {
          const stillExists = list.some((note) => note.id === selectedNoteId)
          if (!stillExists) {
            clearEditor({ message: 'Note removed on another device.' })
          }
        } else if (!silent) {
          if (vaultChanged && list.length === 0) {
            // New vault appears empty - could be syncing
            updateStatus('Vault joined! Syncing content from peers...', 'info')
          } else if (list.length === 0) {
            updateStatus('Vault is empty. Start typing to create your first note!', 'info')
          } else {
            updateStatus(`Loaded ${list.length} note${list.length === 1 ? '' : 's'}.`, 'success')
          }
        }
      } catch (err) {
        console.error('Failed to load notes', err)
        if (!silent) {
          updateStatus('Syncing with vault... Notes will appear once connected to peers.', 'info')
        }
      }
    },
    [pearl, selectedNoteId, clearEditor, updateStatus]
  )

  const saveNote = useCallback(
    async (fieldsOverride, options = {}) => {
      const { silent = false } = options
      const fields = fieldsOverride ?? noteFields
      const snapshot = snapshotFromFields(fields)
      if (!snapshot) {
        if (!silent) updateStatus('Nothing to save yet.', 'muted')
        return
      }
      try {
        if (noteMode === NOTE_MODES.EDIT && selectedNoteId) {
          if (snapshot === lastSnapshotRef.current) {
            if (!silent) updateStatus('Already up to date.', 'muted')
            return
          }
          await pearl.saveNote({ id: selectedNoteId, ...fields })
          lastSnapshotRef.current = snapshot
          if (!silent) updateStatus('All changes saved.', 'success')
        } else {
          const created = await pearl.saveNote(fields)
          setSelectedNoteId(created.id)
          setNoteMode(NOTE_MODES.EDIT)
          lastSnapshotRef.current = snapshot
          if (!silent) updateStatus('Note created.', 'success')
        }
        await loadNotes({ silent: true })
      } catch (err) {
        console.error('Failed to save note', err)
        updateStatus('Failed to save note.', 'error')
      }
    },
    [noteFields, noteMode, selectedNoteId, pearl, loadNotes, updateStatus]
  )

  const scheduleAutoSave = useCallback(
    (fields) => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current)
      updateStatus('Autosaving…', 'muted')
      autosaveRef.current = setTimeout(() => {
        saveNote(fields, { silent: true, reason: 'typing' }).catch((err) =>
          console.error('Auto save failed', err)
        )
      }, AUTO_SAVE_DELAY_MS)
    },
    [saveNote, updateStatus]
  )

  const handleFieldInput = useCallback(
    (field) => (event) => {
      const value = event.target.value
      setNoteFields((prev) => {
        const next = { ...prev, [field]: value }
        scheduleAutoSave(next)
        return next
      })
    },
    [scheduleAutoSave]
  )

  const handleBodyInput = useCallback(
    (event) => {
      const value = event.target.value
      const caret = event.target.selectionStart ?? value.length
      setNoteFields((prev) => {
        const next = { ...prev, body: value }
        scheduleAutoSave(next)
        return next
      })
      refreshWikiPalette(value, caret, event.target)
    },
    [scheduleAutoSave, refreshWikiPalette]
  )

  const handleBodySelect = useCallback(() => {
    const element = bodyInputRef.current
    if (!element) return
    const caret = element.selectionStart ?? element.value.length
    refreshWikiPalette(element.value, caret, element)
  }, [refreshWikiPalette])

  const handleBodyScroll = useCallback(() => {
    if (!wikiPalette) return
    const element = bodyInputRef.current
    if (!element) return
    const caret = element.selectionStart ?? element.value.length
    refreshWikiPalette(element.value, caret, element)
  }, [wikiPalette, refreshWikiPalette])

  const handleBodyBlur = useCallback(() => {
    closeWikiPalette()
  }, [closeWikiPalette])

  const handleWikiOptionSelect = useCallback(
    (option) => {
      if (!option || !bodyInputRef.current || !wikiPalette) return
      const textarea = bodyInputRef.current
      const value = textarea.value
      const caret = wikiPalette.caretIndex ?? textarea.selectionStart ?? value.length
      const before = value.slice(0, wikiPalette.triggerStart)
      const after = value.slice(caret)
      const titleSource = option.isCreateSuggestion ? option.title : option.title || option.id || ''
      const safeTitle = cleanWikiTarget(titleSource || wikiPalette.query)
      if (!safeTitle) {
        closeWikiPalette()
        return
      }
      const insertion = `[[${safeTitle}]]`
      const nextValue = `${before}${insertion}${after}`
      setNoteFields((prev) => {
        const next = { ...prev, body: nextValue }
        scheduleAutoSave(next)
        return next
      })
      closeWikiPalette()
      const raf = typeof window !== 'undefined' ? window.requestAnimationFrame : (cb) => setTimeout(cb, 0)
      raf(() => {
        const cursor = before.length + insertion.length
        textarea.selectionStart = textarea.selectionEnd = cursor
        textarea.focus()
      })
    },
    [wikiPalette, setNoteFields, scheduleAutoSave, closeWikiPalette, bodyInputRef]
  )

  const handleBodyKeyDown = useCallback(
    (event) => {
      if (!wikiPalette) return
      const hasOptions = wikiSuggestions.length > 0
      if (event.key === 'ArrowDown' && hasOptions) {
        event.preventDefault()
        highlightNext()
        return
      }
      if (event.key === 'ArrowUp' && hasOptions) {
        event.preventDefault()
        highlightPrevious()
        return
      }
      if ((event.key === 'Enter' || event.key === 'Tab') && hasOptions) {
        event.preventDefault()
        const option = wikiSuggestions[wikiPalette.selectedIndex] || wikiSuggestions[0]
        handleWikiOptionSelect(option)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        closeWikiPalette()
      }
    },
    [wikiPalette, wikiSuggestions, highlightNext, highlightPrevious, handleWikiOptionSelect, closeWikiPalette]
  )

  const persistPendingChanges = useCallback(async () => {
    const snapshot = snapshotFromFields(noteFields)
    if (!snapshot || snapshot === lastSnapshotRef.current) return
    await saveNote(noteFields, { silent: true, reason: 'before-navigation' })
  }, [noteFields, saveNote])

  const openNote = useCallback(
    async (id) => {
      console.log('[Notes Workspace] openNote called with id:', id, 'typeof id:', typeof id)
      try {
        await persistPendingChanges()
        console.log('[Notes Workspace] persistPendingChanges completed')
      } catch (err) {
        console.error('[Notes Workspace] persistPendingChanges failed:', err)
        return
      }

      try {
        console.log('[Notes Workspace] Calling pearl.getNote...')
        const note = await pearl.getNote(id)
        console.log('[Notes Workspace] Got note:', note)
        setSelectedNoteId(note.id)
        setNoteMode(NOTE_MODES.EDIT)
        const fields = { title: note.title || '', body: note.body || '' }
        setNoteFields(fields)
        closeWikiPalette()
        lastSnapshotRef.current = snapshotFromFields(fields)
        updateStatus('', 'info')
        console.log('[Notes Workspace] Note opened successfully')
      } catch (err) {
        console.error('[Notes Workspace] Failed to open note:', err.message || err)
        updateStatus('Failed to open note.', 'error')
      }
    },
    [persistPendingChanges, pearl, updateStatus, closeWikiPalette]
  )

  const handleWikiLinkNavigate = useCallback(
    async (rawTarget) => {
      const cleanTarget = cleanWikiTarget(rawTarget)
      const normalizedKey = normalizeWikiKey(rawTarget)
      if (!cleanTarget || !normalizedKey) return
      closeWikiPalette()
      const existing = notesIndex.get(normalizedKey)
      if (existing) {
        await openNote(existing.id)
        return
      }
      await persistPendingChanges()
      try {
        const created = await pearl.saveNote({ title: cleanTarget, body: '' })
        const nextFields = {
          title: created?.title ?? cleanTarget,
          body: created?.body ?? ''
        }
        setSelectedNoteId(created.id)
        setNoteMode(NOTE_MODES.EDIT)
        setNoteFields(nextFields)
        lastSnapshotRef.current = snapshotFromFields(nextFields)
        updateStatus(`Created "${nextFields.title || cleanTarget}" from link.`, 'success')
        await loadNotes({ silent: true })
      } catch (err) {
        console.error('Failed to create linked note', err)
        updateStatus('Failed to create linked note.', 'error')
      }
    },
    [notesIndex, openNote, persistPendingChanges, pearl, loadNotes, updateStatus, closeWikiPalette]
  )

  const handleNewNote = useCallback(async () => {
    await persistPendingChanges()
    clearEditor()
  }, [persistPendingChanges, clearEditor])

  const handleDeleteNote = useCallback(async () => {
    if (!selectedNoteId) return
    try {
      await pearl.deleteNote(selectedNoteId)
      clearEditor({ message: 'Note deleted.' })
      await loadNotes({ silent: true })
    } catch (err) {
      console.error('Failed to delete note', err)
      updateStatus('Failed to delete note.', 'error')
    }
  }, [selectedNoteId, pearl, clearEditor, loadNotes, updateStatus])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  const handlePreviewToggle = useCallback(() => {
    setPreviewMode((prev) => (prev === 'preview' ? 'edit' : 'preview'))
  }, [])

  // Initial load - only runs once on mount
  useEffect(() => {
    loadNotes()
  }, []) // Empty dependency array - only run once on mount

  // Automatic refresh setup - stable, doesn't re-run on state changes
  useEffect(() => {
    let interval

    const setupAutoRefresh = () => {
      if (interval) clearInterval(interval)
      interval = setInterval(() => {
        if (!autoRefreshActiveRef.current) return
        loadNotes({ silent: true })
      }, NOTES_AUTO_REFRESH_INTERVAL_MS)
    }

    const handleVisibility = () => {
      if (document.hidden) return
      if (!autoRefreshActiveRef.current) return
      loadNotes({ silent: true })
    }

    // Initial setup
    setupAutoRefresh()

    window.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
    window.addEventListener('online', handleVisibility)

    return () => {
      if (interval) clearInterval(interval)
      window.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      window.removeEventListener('online', handleVisibility)
    }
  }, [loadNotes]) // Only depend on loadNotes function changes // Include loadNotes for automatic refresh

  useEffect(() => {
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current)
    }
  }, [])

  useEffect(() => {
    const container = previewRef.current
    if (!container) return undefined
    const handleClick = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest('[data-wikilink-target]')
      if (!link) return
      event.preventDefault()
      const linkTarget = link.getAttribute('data-wikilink-target') || ''
      handleWikiLinkNavigate(linkTarget).catch((err) => console.error('Failed to follow wiki link', err))
    }
    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [handleWikiLinkNavigate])

  useEffect(() => {
    const container = previewRef.current
    if (!container) return
    const anchors = container.querySelectorAll('[data-wikilink-target]')
    anchors.forEach((anchor) => {
      const target = anchor.getAttribute('data-wikilink-target') || ''
      const normalized = normalizeWikiKey(target)
      const resolved = normalized ? notesIndex.get(normalized) : null
      const state = resolved ? 'resolved' : 'new'
      anchor.setAttribute('data-wikilink-status', state)
      const label = anchor.getAttribute('data-wikilink-label') || anchor.textContent || target
      if (resolved) {
        anchor.setAttribute('title', `Open “${resolved.title || label}”`)
      } else if (target) {
        anchor.setAttribute('title', `Create “${label || target}”`)
      }
    })
  }, [previewHtml, notesIndex])

  useEffect(() => {
    if (previewMode === 'preview') {
      closeWikiPalette()
    }
  }, [previewMode, closeWikiPalette])

  const forceReloadNotes = useCallback(async () => {
    console.log('[Notes Workspace] Force reloading notes after vault change')

    try {
      // Always force a reload since this is called after vault join events
      // The vault key state may not be updated yet due to React async updates
      console.log('[Notes Workspace] Forcing reload after vault join')
      await loadNotes({ silent: false, force: true })
    } catch (err) {
      console.error('[Notes Workspace] Force reload failed:', err)
      // Still try a normal reload as fallback
      try {
        await loadNotes({ silent: false })
      } catch (fallbackErr) {
        console.error('[Notes Workspace] Fallback reload also failed:', fallbackErr)
      }
    }
  }, [loadNotes, pearl])

  const pauseAutoRefresh = useCallback(() => {
    autoRefreshActiveRef.current = false
  }, [])

  const resumeAutoRefresh = useCallback(() => {
    const wasPaused = !autoRefreshActiveRef.current
    autoRefreshActiveRef.current = true
    if (wasPaused) {
      loadNotes({ silent: true }).catch((err) => {
        console.error('[Notes Workspace] Auto refresh resume failed', err)
      })
    }
  }, [loadNotes])

  return {
    notes,
    noteFields,
    noteMode,
    selectedNoteId,
    sidebarCollapsed,
    previewMode,
    status,
    previewHtml,
    previewRef,
    bodyInputRef,
    wikiPalette,
    wikiSuggestions,
    formatNoteMeta,
    placeholderAction,
    handleFieldInput,
    handleBodyInput,
    handleBodySelect,
    handleBodyScroll,
    handleBodyBlur,
    handleBodyKeyDown,
    handleWikiOptionSelect,
    handleWikiOptionHover,
    handleNewNote,
    handleDeleteNote,
    openNote,
    toggleSidebar,
    handlePreviewToggle,
    updateStatus,
    loadNotes,
    forceReloadNotes,
    pauseAutoRefresh,
    resumeAutoRefresh
  }
}

