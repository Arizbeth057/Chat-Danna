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
    sonidoNotificacion = document.getElementById('sonidoNotificacion'),
    botonGrabar = document.getElementById('botonGrabar'),
    estadoGrabacion = document.getElementById('estadoGrabacion');

// Variables para la grabación de audio
var mediaRecorder;
var audioChunks = [];
var grabando = false;

// Configurar grabación de nota de voz
if (botonGrabar) {
    botonGrabar.addEventListener('click', function() {
        if (!grabando) {
            // Iniciar grabación
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function(stream) {
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    mediaRecorder.ondataavailable = function(e) {
                        audioChunks.push(e.data);
                    };

                    mediaRecorder.onstop = function() {
                        var audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        enviarAudioServidor(audioBlob);
                        
                        // Detener uso del micrófono
                        stream.getTracks().forEach(track => track.stop());
                    };

                    mediaRecorder.start();
                    grabando = true;
                    botonGrabar.textContent = '⏹️ Detener y Enviar Audio';
                    botonGrabar.classList.add('grabando');
                    estadoGrabacion.textContent = 'Grabando...';
                })
                .catch(function(err) {
                    alert('No se pudo acceder al micrófono: ' + err.message);
                });
        } else {
            // Detener grabación
            mediaRecorder.stop();
            grabando = false;
            botonGrabar.textContent = '🎙️ Grabar Audio';
            botonGrabar.classList.remove('grabando');
            estadoGrabacion.textContent = '';
        }
    });
}

// Función para enviar el blob de audio grabado
function enviarAudioServidor(blob) {
    var formData = new FormData();
    var nombreArchivo = 'nota_voz_' + Date.now() + '.webm';
    formData.append('archivo', blob, nombreArchivo);
    formData.append('usuario', usuario.value);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(function(res) {
        return res.json();
    })
    .catch(function(err) {
        console.error('Error al subir el audio:', err);
    });
}

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

// Escuchar evento de recepción de archivos (Imágenes, Audios, Documentos)
socket.on('file-message', function(data) {
    escribiendoMensaje.innerHTML = '';
    var contenido = '';

    if (data.fileType.startsWith('image/')) {
        // Previsualización de imagen
        contenido = '<br><img src="' + data.filePath + '" style="max-width: 220px; border-radius: 8px; margin-top: 5px;">';
    } else if (data.fileType.startsWith('audio/')) {
        // Reproductor de audio incrustado para notas de voz
        contenido = '<br><audio controls src="' + data.filePath + '" style="margin-top: 5px; max-width: 100%;"></audio>';
    } else {
        // Enlace de descarga para otros archivos
        contenido = '<br><a href="' + data.filePath + '" target="_blank" style="color: #7C4DFF; font-weight: bold;">📄 Descargar ' + data.fileName + '</a>';
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
