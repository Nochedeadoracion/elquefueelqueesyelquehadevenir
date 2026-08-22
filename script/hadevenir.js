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

/* ============ Sistema de entradas ============ */

document.addEventListener('DOMContentLoaded', () => {
  // ⚠️ Pegá acá la URL de tu Apps Script Web App (termina en /exec)
  const API_URL = 'PEGAR_ACA_LA_URL_DE_TU_APPS_SCRIPT';
  const PRECIO_UNITARIO = 5000;

  // El Link de pago simple de Mercado Pago solo admite un monto FIJO
  // (no calcula por cantidad). Por eso creamos un link distinto por
  // cada cantidad de entradas, con el precio ya multiplicado.
  // Los 6 links tienen que tener configurado el mismo "sitio de
  // redireccionamiento": la URL de confirmacion.html de este sitio.
  const LINKS_MERCADO_PAGO = {
    1: 'https://mpago.la/PEGAR_LINK_1_ENTRADA',
    2: 'https://mpago.la/PEGAR_LINK_2_ENTRADAS',
    3: 'https://mpago.la/PEGAR_LINK_3_ENTRADAS',
    4: 'https://mpago.la/PEGAR_LINK_4_ENTRADAS',
    5: 'https://mpago.la/PEGAR_LINK_5_ENTRADAS',
    6: 'https://mpago.la/PEGAR_LINK_6_ENTRADAS'
  };

  const inputCantidad = document.getElementById('cantidad');
  const totalMonto = document.getElementById('total-monto');
  const formEntradas = document.getElementById('form-entradas');
  const btnPagar = document.getElementById('btn-pagar');
  const mensajeEstado = document.getElementById('mensaje-estado');

  function actualizarTotal() {
    const cantidad = parseInt(inputCantidad.value) || 1;
    const total = cantidad * PRECIO_UNITARIO;
    totalMonto.textContent = `$${total.toLocaleString('es-AR')} ARS`;
  }
  inputCantidad.addEventListener('input', actualizarTotal);

  function mostrarMensaje(texto, tipo = 'info') {
    if (!mensajeEstado) return;
    mensajeEstado.textContent = texto;
    mensajeEstado.dataset.tipo = tipo;
    mensajeEstado.hidden = false;
  }

  function bloquearVenta(texto) {
    formEntradas.querySelectorAll('input, button').forEach(el => (el.disabled = true));
    mostrarMensaje(texto || '¡Entradas agotadas! Gracias por el interés 🙏', 'agotado');
  }

  // Consulta cuántas entradas quedan antes de mostrar el formulario habilitado
  async function verificarDisponibilidad() {
    try {
      const res = await fetch(`${API_URL}?action=contar`);
      const data = await res.json();

      if (!data.ok) return;

      if (data.agotado) {
        bloquearVenta();
      } else if (data.restantes <= 20) {
        mostrarMensaje(`¡Quedan solo ${data.restantes} entradas!`, 'aviso');
      }
    } catch (err) {
      // Si falla la consulta, dejamos que el usuario intente comprar igual;
      // el backend vuelve a validar el cupo al momento de la compra.
    }
  }

  verificarDisponibilidad();

  formEntradas.addEventListener('submit', async (e) => {
    e.preventDefault();

    btnPagar.disabled = true;
    const textoOriginal = btnPagar.textContent;
    btnPagar.textContent = 'Procesando...';

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const cantidad = parseInt(inputCantidad.value) || 1;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        // Content-Type text/plain a propósito: evita el preflight CORS
        // que Apps Script no maneja bien. El backend igual lee el JSON.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'comprar', nombre, email, cantidad })
      });
      const data = await res.json();

      if (!data.ok) {
        mostrarMensaje(data.error || 'No pudimos procesar tu reserva. Probá de nuevo.', 'error');
        if (data.restantes === 0) {
          bloquearVenta();
        } else {
          btnPagar.disabled = false;
          btnPagar.textContent = textoOriginal;
        }
        return;
      }

      const linkPago = LINKS_MERCADO_PAGO[cantidad];

      if (!linkPago) {
        mostrarMensaje('No tenemos un link de pago para esa cantidad. Probá con un número menor.', 'error');
        btnPagar.disabled = false;
        btnPagar.textContent = textoOriginal;
        return;
      }

      // Guardamos los datos de esta compra para mostrarlos en confirmacion.html
      // recién cuando la persona vuelva de Mercado Pago (no antes).
      sessionStorage.setItem('entrada_actual', JSON.stringify({
        nombre,
        email,
        cantidad,
        total: data.total,
        orderId: data.orderId,
        entradas: data.entradas
      }));

      // Redirige en la MISMA pestaña (no target="_blank"): así, cuando
      // Mercado Pago redirija de vuelta a confirmacion.html, la
      // sessionStorage sigue disponible en esa pestaña.
      window.location.href = linkPago;
    } catch (err) {
      mostrarMensaje('Error de conexión. Probá de nuevo en un momento.', 'error');
      btnPagar.disabled = false;
      btnPagar.textContent = textoOriginal;
    }
  });
});