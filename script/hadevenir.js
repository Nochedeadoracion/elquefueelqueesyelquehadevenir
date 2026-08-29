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
  const API_URL = 'https://script.google.com/macros/s/AKfycbxG1EN2vbIaNwv9JKqv6DoPISsTmVBDzbqg_B8J3N5FR9SJzeIrfgQqbxNxTV-Ay8W4/exec';
  const PRECIO_UNITARIO = 5000;
  const PORCENTAJE_MERCADO_PAGO = 0.0660; // se lo trasladamos al comprador

  // El Link de pago simple de Mercado Pago solo admite un monto FIJO
  // (no calcula por cantidad). Por eso creamos un link distinto por
  // cada cantidad de entradas, con el precio ya multiplicado Y con el
  // cargo de Mercado Pago (6,29%) ya incluido. Los montos exactos que
  // tiene que tener cada link (calculados igual que acá abajo):
  //   1 entrada  -> $5.434,19
  //   2 entradas -> $10.868,38
  //   3 entradas -> $16.302,58
  //   4 entradas -> $21.736,77
  //   5 entradas -> $27.170,96
  //   6 entradas -> $32.605,15
  // Los 6 links tienen que tener configurado el mismo "sitio de
  // redireccionamiento": la URL de confirmacion.html de este sitio.
  const LINKS_MERCADO_PAGO = {
    1: 'https://mpago.la/1yagK4K',
    2: 'https://mpago.la/2HZZS7W',
    3: 'https://mpago.la/26EP8yK',
    4: 'https://mpago.la/PEGAR_LINK_4_ENTRADAS',
    5: 'https://mpago.la/PEGAR_LINK_5_ENTRADAS',
    6: 'https://mpago.la/2tsidhN'
  };

  const inputCantidad = document.getElementById('cantidad');
  const totalMonto = document.getElementById('total-monto');
  const formEntradas = document.getElementById('form-entradas');
  const btnPagar = document.getElementById('btn-pagar');
  const mensajeEstado = document.getElementById('mensaje-estado');
  const pantallaEspera = document.getElementById('pantalla-espera');
  const btnReintentar = document.getElementById('btn-reintentar');

  // Se pone en true justo antes de mandar a pagar. Si la persona vuelve
  // a esta pestaña (sin haber llegado a confirmacion.html), lo sabemos.
  let esperandoVueltaDePago = false;

  function actualizarTotal() {
    const cantidad = parseInt(inputCantidad.value) || 1;
    const subtotal = cantidad * PRECIO_UNITARIO;
    const cargoMP = Math.round(subtotal * PORCENTAJE_MERCADO_PAGO);
    const total = subtotal + cargoMP;

    document.getElementById('desglose-cantidad').textContent = cantidad;
    document.getElementById('desglose-subtotal').textContent = `$${subtotal.toLocaleString('es-AR')} ARS`;
    document.getElementById('desglose-cargo').textContent = `$${cargoMP.toLocaleString('es-AR')} ARS`;
    totalMonto.textContent = `$${total.toLocaleString('es-AR')} ARS`;
  }
  inputCantidad.addEventListener('change', actualizarTotal);
  actualizarTotal();

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
      // Usamos localStorage (no sessionStorage): al volver de pagar, el
      // navegador a veces lo trata como una pestaña/ventana distinta, y
      // sessionStorage no sobrevive eso — localStorage sí.
      localStorage.setItem('entrada_actual', JSON.stringify({
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
      esperandoVueltaDePago = true;
      window.location.href = linkPago;
    } catch (err) {
      mostrarMensaje('Error de conexión. Probá de nuevo en un momento.', 'error');
      btnPagar.disabled = false;
      btnPagar.textContent = textoOriginal;
    }
  });

  // Si la persona cierra la app de Mercado Pago y vuelve a esta pestaña
  // "a lo bruto" (sin pasar por el botón de vuelta de MP), nunca llega a
  // confirmacion.html. Detectamos que volvió a mirar esta pestaña y le
  // mostramos qué va a pasar, en vez de dejar el botón trabado en
  // "Procesando...".
  document.addEventListener('visibilitychange', () => {
    if (esperandoVueltaDePago && document.visibilityState === 'visible') {
      esperandoVueltaDePago = false;
      formEntradas.hidden = true;
      pantallaEspera.hidden = false;
    }
  });

  btnReintentar.addEventListener('click', () => {
    pantallaEspera.hidden = true;
    formEntradas.hidden = false;
    formEntradas.reset();
    actualizarTotal();
    btnPagar.disabled = false;
    btnPagar.textContent = 'Reservar e ir a pagar';
  });
});