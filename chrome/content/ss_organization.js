var ScreenShotOrganization = {
    _cnt: 0,
    canvas: null,

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

		let x = (cnt % 3) * w;
		let y = parseInt( cnt / 3 ) * h;

		ctx.drawImage( img, base_x, base_y, w, h, x, y, w, h );

		ScreenShotOrganization._cnt++;
		ScreenShotOrganization._cnt %= 6;
		$( 'text' ).value = (ScreenShotOrganization._cnt + 1) + "枚目を撮影してください。";

		let url = canvas.toDataURL( "image/png" );
		const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
		    .getService( Components.interfaces.nsIIOService );
		url = IO_SERVICE.newURI( url, null, null );
		$( 'picture' ).src = url.spec;
	    };
	    img.src = url.spec;
	} );
    },

    tweet: function(){
	let url = this.canvas.toDataURL( "image/png" );
	const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
	    .getService( Components.interfaces.nsIIOService );
	url = IO_SERVICE.newURI( url, null, null );
	OpenTweetDialog( true, url );
    },

    init: function(){
	this.canvas = document.createElementNS( "http://www.w3.org/1999/xhtml", "canvas" );
	this.canvas.style.display = "inline";
	this.canvas.width = 1360;
	this.canvas.height = 730;
    }

};

window.addEventListener( "load", function( e ){
    ScreenShotOrganization.init();
}, false );
