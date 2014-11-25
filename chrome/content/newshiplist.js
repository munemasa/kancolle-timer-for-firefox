/**
 * Created by amano on 14/11/18.
 */

Components.utils.import( "resource://kancolletimermodules/httpobserve.jsm" );

const TYPE_ITEM = 1;
const TYPE_FOLDER = 2;

var gShipCategoryData = [
    new ShipCategoryListItem( "fleet", TYPE_FOLDER, "艦隊別", "root", true, true ),
    new ShipCategoryListItem( "fleet-1", TYPE_ITEM, "第1艦隊", "fleet", true, true ),
    new ShipCategoryListItem( "fleet-2", TYPE_ITEM, "第2艦隊", "fleet", true, true ),
    new ShipCategoryListItem( "fleet-3", TYPE_ITEM, "第3艦隊", "fleet", true, true ),
    new ShipCategoryListItem( "fleet-4", TYPE_ITEM, "第4艦隊", "fleet", true, true ),
    new ShipCategoryListItem( "kind", TYPE_FOLDER, "艦種別", "root", true, true ),
    new ShipCategoryListItem( "kind-all", TYPE_ITEM, "全て", "kind", true, true ),
    // 7
    new ShipCategoryListItem( "ud", TYPE_FOLDER, "ユーザー定義", "root", true, true )
];


function ShipCategoryListItem( aId, aType, aName, aParent, aOpen, aLocked ){
    this.id = aId;
    this.type = aType;
    this.name = aName;
    this.parentId = aParent;
    this.isOpened = aOpen;
    this.isLocked = aLocked;

    this.empty = null;
    this.level = null;
}

function ShipCategoryTreeView( data ){
    this._data = data;
}

ShipCategoryTreeView.prototype = {
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
	let str = this._visibleData[row].name;
	if( this._visibleData[row].isLocked ) str += "*";
	return str;
    },
    setCellText: function( row, col, value ){

	let n = 2;
	let newvalue = value;
	while( 1 ){
	    let i;
	    for( i = 0; i < this._data.length; i++ ){
		if( newvalue == this._data[i].name ){
		    newvalue = value + "(" + n + ")";
		    n++;
		}
	    }
	    if( i == this._data.length ) break;
	}

	let old_id = this._visibleData[row].id;
	let new_id = "ud-" + newvalue;

	this._visibleData[row].id = "ud-" + newvalue;
	this._visibleData[row].name = newvalue;
	this.treebox.invalidate();

	// 名前変えたときに新しい名前で現状のデータで上書きのため、
	// 不要なファイルが残ってしまうのは置いておいて、
	// 古いファイルは残したままでとりあえず問題なし
	console.log( old_id + " -> " + new_id );
	let list = Storage.readObject( "ship-group-" + old_id, [] );
	Storage.writeObject( "ship-group-" + new_id, list );

	NewShipList.saveGroup();
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
    getRowProperties: function( idx, prop ){
    },
    getCellProperties: function( idx, column, prop ){
    },
    getColumnProperties: function( column, element, prop ){
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
	return !this._visibleData[idx].isLocked && !this.isSeparator( idx );
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
	//console.log( "canDrop(" + targetIndex + ", " + orientation + ")" );
	// Components.interfaces.nsITreeView.DROP_BEFORE -1
	// Components.interfaces.nsITreeView.DROP_ON  0
	// Components.interfaces.nsITreeView.DROP_AFTER 1
	if( !this._visibleData[targetIndex].id.match( /^ud-/ ) ) return false;
	if( !dataTransfer.types.contains( "text/x-kt-ship-list" ) )
	    return false;

	return true;
    },
    drop: function( targetIndex, orientation, dataTransfer ){
	if( !this.canDrop( targetIndex, orientation, dataTransfer ) )
	    return;

	let target_id = this._visibleData[targetIndex].id;
	let data = dataTransfer.mozGetDataAt( "text/x-kt-ship-list", 0 );

	let list = Storage.readObject( "ship-group-" + target_id, [] );
	list = list.concat( JSON.parse( data ) );
	Storage.writeObject( "ship-group-" + target_id, list );
    },

    updateData: function( data ){
	let n = this.rowCount;

	this._data = data;
	this._buildVisibleData();
	this.treebox.rowCountChanged( this.rowCount, this.rowCount - n );
	this.treebox.invalidate();
    }

};

function ShipListTreeView( data ){
    this._data = data;
}

ShipListTreeView.prototype = {
    _visibleData: [],
    _currentData: [],
    _filterType: "",
    _filterEquip: "",

    /**
     * @param type フィルタリングしたい艦種名。無指定(false)の場合は全て。
     */
    filterByType: function( type ){
	this._filterType = type;
	if( this._filterEquip ){
	    this.filterByEquipment( this._filterEquip );
	    return;
	}
	let ships = type ? this._data.filter( function( d ){
	    return KanColleData.type_name[d._spec.api_stype] == type;
	} ) : this._data;
	let n = this.rowCount;
	this._buildVisibleData( ships );
	this.treebox.rowCountChanged( this.rowCount, this.rowCount - n );
	this.treebox.invalidate();
	this.selection.clearSelection();
    },

    /**
     * 装備アイテムでフィルタリング。
     * @param equip
     */
    filterByEquipment: function( equip ){
	this._filterEquip = equip;
	if( this._filterType == "/fleet" ) return;

	let typename = this._filterType;
	let ships = this._filterType ? this._data.filter( function( d ){
	    return KanColleData.type_name[d._spec.api_stype] == typename;
	} ) : this._data;

	let n = this.rowCount;

	this._buildVisibleData( ships );
	this._visibleData = this._visibleData.filter( function( d ){
	    for( let tmp of d ){
		if( "string" == typeof tmp ){
		    if( tmp.indexOf( equip ) == 0 ) return true;
		}
	    }
	    return false;
	} );
	let no = 1;
	for( let o of this._visibleData ){
	    o[0] = no++;
	}

	this.treebox.rowCountChanged( this.rowCount, this.rowCount - n );
	this.treebox.invalidate();
	this.selection.clearSelection();
    },

    /**
     * 表示物の並べ替え
     * @param type
     */
    sort: function( type ){
	this._visibleData.sort( function( a, b ){
	    var tmpa = 0;
	    var tmpb = 0;
	    var order = -1; // descending order
	    a = a[-1];
	    b = b[-1];
	    switch( type ){
	    case 0: // 艦種
		tmpa = a._spec.api_stype;
		tmpb = b._spec.api_stype;
		if( tmpa == tmpb ){
		    tmpa = b._spec.api_sortno;
		    tmpb = a._spec.api_sortno;
		}
		break;
	    case 1: // レベル
		tmpa = a.api_lv;
		tmpb = b.api_lv;
		if( tmpa == tmpb ){
		    tmpa = b._spec.api_sortno;
		    tmpb = a._spec.api_sortno;
		}
		break;
	    case 2: // 状態
		tmpa = a.api_cond;
		tmpb = b.api_cond;
		break;
	    case 3: // 入渠時間
		tmpa = a.api_ndock_time;
		tmpb = b.api_ndock_time;
		break;
	    }
	    return (tmpa - tmpb) * order;
	} );
	let n = 1;
	for( let o of this._visibleData ){
	    o[0] = n++;
	}
	this.treebox.invalidate();
	this.selection.clearSelection();
    },

    _resetSortDirection: function(){
	for( let e of $( 'newshiplist-tree' ).getElementsByTagName( 'treecol' ) ){
	    e.setAttribute( 'sortDirection', 'natural' );
	}

    },

    setShipList: function( data ){
	// 艦隊の艦娘リストの場合に装備アイテムフィルタリングしないようにするためのキーワード
	this._filterType = "/fleet";

	let n = this.rowCount;
	this._buildVisibleData( data );
	this.treebox.rowCountChanged( this.rowCount, this.rowCount - n );
	this.treebox.invalidate();
	this.selection.clearSelection();
    },

    updateVisibleData: function(){
	let no = 1;
	for( let i = 0; i < this._visibleData.length; i++ ){
	    let item = this._visibleData[i];
	    let ship_id = item[-1].api_id;

	    let ship = KanColleDatabase.ship.get( ship_id );
	    let spec = FindShipData( ship.api_id );
	    let fleet_no = ShipList.getFleetNo( ship.api_id );
	    ship._spec = spec;
	    ship._equips = new Array();
	    ship._fleet_no = fleet_no;
	    for( let i in ship.api_slot ){
		let slot_id = ship.api_slot[i];
		if( slot_id == -1 ) continue;
		let item = KanColleDatabase.slotitem.get( slot_id );
		if( item ){
		    let masterdata = KanColleDatabase.masterSlotitem.get( item.api_slotitem_id );
		    ship._equips.push( masterdata.api_name + (item.api_level > 0 ? "+" + item.api_level : "") );
		}
	    }

	    let row = new Array();
	    row.push( no );
	    fleet_no = ShipList.getFleetNo( ship.api_id );
	    row.push( KanColleData.type_name[ship._spec.api_stype] + (fleet_no ? "(" + fleet_no + ")" : "") );
	    row.push( ship._spec.api_name );
	    row.push( ship.api_lv );
	    row.push( ship.api_cond );
	    row.push( ship.api_ndock_time ? GetTimeString( parseInt( ship.api_ndock_time / 1000 ) ) : "---" );
	    row.push( ship.api_sakuteki[0] );
	    row.push( ship.api_exp[2] + "%" );
	    let n = d3.sum( ship.api_onslot );
	    if( n ){
	    }else{
		n = "--";
	    }
	    row.push( n );
	    for( let i in ship.api_slot ){
		if( ship.api_slot[i] < 0 ) continue;
		let item = KanColleDatabase.slotitem.get( ship.api_slot[i] );
		if( item ){
		    let masterdata = KanColleDatabase.masterSlotitem.get( item.api_slotitem_id );
		    row.push( masterdata.api_name + (item.api_level > 0 ? "★+" + item.api_level : "") );
		}
	    }

	    row[-1] = ship;
	    this._visibleData[i] = row;
	    no++;
	}
	this.treebox.invalidate();
    },

    _buildVisibleData: function( data ){
	this._visibleData = [];
	let no = 1;
	for( let ship of data ){
	    let row = new Array();
	    row.push( no );
	    let fleet_no = ShipList.getFleetNo( ship.api_id );
	    row.push( KanColleData.type_name[ship._spec.api_stype] + (fleet_no ? "(" + fleet_no + ")" : "") );
	    row.push( ship._spec.api_name );
	    row.push( ship.api_lv );
	    row.push( ship.api_cond );
	    row.push( ship.api_ndock_time ? GetTimeString( parseInt( ship.api_ndock_time / 1000 ) ) : "---" );
	    row.push( ship.api_sakuteki[0] );
	    row.push( ship.api_exp[2] + "%" );
	    let n = d3.sum( ship.api_onslot );
	    if( n ){
	    }else{
		n = "--";
	    }
	    row.push( n );
	    for( let i in ship.api_slot ){
		if( ship.api_slot[i] < 0 ) continue;
		let item = KanColleDatabase.slotitem.get( ship.api_slot[i] );
		if( item ){
		    let masterdata = KanColleDatabase.masterSlotitem.get( item.api_slotitem_id );
		    row.push( masterdata.api_name + (item.api_level > 0 ? "★+" + item.api_level : "") );
		}
	    }

	    row[-1] = ship;
	    this._visibleData.push( row );
	    no++;
	}
    },
    get rowCount(){
	return this._visibleData.length;
    },
    getCellText: function( row, column ){
	let str = this._visibleData[row][column.index];
	return str;
    },
    setCellText: function( row, col, value ){
    },
    setTree: function( treebox ){
	this.treebox = treebox;
	this._buildVisibleData( this._data );
    },
    isContainer: function( row ){
	return false;
    },
    isContainerOpen: function( index ){
	return true;
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
	return 0;
    },
    getRowProperties: function( idx, prop ){
	let str = "";
	// 10行ごとの区切り
	let tmp = idx != 0 && (idx % 10) == 0 ? "dash-separator " : "";
	str += tmp;

	// ハイコンディション
	if( this._visibleData[idx][4] > 49 ){
	    str += "high-condition ";
	}

	// 小破・中破・大破
	let ship = this._visibleData[idx][-1];
	let p = 1.0 * ship.api_nowhp / ship.api_maxhp;
	if( p <= 0.25 ){
	    str += "large-damage ";
	}else if( p <= 0.50 ){
	    str += "mid-damage ";
	}else if( p <= 0.75 ){
	    str += "small-damage ";
	}

	return str;
    },
    getCellProperties: function( idx, column, prop ){
	let str = "";
	if( column.index == 1 || column.index == 2 ){
	    let ship = this._visibleData[idx][-1];
	    let p = 1.0 * ship.api_nowhp / ship.api_maxhp;
	    if( p <= 0.25 ){
		str += "large-damage ";
	    }else if( p <= 0.50 ){
		str += "mid-damage ";
	    }else if( p <= 0.75 ){
		str += "small-damage ";
	    }
	}
	if( column.index == 2 ){
	    let ship = this._visibleData[idx][-1];
	    str += "sally" + ship.api_sally_area + " ";
	}
	return str;
    },
    getColumnProperties: function( column, element, prop ){
    },

    getParentIndex: function( idx ){
	return -1;
    },
    toggleOpenState: function( idx ){
    },
    isEditable: function( idx, column ){
	return false;
    },
    __hasNextSibling: function( idx, after ){
	return false;
    },

    getImageSrc: function( idx, column ){
	if( column.index != 2 ) return;
	let ship = this._visibleData[idx][-1];
	return ShipList.isRepairing( ship.api_id ) ? "chrome://kancolletimer/content/data/cross.png" : "";
    },
    getProgressMode: function( idx, column ){
    },
    getCellValue: function( idx, column ){
    },
    cycleHeader: function( col, elem ){
	var sortDir = col.element.getAttribute( "sortDirection" );
	switch( sortDir ){
	case "ascending":
	    sortDir = "descending";
	    break;
	case "descending":
	    sortDir = "natural";
	    break;
	default:
	    sortDir = "descending";
	    break;
	}

	let flag = [0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0];
	if( !flag[col.index] ) return;

	if( sortDir != "natural" ){
	    switch( col.index ){
	    case 1: // 艦種
		this.sort( 0 );
		break;
	    case 3: // Level
		this.sort( 1 );
		break;
	    case 4: // condition
		this.sort( 2 );
		break;
	    case 5: // repair time
		this.sort( 3 );
		break;
	    }
	    this._resetSortDirection();
	    col.element.setAttribute( "sortDirection", sortDir );
	}else{
	    this.sort( 0 );
	    col.element.setAttribute( "sortDirection", 'natural' );
	}

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
	//console.log( "canDrop(" + targetIndex + ", " + orientation + ")" );
	// Components.interfaces.nsITreeView.DROP_BEFORE -1
	// Components.interfaces.nsITreeView.DROP_ON  0
	// Components.interfaces.nsITreeView.DROP_AFTER 1
	if( !dataTransfer.types.contains( "text/x-kt-ship-list" ) )
	    return false;

	let data = dataTransfer.mozGetDataAt( "text/x-kt-ship-list", 0 );
	let tmp = JSON.parse( data );
	if( tmp.length > 1 ) return false;

	let n = $( 'ship-category-tree' ).currentIndex;
	let current_category = NewShipList.shipCategoryTreeView._visibleData[n].id;
	if( !current_category.match( /^ud-/ ) ) return false;

	return true;
    },
    drop: function( targetIndex, orientation, dataTransfer ){
	if( !this.canDrop( targetIndex, orientation, dataTransfer ) )
	    return;

	let data = dataTransfer.mozGetDataAt( "text/x-kt-ship-list", 0 );
	let source_ship_id = JSON.parse( data )[0];

	let i;
	for( i = 0; i < this._visibleData.length; i++ ){
	    let ship = this._visibleData[i][-1];
	    let id = ship.api_id;
	    if( id == source_ship_id ) break;
	}

	let removedItems = this._visibleData.splice( i, 1 );
	this._visibleData.splice( targetIndex, 0, removedItems[0] );
	this.treebox.invalidate();

	let newlist = new Array();
	for( let item of this._visibleData ){
	    newlist.push( item[-1].api_id );
	}

	let n = $( 'ship-category-tree' ).currentIndex;
	let current_category = NewShipList.shipCategoryTreeView._visibleData[n].id;
	Storage.writeObject( "ship-group-" + current_category, newlist );
    }

}
;


var NewShipList = {
    shipCategoryTreeView: null,

    handleDragStart: function( event ){
	// ignore when dragging scrollbar
	if( event.target.localName != "treechildren" )
	    return;
	let selection = this.shipListTreeView.selection;

	if( selection.count < 1 )
	    return;

	let list = new Array();
	for( let i = 0; i < this.shipListTreeView._visibleData.length; i++ ){
	    if( selection.isSelected( i ) ){
		let ship = this.shipListTreeView._visibleData[i][-1];
		list.push( ship.api_id );
	    }
	}

	event.dataTransfer.setData( "text/x-kt-ship-list", JSON.stringify( list ) );
	event.dataTransfer.dropEffect = "copy";
    },

    // ツリービューを選択したときの処理
    onselect: function( idx ){
	let data = this.shipCategoryTreeView._visibleData[idx];
	if( !data ) return;

	switch( data.id ){
	case "fleet-1":
	case "fleet-2":
	case "fleet-3":
	case "fleet-4":
	    data.id.match( /fleet-(\d)/ );
	    let n = parseInt( RegExp.$1 );
	    this.showFleetOrganization( n );
	    this.shipListTreeView._resetSortDirection();
	    break;

	case "kind-all":
	    this.shipListTreeView.filterByType();
	    this.shipListTreeView._resetSortDirection();
	    break;

	default:
	    if( data.id.match( /kind-(\d+)/ ) ){
		// 艦種別表示
		let n = parseInt( RegExp.$1 );
		let target_type = KanColleData.type_name[n];
		this.shipListTreeView.filterByType( target_type );
		this.shipListTreeView._resetSortDirection();
		break;
	    }
	    if( data.id.match( /^ud-/ ) ){
		// ユーザー定義グループ
		this.showUserDefinedGroupShip( data.id );
	    }
	    break;
	}
    },

    // 艦娘リストを選択したとき
    onShipListSelected: function( n ){
	if( this.shipListTreeView.selection.count == 0 ) return;
	let ship = this.shipListTreeView._visibleData[n][-1];

	$( 'api_stype' ).value = KanColleData.type_name[ ship._spec.api_stype ];
	$( 'api_name' ).value = ship._spec.api_name;
	$( 'api_lv' ).value = "Lv " + ship.api_lv;
	$( 'api_maxhp' ).value = ship.api_maxhp;
	$( 'api_soukou' ).value = ship.api_soukou[0];
	$( 'api_kaihi' ).value = ship.api_kaihi[0];
	$( 'api_onslot' ).value = d3.sum( ship.api_onslot );
	$( 'api_soku' ).value = ship._spec.api_soku < 10 ? "低速" : "高速";
	$( 'api_leng' ).value = ["", "短", "中", "長", "超長"][ship.api_leng];
	$( 'api_karyoku' ).value = ship.api_karyoku[0];
	$( 'api_raisou' ).value = ship.api_raisou[0];
	$( 'api_taiku' ).value = ship.api_taiku[0];
	$( 'api_taisen' ).value = ship.api_taisen[0];
	$( 'api_sakuteki' ).value = ship.api_sakuteki[0];
	$( 'api_lucky' ).value = ship.api_lucky[0];

	for( let i = 0; i < 4; i++ ){
	    let slot_id = ship.api_slot[i];
	    if( ship.api_onslot[i] ){
		$( 'api_onslot' + i ).value = '搭載機数(' + ship.api_onslot[i] + ')';
	    }else{
		$( 'api_onslot' + i ).value = '';
	    }
	    if( slot_id == -1 ){
		$( 'api_slot' + i ).value = "";
		$( 'api_slot' + i ).removeAttribute( 'style' );
		continue;
	    }
	    let item = KanColleDatabase.slotitem.get( slot_id );
	    if( item ){
		let masterdata = KanColleDatabase.masterSlotitem.get( item.api_slotitem_id );
		let str = masterdata.api_name
		    + (item.api_level > 0 ? "+" + item.api_level : "");
		$( 'api_slot' + i ).value = str;

		let color = ShipList.getEquipmentColor( masterdata );
		str = "border-left:" + color + " 8px solid; padding-left: 4px;";
		$( 'api_slot' + i ).setAttribute( 'style', str );
	    }
	}
    },

    saveCvs: function(){
	let txt = "";

	for( let s of this.shipListTreeView._visibleData ){
	    let ship = s[-1];

	    let row = new Array();
	    row.push( KanColleData.type_name[ship._spec.api_stype] );
	    row.push( ship._spec.api_name );
	    row.push( ship.api_lv );
	    for( let i in ship.api_slot ){
		if( ship.api_slot[i] < 0 ) continue;
		let item = KanColleDatabase.slotitem.get( ship.api_slot[i] );
		if( item ){
		    let masterdata = KanColleDatabase.masterSlotitem.get( item.api_slotitem_id );
		    row.push( masterdata.api_name + (item.api_level > 0 ? "★+" + item.api_level : "") );
		}
	    }

	    txt += row.join( '\t' );

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

    showUserDefinedGroupShip: function( id ){
	let list = Storage.readObject( "ship-group-" + id, [] );
	let ships = list.map( function( k ){
	    return KanColleDatabase.ship.get( k );
	} );

	for( let ship of ships ){
	    let spec = FindShipData( ship.api_id );
	    let fleet_no = ShipList.getFleetNo( ship.api_id );
	    ship._spec = spec;
	    ship._equips = new Array();
	    ship._fleet_no = fleet_no;
	    for( let i in ship.api_slot ){
		let slot_id = ship.api_slot[i];
		if( slot_id == -1 ) continue;
		let item = KanColleDatabase.slotitem.get( slot_id );
		if( item ){
		    let masterdata = KanColleDatabase.masterSlotitem.get( item.api_slotitem_id );
		    ship._equips.push( masterdata.api_name + (item.api_level > 0 ? "+" + item.api_level : "") );
		}
	    }
	}
	this.shipListTreeView.setShipList( ships );
	this.shipListTreeView._resetSortDirection();
    },

    /**
     * 艦隊編成のリストを作成する
     */
    showFleetOrganization: function( n ){
	// 艦隊編成
	let fleet = KanColleDatabase.deck.get( n );
	let no = 1;
	let sakuteki = 0;

	let ships = new Array();

	for( let i = 0; fleet.api_ship[i] != -1 && i < 6; i++ ){
	    let data = FindOwnShipData( fleet.api_ship[i] );
	    let masterdata = FindShipData( fleet.api_ship[i] );
	    data._spec = masterdata;

	    sakuteki += data.api_sakuteki[0];
	    ships.push( data );
	}
	this.shipListTreeView.setShipList( ships );
    },

    filterByEquipment: function( equip ){
	this.shipListTreeView.filterByEquipment( equip );
    },

    /**
     * 艦娘リスト（配列）をソート
     * @param ships 艦娘配列
     * @param type ソート種別
     */
    sort: function( ships, type ){
	ships.sort( function( a, b ){
	    var tmpa = 0;
	    var tmpb = 0;
	    var order = -1;
	    switch( type ){
	    case 0: // 艦種
		tmpa = a._spec.api_stype;
		tmpb = b._spec.api_stype;
		if( tmpa == tmpb ){
		    tmpa = b._spec.api_sortno;
		    tmpb = a._spec.api_sortno;
		}
		break;
	    case 1: // レベル
		tmpa = a.api_lv;
		tmpb = b.api_lv;
		if( tmpa == tmpb ){
		    tmpa = b._spec.api_sortno;
		    tmpb = a._spec.api_sortno;
		}
		break;
	    case 2: // 状態
		tmpa = a.api_cond;
		tmpb = b.api_cond;
		break;
	    case 3: // 入渠時間
		tmpa = a.api_ndock_time;
		tmpb = b.api_ndock_time;
		break;
	    }
	    return (tmpa - tmpb) * order;
	} );
    },

    createShipArray: function(){
	// 艦艇リスト
	let ships = KanColleDatabase.ship.list().map( function( k ){
	    return KanColleDatabase.ship.get( k );
	} );

	for( let ship of ships ){
	    let spec = FindShipData( ship.api_id );
	    let fleet_no = ShipList.getFleetNo( ship.api_id );
	    ship._spec = spec;
	    ship._equips = new Array();
	    ship._fleet_no = fleet_no;
	    for( let i in ship.api_slot ){
		let slot_id = ship.api_slot[i];
		if( slot_id == -1 ) continue;
		let item = KanColleDatabase.slotitem.get( slot_id );
		if( item ){
		    let masterdata = KanColleDatabase.masterSlotitem.get( item.api_slotitem_id );
		    ship._equips.push( masterdata.api_name + (item.api_level > 0 ? "+" + item.api_level : "") );
		}
	    }
	}

	this.sort( ships, 0 );// 艦種ソート
	return ships;
    },


    findGroup: function( id ){
	for( let i = 0; i < gShipCategoryData.length; i++ ){
	    let item = gShipCategoryData[i];
	    if( item.id == id ) return i;
	}
	return -1;
    },
    createGroup: function(){
	let elem = $( 'ship-category-tree' );
	let n = elem.currentIndex;

	let name = InputPrompt( "グループ名を入力してください", "新規グループ作成" );
	if( !name ) return;

	let no = 2;
	let newvalue = name;
	while( 1 ){
	    let i;
	    for( i = 0; i < gShipCategoryData.length; i++ ){
		if( newvalue == gShipCategoryData[i].name ){
		    newvalue = name + "(" + no + ")";
		    no++;
		}
	    }
	    if( i == gShipCategoryData.length ) break;
	}

	let newitem = new ShipCategoryListItem( "ud-" + newvalue, TYPE_ITEM, newvalue, "ud", true, false );

	let target_id = this.shipCategoryTreeView._visibleData[n].id;
	if( target_id == 'ud' ){
	    gShipCategoryData.push( newitem );
	}else{
	    let targetIndex = this.findGroup( target_id );
	    gShipCategoryData.splice( targetIndex + 1, 0, newitem );
	}

	this.shipCategoryTreeView.updateData( gShipCategoryData );

	this.saveGroup();
    },

    deleteGroup: function(){
	let elem = $( 'ship-category-tree' );
	let n = elem.currentIndex;
	if( this.shipCategoryTreeView._visibleData[n].id == 'ud' ) return;

	let deleteTarget = this.findGroup( this.shipCategoryTreeView._visibleData[n].id );
	gShipCategoryData.splice( deleteTarget, 1 );
	this.shipCategoryTreeView.updateData( gShipCategoryData );

	this.saveGroup();
    },

    deleteShip: function(){
	let selection = this.shipListTreeView.selection;
	if( selection.count < 1 )
	    return;

	let n = $( 'ship-category-tree' ).currentIndex;
	let group_id = this.shipCategoryTreeView._visibleData[n].id;

	let key = "ship-group-" + group_id;
	let list = Storage.readObject( key, [] );

	for( let i = 0; i < this.shipListTreeView._visibleData.length; i++ ){
	    if( selection.isSelected( i ) ){
		let ship = this.shipListTreeView._visibleData[i][-1];
		let id = ship.api_id;

		list = list.filter( function( d ){
		    return d !== id;
		} );
	    }
	}

	Storage.writeObject( key, list );
	this.showUserDefinedGroupShip( group_id );
    },

    onpopupshowing: function(){
	// ユーザー定義カテゴリの時のみメニューを開く
	let elem = $( 'ship-category-tree' );
	let n = elem.currentIndex;
	if( this.shipCategoryTreeView._visibleData[n].id.match( /^ud/ ) ){
	    return true;
	}
	return false;
    },

    onpopupshowingSaveCvs: function(){
	let n = $( 'ship-category-tree' ).currentIndex;
	if( n != -1 && this.shipCategoryTreeView._visibleData[n].id.match( /^ud-/ ) ){
	    $( 'ship-delete-menu' ).hidden = false;
	    $( 'ship-delete-menu' ).nextSibling.hidden = false;
	}else{
	    $( 'ship-delete-menu' ).hidden = true;
	    $( 'ship-delete-menu' ).nextSibling.hidden = true;
	}
    },

    saveGroup: function(){
	let data = gShipCategoryData.filter( function( d ){
	    if( d.id.match( /^kind-\d+/ ) ) return false;
	    return true;
	} );
	console.log( data );

	Storage.writeObject( "ship-group-category", data );
    },

    loadGroup: function(){
	let data = Storage.readObject( "ship-group-category", null );
	if( !data ) return;
	gShipCategoryData = data;
    },

    refreshShipList: function(){
	this.allships = this.createShipArray();
	console.log( this.allships );

	// 艦種別メニュー項目を作成
	let tmp = new Object();
	this.allships.forEach( function( d ){
	    let data = FindShipData( d.api_id );
	    // 艦これでは戦艦と高速戦艦（金剛型）の表示上の区別がないので
	    // 高速戦艦(9)の分はスキップする
	    if( data.api_stype != 9 ) tmp[ data.api_stype ] = 1;
	} );

	let newlist = gShipCategoryData.filter( function( d ){
	    return !d.id.match( /^kind-\d+/ );
	} );

	d3.map( tmp ).keys()
	    .sort( function( a, b ){
		       return a - b;
		   } )
	    .forEach( function( d ){
			  let name = KanColleData.type_name[d];
			  let cat = new ShipCategoryListItem( "kind-" + d, TYPE_ITEM, name, "kind", true, true );
			  newlist.splice( 7, 0, cat );
		      } );
	if( this.shipCategoryTreeView ){
	    this.shipCategoryTreeView.updateData( newlist );
	    this.shipListTreeView.updateVisibleData();
	}else{
	    gShipCategoryData = newlist;
	}
    },

    init: function(){
	this.loadGroup();

	this.refreshShipList();

	$( "tab-newshiplist" ).setAttribute( "label", "艦娘一覧(" + this.allships.length + ")" );

	this.shipCategoryTreeView = new ShipCategoryTreeView( gShipCategoryData );
	$( "ship-category-tree" ).view = this.shipCategoryTreeView;

	this.shipListTreeView = new ShipListTreeView( this.allships );
	$( "newshiplist-tree" ).view = this.shipListTreeView;


	// 装備アイテムメニュー
	tmp = new Object();
	ShipList.allequipments.forEach( function( d ){
	    tmp[ d.api_name ] = d;
	} );
	d3.map( tmp ).keys().forEach( function( d ){
	    let menuitem = CreateMenuItem( d, d );
	    let color = ShipList.getEquipmentColor( tmp[ d ] );
	    menuitem.appendChild( CreateLabel( d, d ) );
	    menuitem.setAttribute( "style", "border-left: " + color + " 16px solid;" );
	    $( 'newshiplist-menu-equipment' ).appendChild( menuitem );
	} );

    },

    destroy: function(){
	this.saveGroup();
    }
};


window.addEventListener( "load", function( e ){
    NewShipList.init();
}, false );

window.addEventListener( "unload", function( e ){
    NewShipList.destroy();
}, false );
