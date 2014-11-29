var VideoRecorder = {
    fps: 15,
    timer_id: null,

    data: [],
    cnt: 0,

    seekbar: null,

    setFPS: function( n ){
	console.log( "Record " + n + " fps." );
	this.fps = n;
    },

    showFrame: function( frame_no ){
	if( frame_no >= this.data.length ){
	    frame_no = this.data.length - 1;
	}
	let frame = this.data[frame_no];
	var ctx = $( 'video-playback' ).getContext( "2d" );
	ctx.drawImage( frame, 0, 0, 800, 480 );
	this.cnt = frame_no;
    },

    play: function(){
	this.seekbar = $( 'seekbar' );
	let t = 1000 / this.fps;
	this.timer_id = setInterval( function(){
	    VideoRecorder.seekbar.value = VideoRecorder.cnt;
	    VideoRecorder.showFrame( VideoRecorder.cnt );
	    VideoRecorder.cnt++;
	    if( VideoRecorder.cnt >= VideoRecorder.data.length ){
		VideoRecorder.pause();
	    }
	}, t );
    },
    pause: function(){
	clearInterval( this.timer_id );
    },

    start: function(){
	this.data = [];
	let t;
	t = 1000 / this.fps;
	this.timer_id = setInterval( function(){
	    let frame = TakeKanColleScreenshot_canvas();
	    VideoRecorder.data.push( frame );

	    let n = VideoRecorder.data.length;
	    if( (n % VideoRecorder.fps) == 0 ){
		$( 'message' ).label = "Recording..." + VideoRecorder.data.length + " frame(s)";
		VideoRecorder.showFrame( n - 1 );
	    }
	}, t );
	$( 'message' ).label = "Recording..."
    },

    tweet: function(){
	let isjpeg = KanColleTimerConfig.getBool( "screenshot.jpeg" );
	let url;
	let n = this.cnt;
	if( n >= this.data.length ){
	    n = this.data.length - 1;
	}
	let canvas = this.data[ n ];
	if( isjpeg ){
	    url = canvas.toDataURL( "image/jpeg" );
	}else{
	    url = canvas.toDataURL( "image/png" );
	}
	const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
	    .getService( Components.interfaces.nsIIOService );
	url = IO_SERVICE.newURI( url, null, null );
	OpenTweetDialog( true, url );
    },

    stop: function(){
	clearInterval( this.timer_id );
	$( 'seekbar' ).setAttribute( 'max', this.data.length - 1 );
	$( 'message' ).label = this.data.length + ' frame(s) captured.';
	this.showFrame( 0 );
    },

    init: function(){
	console.log( 'init' );
	var ctx = $( 'video-playback' ).getContext( "2d" );
	ctx.fillStyle = "rgb(0,0,0)";
	ctx.fillRect( 0, 0, 800, 480 );
	ctx.fillStyle = "rgb(255,255,255)";
	ctx.fillRect( 1, 1, 798, 478 );

	ctx.beginPath();
	ctx.moveTo( 0, 0 );
	ctx.lineTo( 800, 480 );
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo( 0, 480 );
	ctx.lineTo( 800, 0 );
	ctx.stroke();
    }
};

window.addEventListener( "load", function( e ){
    VideoRecorder.init();
}, false );
