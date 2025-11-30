/**
 * Muestra una notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'info'
 * @param {number} duration - Duración en ms (default: 5000)
 */
export function showToast(message, type = 'info', duration = 5000) {
  // Crear elemento toast
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  
  // Iconos según el tipo
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };
  
  const titles = {
    success: 'Éxito',
    error: 'Error',
    info: 'Información'
  };
  
  toast.innerHTML = `
    <div class="toast-icon ${type}">${icons[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${titles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Animar entrada
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remover después de la duración
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
