Components.utils.import( "resource://kancolletimermodules/httpobserve.jsm" );


const TYPE_ITEM = 1;
const TYPE_FOLDER = 2;

var gEquipmentTreeData = [
//    new EquipmentListItem( "all", TYPE_FOLDER, "全て", "root", false, true )
];

function EquipmentListItem( aId, aType, aName, aParent, aOpened, aLocked, aSpec, aOwner ){
    this.id = aId;
    this.type = aType;
    this.name = aName;
    this.parentId = aParent;
    this.isOpened = aOpened;
    this.isLocked = aLocked;

    this.spec = aSpec;
    this.owner = aOwner;

    this.empty = null;
    this.level = null;
}

function EquipmentTreeView( data ){
    this._data = data;
}


EquipmentTreeView.prototype = {
    _visibleData: [],

    _buildVisibleData: function(){
	this._visibleData = [];
	this._buildTree( "root", 0 );
    },
    _buildTree: function( parent, level ){
	let children = this._getChildren( parent );
	for( let i = 0; i < children.length; i++ ){
	    let c = children[i];
	    //console.log( c.name );
	    c.level = level;
	    this._visibleData.push( c );
	    if( c.isOpened && c.type == TYPE_FOLDER ){
		this._buildTree( c.id, level + 1 );
	    }
	}
    },
    _getChildren: function( parent ){
	let children = this._data.filter( function( d ){
	    return d.parentId == parent;
	} );
	return children;
    },

    get rowCount(){
	return this._visibleData.length;
    },
    getCellText: function( row, column ){
	switch( column.index ){
	case 0:
	    return this._visibleData[row].name;
	case 1:
	    return this._visibleData[row].owner;
	case 2:
	    return this._visibleData[row].spec;
	}
	return 'undefined';
    },
    setCellText: function( row, col, value ){
    },
    setTree: function( treebox ){
	this.treebox = treebox;
	this._buildVisibleData();
    },
    isContainer: function( row ){
	return this._visibleData[row].type == TYPE_FOLDER;
    },
    isContainerOpen: function( index ){
	return this._visibleData[index].isOpened;
    },
    isContainerEmpty: function( idx ){
	return false;
    },
    isSeparator: function( row ){
	return false;
    },
    isSorted: function(){
	return false;
    },
    getLevel: function( idx ){
	return this._visibleData[idx].level;
    },
    getRowProperties: function( idx ){
    },
    getCellProperties: function( idx, column ){
    },
    getColumnProperties: function( column ){
    },

    getParentIndex: function( idx ){
	if( this.isContainer( idx ) ) return -1;
	for( let t = idx - 1; t >= 0; t-- ){
	    if( this.isContainer( t ) ) return t;
	}
    },
    toggleOpenState: function( idx ){
	var lastRowCount = this.rowCount;
	// change |open| property
	this._visibleData[idx].isOpened = !this._visibleData[idx].isOpened;
	this._buildVisibleData();
	this.treebox.rowCountChanged( idx + 1, this.rowCount - lastRowCount );
	// need this to update the -/+ sign when called by pressing enter key
	this.treebox.invalidateRow( idx );
    },
    isEditable: function( idx, column ){
	return false;
    },
    hasNextSibling: function( idx, after ){
	var thisLevel = this.getLevel( idx );
	for( var t = after + 1; t < this._visibleData.length; t++ ){
	    var nextLevel = this.getLevel( t );
	    if( nextLevel == thisLevel ) return true;
	    if( nextLevel < thisLevel ) break;
	}
	return false;
    },

    getImageSrc: function( idx, column ){
	if( column.index == 0 ){
	    return this._visibleData[idx].icon;
	}
    },
    getProgressMode: function( idx, column ){
    },
    getCellValue: function( idx, column ){
    },
    cycleHeader: function( col, elem ){
    },
    selectionChanged: function(){
    },
    cycleCell: function( idx, column ){
    },
    performAction: function( action ){
    },
    performActionOnRow: function( action, row ){
    },
    performActionOnCell: function( action, row, col ){
    },

    canDrop: function( targetIndex, orientation, dataTransfer ){
	return false;
    },
    drop: function( targetIndex, orientation, dataTransfer ){
    },

    updateData: function( data ){
	let n = this.rowCount;

	this._data = data;
	this._buildVisibleData();
	this.treebox.rowCountChanged( this.rowCount, this.rowCount - n );
	this.treebox.invalidate();
    }

};


var EquipmentList = {
    allequipments: [],
    equipment_owner: null, // 装備品のオーナー艦娘

    parameter_name: {
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
    },

    updateOwnerShip: function(){
	this.allequipments.forEach( function( elem ){
	    elem._owner_ship = null;
	    elem._owner_ship_name = '';
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
		    ship["_page_no"] = 1 + parseInt( j / 10 );
		    item._owner_ship = ship;
		    item._owner_ship_name = data.api_name;
		}
	    }
	    if( ship.api_slot_ex && ship.api_slot_ex > 0 ){
		let item = KanColleDatabase.slotitem.get( ship.api_slot_ex );
		if( item ){
		    ship["_page_no"] = 1 + parseInt( j / 10 );
		    item._owner_ship = ship;
		    item._owner_ship_name = data.api_name;
		}
	    }
	}
    },

    popupEquipmentOwner: function( elem ){
	let equip = elem.getAttribute( 'equipment' );
	let listbox = $( 'owner-list-box' );
	ClearListBox( listbox );

	if( this.equipment_owner[equip].length == 0 ){
	    $( 'owner-equip-name' ).value = "装備している艦娘はいません";
	    $( 'owner-list' ).openPopup( elem, 'after_start', 0, 0 );
	    listbox.style.display = "none";
	    return;
	}

	let unique = this.equipment_owner[equip].filter( function( itm, i, a ){
	    return i == a.indexOf( itm );
	} );

	unique.sort( function( a, b ){
	    a = FindShipData( a.api_id );
	    b = FindShipData( b.api_id );

	    let tmpa = a.api_stype;
	    let tmpb = b.api_stype;
	    if( tmpa == tmpb ){
		tmpa = b.api_sortno;
		tmpb = a.api_sortno;
	    }
	    return tmpb - tmpa;
	} );

	listbox.style.display = "";
	$( 'owner-equip-name' ).value = equip;

	unique.forEach( function( ship ){
	    item = FindShipData( ship.api_id );
	    let listitem = CreateElement( 'listitem' );
	    listitem.appendChild( CreateListCell( ship._page_no || "" ) );
	    listitem.appendChild( CreateListCell( "Lv" + ship.api_lv ) );
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

	$( 'owner-list' ).openPopup( elem, 'after_start', 0, 0 );
    },

    createEquipmentList: function(){
	let count = new Object(); // 未装備数
	let _count_all = new Object(); // 所持総数
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

	    if( !_count_all[d.api_name] ) _count_all[d.api_name] = 0;
	    _count_all[d.api_name]++;
	} );
	this._count_all = _count_all;

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
		value.push( "総数 " + _count_all[d] );

		let name = EquipmentList.parameter_name;
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

    createIcon: function( color1, color2 ){
	let canvas = document.createElementNS( "http://www.w3.org/1999/xhtml", "canvas" );
	canvas.style.display = "inline";
	canvas.width = 18;
	canvas.height = 16;

	let ctx = canvas.getContext( "2d" );
	ctx.fillStyle = color1;
	ctx.fillRect( 0, 0, color2 ? 8 : 16, 16 );
	if( color2 ){
	    ctx.fillStyle = color2;
	    ctx.fillRect( 8, 0, 8, 16 );
	}
	return canvas.toDataURL();
    },

    buildEquipmentTree: function(){
	let current, icon;
	for( let item of this.allequipments ){
	    let id = 'id';
	    let name = item.api_name;
	    let type = TYPE_ITEM;
	    let parent = 'id' + item.api_sortno;
	    let opened = true;
	    let locked = true;
	    let owner;
	    if( item._owner_ship_name ){
		owner = item._owner_ship_name + ' (Lv' + item._owner_ship.api_lv + ')';
	    }else{
		owner = '---';
	    }

	    let value = new Array();
	    for( let k in item ){
		let v = GetSignedValue( item[k] );
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
		    if( v ) value.push( this.parameter_name[k] + v );
		    break;
		}
	    }
	    let spec = value.join( ' ' );
	    if( current != name ){
		let t = new EquipmentListItem( 'id' + item.api_sortno, TYPE_FOLDER, name + '(' + this._count_all[name] + ')', 'root', false, true, spec, '' );
		icon = this.createIcon( GetEquipmentColor( item ), GetEquipmentSubColor( item ) );
		t.icon = icon;
		gEquipmentTreeData.push( t );
		current = name;
	    }
	    spec = value.join( ' ' );

	    name += (item.api_level > 0 ? "★+" + item.api_level : "");
	    if( item.api_alv && item.api_alv > 0 ){
		let str = '';
		for( let i = 0; i < item.api_alv; i++ ){
		    str += '|';
		}
		name += ' ' + str;
	    }

	    let tmp = new EquipmentListItem( id, type, name, parent, opened, locked, spec, owner );
	    tmp.icon = icon;
	    gEquipmentTreeData.push( tmp );
	}

	this._equipmentTreeView = new EquipmentTreeView( gEquipmentTreeData );
	$( "equipment-tree" ).view = this._equipmentTreeView;
    },

    init: function(){
	this.initEquipmentList();
	this.updateOwnerShip();
	this.createEquipmentList();
	this.buildEquipmentTree();

	document.title += " " + new Date();

	// 未装備品リストを作成する
	let non_equipments = this.allequipments.filter( function( d ){
	    return !d._owner_ship;
	} );
	$( "tab-equipment" ).setAttribute( "label", "未装備品(" + non_equipments.length + ")" );
	$( "tab-all-equipment" ).setAttribute( "label", "全装備一覧(" + this.allequipments.length + ")" );
    }

};


window.addEventListener( "load", function( e ){
    EquipmentList.init();
    WindowOnTop( window, $( 'window-stay-on-top' ).hasAttribute( 'checked' ) );
}, false );
