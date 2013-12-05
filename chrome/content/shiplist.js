Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

var ShipList = {
    allships: [],

    clearListBox:function(){
	let list = $('ship-list');

	while( list.getRowCount() ){
	    list.removeItemAt(0);
	}
    },

    getFleetNo: function( ship_id ){
	let fleet = KanColleRemainInfo.shipfleet[ship_id];
	if (fleet)
	    return fleet.fleet;
	return 0;
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
	    obj.fleet_no = fleet_no;
	    obj.type = KanColleData.type_name[data.api_stype];
	    obj.stype = data.api_stype;
	    obj.name = data.api_name;
	    obj.lv = ship.api_lv;
	    obj.cond = ship.api_cond;

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


window.addEventListener("load", function(e){ ShipList.init(); }, false);
