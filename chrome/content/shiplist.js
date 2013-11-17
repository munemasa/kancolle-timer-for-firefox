Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

var ShipList = {

    init: function(){
	let now = GetCurrentTime();

	// 艦艇リスト
	let ships = KanColleDatabase.memberShip2.list();

	document.title = "保有艦艇リスト "+ships.length+"隻 ("+GetDateString(now*1000)+")";

	let no = 1;
	let list = $('ship-list');
	for( let j = 0; j < ships.length; j++ ){
	    let ship = KanColleDatabase.memberShip2.get(ships[j]);

	    let elem = CreateElement('listitem');
	    let data = FindShipData( ship.api_id );
	    elem.appendChild( CreateListCell( no++ ) );
	    elem.appendChild( CreateListCell( KanColleData.type_name[data.api_stype] ) );
	    elem.appendChild( CreateListCell( data.api_name ) );
	    elem.appendChild( CreateListCell( ship.api_lv) );
	    elem.appendChild( CreateListCell( ship.api_cond) );

	    for( let i in ship.api_slot ){
		let slot_id = ship.api_slot[i];
		if( slot_id==-1 ) continue;
		let itemname = FindSlotItemNameById( slot_id );
		elem.appendChild( CreateListCell( itemname) );
	    }
	    list.appendChild(elem);
	}

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
