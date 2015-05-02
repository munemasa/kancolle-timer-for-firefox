Components.utils.import( "resource://kancolletimermodules/httpobserve.jsm" );

var ShipList = {
    allequipments: [],
    equipment_owner: null, // 装備品のオーナー艦娘

    getFleetNo: function( ship_id ){
	let fleet = KanColleDatabase.deck.lookup( ship_id );
	if( fleet )
	    return fleet.fleet;
	return 0;
    },

    isRepairing: function( ship_id ){
	for( let i in KanColleRemainInfo.ndock_ship_id ){
	    if( KanColleRemainInfo.ndock_ship_id[i] == ship_id ) return true;
	}
	return false;
    },

    /**
     * 艦隊編成のリストを作成する
     */
    setFleetOrganization: function( n ){
	let list = $( 'fleet-organization' );
	ClearListBox( list );
	// 艦隊編成
	let fleet = KanColleDatabase.deck.get( n );

	let no = 1;
	let sakuteki = 0;
	for( let i = 0; fleet.api_ship[i] != -1 && i < 6; i++ ){
	    let data = FindOwnShipData( fleet.api_ship[i] );
	    let masterdata = FindShipData( fleet.api_ship[i] );

	    sakuteki += data.api_sakuteki[0];

	    let elem = CreateElement( 'listitem' );

	    elem.appendChild( CreateListCell( KanColleData.type_name[masterdata.api_stype], '' ) );
	    elem.appendChild( CreateListCell( masterdata.api_name ) );

	    let cell = CreateListCell( data.api_lv );
	    elem.appendChild( cell );
	    elem.appendChild( CreateListCell( data.api_cond ) );

	    if( data.api_cond >= 50 ){
		elem.setAttribute( 'style', 'background-color: #ffffc0;' );
	    }else{
		elem.setAttribute( 'style', 'background-color: white;' );
	    }

	    cell = CreateListCell( data.api_ndock_time ? GetTimeString( data.api_ndock_time / 1000 ) : "---" );
	    if( this.isRepairing( data.api_id ) ){
		cell.setAttribute( 'style', 'color: gray; text-align: center;' );
	    }else{
		cell.setAttribute( 'style', 'text-align: center;' );
	    }
	    elem.appendChild( cell );

	    elem.appendChild( CreateListCell( data.api_sakuteki[0] ) );

	    cell = CreateListCell( data.api_exp[2] + "%" );
	    cell.setAttribute( 'style', 'text-align: right' );
	    elem.appendChild( cell );

	    let n = d3.sum( data.api_onslot );
	    if( n ){
	    }else{
		n = "--";
	    }
	    cell = CreateListCell( n );
	    elem.appendChild( cell );

	    for( let i in data.api_slot ){
		if( data.api_slot[i] < 0 ) continue;
		let name = FindSlotItemNameById( data.api_slot[i] );
		elem.appendChild( CreateListCell( name ) );
	    }
	    list.appendChild( elem );
	}
	$( 'fleet-organization' ).setAttribute( 'tooltiptext', "索敵値" + sakuteki );
    },

    createHistogram: function(){
	let histogram = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	let ships = KanColleDatabase.ship.list().map( function( k ){
	    return KanColleDatabase.ship.get( k );
	} );
	for( let i = 0; i < ships.length; i++ ){
	    let k = parseInt( ships[i].api_lv / 10 );
	    histogram[k]++;
	}

	let margin = {top: 20, right: 20, bottom: 30, left: 40},
	    width = 800 - margin.left - margin.right,
	    height = 480 - margin.top - margin.bottom;

	let x = d3.scale.ordinal()
	    .rangeRoundBands( [0, width], .1 );
	let y = d3.scale.linear()
	    .range( [height, 0] );

	let xAxis = d3.svg.axis()
	    .scale( x )
	    .orient( "bottom" )
	    .tickFormat( function( d ){
			     return d3.max( [(d * 10), 1] ) + "-";
			 } );

	let yAxis = d3.svg.axis()
	    .scale( y )
	    .orient( "left" )
	    .tickFormat( function( d ){
			     return d + "隻";
			 } )
	    .ticks( 10 );

	let svg = d3.select( "#histogram" ).append( "svg" )
	    .attr( "id", "svg-histogram" )
	    .attr( "width", width + margin.left + margin.right )
	    .attr( "height", height + margin.top + margin.bottom )
	    .append( "g" )
	    .attr( "transform", "translate(" + margin.left + "," + margin.top + ")" );

	x.domain( d3.keys( histogram ) );
	y.domain( [0, d3.max( histogram )] );

	svg.append( "g" )
	    .attr( "class", "x axis" )
	    .attr( "transform", "translate(0," + height + ")" )
	    .call( xAxis );

	svg.append( "g" )
	    .attr( "class", "y axis" )
	    .call( yAxis );

	svg.append( "g" )
	    .attr( "class", "grid" )
	    .call( d3.svg.axis()
		       .scale( y )
		       .orient( "left" )
		       .tickSize( -width, 0, 0 )
		       .tickFormat( "" )
	    );

	svg.selectAll( ".bar" )
	    .data( histogram )
	    .enter().append( "rect" )
	    .attr( "class", "bar" )
	    .attr( "x", function( d, i ){
		       return x( i );
		   } )
	    .attr( "width", x.rangeBand() )
	    .attr( "y", function( d ){
		       return y( d );
		   } )
	    .attr( "height", function( d ){
		       return height - y( d );
		   } );
    },

    createShipOrganizationList: function(){
	// 艦隊編成
	let fleets = KanColleDatabase.deck.list();
	for( let j = 0; j < fleets.length; j++ ){
	    let fleet = KanColleDatabase.deck.get( fleets[j] );
	    let rows = $( 'fleet-' + fleet.api_id );

	    let ships = KanColleDatabase.ship.list();
	    for( let i = 0; fleet.api_ship[i] != -1 && i < 6; i++ ){
		let row = CreateElement( 'row' );
		let data = FindOwnShipData( fleet.api_ship[i] );
		let masterdata = FindShipData( fleet.api_ship[i] );
		row.appendChild( CreateLabel( KanColleData.type_name[masterdata.api_stype], '' ) );
		row.appendChild( CreateLabel( masterdata.api_name ) );
		row.appendChild( CreateListCell( data.api_nowhp + "/" + data.api_maxhp ) );

		let hbox = CreateElement( 'hbox' );
		hbox.appendChild( CreateLabel( "" + data.api_cond ) );
		if( data.api_cond >= 50 ){
		    hbox.setAttribute( 'style', 'background-color: #ffffc0;' );
		}else{
		    hbox.setAttribute( 'style', 'background-color: white;' );
		}
		row.appendChild( hbox );
		if( masterdata.api_fuel_max != data.api_fuel ||
		    masterdata.api_bull_max != data.api_bull ){
		    hbox.setAttribute( 'warning', '1' );
		}

		let maxhp = parseInt( data.api_maxhp );
		let nowhp = parseInt( data.api_nowhp );
		if( nowhp - 1 <= maxhp * 0.25 ){
		    row.style.backgroundColor = '#ff8080';
		}else{
		    row.style.backgroundColor = '';
		}
		rows.appendChild( row );
	    }

	}
    },

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

	ClearListBox( listbox );
	listbox.style.display = "";
	$( 'owner-equip-name' ).value = equip;

	unique.forEach( function( ship ){
	    item = FindShipData( ship.api_id );
	    let listitem = CreateElement( 'listitem' );
	    listitem.appendChild( CreateListCell( ship._page_no || "" ) );
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

	    if( !ShipList.equipment_owner[k] ){
		ShipList.equipment_owner[k] = new Array();
	    }
	    if( !d._owner_ship ){
		count[k]++;
	    }else{
		ShipList.equipment_owner[k].push( d._owner_ship );
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
		let color = ShipList.getEquipmentColor( data[d] );
		let str = "border-left:" + color + " 16px solid; border-bottom: #c0c0c0 1px solid;";
		let color2 = ShipList.getEquipmentSubColor( data[d] ) || color;
		str = "box-shadow: -8px 0 0 0 " + color2 + ", -16px 0 0 0 " + color + "; margin-left: 16px; border-bottom: #c0c0c0 1px solid;";
		return str;
	    } )
	    .attr( "equipment", function( d ){
		return d;
	    } )
	    .attr( "onclick", "ShipList.popupEquipmentOwner(this);" )
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

    /**
     * 装備アイテムの色を返す
     * @param d 装備アイテム
     * @returns 色を返す
     */
    getEquipmentColor: function( d ){
	let color = KanColleData.slotitem_color[ d.api_type[2] ];
	if( (d.api_type[2] == 1 || d.api_type[2] == 4) && d.api_type[3] == 16 ){
	    // 主砲・副砲扱いの高角砲たち
	    color = "#66cc77";
	}
	return color;
    },
    getEquipmentSubColor: function( d ){
	let subcolor = {
	    6:  '#39b74e',	// 制空戦闘機
	    7:  '#ea6a6a',	// 艦爆
	    8:  '#65bcff',	// 艦攻
	    9:  '#ffc000'	// 彩雲
	};
	let color = subcolor[ d.api_type[2] ];
	return color;
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

	this.createHistogram();

	this.createShipOrganizationList();
	this.createEquipmentList();

	this.setFleetOrganization( 1 );

	document.title += " " + new Date();

	// 未装備品リストを作成する
	let non_equipments = this.allequipments.filter( function( d ){
	    return !d._owner_ship;
	} );
	$( "tab-equipment" ).setAttribute( "label", "未装備品(" + non_equipments.length + ")" );
    }

};


window.addEventListener( "load", function( e ){
    ShipList.init();
    WindowOnTop( window, $( 'window-stay-on-top' ).hasAttribute( 'checked' ) );
}, false );
