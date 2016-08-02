'use strict';

navigator.getUserMedia =  navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

window.onbeforeunload = function (e) {
	hangup();
};

var sendChanel, recevieChanel;
var sendButton = document.getElementById('sendButton');
var sendTextArea = document.getUserMedia('dataChanelSend');
var receiveTextarea = document.getElementById('dataChannelReceive');

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

sendButton.onclick = sendData;

var isChannelReady = false; 
var isInitiator = false; 
var isStarted = false;

var localStream;
var remoteStream;

var pc;

var pc_config = webrtcDetectedBrowser === 'firefox' ?
	{'iceServers':[{'url':'stun:23.21.150.121'}]} :
	{'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};

var pc_constraints = { 'optional': [
{'DtlsSrtpKeyAgreement': true} ]};

var sdpConstraints = {};

var room = prompt('Enter room name:');
var socket = io.connect("http://localhost:8181");

if (room !== '' ) {
	console.log('Create or join room', room);
	socket.emit('create or join', room);

}

var constrants = {video: true, audio: true};

function handleUserMedia(stream) {
	localStream = stream;
	attachMediaStream(localVideo, stream);
    console.log('Adding local stream.');
    sendMessage('got user media');
}

function handleUserMediaError(error){
        console.log('navigator.getUserMedia error: ', error);
}


socket.on('created', function (room){
	console.log('Created room ' + room);
	 isInitiator = true;
  // Call getUserMedia()
  navigator.getUserMedia(constraints, handleUserMedia, handleUserMediaError);
  console.log('Getting user media with constraints', constraints);
  checkAndStart();
});

socket.on('full', function(room) {
	console.log('Room ' + room + 'i s full');
});

socket.on('join', function(room) {
	console.log('Another peer made a request to join room ' + room);
	console.log('This peer is the initiator of room ' + room);
	isChannelReady = true;
});

socket.on('joined', function (room){
	console.log('This peer has joined room ' + room); isChannelReady = true;
  // Call getUserMedia()
  navigator.getUserMedia(constraints, handleUserMedia, handleUserMediaError);
  console.log('Getting user media with constraints', constraints);
});

socket.on('message', function(message) {
	console.log('Receive message: '+ message);
	if (message === 'got user media') {
		checkAndStart();
	} else if (message.type === 'offer') {
		if (!isInitiator && !isStarted) {
			checkAndStart();
		}

		pc.setRemoteDescription(new RTCSessionDescription(message));
		doAnswer();
	} else if (message.type === 'answer' && isStarted ) {
		pc.setRemoteDescription(new RTCSessionDescription(message));
	} else if (message.type === 'candidate' && isStarted)  {
		handleRemoteHangup();
	}
});


function sendMessage(message){ 
	console.log('Sending message: ', message); 
	socket.emit('message', message);
}

function checkAndStart() {
	if (!isStarted && typeof localStream != 'undefined' && isChannelReady) {
		createPeerConnection();
		isStarted = true; 
		if (isInitiator) {
			doCall();
		}
	}
}

function createPeerConnection() {
	try {
		pc = new RTCPeerConnection(pc_config, pc_constraints);
		pc.addStream(localStream);
		pc.onicecandidate = handleIceCandidate;
	} catch (e) {
		console.log('Failed to create PeerConnection, exception: ' + e.message);
		return;
	}

	pc.onaddstream = handleRemoteStreamAdded;
	pc.onremovestream = handleRemoteStreamRemoved;

	if (isInitiator ) {
		try {
			sendChanel = pc.createDataChannel('sendDataChannel', {reliable: true});
			trace('Created send data channel');
		} catch(e) {
			alert('Failed to create data channel. ');
      		trace('createDataChannel() failed with exception: ' + e.message);
		}

		sendChannel.onopen = handleSendChannelStateChange;
    	sendChannel.onmessage = handleMessage;
    	sendChannel.onclose = handleSendChannelStateChange;
	} else {
		function sendData() {
			var data = sendTextArea.value;
			if (isInitiator)
				sendChannel.send(data);
			else 
				recevieChanel.send(data);

			trace('send data: ', data);
		}
	}
}

function gotReceiveChannel(event) {
	trace('Receive Channel Callback');
	receiveChannel = event.channel;
	receiveChannel.onmessage = handleMessage;
	receiveChannel.onopen = handleReceiveChannelStateChange;
	receiveChannel.onclose = handleReceiveChannelStateChange;
}

function handleMessage(event) {
	trace('Received message: ' + event.data);
	receiveTextarea.value += event.data + '\n';
}