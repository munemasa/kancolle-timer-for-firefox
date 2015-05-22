Components.utils.import( "resource://kancolletimermodules/httpobserve.jsm" );

var EquipmentList = {
    allequipments: [],
    equipment_owner: null, // 装備品のオーナー艦娘

    updateOwnerShip: function(){
	this.allequipments.forEach( function( elem ){
	    elem._owner_ship = null;
	} );

	let ships = KanColleDatabase.ship.list().map( function( k ){
	    return KanColleDatabase.ship.get( k );
	} );

	ships.sort( function( a, b ){
	    let spec_a = FindShipData( a.api_id );
	    let spec_b = FindShipData( b.api_id );
	    let tmpa = spec_a.api_stype;
	    let tmpb = spec_b.api_stype;
	    if( tmpa == tmpb ){
		tmpa = spec_b.api_sortno;
		tmpb = spec_a.api_sortno;
	    }
	    return tmpb - tmpa;
	} );

	for( let j = 0; j < ships.length; j++ ){
	    let ship = ships[j];
	    let data = FindShipData( ship.api_id );
	    for( let i in ship.api_slot ){
		let slot_id = ship.api_slot[i];
		if( slot_id == -1 ) continue;

		let item = KanColleDatabase.slotitem.get( slot_id );
		if( item ){
		    ship["_page_no"] = 1 + parseInt(j/10);
		    item._owner_ship = ship;
		}
	    }
	}
    },

    popupEquipmentOwner: function( elem ){
	let equip = elem.getAttribute( 'equipment' );
	let listbox = $( 'owner-list-box' );
	ClearListBox( listbox );

	if( this.equipment_owner[equip].length==0){
	    $('owner-equip-name').value = "装備している艦娘はいません";
	    $('owner-list').openPopup( elem, 'after_start', 0, 0 );
	    listbox.style.display = "none";
	    return;
	}

	let unique = this.equipment_owner[equip].filter( function( itm, i, a ){
	    return i == a.indexOf( itm );
	} );

	unique.sort( function(a,b){
	    a = FindShipData( a.api_id );
	    b = FindShipData( b.api_id );

	    let tmpa = a.api_stype;
	    let tmpb = b.api_stype;
	    if( tmpa == tmpb ){
		tmpa = b.api_sortno;
		tmpb = a.api_sortno;
	    }
	    return tmpb - tmpa;
	});

	listbox.style.display = "";
	$( 'owner-equip-name' ).value = equip;

	unique.forEach( function( ship ){
	    item = FindShipData( ship.api_id );
	    let listitem = CreateElement( 'listitem' );
	    listitem.appendChild( CreateListCell( ship._page_no || "" ) );
	    listitem.appendChild( CreateListCell( "Lv"+ ship.api_lv ) );
	    listitem.appendChild( CreateListCell( KanColleData.type_name[item.api_stype] ) );
	    listitem.appendChild( CreateListCell( item.api_name ) );

	    for( let slot_id of ship.api_slot ){
		if( slot_id == -1 ) continue;
		let item = KanColleDatabase.slotitem.get( slot_id );
		if( item ){
		    let masterdata = KanColleDatabase.masterSlotitem.get( item.api_slotitem_id );
		    let str = masterdata.api_name + (item.api_level > 0 ? "★+" + item.api_level : "");
		    listitem.appendChild( CreateListCell( str ) );
		}
	    }

	    listbox.appendChild( listitem );
	} );

	$('owner-list').openPopup( elem, 'after_start', 0, 0 );
    },

    createEquipmentList: function(){
	let count = new Object(); // 未装備数
	let count_all = new Object(); // 所持総数
	let data = new Object();

	this.equipment_owner = new Object();
	this.allequipments.forEach( function( d ){
	    let k = d.api_name;
	    if( !count[k] ) count[k] = 0;

	    if( !EquipmentList.equipment_owner[k] ){
		EquipmentList.equipment_owner[k] = new Array();
	    }
	    if( !d._owner_ship ){
		count[k]++;
	    }else{
		EquipmentList.equipment_owner[k].push( d._owner_ship );
	    }
	    data[k] = d;

	    if( !count_all[d.api_name] ) count_all[d.api_name] = 0;
	    count_all[d.api_name]++;
	} );

	let update = d3.select( "#equipment-list" )
	    .selectAll( "row" )
	    .data( d3.map( count ).keys() );
	update.enter()
	    .append( "row" )
	    .attr( "style", function( d ){
		let color = GetEquipmentColor( data[d] );
		let str = "border-left:" + color + " 16px solid; border-bottom: #c0c0c0 1px solid;";
		let color2 = GetEquipmentSubColor( data[d] ) || color;
		str = "box-shadow: -8px 0 0 0 " + color2 + ", -16px 0 0 0 " + color + "; margin-left: 16px; border-bottom: #c0c0c0 1px solid;";
		return str;
	    } )
	    .attr( "equipment", function( d ){
		return d;
	    } )
	    .attr( "onclick", "EquipmentList.popupEquipmentOwner(this);" )
	    .selectAll( "label" )
	    .data( function( d ){
		       let value = new Array();
		       value.push( d );
		       value.push( count[d] );
		       value.push( "総数 " + count_all[d] );

		       let name = {
			   "api_houg": "火力",
			   "api_raig": "雷装",
			   "api_baku": "爆装",
			   "api_tyku": "対空",
			   "api_tais": "対潜",
			   "api_houm": "命中",
			   "api_houk": "回避",
			   "api_saku": "索敵",
			   "api_raim": "雷撃命中", // かな？
			   "api_souk": "装甲"
		       };
		       d3.map( data[d] ).keys().forEach( function( k ){
			   let v = GetSignedValue( data[d][k] );
			   switch( k ){
			   case "api_houg": // 火力
			   case "api_raig": // 雷装
			   case "api_baku": // 爆装
			   case "api_tyku": // 対空
			   case "api_tais": // 対潜
			   case "api_houm": // 命中
			   case "api_houk": // 回避
			   case "api_saku": // 索敵
			   case "api_souk": // 装甲
			       //case "api_raim": // 雷撃命中
			       if( v ) value.push( name[k] + v );
			       break;
			   }
		       } );
		       return value;
		   } )
	    .enter()
	    .append( "label" )
	    .attr( "value", function( d ){
		       return d;
		   } );
    },

    initEquipmentList: function(){
	// 装備アイテムリスト
	this.allequipments = KanColleDatabase.slotitem.list().map( function( k ){
	    let item = KanColleDatabase.slotitem.get( k );
	    let tmp = KanColleDatabase.masterSlotitem.get( item.api_slotitem_id );
	    MergeSimpleObject( item, tmp );
	    return item;
	} );
	// 艦これと同じ並びにする
	this.allequipments.sort( function( a, b ){
	    return a.api_slotitem_id - b.api_slotitem_id;
	} );
	for( let i = 0; i < 4; i += 2 ){
	    this.allequipments.sort( function( a, b ){
		return a.api_type[i] - b.api_type[i];
	    } );
	}
    },

    init: function(){
	this.initEquipmentList();
	this.updateOwnerShip();
	this.createEquipmentList();

	document.title += " " + new Date();

	// 未装備品リストを作成する
	let non_equipments = this.allequipments.filter( function( d ){
	    return !d._owner_ship;
	} );
	$( "tab-equipment" ).setAttribute( "label", "未装備品(" + non_equipments.length + ")" );
    }

};


window.addEventListener( "load", function( e ){
    EquipmentList.init();
    WindowOnTop( window, $( 'window-stay-on-top' ).hasAttribute( 'checked' ) );
}, false );
