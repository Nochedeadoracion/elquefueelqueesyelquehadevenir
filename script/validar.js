document.addEventListener('DOMContentLoaded', () => {
  // ⚠️ Misma URL que en hadevenir.js
  const API_URL = 'https://script.google.com/macros/s/AKfycbxzy-wy1dxsw1nmVNszWPe-gJEUFg1bFVnkiX7UHoddbjfwfNUH3nKKr9dNyKQBrRR6/exec';

  // Clave simple para que no cualquiera pueda validar/marcar entradas.
  // OJO: al ser una página pública en GitHub Pages, esto NO es seguridad
  // real (cualquiera con acceso al código fuente la puede ver). Solo
  // evita el uso accidental o casual. Tiene que ser IGUAL a STAFF_KEY
  // en Code.gs.
  const STAFF_KEY = 'si-va-a-ser-la-utltima-hagamola-bien';

  const resultado = document.getElementById('resultado');
  const contadorEl = document.getElementById('contador');
  let validadas = 0;
  let procesando = false;

  function mostrarResultado(texto, tipo) {
    resultado.textContent = texto;
    resultado.dataset.tipo = tipo;
  }

  async function validarCodigo(codigo) {
    if (procesando) return;
    procesando = true;
    mostrarResultado('Validando...', 'cargando');

    try {
      const url = `${API_URL}?action=validar&codigo=${encodeURIComponent(codigo)}&staffKey=${encodeURIComponent(STAFF_KEY)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok) {
        validadas++;
        contadorEl.textContent = validadas;
        mostrarResultado(`✅ Entrada válida — ${data.nombre}`, 'ok');
      } else {
        mostrarResultado(`❌ ${data.error}${data.nombre ? ' — ' + data.nombre : ''}`, 'error');
      }
    } catch (err) {
      mostrarResultado('⚠️ Error de conexión, probá de nuevo', 'error');
    } finally {
      // Pequeña pausa para no reprocesar el mismo QR en cámara instantáneamente
      setTimeout(() => { procesando = false; }, 1500);
    }
  }

  const scanner = new Html5Qrcode('reader');
  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    (decodedText) => validarCodigo(decodedText),
    () => { /* ignorar frames sin QR */ }
  ).catch(() => {
    mostrarResultado('No pudimos acceder a la cámara. Revisá los permisos del navegador.', 'error');
  });
});