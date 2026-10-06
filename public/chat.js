// Conexión dinámica con el servidor (funciona en localhost y en la IP de AWS)
var socket = io.connect();

// Elementos del DOM
var persona = document.getElementById('persona'),
    appChat = document.getElementById('app-chat'),
    panelBienvenida = document.getElementById('panel-bienvenida'),
    usuario = document.getElementById('usuario'),
    mensaje = document.getElementById('mensaje'),
    botonEnviar = document.getElementById('enviar'),
    escribiendoMensaje = document.getElementById('escribiendo-mensaje'),
    output = document.getElementById('output'),
    archivoInput = document.getElementById('archivoInput'),
    sonidoNotificacion = document.getElementById('sonidoNotificacion');

// Función para reproducir sonido de notificación estilo WhatsApp
function reproducirSonido() {
    if (sonidoNotificacion) {
        sonidoNotificacion.currentTime = 0;
        sonidoNotificacion.play().catch(function(error) {
            console.log("El navegador requiere interacción previa para reproducir audio:", error);
        });
    }
}

// Evento al hacer clic en Enviar
botonEnviar.addEventListener('click', function() {
    // 1. Enviar archivo si se seleccionó uno
    if (archivoInput && archivoInput.files.length > 0) {
        var formData = new FormData();
        formData.append('archivo', archivoInput.files[0]);
        formData.append('usuario', usuario.value);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            archivoInput.value = ''; // Limpiar el selector de archivo
        })
        .catch(function(err) {
            console.error('Error al subir el archivo:', err);
        });
    }

    // 2. Enviar mensaje de texto
    if (mensaje.value.trim() !== '') {
        socket.emit('chat', {
            mensaje: mensaje.value,
            usuario: usuario.value
        });
        mensaje.value = '';
    }
});

// Evento para notificar cuando se está escribiendo
mensaje.addEventListener('keyup', function() {
    if (mensaje.value) {
        socket.emit('typing', {
            nombre: usuario.value,
            texto: mensaje.value
        });
    } else {
        socket.emit('typing', {
            nombre: usuario.value,
            texto: ''
        });
    }
});

// Escuchar evento de recepción de mensajes de texto
socket.on('chat', function(data) {
    escribiendoMensaje.innerHTML = '';
    output.innerHTML += '<p><strong>' + data.usuario + ':</strong> ' + data.mensaje + '</p>';
    reproducirSonido();
});

// Escuchar evento de recepción de archivos
socket.on('file-message', function(data) {
    escribiendoMensaje.innerHTML = '';
    var contenido = '';

    // Si es imagen muestra la previsualización, si no, muestra enlace de descarga
    if (data.fileType.startsWith('image/')) {
        contenido = '<br><img src="' + data.filePath + '" style="max-width: 220px; border-radius: 8px; margin-top: 5px;">';
    } else {
        contenido = '<br><a href="' + data.filePath + '" target="_blank" style="color: #337ab7; font-weight: bold;">📄 Descargar ' + data.fileName + '</a>';
    }

    output.innerHTML += '<p><strong>' + data.usuario + ':</strong> ' + contenido + '</p>';
    reproducirSonido();
});

// Escuchar evento de "escribiendo"
socket.on('typing', function(data) {
    if (data.texto) {
        escribiendoMensaje.innerHTML = '<p><em>' + data.nombre + ' está escribiendo un mensaje...</em></p>';
    } else {
        escribiendoMensaje.innerHTML = '';
    }
});

// Función para ingresar al chat desde el panel de bienvenida
function ingresarAlChat() {
    if (persona.value) {
        panelBienvenida.style.display = 'none';
        appChat.style.display = 'block';
        var nombreDeUsuario = persona.value;
        usuario.value = nombreDeUsuario;
        usuario.readOnly = true;
    }
}