export function copyTextToClipboard (value) {
  if (!value) return Promise.resolve(false)
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(value)
      .then(() => true)
      .catch(() => fallbackCopy(value))
  }
  return Promise.resolve(fallbackCopy(value))
}

export function fallbackCopy (value) {
  try {
    const temp = document.createElement('textarea')
    temp.value = value
    temp.setAttribute('readonly', '')
    temp.style.position = 'absolute'
    temp.style.left = '-9999px'
    document.body.appendChild(temp)
    temp.select()
    const success = document.execCommand('copy')
    document.body.removeChild(temp)
    return success
  } catch (err) {
    console.warn('Fallback clipboard copy failed', err)
    return false
  }
}

