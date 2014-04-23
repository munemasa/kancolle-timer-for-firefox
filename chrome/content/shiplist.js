Components.utils.import( "resource://kancolletimermodules/httpobserve.jsm" );

var ShipList = {
    allships:      [],
    allequipments: [],
    filter_key:    [],

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
	fp.init( window, "艦娘リストの保存...", nsIFilePicker.modeSave );
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

    getFleetNo: function( ship_id ){
	let fleets = KanColleDatabase.memberDeck.list();
	for( let i = 0; i < fleets.length; i++ ){
	    let fleet = KanColleDatabase.memberDeck.get( fleets[i] );
	    for( let j in fleet.api_ship ){
		if( fleet.api_ship[j] == ship_id ){
		    return fleet.api_id;
		}
	    }
	}
	return 0;
    },

    isRepairing: function( ship_id ){
	for( let i in KanColleRemainInfo.ndock_ship_id ){
	    if( KanColleRemainInfo.ndock_ship_id[i] == ship_id ) return true;
	}
	return false;
    },

    sort: function( type ){
	this.allships.sort( function( a, b ){
	    var tmpa = 0;
	    var tmpb = 0;
	    var order = -1;
	    switch( type ){
	    case 0: // 艦種
		tmpa = a.stype;
		tmpb = b.stype;
		if( tmpa == tmpb ){
		    tmpa = b.sort_no;
		    tmpb = a.sort_no;
		}
		break;
	    case 1: // レベル
		tmpa = a.lv;
		tmpb = b.lv;
		if( tmpa == tmpb ){
		    tmpa = b.sort_no;
		    tmpb = a.sort_no;
		}
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
	} );
	let list = this.filter( this.allships );
	this.showShipList( list );
    },

    /**
     * 艦隊編成のリストを作成する
     */
    setFleetOrganization: function( n ){
	let list = $( 'fleet-organization' );
	this.clearListBox( list );
	// 艦隊編成
	let fleet = KanColleDatabase.memberDeck.get( n );

	let no = 1;
	for( let i = 0; fleet.api_ship[i] != -1 && i < 6; i++ ){
	    let data = FindOwnShipData( fleet.api_ship[i] );
	    let masterdata = FindShipData( fleet.api_ship[i] );

	    let elem = CreateElement( 'listitem' );

	    elem.appendChild( CreateListCell( KanColleData.type_name[masterdata.api_stype], '' ) );
	    elem.appendChild( CreateListCell( masterdata.api_name ) );
	    elem.appendChild( CreateListCell( data.api_lv ) );
	    elem.appendChild( CreateListCell( data.api_cond ) );

	    if( data.api_cond >= 50 ){
		elem.setAttribute( 'style', 'background-color: #ffffc0;' );
	    }else{
		elem.setAttribute( 'style', 'background-color: white;' );
	    }

	    let cell = CreateListCell( data.api_ndock_time ? GetTimeString( data.api_ndock_time / 1000 ):"---" );
	    if( this.isRepairing( data.api_id ) ){
		cell.setAttribute( 'style', 'color: gray;' );
	    }else{
	    }
	    elem.appendChild( cell );

	    for( let i in data.api_slot ){
		if( data.api_slot[i] < 0 ) continue;
		let name = FindSlotItemNameById( data.api_slot[i] );
		elem.appendChild( CreateListCell( name ) );
	    }
	    list.appendChild( elem );
	}
    },

    _filter_func: [ function( d ){
	let type = ShipList.filter_key[0];
	if( !type ) return true;
	return d.type == type;
    }, function( d ){
	let equip = ShipList.filter_key[1];
	if( !equip ) return true;
	for( let i in d.equips ){
	    if( equip == d.equips[i] ) return true;
	}
	return false;
    }],

    filterByType: function( type ){
	this.filter_key[0] = type;
	let ships = this.filter( this.allships );
	this.showShipList( ships );
    },

    filterByEquipment: function( equip ){
	this.filter_key[1] = equip;
	let ships = this.filter( this.allships );
	this.showShipList( ships );
    },

    filter: function( list ){
	return list.filter( this._filter_func[0] ).filter( this._filter_func[1] );
    },

    /**
     * 艦娘リストを作成する
     */
    showShipList: function( ships ){
	let list = $( 'ship-list' );

	this.clearListBox( list );

	let no = 1;
	ships.forEach( function( obj ){
	    let elem = CreateElement( 'listitem' );
	    let style = no != 1 && (no % 10) == 1 ? "border-top: 1px solid black;":"";

	    elem.appendChild( CreateListCell( no++ ) );
	    if( obj.fleet_no ){
		elem.appendChild( CreateListCell( obj.type + '(' + obj.fleet_no + ')' ) );
	    }else{
		elem.appendChild( CreateListCell( obj.type ) );
	    }
	    elem.appendChild( CreateListCell( obj.name ) );
	    elem.appendChild( CreateListCell( obj.lv ) );
	    elem.appendChild( CreateListCell( obj.cond ) );

	    if( obj.cond >= 50 ){
		elem.setAttribute( 'style', style + 'background-color: #ffffc0;' );
	    }else{
		elem.setAttribute( 'style', style + 'background-color: white;' );
	    }

	    let cell = CreateListCell( obj.ndock_time ? GetTimeString( obj.ndock_time ):"---" );
	    if( ShipList.isRepairing( obj.ship_id ) ){
		cell.setAttribute( 'style', 'color: gray;' );
	    }else{
	    }
	    elem.appendChild( cell );

	    for( let i in obj.equips ){
		let name = obj.equips[i];
		elem.appendChild( CreateListCell( name ) );
	    }
	    list.appendChild( elem );
	} );
    },

    createHistogram: function(){
	let histogram = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	let ships = KanColleDatabase.memberShip2.list().map( function( k ){
	    return KanColleDatabase.memberShip2.get( k );
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
	let fleets = KanColleDatabase.memberDeck.list();
	for( let j = 0; j < fleets.length; j++ ){
	    let fleet = KanColleDatabase.memberDeck.get( fleets[j] );
	    let rows = $( 'fleet-' + fleet.api_id );

	    for( let i = 0; fleet.api_ship[i] != -1 && i < 6; i++ ){
		let row = CreateElement( 'row' );
		let data = FindOwnShipData( fleet.api_ship[i] );
		let masterdata = FindShipData( fleet.api_ship[i] );
		row.appendChild( CreateLabel( KanColleData.type_name[masterdata.api_stype], '' ) );
		row.appendChild( CreateLabel( masterdata.api_name ) );
		row.appendChild( CreateListCell( data.api_nowhp + "/" + data.api_maxhp ) );

		let hbox = CreateElement( 'hbox' );
		hbox.appendChild( CreateLabel( "" + data.api_cond ) );
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

    createShipList: function( ships ){
	this.allequipments.forEach( function( elem ){
	    elem._owner_ship = null;
	} );

	let allships = new Array();

	let list = $( 'ship-list' );
	let no = 1;
	for( let j = 0; j < ships.length; j++ ){
	    let ship = ships[j];
	    let data = FindShipData( ship.api_id );
	    let fleet_no = this.getFleetNo( ship.api_id );

	    let obj = new Object();
	    obj.ship_id = ship.api_id;
	    obj.sort_no = data.api_sortno;
	    obj.fleet_no = fleet_no;
	    obj.type = KanColleData.type_name[data.api_stype];
	    obj.stype = data.api_stype;
	    obj.name = data.api_name;
	    obj.lv = ship.api_lv;
	    obj.cond = ship.api_cond;
	    obj.ndock_time = parseInt( ship.api_ndock_time / 1000 );

	    obj.equips = new Array();

	    for( let i in ship.api_slot ){
		let slot_id = ship.api_slot[i];
		if( slot_id == -1 ) continue;
		let item = FindSlotItem( slot_id );
		if( item ){
		    item._owner_ship = obj.name;
		    obj.equips.push( item.api_name );
		}
	    }
	    allships.push( obj );
	}
	return allships;
    },

    createEquipmentList: function(){
	let count = new Object();
	let count_all = new Object();
	let data = new Object();
	this.allequipments.forEach( function( d ){
	    let k = d.api_name;
	    if( !count[k] ) count[k] = 0;
	    if( !d._owner_ship ) count[ k ]++;
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
		return "border-left:" + color + " 16px solid; border-bottom: #c0c0c0 1px solid;";
	    } )
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
		    "api_kaih": "回避",
		    "api_saku": "索敵",
		    "api_raim": "雷撃命中" // かな？
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
		    case "api_kaih": // 回避
		    case "api_saku": // 索敵
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

    init: function(){
	// 装備アイテムリスト
	this.allequipments = KanColleDatabase.memberSlotitem.list().map( function( k ){
	    let item = KanColleDatabase.memberSlotitem.get( k );
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

	this.createHistogram();

	// 艦艇リスト
	let ships = KanColleDatabase.memberShip2.list().map( function( k ){
	    return KanColleDatabase.memberShip2.get( k );
	} );
	this.allships = this.createShipList( ships );
	this.showShipList( this.allships );

	this.createShipOrganizationList();
	this.createEquipmentList();

	// 艦種メニュー
	let tmp = new Object();
	ships.forEach( function( d ){
	    let data = FindShipData( d.api_id );
	    if( data.api_stype != 9 ) tmp[ data.api_stype ] = 1;
	} );
	d3.map( tmp ).keys()
	    .sort( function( a, b ){
		return b - a;
	    } )
	    .forEach( function( d ){
		let name = KanColleData.type_name[d];
		let menuitem = CreateMenuItem( name, name );
		$( 'menu-shiptype' ).appendChild( menuitem );
	    } );

	// 装備アイテムメニュー
	tmp = new Object();
	this.allequipments.forEach( function( d ){
	    tmp[ d.api_name ] = d;
	} );
	d3.map( tmp ).keys().forEach( function( d ){
	    let menuitem = CreateMenuItem( d, d );
	    let color = ShipList.getEquipmentColor( tmp[ d ] );
	    menuitem.appendChild( CreateLabel( d, d ) );
	    menuitem.setAttribute( "style", "border-left: " + color + " 16px solid;" );
	    $( 'menu-equipment' ).appendChild( menuitem );
	} );

	this.setFleetOrganization( 1 );

	document.title += " " + new Date();

	// 未装備品リストを作成する
	let non_equipments = this.allequipments.filter( function( d ){
	    return !d._owner_ship;
	} );
	$( "tab-ships" ).setAttribute( "label", "艦娘(" + ships.length + ")" );
	$( "tab-equipment" ).setAttribute( "label", "未装備品(" + non_equipments.length + ")" );
    }

};


window.addEventListener( "load", function( e ){
    ShipList.init();
    WindowOnTop( window, $( 'window-stay-on-top' ).hasAttribute( 'checked' ) );
}, false );
