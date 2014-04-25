Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

var ShipList = {
    allships: [],

    saveCvs:function(){
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
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "艦艇リストの保存...", nsIFilePicker.modeSave);
	fp.appendFilters(nsIFilePicker.filterAll);
	let rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    let file = fp.file;
	    let path = fp.file.path;
	    let os = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
	    let flags = 0x02|0x08|0x20;// wronly|create|truncate
	    os.init(file,flags,0664,0);
	    let cos = GetUTF8ConverterOutputStream(os);
	    cos.writeString( txt );
	    cos.close();
	}
    },

    clearListBox:function(){
	let list = $('ship-list');

	while( list.getRowCount() ){
	    list.removeItemAt(0);
	}
    },

    getFleetNo: function( ship_id ){
	let fleet = KanColleDatabase.ship.get(ship_id, 'fleet');
	if (fleet)
	    return fleet.fleet;
	return 0;
    },

    isRepairing: function(ship_id){
	for(let i in KanColleRemainInfo.ndock_ship_id ){
	    if( KanColleRemainInfo.ndock_ship_id[i]==ship_id ) return true;
	}
	return false;
    },

    sort: function(type){
	this.allships.sort( function(a,b){
	    var tmpa = 0;
	    var tmpb = 0;
	    var order = -1;
	    switch( type ){
	    case 0: // 艦種
		tmpa = a.stype;
		tmpb = b.stype;
		break;
	    case 1: // レベル
		tmpa = a.lv;
		tmpb = b.lv;
		break;
	    case 2: // 状態
		tmpa = a.cond;
		tmpb = b.cond;
		break;
	    case 3: // 入渠時間
		tmpa = a.ndock_time;
		tmpb = b.ndock_time;
		break;
	    }
	    return (tmpa - tmpb) * order;
	});
	this.setupListBox();
    },

    setupListBox:function(){
	let list = $('ship-list');
	
	this.clearListBox();

	let no = 1;
	for( let k in this.allships ){
	    let obj = this.allships[k];

	    let elem = CreateElement('listitem');
	    let style = no!=1&&(no%10)==1 ? "border-top: 1px solid black;":"";

	    elem.appendChild( CreateListCell( no++ ) );
	    if( obj.fleet_no ){
		elem.appendChild( CreateListCell( obj.type + '('+obj.fleet_no+')' ) );
	    }else{
		elem.appendChild( CreateListCell( obj.type ) );
	    }
	    elem.appendChild( CreateListCell( obj.name ) );
	    elem.appendChild( CreateListCell( obj.lv ) );
	    elem.appendChild( CreateListCell( obj.cond ) );

	    if( obj.cond >=50 ){
		elem.setAttribute('style',style+'background-color: #ffffc0;');
	    }else{
		elem.setAttribute('style',style+'background-color: white;');
	    }

	    let cell = CreateListCell( obj.ndock_time ? GetTimeString(obj.ndock_time):"---" );
	    if( this.isRepairing(obj.ship_id) ){
		cell.setAttribute('style','color: gray;');
	    }else{
	    }
	    elem.appendChild( cell );

	    for( let i in obj.equips ){
		let name = obj.equips[i];
		elem.appendChild( CreateListCell( name ) );
	    }
	    list.appendChild(elem);
	}
    },

    init: function(){
	let now = GetCurrentTime();

	// 艦艇リスト
	let ships = KanColleDatabase.memberShip2.list();

	document.title = "保有艦艇リスト "+ships.length+"隻 ("+GetDateString(now*1000)+")";

	this.allships = new Array();

	let no = 1;
	let list = $('ship-list');
	for( let j = 0; j < ships.length; j++ ){
	    let ship = KanColleDatabase.memberShip2.get(ships[j]);
	    let data = FindShipData( ship.api_id );
	    let fleet_no = this.getFleetNo( ship.api_id );

	    let obj = new Object();
	    obj.ship_id = ship.api_id;
	    obj.fleet_no = fleet_no;
	    obj.type = KanColleData.type_name[data.api_stype];
	    obj.stype = data.api_stype;
	    obj.name = data.api_name;
	    obj.lv = ship.api_lv;
	    obj.cond = ship.api_cond;
	    obj.ndock_time = parseInt(ship.api_ndock_time/1000);

	    obj.equips = new Array();

	    for( let i in ship.api_slot ){
		let slot_id = ship.api_slot[i];
		if( slot_id==-1 ) continue;
		let itemname = FindSlotItemNameById( slot_id );
		obj.equips.push( itemname );
	    }
	    this.allships.push( obj );
	}
	this.setupListBox();

	// 艦隊編成
	let fleets = KanColleDatabase.memberDeck.list();
	for( let j=0; j < fleets.length; j++ ){
	    let fleet = KanColleDatabase.memberDeck.get(fleets[j]);

	    let rows = $('fleet-'+fleet.api_id);

	    for( let i=0; fleet.api_ship[i]!=-1 && i<6; i++){
		let row = CreateElement('row');
		let data = FindOwnShipData( fleet.api_ship[i] );
		let masterdata = FindShipData( fleet.api_ship[i] );
		row.appendChild( CreateLabel(KanColleData.type_name[masterdata.api_stype],'') );
		row.appendChild( CreateLabel(masterdata.api_name) );
		row.appendChild( CreateListCell( data.api_nowhp + "/" + data.api_maxhp) );
		row.appendChild( CreateLabel(""+data.api_cond) );

		let maxhp = parseInt(data.api_maxhp);
		let nowhp = parseInt(data.api_nowhp);
		if( nowhp-1 <= maxhp*0.25 ){
		    row.style.backgroundColor = '#ff8080';
		}else{
		    row.style.backgroundColor = '';
		}
		rows.appendChild( row );
	    }

	}

    }

};


window.addEventListener("load", function(e){
    ShipList.init();
    WindowOnTop( window, $('window-stay-on-top').hasAttribute('checked') );
}, false);
