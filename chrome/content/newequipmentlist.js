var NewEquipmentList = {
    allequipments: [],

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
	console.log( this.allequipments );
    },
    destroy: function(){

    }
};


window.addEventListener( "load", function( e ){
    NewEquipmentList.init();
}, false );

window.addEventListener( "unload", function( e ){
    NewEquipmentList.destroy();
}, false );
