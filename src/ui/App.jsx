import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import WikiLinkPaletteDropdown from './components/WikiLinkPaletteDropdown'
import { EDITOR_TOOLBAR_ACTIONS } from './constants.js'
import { useNotesWorkspace } from './hooks/useNotesWorkspace'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useThemeState } from './hooks/useThemeState'
import { useVaultStatus } from './hooks/useVaultStatus'
import { openThemePicker } from './utils/themePicker.js'
import { openNotesModal } from './utils/openNotesModal.js'
import styles from './App.module.css'

const MOBILE_QUERY = '(max-width: 1024px)'

export default function App ({ pearl, themeManager, markdown, uiLog }) {
  const {
    notes,
    noteFields,
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
    loadNotes
  } = useNotesWorkspace({ pearl, markdown })

  const themeState = useThemeState(themeManager)
  const isNarrowViewport = useMediaQuery(MOBILE_QUERY)
  const [isSidebarModalOpen, setSidebarModalOpen] = useState(false)
  const [isStatusBarVisible, setStatusBarVisible] = useState(true)
  const titleInputRef = useRef(null)
  const sidebarModalControllerRef = useRef(null)

  const handleFontChange = useCallback(
    (event) => {
      themeManager.setFontStyle(event.target.value)
    },
    [themeManager]
  )

  const handleThemePicker = useCallback(() => {
    openThemePicker(themeManager, themeState)
  }, [themeManager, themeState])

  const handleStatusBarToggle = useCallback(() => {
    setStatusBarVisible((visible) => !visible)
  }, [])

  const adjustTitleHeight = useCallback(() => {
    const el = titleInputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  const handleTitleInput = useMemo(() => {
    const handler = handleFieldInput('title')
    return (event) => {
      handler(event)
      requestAnimationFrame(adjustTitleHeight)
    }
  }, [handleFieldInput, adjustTitleHeight])

  useEffect(() => {
    adjustTitleHeight()
  }, [noteFields.title, adjustTitleHeight])

  const { vaultStatus, syncStatusText, exportDir, handleCopyVaultKey, handleVaultShare } = useVaultStatus({
    pearl,
    notify: updateStatus,
    uiLog,
    refreshNotes: () => loadNotes({ silent: true })
  })

  const previewButtonLabel = previewMode === 'preview' ? 'Back to editor' : 'Preview'
  const wikiHighlightIndex =
    wikiPalette && wikiSuggestions.length > 0
      ? Math.min(wikiPalette.selectedIndex, wikiSuggestions.length - 1)
      : -1
  const sidebarSharedProps = useMemo(
    () => ({
      notes,
      selectedNoteId,
      onSelectNote: openNote,
      onNewNote: handleNewNote,
      onDeleteNote: handleDeleteNote,
      onVaultShare: handleVaultShare,
      onThemePicker: handleThemePicker,
      formatNoteMeta,
      previewMode,
      previewButtonLabel,
      onPreviewToggle: handlePreviewToggle,
      onCopyVaultKey: handleCopyVaultKey,
      hasVaultKey: Boolean(vaultStatus?.driveKey),
      onStatusBarToggle: handleStatusBarToggle,
      isStatusBarVisible,
      fontStyle: themeState.fontStyle,
      onFontChange: handleFontChange
    }),
    [
      notes,
      selectedNoteId,
      openNote,
      handleNewNote,
      handleDeleteNote,
      handleVaultShare,
      handleThemePicker,
      formatNoteMeta,
      previewMode,
      previewButtonLabel,
      handlePreviewToggle,
      handleCopyVaultKey,
      vaultStatus?.driveKey,
      handleStatusBarToggle,
      isStatusBarVisible,
      themeState.fontStyle,
      handleFontChange
    ]
  )

  const modalSidebarProps = useMemo(
    () => ({
      ...sidebarSharedProps,
      sidebarCollapsed: false
    }),
    [sidebarSharedProps]
  )

  const handleSidebarModalClose = useCallback(() => {
    setSidebarModalOpen(false)
    sidebarModalControllerRef.current = null
  }, [])

  const getShouldUseModal = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (typeof window.matchMedia === 'function') {
        return window.matchMedia(MOBILE_QUERY).matches
      }
      if (typeof window.innerWidth === 'number') {
        return window.innerWidth <= 1024
      }
    }
    return isNarrowViewport
  }, [isNarrowViewport])

  const handleSidebarToggleRequest = useCallback(() => {
    const shouldUseModal = getShouldUseModal()
    if (!shouldUseModal) {
      toggleSidebar()
      return
    }
    if (isSidebarModalOpen) {
      sidebarModalControllerRef.current?.close?.()
      return
    }
    const controller = openNotesModal({
      sidebarProps: modalSidebarProps,
      onClose: handleSidebarModalClose
    })
    if (controller) {
      sidebarModalControllerRef.current = controller
      setSidebarModalOpen(true)
    }
  }, [getShouldUseModal, handleSidebarModalClose, isSidebarModalOpen, modalSidebarProps, toggleSidebar])

  useEffect(() => {
    if (!isSidebarModalOpen || !sidebarModalControllerRef.current) return
    sidebarModalControllerRef.current.update(modalSidebarProps)
  }, [isSidebarModalOpen, modalSidebarProps])

  useEffect(() => {
    if (typeof window === 'undefined' || !isSidebarModalOpen) return undefined
    const handleViewportChange = () => {
      if (!getShouldUseModal()) {
        sidebarModalControllerRef.current?.close?.()
      }
    }
    handleViewportChange()
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
    }
  }, [getShouldUseModal, isSidebarModalOpen])

  const modalViewport = getShouldUseModal()
  const statusBarSidebarOpen = modalViewport ? isSidebarModalOpen : !sidebarCollapsed

  return (
    <div className={styles.app}>
      <div className={styles.shell}>
        <main className={styles.layout} role="main" aria-label="Pearl workspace">
          {!modalViewport ? (
            <Sidebar
              {...sidebarSharedProps}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={toggleSidebar}
            />
          ) : null}
          <section className={styles.mainPane}>
            <div
              className={`${styles.editorSpace} ${previewMode === 'preview' ? styles.editorHidden : ''}`}
              role="region"
              aria-label="Note editor"
              aria-hidden={previewMode === 'preview'}
            >
          <label htmlFor="note-title-input" className={styles.visuallyHidden}>
            Note title
          </label>
              <textarea
                ref={titleInputRef}
                className={styles.editorTitleInput}
                placeholder="Title"
                autoComplete="off"
                spellCheck={false}
                rows={1}
                wrap="soft"
                value={noteFields.title}
                onInput={handleTitleInput}
            id="note-title-input"
            aria-describedby="note-title-help"
              />
          <p id="note-title-help" className={styles.visuallyHidden}>
            Provide a short, descriptive note title. The field expands automatically as you type.
          </p>
              <div className={styles.editorToolbar} role="toolbar" aria-label="Editor utilities">
                {EDITOR_TOOLBAR_ACTIONS.map((action) => {
                  const { Icon } = action
                  return (
                    <button
                      key={action.key}
                      type="button"
                      className={styles.editorToolbarBtn}
                      aria-label={action.label}
                      title={action.label}
                      onClick={placeholderAction(action.message)}
                    >
                      <Icon className={styles.editorToolbarIcon} aria-hidden="true" size={18} />
                    </button>
                  )
                })}
              </div>
              <label htmlFor="note-body-input" className={styles.visuallyHidden}>
                Note body editor
              </label>
              <textarea
                ref={bodyInputRef}
                className={styles.editorBodyInput}
                placeholder="Start writing markdown..."
                spellCheck={false}
                wrap="soft"
                value={noteFields.body}
                onInput={handleBodyInput}
                onKeyDown={handleBodyKeyDown}
                onSelect={handleBodySelect}
                onClick={handleBodySelect}
                onScroll={handleBodyScroll}
                onBlur={handleBodyBlur}
                id="note-body-input"
                aria-describedby="note-body-help"
                aria-multiline="true"
              />
              <p id="note-body-help" className={styles.visuallyHidden}>
                This field supports Markdown syntax and wiki links. Switch to preview mode to verify formatting.
              </p>
            </div>
            <div
              ref={previewRef}
              className={`${styles.markdownPreview} ${previewMode === 'preview' ? styles.previewVisible : ''} ${!previewHtml ? styles.previewEmpty : ''}`}
              aria-live="polite"
              hidden={previewMode !== 'preview'}
              role="region"
              aria-label="Markdown preview"
              tabIndex={0}
              dangerouslySetInnerHTML={{
                __html: previewHtml || '<p>Nothing to preview yet.</p>'
              }}
            />
          </section>
        </main>
        <StatusBar
          syncText={syncStatusText}
          status={status}
          fontStyle={themeState.fontStyle}
          onFontChange={handleFontChange}
          exportDir={exportDir}
          onSidebarToggle={handleSidebarToggleRequest}
          isSidebarOpen={statusBarSidebarOpen}
          showSidebarToggle
          isCollapsed={!isStatusBarVisible}
          onStatusBarToggle={handleStatusBarToggle}
        />
      </div>
      {wikiPalette ? (
        <WikiLinkPaletteDropdown
          anchor={wikiPalette.anchor}
          options={wikiSuggestions}
          highlightedIndex={wikiHighlightIndex}
          query={wikiPalette.query}
          onHover={handleWikiOptionHover}
          onSelect={handleWikiOptionSelect}
        />
      ) : null}
    </div>
  )
}
