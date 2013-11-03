Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

var ShipList = {



    init: function(){
	let ships = KanColleRemainInfo.gOwnedShipList;

	let list = $('ship-list');
	for( let k in ships ){
	    let ship = ships[k];

	    let elem = CreateElement('listitem');
	    elem.appendChild( CreateListCell( FindShipName(ship.api_id) ) );
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
    }

};


window.addEventListener("load", function(e){ ShipList.init(); }, false);
