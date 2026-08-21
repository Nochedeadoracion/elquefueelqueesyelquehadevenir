const menuToggle = document.querySelector(".menu-toggle");
const navigationList = document.querySelector(".navigation-list");

menuToggle.addEventListener("click", () => {
  const isOpen = navigationList.classList.toggle("is-open");

  menuToggle.setAttribute("aria-expanded", isOpen);
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Cerrar menú" : "Abrir menú"
  );
});

/*Sistema de entradas  */

document.addEventListener('DOMContentLoaded', () => {
  // Configuración
  const PRECIO_UNITARIO = 5000;
  const LINK_MERCADO_PAGO = 'https://mpago.la/2THtrzm'; // Reemplazá con tu link real

  // Elementos del DOM
  const inputCantidad = document.getElementById('cantidad');
  const totalMonto = document.getElementById('total-monto');
  const formEntradas = document.getElementById('form-entradas');

  // Actualizar el monto total dinámicamente según la cantidad
  function actualizarTotal() {
    const cantidad = parseInt(inputCantidad.value) || 1;
    const total = cantidad * PRECIO_UNITARIO;
    totalMonto.textContent = `$${total.toLocaleString('es-AR')} ARS`;
  }

  // Escuchar cambios en la cantidad
  inputCantidad.addEventListener('input', actualizarTotal);

  // Manejar el envío del formulario
  formEntradas.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const cantidad = inputCantidad.value;

    // Guardamos los datos del comprador en localStorage para usarlos
    // cuando el usuario vuelva de pagar en Mercado Pago
    const datosComprador = {
      nombre,
      email,
      cantidad,
      total: cantidad * PRECIO_UNITARIO,
      fecha: new Date().toISOString()
    };

    localStorage.setItem('datos_entrada', JSON.stringify(datosComprador));

    // Redirigir al Checkout Pro de Mercado Pago
    window.location.href = LINK_MERCADO_PAGO;
  });
});