Components.utils.import( "resource://kancolletimermodules/httpobserve.jsm" );

var DropShipList = {
    allships: [],

    saveCvs: function(){
	let txt = "";

	for( let k in this.allships ){
	    let obj = this.allships[k];
	    txt += obj.type + "," + obj.name + "," + obj.lv + ",";
	    for( let i in obj.equips ){
		let name = obj.equips[i];
		txt += name + ",";
	    }
	    txt += "\n";
	}

	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance( nsIFilePicker );
	fp.init( window, "一覧をCSVで保存...", nsIFilePicker.modeSave );
	fp.appendFilters( nsIFilePicker.filterAll );
	let rv = fp.show();
	if( rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace ){
	    let file = fp.file;
	    let path = fp.file.path;
	    let os = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance( Components.interfaces.nsIFileOutputStream );
	    let flags = 0x02 | 0x08 | 0x20;// wronly|create|truncate
	    os.init( file, flags, 0664, 0 );
	    let cos = GetUTF8ConverterOutputStream( os );
	    cos.writeString( txt );
	    cos.close();
	}
    },

    clearListBox: function( list ){
	while( list.getRowCount() ){
	    list.removeItemAt( 0 );
	}
    },

    load: function(){
	let profdir = GetProfileDir();
	profdir.append( "kancolletimer.dat" )
	profdir.append( "getship.dat" );

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
	    this.allships.push( ship );
	}
    },

    createTable: function(){
	let list = $( 'dropship-list' );
	this.clearListBox( list );

	let no = 1;
	for( let i = 0; i < this.allships.length; i++ ){
	    let ship = this.allships[i];

	    let elem = CreateElement( 'listitem' );
	    let style = no != 1 && (no % 10) == 1 ? "border-top: 1px solid black;" : "";
	    elem.appendChild( CreateListCell( ship.area == "Created" ? "建造" : ship.area ) );
	    elem.appendChild( CreateListCell( ship.enemy ) );
	    elem.appendChild( CreateListCell( ship.type ) );
	    elem.appendChild( CreateListCell( ship.name ) );
	    elem.appendChild( CreateListCell( GetDateString( ship.date * 1000, true ).replace( "-", "/", "g" ) ) );

	    list.appendChild( elem );
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
