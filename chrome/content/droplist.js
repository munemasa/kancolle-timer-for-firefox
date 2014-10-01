Components.utils.import( "resource://kancolletimermodules/httpobserve.jsm" );

var DropShipList = {
    allships: [],

    clearListBox: function( list ){
	while( list.getRowCount() ){
	    list.removeItemAt( 0 );
	}
    },

    selectAll: function(){
	$('dropship-list').selectAll();
    },

    delete: function(){
	let targets = $('dropship-list' ).selectedItems;
	for( let t in targets ){
	    let id = parseInt( targets[t].getAttribute('list_id') );
	    this.allships = this.allships.filter( function(d){ return d.date!=id; } );
	}
	this.createTable();
	this.save();
    },

    getFile: function(){
	let profdir = GetProfileDir();
	profdir.append( "kancolletimer.dat" );
	profdir.append( "getship.dat" );
	return profdir;
    },

    openSaveFolder: function(){
	let profdir = GetProfileDir();
	profdir.append( "kancolletimer.dat" );
	let profileDir = profdir.path;

	// Show the profile directory.
	let nsLocalFile = Components.Constructor("@mozilla.org/file/local;1",
						 "nsILocalFile", "initWithPath");
	new nsLocalFile(profileDir).reveal();
    },

    save: function(){
	let file = this.getFile();
	let os = CreateFile( file );
	os = GetUTF8ConverterOutputStream( os );

	for( let i = 0; i < this.allships.length; i++ ){
	    let ship = this.allships[i];
	    let str = ship.area + "," + ship.enemy + "," + ship.type + "," + ship.name + "," + ship.date + "," + ship.winrank + "\n";
	    os.writeString( str );
	}
	os.close();
    },
    load: function(){
	let profdir = this.getFile();

	let istream = GetInputStream( profdir );
	istream = GetUTF8ConverterInputStream( istream );
	let line = {}, hasmore;
	let str = "";
	do{
	    hasmore = istream.readString( 4096, line );
	    str += line.value;
	}while( hasmore );
	istream.close();

	let d = str.split( "\n" );
	for( let i = 0; i < d.length; i++ ){
	    let data = d[i].split( "," );
	    if( data.length < 2 ) continue; // EOFの分をスルー
	    let ship = new Object();
	    ship.area = data[0];
	    ship.enemy = data[1];
	    ship.type = data[2];
	    ship.name = data[3];
	    ship.date = parseInt( data[4] );
	    ship.winrank = data[5] || "";
	    this.allships.push( ship );
	}
    },

    createTable: function(){
	let list = $( 'dropship-list' );
	this.clearListBox( list );

	let n = this.allships.length;
	if( n > 500 ){
	    this.allships = this.allships.slice(-500);
	}
	$('number-of-ships').setAttribute('label', this.allships.length + '/'+n+'人を表示しています');

	let no = 1;
	for( let i = 0; i < this.allships.length; i++ ){
	    let ship = this.allships[i];

	    let elem = CreateElement( 'listitem' );
	    let style = no != 1 && (no % 10) == 1 ? "border-top: 1px solid gray;" : "";
	    elem.appendChild( CreateListCell( ship.area == "Created" ? "建造" : ship.area ) );
	    elem.appendChild( CreateListCell( ship.enemy ) );
	    elem.appendChild( CreateListCell( ship.winrank ) );
	    elem.appendChild( CreateListCell( ship.type ) );
	    elem.appendChild( CreateListCell( ship.name ) );
	    elem.appendChild( CreateListCell( GetDateString( ship.date * 1000, true ).replace( "-", "/", "g" ) ) );
	    elem.setAttribute( 'style', style );
	    // 秒単位で一致する速度で建造、ドロップできないので日時をIDとして扱ってもいいだろう
	    elem.setAttribute( 'list_id', ship.date );

	    list.appendChild( elem );
	    no++;
	}
    },

    init: function(){
	this.load();
	this.createTable();
    }

};


window.addEventListener( "load", function( e ){
    DropShipList.init();
}, false );
