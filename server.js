var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
var app = http.createServer(function (req, res) {  file.serve(req, res); }).listen(8888);
var io = require('socket.io').listen(app);

//==========================================================================

io.on('connection', function(client) {
    console.log('-- ' + client.id + ' joined --');
    //client.emit('id', client.id);
    console.log("Client " + client.id + " connected");
    io.sockets.emit('id', client.id);


    client.on('message', function (details) {
    	var otherClient = io.sockets.connected[details.to];

    	if (!otherClient) {
        	return;
      	}
        delete details.to;
        details.from = client.id;
        otherClient.emit('message', details);
    });

});


function logToConsole(mes) {
    console.log(mes);
}
    
