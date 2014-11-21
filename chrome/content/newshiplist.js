/**
 * Created by amano on 14/11/18.
 */

Components.utils.import( "resource://kancolletimermodules/httpobserve.jsm" );

const TYPE_ITEM = 1;
const TYPE_FOLDER = 2;
const TYPE_SEPARATOR = 3;

var gShipTreeView;


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

var gShipCategoryData = [
    new ShipCategoryListItem( "fleet", TYPE_FOLDER, "艦隊別", "root", true, true ),
    new ShipCategoryListItem( "fleet-1", TYPE_ITEM, "第1艦隊", "fleet", true, true ),
    new ShipCategoryListItem( "fleet-2", TYPE_ITEM, "第2艦隊", "fleet", true, true ),
    new ShipCategoryListItem( "fleet-3", TYPE_ITEM, "第3艦隊", "fleet", true, true ),
    new ShipCategoryListItem( "fleet-4", TYPE_ITEM, "第4艦隊", "fleet", true, true ),
    new ShipCategoryListItem( "kind", TYPE_FOLDER, "艦種別", "root", true, true ),
    new ShipCategoryListItem( "kind-all", TYPE_ITEM, "全て", "kind", true, true ),
    // 7
    new ShipCategoryListItem( "userdefined", TYPE_FOLDER, "ユーザー定義", "root", true, true )
];

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
	this._data[row].name = value;
	this.treebox.invalidate();
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
	console.log( "canDrop(" + targetIndex + ", " + orientation + ")" );
	return false;
	if( !dataTransfer.types.contains( "text/x-moz-tree-index" ) )
	    return false;
	if( this.selection.count != 1 )
	    return false;
	var sourceIndex = this.selection.currentIndex;
	if( sourceIndex == -1 )
	    return false;
	if( sourceIndex == targetIndex )
	    return false;
	if( sourceIndex == (targetIndex + orientation) )
	    return false;

	return false;
    },
    drop: function( targetIndex, orientation, dataTransfer ){
	if( !this.canDrop( targetIndex, orientation, dataTransfer ) )
	    return;
	var sourceIndex = this.selection.currentIndex;
	if( sourceIndex < targetIndex ){
	    if( orientation == Components.interfaces.nsITreeView.DROP_BEFORE )
		targetIndex--;
	}
	else{
	    if( orientation == Components.interfaces.nsITreeView.DROP_AFTER )
		targetIndex++;
	}
	this.moveItem( sourceIndex, targetIndex );
    },
    moveItem: function( aSourceIndex, aTargetIndex ){
	if( aTargetIndex < 0 || aTargetIndex > this.rowCount - 1 )
	    return;

	let src_id = this._visibleData[aSourceIndex].id;
	let srcidx;
	for( srcidx = 0; srcidx < this._data.length; srcidx++ ){
	    if( this._data[srcidx].id == src_id ) break;
	}
	let removedItems = this._data.splice( srcidx, 1 );

	let dst_id = this._visibleData[aTargetIndex].id;
	let dstidx;
	for( dstidx = 0; dstidx < this._data.length; dstidx++ ){
	    if( this._data[dstidx].id == dst_id ) break;
	}

	if( this._visibleData[aTargetIndex].type == TYPE_FOLDER ){
	    removedItems[0].parentId = this._visibleData[aTargetIndex].id;
	}else{
	    removedItems[0].parentId = this._visibleData[aTargetIndex].parentId;
	}
	this._data.splice( dstidx, 0, removedItems[0] );
	this._buildVisibleData();

	this.treebox.invalidate();
	// select moved item again
	this.selection.clearSelection();
	this.selection.select( aTargetIndex );
	this.treebox.ensureRowIsVisible( aTargetIndex );
	this.treebox.treeBody.parentNode.focus();
    }

};

function ShipListTreeView( data ){
    this._data = data;
}

ShipListTreeView.prototype = {
    _visibleData: [],

    /**
     * @param type フィルタリングしたい艦種名。無指定(false)の場合は全て。
     */
    filterByType: function( type ){
	let ships = type ? this._data.filter( function( d ){
	    return KanColleData.type_name[d._spec.api_stype] == type;
	} ) : this._data;
	let n = this.rowCount;
	this._buildVisibleData( ships );
	this.treebox.rowCountChanged( this.rowCount, this.rowCount - n );
	this.treebox.invalidate();
    },

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
    },

    _resetSortDirection: function(){
	for( let e of $( 'newshiplist-tree' ).getElementsByTagName( 'treecol' ) ){
	    e.setAttribute( 'sortDirection', 'natural' );
	}

    },
    setShipList: function( data ){
	let n = this.rowCount;
	this._buildVisibleData( data );
	this.treebox.rowCountChanged( this.rowCount, this.rowCount - n );
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
    }
}
;


var NewShipList = {
    shipCategoryTreeView: null,

    handleDragStart: function( event ){
	// ignore when dragging scrollbar
	if( event.target.localName != "treechildren" )
	    return;
	// disallow dragging multiple rows
	if( this.shipCategoryTreeView.selection.count != 1 )
	    return;
	// set current row index to transfer data
	var sourceIndex = this.shipCategoryTreeView.selection.currentIndex;
	event.dataTransfer.setData( "text/x-moz-tree-index", sourceIndex );
	event.dataTransfer.dropEffect = "move";
    },

    // ツリービューを選択したときの処理
    onselect: function( idx ){
	let data = this.shipCategoryTreeView._visibleData[idx];

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
	    }
	    break;
	}
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

    init: function(){
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
	d3.map( tmp ).keys()
	    .sort( function( a, b ){
		       return a - b;
		   } )
	    .forEach( function( d ){
			  let name = KanColleData.type_name[d];
			  let cat = new ShipCategoryListItem( "kind-" + d, TYPE_ITEM, name, "kind", true, true );
			  gShipCategoryData.splice( 7, 0, cat );
		      } );

	$( "tab-newshiplist" ).setAttribute( "label", "艦娘一覧(" + this.allships.length + ")" );

	this.shipCategoryTreeView = new ShipCategoryTreeView( gShipCategoryData );
	$( "ship-category-tree" ).view = this.shipCategoryTreeView;

	this.shipListTreeView = new ShipListTreeView( this.allships );
	$( "newshiplist-tree" ).view = this.shipListTreeView;
    }
};


window.addEventListener( "load", function( e ){
    NewShipList.init();
}, false );


