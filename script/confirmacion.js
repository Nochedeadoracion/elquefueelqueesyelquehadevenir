document.addEventListener('DOMContentLoaded', () => {
  const datosGuardados = localStorage.getItem('entrada_actual');
  const sinDatos = document.getElementById('sin-datos');
  const conDatos = document.getElementById('con-datos');

  if (!datosGuardados) {
    sinDatos.hidden = false;
    return;
  }

  const datos = JSON.parse(datosGuardados);
  conDatos.hidden = false;

  document.getElementById('resumen-compra').textContent =
    `${datos.nombre}, reservaste ${datos.cantidad} entrada(s) por un total de ` +
    `$${Number(datos.total).toLocaleString('es-AR')} ARS.`;

  const contenedor = document.getElementById('lista-entradas');

  // Arma una imagen final con: zona de silencio blanca pareja en los 4
  // lados (necesaria para que los lectores de QR lo detecten bien) y el
  // nombre del evento horneado arriba, dentro de la misma imagen.
  function crearImagenEntrada(canvasQR, tituloTexto) {
    const margen = 28;   // zona de silencio
    const altoTexto = 34;

    const canvasFinal = document.createElement('canvas');
    canvasFinal.width = canvasQR.width + margen * 2;
    canvasFinal.height = canvasQR.height + margen * 2 + altoTexto;

    const ctx = canvasFinal.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasFinal.width, canvasFinal.height);

    ctx.fillStyle = '#0B1A32';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tituloTexto, canvasFinal.width / 2, margen);

    ctx.drawImage(canvasQR, margen, margen + altoTexto);

    return canvasFinal;
  }

  datos.entradas.forEach((entrada, index) => {
    const item = document.createElement('div');
    item.className = 'entrada-item';

    const titulo = document.createElement('h3');
    titulo.textContent = `Entrada ${index + 1} de ${datos.entradas.length}`;

    const qrBox = document.createElement('div');
    qrBox.className = 'qr-box';

    const btnDescargar = document.createElement('button');
    btnDescargar.className = 'btn-primary btn-descargar';
    btnDescargar.textContent = 'Descargar QR';

    item.appendChild(titulo);
    item.appendChild(qrBox);
    item.appendChild(btnDescargar);
    contenedor.appendChild(item);

    // Genera el QR crudo en un contenedor temporal (no visible en la página)
    const contenedorTemporal = document.createElement('div');
    contenedorTemporal.style.display = 'none';
    document.body.appendChild(contenedorTemporal);

    new QRCode(contenedorTemporal, {
      text: entrada.codigo,
      width: 260,
      height: 260,
      colorDark: '#0B1A32',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H // corrección de errores alta
    });

    const canvasCrudo = contenedorTemporal.querySelector('canvas');
    const canvasFinal = crearImagenEntrada(canvasCrudo, 'Noche de Adoración');

    canvasFinal.className = 'qr-imagen';
    qrBox.appendChild(canvasFinal);
    document.body.removeChild(contenedorTemporal);

    btnDescargar.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `entrada-${index + 1}-noche-de-adoracion.png`;
      link.href = canvasFinal.toDataURL('image/png');
      link.click();
    });
  });

  localStorage.removeItem('entrada_actual');
});