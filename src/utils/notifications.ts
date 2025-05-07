// Sistema de notificaciones mejorado
export function showNotification(
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info'
): void {
  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  notification.textContent = message
  document.body.appendChild(notification)
  setTimeout(() => {
    notification.style.opacity = '0'
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 3000)
}
export function handleError(error: unknown, operation: string): void {
  let errorMessage = 'Error desconocido'
  if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = (error as any).message
  }
  showNotification(`Error en ${operation}: ${errorMessage}`, 'error')
}
