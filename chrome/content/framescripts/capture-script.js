/*
 Copyright (c) 2015 amano <amano@miku39.jp>

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */


function KanColleGetFrame(){
    let win = content;

    let game_frame = win.window.document.getElementById( "game_frame" );
    if( !game_frame ) return null;
    let rect = game_frame.getBoundingClientRect();
    let offset_x = rect.x + win.window.pageXOffset;
    let offset_y = rect.y + win.window.pageYOffset;
//    let flash = game_frame.contentWindow.document.getElementById( "flashWrap" );
    let flash = game_frame.contentWindow.document.getElementsByTagName( "embed" )[0];
    offset_x += flash.offsetLeft;
    offset_y += flash.offsetTop;

    let w = flash.clientWidth;
    let h = flash.clientHeight;
    let x = offset_x;
    let y = offset_y;

    let canvas = content.document.createElement( "canvas" );
    canvas.style.display = "inline";
    canvas.width = w;
    canvas.height = h;

    let ctx = canvas.getContext( "2d" );
    // x,y,w,h
    ctx.drawWindow( win, x, y, w, h, "rgb(255,255,255)" );

    return canvas;
}

function KanColleScreenCapture( msg ){
    //console.log("KanColle Screen Capture for E10S");
    let canvas;
    try{
	canvas = KanColleGetFrame();
    }catch( e ){
	console.log( e );
    }
    if( !canvas ) return;

    let route = msg.objects.route;
    let isjpeg = msg.objects.is_jpeg;

    let ctx = canvas.getContext( "2d" );

    let mask_admiral_name = msg.objects.do_masking;
    if( mask_admiral_name ){
	ctx.fillStyle = "rgb(0,0,0)";
	ctx.fillRect( 110, 5, 145, 20 );
    }

    let url;
    if( isjpeg ){
	url = canvas.toDataURL( "image/jpeg" );
    }else{
	url = canvas.toDataURL( "image/png" );
    }

    canvas.style.display = "none";
    canvas.width = 1;
    canvas.height = 1;

    console.log( "kancolle screenshot captured." );
    // dataスキーマの文字列で返す
    //"kancolletimer:save-image"
    sendAsyncMessage( route, {}, {image: url} );
    return url;
}

addMessageListener( "kancolletimer@miku39.jp:capture", KanColleScreenCapture );

addEventListener( "unload", function(){
    removeMessageListener( "kancolletimer@miku39.jp:capture", KanColleScreenCapture );
} );