function KanColleGetFrame(){
    var win = content;

    var game_frame = win.window.document.getElementById( "game_frame" );
    if( !game_frame ) return null;
    var offset_x = game_frame.offsetLeft;
    var offset_y = game_frame.offsetTop;
    var flash = game_frame.contentWindow.document.getElementById( "flashWrap" );
    offset_x += flash.offsetLeft;
    offset_y += flash.offsetTop;

    var w = flash.clientWidth;
    var h = flash.clientHeight;
    var x = offset_x;
    var y = offset_y;

    var canvas = content.document.createElement( "canvas" );
    canvas.style.display = "inline";
    canvas.width = w;
    canvas.height = h;

    var ctx = canvas.getContext( "2d" );
    // x,y,w,h
    ctx.drawWindow( win, x, y, w, h, "rgb(255,255,255)" );

    return canvas;
}

function KanColleScreenCapture( msg ){
    //console.log("KanColle Screen Capture for E10S");
    let canvas = KanColleGetFrame();

    let route = msg.objects.route;
    let isjpeg = msg.objects.is_jpeg;

    var ctx = canvas.getContext( "2d" );

    let mask_admiral_name = msg.objects.do_masking;
    if( mask_admiral_name ){
	ctx.fillStyle = "rgb(0,0,0)";
	ctx.fillRect( 110, 5, 145, 20 );
    }

    var url;
    if( isjpeg ){
	url = canvas.toDataURL( "image/jpeg" );
    }else{
	url = canvas.toDataURL( "image/png" );
    }

    canvas.style.display = "none";
    canvas.width = 1;
    canvas.height = 1;

    // dataスキーマの文字列で返す
    //"kancolletimer:save-image"
    sendAsyncMessage( route, {}, {image: url} );
    return url;
}

addMessageListener( "kancolletimer@miku39.jp:capture", KanColleScreenCapture );
