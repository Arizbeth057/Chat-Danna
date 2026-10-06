var express = require('express');
var socket = require('socket.io');
var multer = require('multer');
var path = require('path');

var app = express();

// 1. Escuchar en el puerto 4000
var server = app.listen(4000, function(){
    console.log('Servidor corriendo en http://localhost:4000');
});

// Serve los archivos de la carpeta public
app.use(express.static('public'));

// 2. Configurar almacenamiento para archivos adjuntos
var storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
var upload = multer({ storage: storage });

var io = socket(server);

// 3. Ruta POST para subir archivos y emitirlos vía Socket.io
app.post('/upload', upload.single('archivo'), function(req, res) {
    if (!req.file) {
        return res.status(400).send('No se subió ningún archivo.');
    }
    
    var fileData = {
        usuario: req.body.usuario,
        filePath: '/uploads/' + req.file.filename,
        fileName: req.file.originalname,
        fileType: req.file.mimetype
    };

    io.sockets.emit('file-message', fileData);
    res.json({ success: true });
});

// 4. Conexiones Socket.io
io.on('connection', function(socket){
    console.log('Hay una conexión:', socket.id);

    socket.on('chat', function(data){
        console.log(data);
        io.sockets.emit('chat', data);
    });

    socket.on('typing', function(data){
        socket.broadcast.emit('typing', data);
    });
});