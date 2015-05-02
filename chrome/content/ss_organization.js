var ScreenShotOrganization = {
    _cnt: 0,
    canvas: null,
    w: 453,
    h: 365,

    row: 2,
    col: 3,

    getScreenshot: function(){
	let canvas = this.canvas;

	RequestKanColleScreenshot( "kancolletimer@miku39.jp:take-organization", function( url ){
	    let cnt = ScreenShotOrganization._cnt;

	    let ctx = canvas.getContext( '2d' );
	    let img = new Image();
	    img.onload = function(){
		let w = 453;
		let h = 365;
		let base_x = 330;
		let base_y = 103;

		let x = (cnt % ScreenShotOrganization.col) * w;
		let y = parseInt( cnt / ScreenShotOrganization.col ) * h;

		ctx.drawImage( img, base_x, base_y, w, h, x, y, w, h );

		ScreenShotOrganization._cnt++;
		ScreenShotOrganization._cnt %= 6;
		$( 'text' ).value = (ScreenShotOrganization._cnt + 1) + "枚目を撮影してください。";

		let url = CanvasToURI( canvas, "image/png" );
		$( 'picture' ).src = url.spec;
	    };
	    img.src = url.spec;
	} );
    },

    changeColumns: function( n ){
	let width = this.w * n;
	let height = this.h * parseInt( 6 / n + 0.999 );
	this.canvas.width = width;
	this.canvas.height = height;
	$( 'picture' ).width = width / 2;
	$( 'picture' ).height = height / 2;
	this.col = n;

	this._cnt = 0;
	$( 'text' ).value = "1枚目を撮影してください。";
    },

    tweet: function(){
	let url = CanvasToURI( this.canvas, KanColleTimerConfig.getBool( "screenshot.jpeg" ) ? "image/jpeg" : "image/png" );
	OpenTweetDialog( true, url );
    },

    init: function(){
	this.canvas = document.createElementNS( "http://www.w3.org/1999/xhtml", "canvas" );
	this.canvas.style.display = "inline";
	this.canvas.width = 1360;
	this.canvas.height = 730;

	this.changeColumns( parseInt( $( 'columns' ).value ) );
    }

};

window.addEventListener( "load", function( e ){
    ScreenShotOrganization.init();
}, false );
