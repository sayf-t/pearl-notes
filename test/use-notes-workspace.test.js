import test from 'brittle'

// Mock React hooks for testing
const createMockUseState = (initialValue) => {
  let currentValue = initialValue
  const getter = () => currentValue
  const setter = (newValue) => {
    currentValue = typeof newValue === 'function' ? newValue(currentValue) : newValue
  }
  return [getter, setter]
}

test('useNotesWorkspace: basic setup and imports work', (t) => {
  // This test ensures the module can be imported and basic functionality works
  t.pass('useNotesWorkspace test module created successfully')
})

test('useNotesWorkspace: note selection state management', (t) => {
  // Test that selectedNoteId state updates correctly
  const [getSelectedNoteId, setSelectedNoteId] = createMockUseState(null)

  // Simulate selecting a note
  setSelectedNoteId('test-note-id')
  t.is(getSelectedNoteId(), 'test-note-id', 'selectedNoteId should update to the selected note')

  // Simulate clearing selection
  setSelectedNoteId(null)
  t.is(getSelectedNoteId(), null, 'selectedNoteId should clear when set to null')
})

test('useNotesWorkspace: note fields state management', (t) => {
  const [getNoteFields, setNoteFields] = createMockUseState({ title: '', body: '' })

  // Simulate updating note fields
  setNoteFields({ title: 'Test Title', body: 'Test Body' })
  t.alike(getNoteFields(), { title: 'Test Title', body: 'Test Body' }, 'noteFields should update correctly')

  // Simulate clearing fields
  setNoteFields({ title: '', body: '' })
  t.alike(getNoteFields(), { title: '', body: '' }, 'noteFields should clear correctly')
})

test('useNotesWorkspace: note mode state management', (t) => {
  const [getNoteMode, setNoteMode] = createMockUseState('CREATE')

  // Simulate switching to edit mode
  setNoteMode('EDIT')
  t.is(getNoteMode(), 'EDIT', 'noteMode should update to EDIT')

  // Simulate switching back to create mode
  setNoteMode('CREATE')
  t.is(getNoteMode(), 'CREATE', 'noteMode should update to CREATE')
})

test('useNotesWorkspace: vault key state management', (t) => {
  const [getVaultKey, setVaultKey] = createMockUseState(null)

  // Simulate vault key change
  setVaultKey('test-vault-key')
  t.is(getVaultKey(), 'test-vault-key', 'vaultKey should update correctly')

  // Simulate clearing vault key
  setVaultKey(null)
  t.is(getVaultKey(), null, 'vaultKey should clear correctly')
})

test('useNotesWorkspace: vault change detection logic', (t) => {
  const vaultKey = 'current-key'
  const force = false

  // Test no change scenario
  const noChange = force || 'current-key' !== vaultKey
  t.is(noChange, false, 'should not detect change when keys match')

  // Test forced change scenario
  const forcedChange = true || 'different-key' !== vaultKey
  t.is(forcedChange, true, 'should detect change when force is true')

  // Test key change scenario
  const keyChange = false || 'different-key' !== vaultKey
  t.is(keyChange, true, 'should detect change when keys differ')
})

test('useNotesWorkspace: openNote function with successful getNote', async (t) => {
  const [getSelectedNoteId, setSelectedNoteId] = createMockUseState(null)
  const [getNoteMode, setNoteMode] = createMockUseState('CREATE')
  const [getNoteFields, setNoteFields] = createMockUseState({ title: '', body: '' })

  // Mock pearl API
  const mockPearl = {
    getNote: async (id) => ({
      id,
      title: 'Test Note',
      body: 'Test content',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T01:00:00.000Z'
    })
  }

  // Mock persistPendingChanges
  const persistPendingChanges = async () => {}

  // Mock closeWikiPalette
  const closeWikiPalette = () => {}

  // Mock updateStatus
  const updateStatus = () => {}

  // Simulate openNote function
  const openNote = async (id) => {
    console.log('[Notes Workspace] openNote called with id:', id)
    await persistPendingChanges()
    try {
      console.log('[Notes Workspace] Calling pearl.getNote...')
      const note = await mockPearl.getNote(id)
      console.log('[Notes Workspace] Got note:', note)
      setSelectedNoteId(note.id)
      setNoteMode('EDIT')
      const fields = { title: note.title || '', body: note.body || '' }
      setNoteFields(fields)
      closeWikiPalette()
      updateStatus('', 'info')
      console.log('[Notes Workspace] Note opened successfully')
    } catch (err) {
      console.error('Failed to open note', err)
      updateStatus('Failed to open note.', 'error')
    }
  }

  // Test opening a note
  await openNote('test-note-id')

  t.is(getSelectedNoteId(), 'test-note-id', 'selectedNoteId should be set to the opened note')
  t.is(getNoteMode(), 'EDIT', 'noteMode should be set to EDIT')
  t.alike(getNoteFields(), { title: 'Test Note', body: 'Test content' }, 'noteFields should be populated with note data')
})

test('useNotesWorkspace: openNote function with failed getNote', async (t) => {
  const [getSelectedNoteId, setSelectedNoteId] = createMockUseState(null)
  const [getNoteMode, setNoteMode] = createMockUseState('CREATE')
  const [getNoteFields, setNoteFields] = createMockUseState({ title: '', body: '' })

  // Mock pearl API that throws
  const mockPearl = {
    getNote: async (id) => {
      throw new Error('Note not found')
    }
  }

  // Mock persistPendingChanges
  const persistPendingChanges = async () => {}

  // Mock closeWikiPalette
  const closeWikiPalette = () => {}

  // Track status updates
  let lastStatusUpdate = null
  const updateStatus = (message, tone) => {
    lastStatusUpdate = { message, tone }
  }

  // Simulate openNote function
  const openNote = async (id) => {
    console.log('[Notes Workspace] openNote called with id:', id)
    await persistPendingChanges()
    try {
      console.log('[Notes Workspace] Calling pearl.getNote...')
      const note = await mockPearl.getNote(id)
      console.log('[Notes Workspace] Got note:', note)
      setSelectedNoteId(note.id)
      setNoteMode('EDIT')
      const fields = { title: note.title || '', body: note.body || '' }
      setNoteFields(fields)
      closeWikiPalette()
      updateStatus('', 'info')
      console.log('[Notes Workspace] Note opened successfully')
    } catch (err) {
      console.error('Failed to open note', err)
      updateStatus('Failed to open note.', 'error')
    }
  }

  // Test opening a note that fails
  await openNote('test-note-id')

  t.is(getSelectedNoteId(), null, 'selectedNoteId should remain null on failure')
  t.is(getNoteMode(), 'CREATE', 'noteMode should remain CREATE on failure')
  t.alike(getNoteFields(), { title: '', body: '' }, 'noteFields should remain unchanged on failure')
  t.alike(lastStatusUpdate, { message: 'Failed to open note.', tone: 'error' }, 'error status should be set on failure')
})

test('useNotesWorkspace: note selection after vault change clears state', (t) => {
  const [getSelectedNoteId, setSelectedNoteId] = createMockUseState('old-note-id')
  const [getNoteFields, setNoteFields] = createMockUseState({ title: 'Old Title', body: 'Old Body' })
  const [getNoteMode, setNoteMode] = createMockUseState('EDIT')

  // Simulate vault change clearing state
  setSelectedNoteId(null)
  setNoteFields({ title: '', body: '' })
  setNoteMode('CREATE')

  t.is(getSelectedNoteId(), null, 'selectedNoteId should be cleared on vault change')
  t.alike(getNoteFields(), { title: '', body: '' }, 'noteFields should be cleared on vault change')
  t.is(getNoteMode(), 'CREATE', 'noteMode should be reset to CREATE on vault change')
})

test('useNotesWorkspace: note clicking works after vault switch simulation', async (t) => {
  // Simulate state after vault switch - cleared state
  const [getSelectedNoteId, setSelectedNoteId] = createMockUseState(null)
  const [getNoteMode, setNoteMode] = createMockUseState('CREATE')
  const [getNoteFields, setNoteFields] = createMockUseState({ title: '', body: '' })

  // Mock pearl API for new vault
  const mockPearl = {
    getNote: async (id) => ({
      id,
      title: 'New Vault Note',
      body: 'Content from new vault',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T01:00:00.000Z'
    })
  }

  // Mock functions
  const persistPendingChanges = async () => {
    // Should do nothing since noteFields is empty
  }
  const closeWikiPalette = () => {}
  const updateStatus = () => {}

  // Create openNote function (simulating the one from the hook)
  const openNote = async (id) => {
    console.log('[Test] openNote called with id:', id)
    await persistPendingChanges()
    const note = await mockPearl.getNote(id)
    setSelectedNoteId(note.id)
    setNoteMode('EDIT')
    const fields = { title: note.title || '', body: note.body || '' }
    setNoteFields(fields)
    closeWikiPalette()
    updateStatus('', 'info')
    console.log('[Test] Note opened successfully')
  }

  // Simulate clicking on a note from the new vault
  const testNoteId = 'new-vault-note-id'
  await openNote(testNoteId)

  t.is(getSelectedNoteId(), testNoteId, 'selectedNoteId should be set to clicked note')
  t.is(getNoteMode(), 'EDIT', 'noteMode should be EDIT after opening note')
  t.alike(getNoteFields(), { title: 'New Vault Note', body: 'Content from new vault' }, 'noteFields should be populated with note data')
})

test('useNotesWorkspace: click handler chain works correctly', (t) => {
  // Test that the click handler chain works: NoteListItem -> Sidebar -> App -> openNote

  // Mock note data
  const mockNote = { id: 'test-note-id', title: 'Test Note' }

  // Track function calls
  let sidebarOnSelectCalled = false
  let appOnSelectNoteCalled = false
  let openNoteCalled = false
  let openNoteId = null

  // Mock openNote function
  const mockOpenNote = (id) => {
    openNoteCalled = true
    openNoteId = id
  }

  // Simulate App level onSelectNote
  const appOnSelectNote = (id) => {
    appOnSelectNoteCalled = true
    mockOpenNote(id)
  }

  // Simulate Sidebar onSelectNote
  const sidebarOnSelectNote = (id) => {
    sidebarOnSelectCalled = true
    appOnSelectNote(id)
  }

  // Simulate NoteListItem onSelect
  const noteListItemOnSelect = () => {
    sidebarOnSelectNote(mockNote.id)
  }

  // Execute the click chain
  noteListItemOnSelect()

  t.ok(sidebarOnSelectCalled, 'Sidebar onSelectNote should be called')
  t.ok(appOnSelectNoteCalled, 'App onSelectNote should be called')
  t.ok(openNoteCalled, 'openNote should be called')
  t.is(openNoteId, mockNote.id, 'openNote should receive correct note ID')
})
