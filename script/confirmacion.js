document.addEventListener('DOMContentLoaded', () => {
  const datosGuardados = sessionStorage.getItem('entrada_actual');
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

  const btnMP = document.getElementById('btn-mercado-pago');
  btnMP.href = datos.linkPago;

  const contenedor = document.getElementById('lista-entradas');

  datos.entradas.forEach((entrada, index) => {
    const item = document.createElement('div');
    item.className = 'entrada-item';

    const titulo = document.createElement('h3');
    titulo.textContent = `Entrada ${index + 1} de ${datos.entradas.length}`;

    const qrDiv = document.createElement('div');
    qrDiv.className = 'qr-box';

    const btnDescargar = document.createElement('button');
    btnDescargar.className = 'btn-primary btn-descargar';
    btnDescargar.textContent = 'Descargar QR';

    item.appendChild(titulo);
    item.appendChild(qrDiv);
    item.appendChild(btnDescargar);
    contenedor.appendChild(item);

    // Genera el QR con el código firmado que devolvió el backend
    new QRCode(qrDiv, {
      text: entrada.codigo,
      width: 220,
      height: 220,
      colorDark: '#0B1A32',
      colorLight: '#FFFFFF'
    });

    btnDescargar.addEventListener('click', () => {
      // qrcode.js dibuja en un <canvas> (o <img> como fallback)
      const canvas = qrDiv.querySelector('canvas');
      const link = document.createElement('a');
      link.download = `entrada-${index + 1}-noche-de-adoracion.png`;
      link.href = canvas
        ? canvas.toDataURL('image/png')
        : qrDiv.querySelector('img').src;
      link.click();
    });
  });
});