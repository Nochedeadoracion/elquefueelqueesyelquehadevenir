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
  const PORCENTAJE_MERCADO_PAGO = 0.066033; //  6,6033% (Florencia lo recuerda como "6,60%")
  const IVA = 0.21; // 21%, se aplica sobre la comisión de Mercado Pago

  // Fórmula: si "total" es lo que paga el comprador, Mercado Pago se
  // queda con (total × comisión) + IVA sobre esa comisión, y el resto
  // es el neto que recibe tu cuñada:
  //   total − (total × comisión) − (total × comisión × IVA) = neto
  //   total × (1 − comisión × (1 + IVA)) = neto
  //   total = neto ÷ (1 − comisión × (1 + IVA))
  const DIVISOR_COMISION = 1 - PORCENTAJE_MERCADO_PAGO * (1 + IVA);

  function calcularTotal(cantidad) {
    const subtotalNeto = cantidad * PRECIO_UNITARIO;
    const total = Math.round((subtotalNeto / DIVISOR_COMISION) * 100) / 100;
    const cargoMP = Math.round((total - subtotalNeto) * 100) / 100;
    return { subtotalNeto, cargoMP, total };
  }

  // El Link de pago simple de Mercado Pago solo admite un monto FIJO
  // (no calcula por cantidad). Por eso creamos un link distinto por
  // cada cantidad de entradas. Estos son los montos REALES que generó
  // Florencia desde su cuenta de Mercado Pago (pueden diferir por 1
  // centavo del cálculo de la fórmula de arriba, por redondeo interno
  // de MP — no importa, la diferencia es insignificante).
  // Los 6 links tienen que tener configurado el mismo "sitio de
  // redireccionamiento": la URL de confirmacion.html de este sitio.
  const LINKS_MERCADO_PAGO = {
    1: 'https://mpago.la/27vqjkc',    // $5.434,19
    2: 'https://mpago.la/1nAfGfS',   // $10.868,38
    3: 'https://mpago.la/2WZu9bx',   // $16.302,58
    4: 'https://mpago.la/1oUV148',   // $21.736,77
    5: 'https://mpago.la/2Q8MCfd',   // $27.170,96
    6: 'https://mpago.la/1wrYDrY'    // $32.605,15
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
    const { subtotalNeto, total } = calcularTotal(cantidad);

    const comisionMP = Math.round(total * PORCENTAJE_MERCADO_PAGO * 100) / 100;
    const ivaComision = Math.round(comisionMP * IVA * 100) / 100;

    const formatoARS = (monto) => monto.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    document.getElementById('desglose-cantidad').textContent = cantidad;
    document.getElementById('desglose-subtotal').textContent = `$${formatoARS(subtotalNeto)} ARS`;
    document.getElementById('desglose-comision').textContent = `$${formatoARS(comisionMP)} ARS`;
    document.getElementById('desglose-iva').textContent = `$${formatoARS(ivaComision)} ARS`;
    totalMonto.textContent = `$${formatoARS(total)} ARS`;
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

// Configura la fecha y hora exacta del evento (Año, Mes-1, Día, Hora, Minutos)
// Nota: Los meses en JavaScript van de 0 (Enero) a 11 (Diciembre). Por ejemplo, Octubre es 9.
const FECHA_EVENTO = new Date(2026, 11, 7, 19, 30, 0).getTime();
// Parámetros: (Año, Mes - 1, Día, Hora en formato 24hs, Minutos, Segundos)
// Diciembre es el mes 11 (Enero=0, Febrero=1 ... Diciembre=11)
// 7 PM son las 19:00 hs
function actualizarCountDown() {
  const ahora = new Date().getTime();
  const diferencia = FECHA_EVENTO - ahora;

  if (diferencia <= 0) {
    document.querySelector('.countdown-container').innerHTML =
      '<p class="countdown-label" style="font-size:1rem; margin:0;">¡EL EVENTO HA COMENZADO!</p>';
    return;
  }

  // Cálculos de tiempo
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

  // Formatear dos dígitos (ej: 05 en lugar de 5)
  document.getElementById('days').textContent = dias < 10 ? '0' + dias : dias;
  document.getElementById('hours').textContent = horas < 10 ? '0' + horas : horas;
  document.getElementById('minutes').textContent = minutos < 10 ? '0' + minutos : minutos;
  document.getElementById('seconds').textContent = segundos < 10 ? '0' + segundos : segundos;
}

// Ejecutar al cargar y actualizar cada 1 segundo
actualizarCountDown();
setInterval(actualizarCountDown, 1000);