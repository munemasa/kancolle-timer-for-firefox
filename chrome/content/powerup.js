var Powerup = {
    _file: "chrome://kancolletimer/content/data/powerup.tsv",

    _data: null,

    parse: function( text ){
	this._data = new Array();
	let rows = text.split( /\r\n|\n|\r/ );

	let flg = false;
	for( let row of rows ){
	    if( !flg ){
		// 1行目にはヘッダがあるだけなのでスキップ
		flg = true;
		continue;
	    }
	    let tmp = row.split( /\t/ );
	    this._data.push( tmp );
	}
    },

    expand: function(){
	let elems = document.getElementsByClassName( 'on-off' );
	for( let elem of elems ){
	    elem.setAttribute( 'checked', 'true' );
	}
    },
    collapse: function(){
	let elems = document.getElementsByClassName( 'on-off' );
	for( let elem of elems ){
	    elem.removeAttribute( 'checked' );
	}
    },

    today: function(){
	let now = new Date();
	$( 'calendar' ).value = now.getFullYear() + '-' + (now.getMonth()+1) + '-' + now.getDate();
	this.createView();
    },

    createView: function(){
	let date = $( 'calendar' ).dateValue;
	let dayofweek = date.getDay();

	let pickup = new Object();
	for( let row of this._data ){
	    if( row[dayofweek + 1] ){
		let equip_name = row[0];
		let ship_name = row[8];

		if( !pickup[equip_name] ){
		    pickup[equip_name] = new Array();
		}
		pickup[equip_name].push( ship_name );
	    }
	}

	let body = $( 'body' );
	RemoveChildren( body );

	let cnt = 0;
	for( let k in pickup ){
	    let row = pickup[k];

	    let label = CreateHTMLElement( 'label' );
	    label.setAttribute( 'class', 'equip-name' );
	    label.setAttribute( 'for', '_' + cnt );
	    label.appendChild( document.createTextNode( k ) );

	    let checkbox = CreateHTMLElement( 'input' );
	    checkbox.setAttribute( 'type', 'checkbox' );
	    checkbox.setAttribute( 'id', '_' + cnt );
	    checkbox.setAttribute( 'class', 'on-off' );

	    let description = CreateElement( 'description' );

	    for( let shipname of row ){
		let name = CreateHTMLElement( 'li' );
		name.appendChild( document.createTextNode( shipname || "---" ) );
		description.appendChild( name );
	    }

	    body.appendChild( label );
	    body.appendChild( checkbox );
	    body.appendChild( description );

	    cnt++;
	}
    },

    readFile: function(){
	let req = new XMLHttpRequest();
	if( !req ) return;

	req.open( 'GET', this._file );
	req.responseType = "text";

	req.onreadystatechange = function(){
	    if( req.readyState == 4 && req.status == 200 ){
		let txt = req.responseText;
		Powerup.parse( txt );
		Powerup.createView();
	    }
	};

	req.send( "" );
    },

    init: function(){
	this.readFile();
    }

};

window.addEventListener( "load", function( e ){
    Powerup.init();
}, false );
