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
	    // TODO e10s対応
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


    /**
     * 動画を、指定のファイル名 + "-X.png" という連番で保存する
     */
    save: function(){
	let isjpeg = KanColleTimerConfig.getBool( "screenshot.jpeg" );

	let defaultdir = KanColleTimerConfig.getUnichar( "screenshot.path" );
	let nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance( nsIFilePicker );

	fp.init( window, "保存先を選んでください", nsIFilePicker.modeSave );
	if( defaultdir ){
	    let file = Components.classes['@mozilla.org/file/local;1']
		.createInstance( Components.interfaces.nsIFile );
	    file.initWithPath( defaultdir );
	    if( file.exists() && file.isDirectory() )
		fp.displayDirectory = file;
	}
	fp.appendFilters( nsIFilePicker.filterImages );
	fp.defaultString = "video" + (isjpeg ? ".jpg" : ".png");
	fp.defaultExtension = isjpeg ? "jpg" : "png";
	let ret = fp.show();
	if( (ret != nsIFilePicker.returnOK && ret != nsIFilePicker.returnReplace) || !fp.file )
	    return null;

	const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
	    .getService( Components.interfaces.nsIIOService );
	console.log( 'saving...' );
	for( let n = 0; n < this.data.length; n++ ){
	    let canvas = this.data[ n ];
	    let url;
	    if( isjpeg ){
		url = canvas.toDataURL( "image/jpeg" );
	    }else{
		url = canvas.toDataURL( "image/png" );
	    }
	    url = IO_SERVICE.newURI( url, null, null );
	    let file = OpenFile( fp.file.path + "-" + n + (isjpeg ? ".jpg" : ".png") );
	    SaveUrlToFile( url, file );

	    let thread = Components.classes['@mozilla.org/thread-manager;1'].getService().mainThread;
	    thread.processNextEvent( false );

	    // 最初のうちだけ処理開始しているのが分かりやすいように 5%表示からスタートするように
	    $( 'saving-progress' ).value = Math.max( parseInt( n * 100 / this.data.length ), 5 );
	    $( 'message' ).label = (n + 1) + ' frame(s) saved.';

	    if( this._break ) break;
	}
	console.log( 'done.' );
	$( 'saving-progress' ).value = 0;
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

	if( KanColleTimerConfig.e10sEnabled() ){
	    console.log( "enable e10s" );
	    setTimeout( function(){
		AlertPrompt( "Multi-process(E10S)が有効になっているため録画はできません", "ビデオレコーダーカッコカリ" );

	    }, 1000 );
	}
    },
    destroy: function(){
	this._break = true;
    }
};

window.addEventListener( "load", function( e ){
    VideoRecorder.init();
}, false );

window.addEventListener( "unload", function( e ){
    VideoRecorder.destroy();
}, false );