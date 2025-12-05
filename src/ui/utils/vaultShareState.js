export function needsVaultSwitchConfirmation ({ currentKey, targetKey, pendingKey } = {}) {
  if (!currentKey || !targetKey) return false

  const normalizedCurrent = currentKey.toLowerCase()
  const normalizedTarget = targetKey.toLowerCase()

  if (normalizedCurrent === normalizedTarget) return false
  if (pendingKey && pendingKey.toLowerCase() === normalizedTarget) return false

  return true
}

