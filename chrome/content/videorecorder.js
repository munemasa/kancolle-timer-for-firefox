var VideoRecorder = {
    title: "艦これビデオレコーダー",

    fps: 15,
    timer_id: null,

    data: [],
    cnt: 0,

    seekbar: null,

    showFrame: function( frame_no ){
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
