export function getSwal () {
  return typeof window !== 'undefined' ? window.Swal : null
}

