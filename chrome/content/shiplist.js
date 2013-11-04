Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

var ShipList = {



    init: function(){
	let ships = KanColleRemainInfo.gOwnedShipList;

	let list = $('ship-list');
	let no = 1;
	for( let k in ships ){
	    let ship = ships[k];

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

	let fleets = KanColleRemainInfo.gDeckList;

	for( let f in fleets ){
	    f = parseInt(f);
	    let fleet = fleets[f];

	    let rows = $('fleet-'+(f+1));

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
