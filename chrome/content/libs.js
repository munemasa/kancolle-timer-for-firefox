// vim: set ts=8 sw=4 sts=4 ff=dos :

Components.utils.import("resource://gre/modules/ctypes.jsm");
Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

/**
 * いろいろと便利関数などを.
 */
try{
    // Fx4.0
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
} catch (x) {
} 

const Cc = Components.classes;
const Ci = Components.interfaces;

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const HTML_NS= "http://www.w3.org/1999/xhtml";

/*
 * 艦娘/装備数
 */
function KanColleTimerBasicInformationPanel(){
    let timestamp = 0;
    let basic = KanColleDatabase.memberBasic.get();
    let record = KanColleDatabase.memberRecord.get();
    let maxships = '-';
    let maxslotitems = '-';
    let ships = '-';
    let slotitems = '-';
    let burner = '-';
    let bucket = '-';
    let shipnumfree = KanColleTimerConfig.getInt('display.ship-num-free');
    let ship_color = null;
    let slotitem_color = null;

    if (record) {
	timestamp = KanColleDatabase.memberRecord.timestamp();
	ships = record.api_ship[0];
	maxships = record.api_ship[1];
	slotitems = record.api_slotitem[0];
	maxslotitems = record.api_slotitem[1];
    }

    if (timestamp < KanColleDatabase.memberBasic.timestamp()) {
	maxships = basic.api_max_chara;
	maxslotitems = basic.api_max_slotitem;
    }

    if (timestamp < KanColleDatabase.memberShip2.timestamp()) {
	let count = KanColleDatabase.memberShip2.count();
	if (count !== undefined)
	    ships = count;
    }

    if (timestamp < KanColleDatabase.memberSlotitem.timestamp()) {
	let count = KanColleDatabase.memberSlotitem.count();
	if (count !== undefined)
	    slotitems = count;
    }

    if (ships != '-' && maxships != '-' && shipnumfree >= 0) {
	let ship_room = maxships - ships;
	if (ship_room <= 0) {
	    ship_color = 'red';
	} else if (ship_room <= shipnumfree) {
	    ship_color = 'orange';
	} else {
	    ship_color = 'black';
	}
    }

    if (slotitems != '-' && maxslotitems != '-' && shipnumfree >= 0) {
	let slotitem_room = maxslotitems - slotitems;
	if (slotitem_room <= 0) {
	    slotitem_color = 'red';
	} else if (slotitem_room <= shipnumfree * 4) {
	    slotitem_color = 'orange';
	} else {
	    slotitem_color = 'black';
	}
    }

    if (KanColleDatabase.memberMaterial.timestamp()) {
	let d;
	/*
	 * 1: 燃料
	 * 2: 弾薬
	 * 3: 鋼材
	 * 4: ボーキサイト
	 * 5: 高速建造材
	 * 6: 高速修復材
	 * 7: 開発資材
	 */
	d = KanColleDatabase.memberMaterial.get(5);
	if (typeof(d) == 'object')
	    burner = d.api_value;

	d = KanColleDatabase.memberMaterial.get(6);
	if (typeof(d) == 'object')
	    bucket = d.api_value;
    }


    $('basic-information-shipcount').value = ships;
    SetStyleProperty($('basic-information-shipcount'), 'color', ship_color);
    $('basic-information-shipcount').setAttribute('tooltiptext', ships + ' / ' + maxships);

    $('basic-information-slotitemcount').value = slotitems;
    SetStyleProperty($('basic-information-slotitemcount'), 'color', slotitem_color);
    $('basic-information-slotitemcount').setAttribute('tooltiptext', slotitems + ' / ' + maxslotitems);

    $('basic-information-burnercount').value = burner;
    $('basic-information-bucketcount').value = bucket;

    $('repairkit-number').value = bucket;
    $('burner-number').value = burner;
}

/*
 * デッキ/遠征
 *  member/deck		: api_data
 *  member/deck_port	: api_data
 *  member/ship2	: api_data_deck
 */
function KanColleTimerDeckHandler(){
    let decks = KanColleDatabase.memberDeck.list();
    let now = Math.floor(KanColleDatabase.memberDeck.timestamp() / 1000);

    for( let i = 0; i < decks.length; i++ ){
	let d = KanColleDatabase.memberDeck.get(decks[i]);
	let k = d.api_id;
	let nameid = 'fleetname'+k;
	let targetid = 'fleet'+k;
	let timeid = 'fleetremain'+k;
	KanColleRemainInfo.fleet[i] = new Object();
	KanColleRemainInfo.fleet_name[i] = d.api_name;
	$(nameid).value = d.api_name; // 艦隊名
	if( d.api_mission[0] ){
	    let mission_id = d.api_mission[1]; // 遠征ID
	    // 遠征名を表示
	    let mission_name = KanColleData.mission_name[mission_id];
	    if (!mission_name)
		mission_name = 'UNKNOWN_' + mission_id;
	    KanColleRemainInfo.mission_name[i] = mission_name;
	    $('mission_name'+k).value = mission_name;

	    KanColleRemainInfo.fleet[i].finishedtime = d.api_mission[2];    //遠征終了時刻
	    $(targetid).finishTime = d.api_mission[2];
	    $(timeid).finishTime = d.api_mission[2];
	}else{
	    $(targetid).finishTime = '';
	    $(timeid).finishTime = '';
	    KanColleRemainInfo.fleet[i].finishedtime = Number.NaN;
	}
    }
}

function KanColleTimerDeckBasicHandler(){
    let d = KanColleDatabase.memberBasic.get();
    let fleets;
    if (!d)
	return;
    fleets = document.getElementsByClassName("fleet");
    for( let i=0; i<4; i++ )
	SetStyleProperty(fleets[i], 'display',
			 (i != 0 && i < d.api_count_deck) ? "" : "none");
    if (d.api_count_deck < 2)
	$('group-mission').style.display = "none";
}

function KanColleTimerDeckRestore(){
    KanColleTimerDeckBasicHandler();
    try{
	for( let i = 0; i < 4; i++ ){
	    let k = i + 1;
	    if( KanColleRemainInfo.fleet_name[i] ){
		$('fleetname'+k).value = KanColleRemainInfo.fleet_name[i];
	    }
	    if( KanColleRemainInfo.mission_name[i] ){
		let mission_name = KanColleRemainInfo.mission_name[i];
		$('mission_name'+k).value=mission_name;
	    }
	    if( KanColleRemainInfo.fleet[i] ){
		$('fleet'+k).finishTime = KanColleRemainInfo.fleet[i].finishedtime;
		$('fleetremain'+k).finishTime = KanColleRemainInfo.fleet[i].finishedtime;
	    }
	}
    } catch(x) {
    }
}

function KanColleTimerMakeShipFleetMap(){
    let decks = KanColleDatabase.memberDeck.list();
    let db = {};
    for( let i = 0; i < decks.length; i++ ){
	let deck = KanColleDatabase.memberDeck.get(decks[i]);
	for( let j = 0; j < deck.api_ship.length; j++ ){
	    if (deck.api_ship[j] < 0)
		continue;
	    db[deck.api_ship[j]] = { fleet: deck.api_id, pos: j, };
	}
    }
    KanColleRemainInfo.shipfleet = db;
}

/*
 * 入渠ドック
 *  member/ndock	: api_data
 */
function KanColleTimerNdockHandler(){
    let docks = KanColleDatabase.memberNdock.list();
    let now = Math.floor(KanColleDatabase.memberNdock.timestamp()/1000);
    // 入渠ドック
    for( let i = 0; i < docks.length; i++ ){
	let d = KanColleDatabase.memberNdock.get(docks[i]);
	let k = d.api_id;
	var targetid = 'ndock'+k;
	var timeid = 'ndockremain'+k;
	KanColleRemainInfo.ndock[i] = new Object();
	if( d.api_state > 0 ){
	    let ship_id = d.api_ship_id;
	    let name = FindShipName( ship_id );
	    let complete_time = d.api_complete_time;
	    if (!complete_time)
		complete_time = cur;
	    $("ndock-label"+k).setAttribute('tooltiptext', name);
	    if( name ){
		$("ndock-label"+k).value = name;
	    }

	    KanColleRemainInfo.ndock_ship_id[i] = ship_id;
	    KanColleRemainInfo.ndock[i].finishedtime = complete_time;
	    $(targetid).finishTime = complete_time;
	    $(timeid).finishTime = complete_time;
	}else if(d.api_state == 0){
	    $("ndock-label"+(i+1)).value = "No."+(i+1);
	    $("ndock-label"+(i+1)).setAttribute('tooltiptext', "");
	    KanColleRemainInfo.ndock_ship_id[i] = 0;
	    $(targetid).finishTime = '';
	    $(timeid).finishTime = '';
	    KanColleRemainInfo.ndock[i].finishedtime = Number.NaN;
	}else{
	    $('ndock-box'+(i+1)).style.display = 'none';
	}
    }
}

function KanColleTimerNdockBasicHandler(){
    let d = KanColleDatabase.memberBasic.get();
    let ndocks;
    if (!d)
	return;
    ndocks  = document.getElementsByClassName("ndock-box");
    for( let i = 0; i < 4; i++ )
	SetStyleProperty(ndocks[i], 'display', i < d.api_count_ndock ? "":"none");
}

function KanColleTimerNdockRestore(){
    KanColleTimerNdockBasicHandler();
    try{
	for( let i=0; i < 4; i++ ){
	    let k = i + 1;
	    if( KanColleRemainInfo.ndock_memo[i] ){
		$('ndock-box'+k).setAttribute('tooltiptext',
					      KanColleRemainInfo.ndock_memo[i] );
	    }
	    if( KanColleRemainInfo.ndock[i] ){
		$('ndock'+k).finishTime = KanColleRemainInfo.ndock[i].finishedtime;
		$('ndockremain'+k).finishTime = KanColleRemainInfo.ndock[i].finishedtime;
	    }
	}
    } catch(x) {
    }
}

/*
 * 建造
 *  member/kdock	: api_data
 */
function KanColleTimerKdockHandler(){
    let docks = KanColleDatabase.memberKdock.list();
    let cur = KanColleDatabase.memberKdock.timestamp();
    let now = Math.floor(cur);

    // 建造ドック
    for( let i = 0; i < docks.length; i++ ){
	let d = KanColleDatabase.memberKdock.get(docks[i]);
	let k = d.api_id;
	let targetid = 'kdock'+k;
	let timeid = 'kdockremain'+k;
	KanColleRemainInfo.kdock[i] = new Object();

	if( d.api_state > 0 ){
	    // 建造艦の推定
	    // 建造艦艇の表示…はあらかじめ分かってしまうと面白みがないのでやらない
	    /*
	    let ship_id = parseInt( d.api_created_ship_id, 10 );
	    let ship_name = FindShipNameByCatId(d.api_created_ship_id);
	     */
	    let ship_name = '???';
	    let complete_time = d.api_complete_time;

	    if (d.api_state == 3)
		complete_time = cur;

	    if (cur < complete_time) {
		// ブラウザを起動して初回タイマー起動時に
		// 建造開始時刻を復元するため
		// Note: Configにはms単位の時刻は保存できないので
		//       分けて保存する。
		let created_time = KanColleTimerConfig.getInt("kdock-created-time"+k) * 1000 +
				   KanColleTimerConfig.getInt("kdock-created-timems"+k);
		if( !created_time ){
		    created_time = cur;
		    KanColleTimerConfig.setInt( "kdock-created-time"+k, Math.floor(cur/1000) );
		    KanColleTimerConfig.setInt( "kdock-created-timems"+k, cur % 1000);
		}

		ship_name = GetConstructionShipName(Math.floor(created_time/1000),
						    Math.floor(complete_time/1000));
		KanColleRemainInfo.construction_shipname[i] = ship_name;
	    } else {
		ship_name = KanColleRemainInfo.construction_shipname[i];
	    }
	    if (ship_name) {
		$('kdock-label'+k).setAttribute('tooltiptext', ship_name);
	    }

	    KanColleRemainInfo.kdock[i].finishedtime = complete_time;
	    $(targetid).finishTime = complete_time;
	    $(timeid).finishTime = complete_time;
	}else if (d.api_state == 0) {
	    // 建造していない
	    $('kdock-label'+k).setAttribute('tooltiptext','');
	    $(targetid).finishTime = '';
	    $(timeid).finishTime = '';
	    KanColleRemainInfo.kdock[i].finishedtime = Number.NaN;
	    KanColleTimerConfig.setInt( "kdock-created-time"+k, 0 );
	    KanColleTimerConfig.setInt( "kdock-created-timems"+k, 0 );
	    KanColleRemainInfo.construction_shipname[i] = null;
	}else{
	    $('kdock-box'+k).style.display = 'none';
	}
    }
}

function KanColleTimerKdockBasicHandler(){
    let d = KanColleDatabase.memberBasic.get();
    let ndocks;
    if (!d)
	return;
    ndocks = document.getElementsByClassName("kdock-box");
    for( let i = 0; i < 4; i++ )
	SetStyleProperty(ndocks[i], 'display', i < d.api_count_kdock ? "":"none");
}

function KanColleTimerKdockRestore(){
    KanColleTimerKdockBasicHandler();
    try{
	for(let i=0; i<4; i++){
	    let k = i+1;
	    if( KanColleRemainInfo.kdock[i] ){
		$('kdock'+k).finishTime = KanColleRemainInfo.kdock[i].finishedtime;
		$('kdockremain'+k).finishTime = KanColleRemainInfo.kdock[i].finishedtime;
	    }
	    // 建造中艦艇の表示復元
	    if( KanColleRemainInfo.construction_shipname[i] ){
		$('kdock-box'+k).setAttribute('tooltiptext',KanColleRemainInfo.construction_shipname[i]);
	    }
	}
    } catch (x) {
    }
}

/*
 * 建造艦名表示（隠し機能）
 *
 * 建造ドックのNo.欄を素早く何度かダブルクリックすると
 * 艦名を tooltip として表示
 */
var KanColleKdockMouseEventHandler = {
    timer: {},

    handleEvent: function(e) {
	let id = e.target.id;
	let now = (new Date).getTime();

	if (!this.timer[id] || this.timer[id] + 1000 < now) {
	    this.timer[id] = now;
	    return;
	}
	this.timer[id] += 1000;

	if (this.timer[id] - now <= 2000)
	    return;

	if (id.match(/^kdock-label(\d+)$/)) {
	    let fleet_id = parseInt(RegExp.$1, 10);
	    let fleet = KanColleDatabase.memberKdock.get(fleet_id);
	    if( fleet && fleet.api_complete_time ){
		let ship_id = parseInt( fleet.api_created_ship_id );
		let ship_name = FindShipNameByCatId(ship_id);
		e.target.setAttribute('tooltiptext',ship_name);
	    }
	}
    },

    init: function(){
	for( let i = 0; i < 4; i++ ){
	    let k = 'kdock-label' + (i + 1);
	    $(k).addEventListener('dblclick', this);
	}
    },

    exit: function(){
	for( let i = 0; i < 4; i++ ){
	    let k = 'kdock-label' + (i + 1);
	    $(k).removeEventListener('dblclick', this);
	}
    },
};

// 資源情報
function KanColleTimerMemberMaterialHandler() {
    let now = Math.floor(KanColleDatabase.memberMaterial.timestamp() / 1000);
    let res = KanColleRemainInfo.gResourceData;
    let last_data = res[ res.length-1 ];
    let data = new Object();
    let resnames = {
	fuel: 1,
	bullet: 2,
	steel: 3,
	bauxite: 4,
    };
    let count = 0;

    if (!now)
	return;

    for (let k in resnames) {
	let v = KanColleDatabase.memberMaterial.get(resnames[k]);
	if (typeof(v) != 'object')
	    continue;
	data[k] = v.api_value;
	if (!length || last_data[k] != data[k])
	    count++;
    }

    data.recorded_time = now; // 記録日時

    if (count)
	res.push( data );
}

/*
 * 装備保持艦船の抽出
 * member/ship2 and member/slotitem
 */
function KanColleUpdateSlotitem(){
    let db;
    let items;
    let ships;

    db = {};
    items = KanColleDatabase.memberSlotitem.list();
    ships = KanColleDatabase.memberShip2.list();

    if ( items.length && ships.length ){
	for ( let i = 0; i < items.length; i++ ){
	    let item = KanColleDatabase.memberSlotitem.get(items[i]);
	    let itemtypeid = item.api_slotitem_id;
	    if (!db[itemtypeid]) {
		db[itemtypeid] = {
				    id: itemtypeid,
				    name: item.api_name,
				    type: item.api_type,
				    list: {},
				    totalnum: 0,
				    num: 0,
		};
	    }
	    db[itemtypeid].totalnum++;
	}

	for ( let i = 0; i < ships.length; i++ ){
	    let ship = KanColleDatabase.memberShip2.get(ships[i]);
	    let ship_slot = ship.api_slot;

	    //debugprint(FindShipName(ship.api_id) + ': ');

	    for ( let j = 0; j < ship_slot.length; j++ ){
		let item;
		let itemtypeid;

		if (ship_slot[j] < 0)
		    continue;

		item = KanColleDatabase.memberSlotitem.get(ship_slot[j]);
		// member/slotitem might be out-of-date for a while.
		if (!item)
		    continue;
		itemtypeid = item.api_slotitem_id;

		//debugprint(itemtypeid + ': ' + item.api_name);

		db[itemtypeid].list[ship.api_id]++;
		db[itemtypeid].num++;
	    }
	}

	for ( let k in db ){
	    let s = [];
	    for ( let l in db[k].list ){
		s.push(FindShipName(parseInt(l, 10)));
	    }
	    //debugprint(db[k].name + ': ' + s.join(','));
	}
    }
    //debugprint(KanColleRemainInfo.slotitemowners.toSource());
    KanColleRemainInfo.slotitemowners = db;
}

/*
 * 所有艦娘情報2
 *  member/ship2	: api_data
 */
function KanColleTimerShipInfoHandler(){
    KanColleUpdateSlotitem();
    KanColleCreateShipTree();
    KanColleShipInfoSetView();
}

function KanColleTimerMemberShip2FleetHandler(){
    let l = KanColleDatabase.memberDeck.list();

    function timestr(t){
	let d = new Date;
	let h;
	let m;

	d.setTime(t);

	h = d.getHours();
	if (h < 10)
	    h = '0' + h;

	m = d.getMinutes();
	if (m < 10)
	    m = '0' + m;

	return h + ':' + m;
    }

    // 艦隊/遠征情報
    for ( let i = 0; i < l.length; i++ ){
	let fi = KanColleDatabase.memberDeck.get(l[i]);
	let id = parseInt(fi.api_id, 10);
	let fleet_text = fi.api_name;
	let fleet_flagship_lv = 0;
	let fleet_stypes = {};
	let min_cond = 100;
	for ( let j = 0; j < fi.api_ship.length; j++ ){
	    let ship_id = fi.api_ship[j];
	    let ship_name = FindShipName(ship_id);
	    let ship_info = FindShipStatus(ship_id);
	    let ship_cond = FindShipCond(ship_id);
	    let ship = KanColleDatabase.memberShip2.get(ship_id);
	    let ship_bgcolor;
	    let ship_border;
	    let ship_color;
	    let ship_shadow;
	    let ship_text = ship_name + (ship ? ' Lv' + ship.api_lv : '');

	    if (ship) {
		let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
		if (j == 0)
		    fleet_flagship_lv = ship.api_lv;
		if (!fleet_stypes[shiptype.api_stype])
		    fleet_stypes[shiptype.api_stype] = 1;
		else
		    fleet_stypes[shiptype.api_stype]++;
	    }

	    if (ship_cond === undefined) {
		ship_cond = '-';
		ship_bgcolor = null;
	    } else if (ship_cond >= 90) {
		ship_bgcolor = '#ffffff';   //キラキラ
	    } else if (ship_cond >= 80) {
		ship_bgcolor = '#eeffff';   //キラキラ
	    } else if (ship_cond >= 70) {
		ship_bgcolor = '#ddffee';   //キラキラ
	    } else if (ship_cond >= 60) {
		ship_bgcolor = '#ccffdd';   //キラキラ
	    } else if (ship_cond >= 50) {
		ship_bgcolor = '#bbffcc';   //キラキラ
	    } else if (ship_cond >= 40) {
		ship_bgcolor = '#88ff88';   //平常
	    } else if (ship_cond >= 30) {
		ship_bgcolor = '#ffdd88';   //間宮
	    } else if (ship_cond >= 20) {
		ship_bgcolor = '#ffaa44';   //オレンジ
	    } else if (ship_cond >= 0) {
		ship_bgcolor = '#ff8888';   //赤
	    } else {
		ship_bgcolor = '#666666';   //...
	    }

	    if (ship_cond < 49) {
		let t = KanColleDatabase.memberShip2.timestamp();
		ship_text += ' ' + timestr(t + Math.ceil((49 - ship_cond) / 3) * 180000);

		if (ship_cond < min_cond)
		    min_cond = ship_cond;
	    }

	    if (ship_info === undefined) {
		ship_border = null;
		ship_color = null;
	    } else {
		let hpratio = ship_info.nowhp / ship_info.maxhp;

		ship_text += '\nHP: ' + ship_info.nowhp + '/' + ship_info.maxhp;

		if (ship_info.bull_max > ship_info.bull ||
		    ship_info.fuel_max > ship_info.fuel) {
		    ship_border = 'solid red';
		} else {
		    ship_border = null;
		}

		if (hpratio >= 1) {
		    ship_color = null;	    //無傷
		    ship_shadow = null;
		} else {
		    ship_shadow = '1px 1px 0 black';
		    if (hpratio > 0.75) {
			ship_color = '#0000cc'; //かすり傷
		    } else if (hpratio > 0.50) {
			ship_color = '#ff44cc'; //小破
		    } else if (hpratio > 0.25) {
			ship_color = '#ff4400'; //中破
		    } else {
			ship_color = '#ff0000'; //大破
		    }
		}
	    }

	    $('shipstatus-' + id + '-' + (j + 1)).value = ship_cond;
	    $('shipstatus-' + id + '-' + (j + 1)).setAttribute('tooltiptext', ship_text);
	    SetStyleProperty($('shipstatus-' + id + '-' + (j + 1)), 'background-color', ship_bgcolor);
	    SetStyleProperty($('shipstatus-' + id + '-' + (j + 1)), 'border', ship_border);
	    SetStyleProperty($('shipstatus-' + id + '-' + (j + 1)), 'color', ship_color);
	    SetStyleProperty($('shipstatus-' + id + '-' + (j + 1)), 'text-shadow', ship_shadow);
	}

	if (fleet_flagship_lv > 0) {
	    let stypes;
	    let fleetinfo = [];
	    let timercmd = null;

	    let cur = (new Date).getTime();
	    let t = KanColleDatabase.memberShip2.timestamp();
	    let time = t + Math.ceil((49 - min_cond) / 3) * 180000;
	    let str = timestr(time);

	    if (time >= cur) {
		fleet_text += ' ' + timestr(time);
		$('shipstatus-' + id + '-popup-1').label = 'タイマー設定(' + str + ')';
		$('shipstatus-' + id + '-popup-1').setAttribute('oncommand', 'KanColleTimer.setGeneralTimerByTime(' + time + ')');
		$('shipstatus-' + id + '-popup-1').setAttribute('disabled', 'false');
	    } else {
		$('shipstatus-' + id + '-popup-1').label = 'タイマー';
		$('shipstatus-' + id + '-popup-1').setAttribute('disabled', 'true');
	    }

	    stypes = Object.keys(fleet_stypes).sort(function(a,b){
		return fleet_stypes[b] - fleet_stypes[a];
	    });

	    fleet_text += '\n旗艦Lv' + fleet_flagship_lv;
	    for( let j = 0; j < stypes.length; j++ ){
		let stypename = KanColleData.type_name[stypes[j]];
		if (!stypename)
		    stypename = 'UNKNOWN_' + stypes[j];
		fleetinfo.push(' ' + stypename + '(' + fleet_stypes[stypes[j]] + ')');
	    }
	    fleet_text += ';' + fleetinfo.join(',');
	}

	$('shipstatus-'+ id +'-0').setAttribute('tooltiptext', fleet_text);
    }
}

function KanColleTimerQuestInformationUpdate(){
    let t = KanColleDatabase.memberQuestlist.timestamp();
    let d = KanColleDatabase.memberQuestlist.get();
    let oldest = null;
    let quests = KanColleRemainInfo.quests;
    let cleared;
    let cleared_page;

    if (!t)
	return;

    // Check last clearitem
    cleared = KanColleDatabase.questClearitemget.timestamp();
    if (quests.info && quests.pages &&
	quests.info.last_page &&
	quests.pages[quests.info.last_page] < cleared &&
	(d.api_disp_page == quests.info.last_page ||
	 (quests.info.last_page == quests.info.page_count &&
	 d.api_disp_page == d.api_page_count ||
	 d.api_disp_page + 1 == quests.info.last_page))) {
	cleared_page = quests.info.last_page;
    } else {
	cleared = 0;
	cleared_page = 0;
    }

    quests.info = {
	count: d.api_count,
	page_count: d.api_page_count,
	last_page: d.api_disp_page,
    };
    if (!quests.pages)
	quests.pages = [];
    quests.pages[d.api_disp_page] = t;

    // Check oldest timestamp
    oldest = null;
    for (let i = 1; i <= d.api_page_count && i <= 10; i++) {
	if (!quests.pages[i])
	    continue;
	if (!oldest || quests.pages[i] < oldest)
	    oldest = quests.pages[i];
    }

    if (!quests.list)
	quests.list = {};

    if (d.api_list) {
	for (let i = 0; i < d.api_list.length; i++){
	    let q = d.api_list[i];
	    let no;
	    let state;
	    if (typeof(q) != 'object')
		continue;
	    no = q.api_no;
	    quests.list[no] = {
		timestamp: t,
		page: d.api_disp_page,
		data: q,
	    };
	}
    } else {
	debugprint('d.api_list is null: ' + d.toSource());
    }

    // Clean-up "achieved" quests.
    if (quests.list) {
	let ids = Object.keys(quests.list);
	for (let i = 0; i < ids.length; i++) {
	    let info = quests.list[ids[i]];
	    // - エントリの最終更新が全ページの更新より古ければ、
	    //   もう表示されないエントリ。
	    // - アイテム取得前後に同一ページが表示されたなら、
	    //   アイテム取得はそのページ上のどれかで行われたと
	    //   みなし、古いエントリは消してよい。
	    debugprint(
		       't=' + t +
		       ', oldest=' + oldest +
		       ', cleared=' + cleared +
		       ', cleared_page=' + cleared_page +
		       ', info.timestamp=' + info.timestamp +
		       ', info.page=' + info.page +
	    '');
	    if ((oldest && info.timestamp < oldest) ||
		(cleared && cleared_page &&
		 info.page == cleared_page && info.timestamp < t)) {
		delete quests.list[ids[i]];
	    }
	}
    }

    KanColleTimerQuestInformationShow();
}

function KanColleTimerQuestInformationShow(){
    let questbox = $('quest-list-box');
    let quests = KanColleRemainInfo.quests;
    let ids = quests.list ? Object.keys(quests.list) : [];
    let list = $('quest-list-rows');
    let listitem;
    let staletime = KanColleDatabase.memberShip2.timestamp();
    let mode = KanColleTimerConfig.getInt('quest-info.mode');
    let modenode = $('quest-information-mode');
    let tooltips = {};

    function deadline(t,weekly){
	const base = 331200000;	// 1970/1/4 20:00 UTC = 1970/1/5(月) 5:00 JST
	const fuzz = 60000;
	const span = 86400000 * (weekly ? 7 : 1);
	let d;
	let elapsed;	// 期間開始からの経過時間

	if (!t || t < 0)
	    return -1;	// エラー

	elapsed = (t - base) % span;
	if (elapsed < fuzz)
	    return 0;	// 時計ずれを考慮

	return t + span - elapsed;
    }

    if (modenode) {
	let str = '-';
	let menunodename = modenode.getAttribute('popup');
	let menunode = menunodename ? $(menunodename) : null;
	let children = menunode ? menunode.childNodes : null;
	if (children) {
	    for (let i = 0; i < children.length; i++) {
		let val = parseInt(children[i].value, 10);
		if (mode == val) {
		    str = children[i].label;
		    break;
		}
	    }
	}
	modenode.value = str;
    }

    if (!ids.length)
	return;

    ids = ids.sort(function(a,b){
	return quests.list[a].data.api_no - quests.list[b].data.api_no;
    });

    // clear
    RemoveChildren(list);

    for (let i = 0; i < ids.length; i++) {
	let no = ids[i];
	let listitem = CreateElement('row');
	let cell;
	let t;
	let color = null;
	let q = quests.list[ids[i]];
	let type = 0;
	let tid = 'quest-information-deadline-tooltip-' + i;

	// title
	cell = CreateElement('label');
	cell.setAttribute('value', q.data.api_title);
	cell.setAttribute('crop', 'end');
	cell.setAttribute('tooltiptext', q.data.api_detail);
	listitem.appendChild(cell);

	// type
	switch (q.data.api_type) {
	case 1: t = '';	    type = 0; break;
	case 2: t = '[日]'; type = 1; break;
	case 3: t = '[週]'; type = 2; break;
	case 4: t = '[日]'; type = 1; break;  //3,7,0の日
	case 5: t = '[日]'; type = 1; break;  //2,8の日
	default:
		t = '[' + q.data.api_type + ']';
	}
	cell = CreateElement('label');
	cell.setAttribute('value', t);
	listitem.appendChild(cell);

	t = type ? deadline(q.timestamp, type == 2) : -1;
	if (t > 0) {
	    let tooltip = CreateElement('tooltip');
	    let timer;
	    tooltip.setAttribute('id', tid);

	    timer = CreateElement('timer');
	    timer.mode = 'time';
	    timer.finishTime = '' + t;
	    tooltip.appendChild(timer);

	    tooltips[tid] = tooltip;

	    cell.setAttribute('tooltip', tid);
	}

	// progress
	if (q.data.api_state == 1 ||
	    q.data.api_state == 2) {
	    switch (q.data.api_progress_flag) {
	    case 0:
		    t = '  ';
		    color = null;
		    break;
	    case 1: //50%
		    t = '50';
		    color = '#88ff88';
		    break;
	    case 2: //80%
		    t = '80';
		    color = '#3cb371';
		    break;
	    }
	} else if (q.data.api_state == 3) {
	    //t = '\u2713';	//check mark
	    t = 'OK';
	    color = '#88ffff';
	} else {
	    t = '?';
	    color = 'red';
	}

	cell = CreateElement('label');
	cell.setAttribute('value', t);
	listitem.appendChild(cell);

	listitem.style.color = 'black';

	if (q.data.api_state > 1) {
	    listitem.style.fontWeight = 'bold';
	    listitem.style.color = 'black';
	} else {
	    listitem.style.fontWeight = 'normal';
	    listitem.style.color = '#444444';
	}
	if (color) {
	    cell.style.border = color + ' 1px solid';
	    cell.style.backgroundColor = color;
	    //listitem.style.border = color + ' 1px solid';
	    //listitem.style.backgroundColor = color;
	}

	// 古いときは灰色に。
	if (!staletime || q.timestamp < staletime) {
	    listitem.style.backgroundColor = '#dddddd';
	    //listitem.style.fontStyle = 'italic';
	}

	//debugprint('no: ' + no +
	//	   '[state: ' + q.data.api_state +
	//	   ', flag:' + q.data.api_progress_flag +
	//	   '] title: ' + q.data.api_title +
	//	   '; detail: ' + q.data.api_detail);

	if (mode == 1) {
	    // 遂行していないかつ進捗なし(-50%)
	    if (q.data.api_state == 1 &&
	        q.data.api_progress_flag == 0)
		continue;
	} else if (mode == 2) {
	    // 遂行中でも達成済でもない
	    if (q.data.api_state != 2 && q.data.api_state != 3)
		continue;
	} else if (mode == 3) {
	    // 遂行中でない
	    if (q.data.api_state != 2)
		continue;
	}

	list.appendChild(listitem);
    }

    if (questbox) {
	for (let tid in tooltips) {
	    let node = $(tid);
	    if (node)
		node.parentNode.replaceChild(tooltips[tid], node);
	    else
		questbox.appendChild(tooltips[tid]);
	}
    }
}

function KanColleTimerQuestInformationChangeMode(node){
    let id = node.id;
    let val = parseInt(node.value, 10);

    if (!isNaN(val))
	KanColleTimerConfig.setInt('quest-info.mode', val);

    KanColleTimerQuestInformationShow();
}

function KanColleTimerRegisterCallback(){
    let db = KanColleDatabase;
    db.memberBasic.appendCallback(KanColleTimerBasicInformationPanel);
    db.memberRecord.appendCallback(KanColleTimerBasicInformationPanel);
    db.memberDeck.appendCallback(KanColleTimerDeckHandler);
    db.memberBasic.appendCallback(KanColleTimerDeckBasicHandler);
    db.memberDeck.appendCallback(KanColleTimerMakeShipFleetMap);
    db.memberDeck.appendCallback(KanColleTimerMemberShip2FleetHandler);
    db.memberNdock.appendCallback(KanColleTimerNdockHandler);
    db.memberBasic.appendCallback(KanColleTimerNdockBasicHandler);
    db.memberKdock.appendCallback(KanColleTimerKdockHandler);
    db.memberBasic.appendCallback(KanColleTimerKdockBasicHandler);
    db.memberShip2.appendCallback(KanColleTimerShipInfoHandler);
    db.memberShip2.appendCallback(KanColleTimerBasicInformationPanel);
    db.memberSlotitem.appendCallback(KanColleTimerShipInfoHandler);
    db.masterSlotitem.appendCallback(KanColleTimerShipInfoHandler);
    db.memberSlotitem.appendCallback(KanColleTimerBasicInformationPanel);
    db.memberQuestlist.appendCallback(KanColleTimerQuestInformationUpdate);
    db.memberShip2.appendCallback(KanColleTimerQuestInformationShow);
    db.memberMaterial.appendCallback(KanColleTimerMemberMaterialHandler);
}

function KanColleTimerUnregisterCallback(){
    let db = KanColleDatabase;
    db.memberMaterial.removeCallback(KanColleTimerMemberMaterialHandler);
    db.memberSlotitem.removeCallback(KanColleTimerBasicInformationPanel);
    db.masterSlotitem.removeCallback(KanColleTimerShipInfoHandler);
    db.memberSlotitem.removeCallback(KanColleTimerShipInfoHandler);
    db.memberShip2.removeCallback(KanColleTimerBasicInformationPanel);
    db.memberShip2.removeCallback(KanColleTimerShipInfoHandler);
    db.memberBasic.removeCallback(KanColleTimerKdockBasicHandler);
    db.memberKdock.removeCallback(KanColleTimerKdockHandler);
    db.memberBasic.removeCallback(KanColleTimerNdockBasicHandler);
    db.memberNdock.removeCallback(KanColleTimerNdockHandler);
    db.memberDeck.removeCallback(KanColleTimerMemberShip2FleetHandler);
    db.memberDeck.removeCallback(KanColleTimerMakeShipFleetMap);
    db.memberBasic.removeCallback(KanColleTimerDeckBasicHandler);
    db.memberDeck.removeCallback(KanColleTimerDeckHandler);
    db.memberRecord.removeCallback(KanColleTimerBasicInformationPanel);
    db.memberBasic.removeCallback(KanColleTimerBasicInformationPanel);
    db.memberQuestlist.removeCallback(KanColleTimerQuestInformationUpdate);
    db.memberShip2.removeCallback(KanColleTimerQuestInformationShow);
}

function AddLog(str){
    $('log').value = str + $('log').value;
}

var ShipListView = null;
function SaveShipList(){
    if (!ShipListView)
	return;
    ShipListView.saveShipList();
}

function OpenShipList(){
    let feature="chrome,resizable=yes";
    let w = window.open("chrome://kancolletimer/content/shiplist.xul","KanColleTimerShipList",feature);
    w.focus();
}

function OpenResourceGraph(){
    window.open('chrome://kancolletimer/content/resourcegraph.xul','KanColleTimerResourceGraph','chrome,resizable=yes').focus();
}

function OpenAboutDialog(){
    var f='chrome,toolbar,modal=no,resizable=no,centerscreen';
    var w = window.openDialog('chrome://kancolletimer/content/about.xul','KanColleTimerAbout',f);
    w.focus();
}

function OpenSettingsDialog(){
    var f='chrome,toolbar,modal=no,resizable=yes,centerscreen';
    var w = window.openDialog('chrome://kancolletimer/content/preferences.xul','KanColleTimerPreference',f);
    w.focus();
}

function OpenTweetDialog(nomodal){
    var f;
    nomodal = true;
    if( nomodal ){
	f='chrome,toolbar,modal=no,resizable=no,centerscreen';
    }else{
	f='chrome,toolbar,modal=yes,resizable=no,centerscreen';
    }
    var w = window.openDialog('chrome://kancolletimer/content/sstweet.xul','KanColleTimerTweet',f);
    w.focus();
}

function OpenKanCollePage(){
    let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    let browserEnumerator = wm.getEnumerator("navigator:browser");
    let url = "www.dmm.com/netgame/social/-/gadgets/=/app_id=854854";
    while(browserEnumerator.hasMoreElements()) {
	let browserInstance = browserEnumerator.getNext().gBrowser;
	// browser インスタンスの全てのタブを確認する.
	let numTabs = browserInstance.tabContainer.childNodes.length;
	for(let index=0; index<numTabs; index++) {
	    let currentBrowser = browserInstance.getBrowserAtIndex(index);
	    if (currentBrowser.currentURI.spec.indexOf(url) != -1) {
		browserInstance.selectedTab = browserInstance.tabContainer.childNodes[index];
	    }
	}
    }
}


/**
 * @return スクリーンショットのdataスキーマのnsIURIを返す。艦これのタブがなければnullを返す
 */
function TakeKanColleScreenshot(isjpeg){
    var tab = FindKanColleTab();
    if( !tab ) return null;
    var win = tab.linkedBrowser._contentWindow.wrappedJSObject;

    var game_frame = win.window.document.getElementById("game_frame");
    if (!game_frame) return null;
    var offset_x = game_frame.offsetLeft;
    var offset_y = game_frame.offsetTop;
    var flash = game_frame.contentWindow.document.getElementById("flashWrap");
    offset_x += flash.offsetLeft;
    offset_y += flash.offsetTop;

    var w = flash.clientWidth;
    var h = flash.clientHeight;
    var x = offset_x;
    var y = offset_y;
    
    var canvas = document.getElementById("KanColleTimerCapture");
    canvas.style.display = "inline";
    canvas.width = w;
    canvas.height = h;

    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(1.0, 1.0);
    // x,y,w,h
    ctx.drawWindow(win, x, y, w, h, "rgb(255,255,255)");
    ctx.restore();

    let mask_admiral_name = KanColleTimerConfig.getBool("screenshot.mask-name");
    if( mask_admiral_name ){
	ctx.fillStyle = "rgb(0,0,0)";
	ctx.fillRect(120, 5, 145, 20);
    }

    var url;
    if( isjpeg ){
	url = canvas.toDataURL("image/jpeg");
    }else{
	url = canvas.toDataURL("image/png");
    }
    const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
        .getService(Components.interfaces.nsIIOService);
    url = IO_SERVICE.newURI(url, null, null);

    canvas.style.display = "none";
    canvas.width = 1;
    canvas.height = 1;
    return url;
}

/*
 
 */
function FindSlotItemNameById( api_id ){
    let item = KanColleDatabase.memberSlotitem.get(api_id);
    if (item)
	return item.api_name;
    return "[Unknown";
}

function FindShipNameByCatId( id ){
    try{
	// 全艦データから艦艇型IDをキーに艦名を取得
	return KanColleDatabase.masterShip.get(id).api_name;
    } catch (x) {
    }
    return "";
}

/**
 * 自分の保有している艦のデータを返す.
 */
function FindOwnShipData( ship_id ){
    return KanColleDatabase.memberShip2.get(ship_id);
}

/**
 * 艦のデータを返す
 */
function FindShipData( ship_id ){
    let ship = KanColleDatabase.memberShip2.get(ship_id);
    if (ship)
	return KanColleDatabase.masterShip.get(ship.api_ship_id);
    return undefined;
}

/**
 * 艦艇の名前を返す
 */
function FindShipName( ship_id ){
    try{
	// member/ship2 には艦名がない。艦艇型から取得
	let ship = KanColleDatabase.memberShip2.get(ship_id);
	return FindShipNameByCatId( ship.api_ship_id );
    } catch (x) {
    }
    return "";
}

function FindShipCond( ship_id ){
    try{
	let ship = KanColleDatabase.memberShip2.get(ship_id);
	return parseInt(ship.api_cond, 10);
    } catch (x) {
    }
    return undefined;
}

function FindShipStatus( ship_id ){
    try{
	let info = {
	    fuel: undefined,
	    fuel_max: undefined,
	    bull: undefined,
	    bull_max: undefined,
	    nowhp: undefined,
	    maxhp: undefined,
	};

	// member/ship には fuel, bull, nowhp, maxhp
	let ship = KanColleDatabase.memberShip2.get(ship_id);

	info.fuel = parseInt(ship.api_fuel, 10);
	info.bull = parseInt(ship.api_bull, 10);
	info.nowhp = parseInt(ship.api_nowhp, 10);
	info.maxhp = parseInt(ship.api_maxhp, 10);

	// fuel_max と bull_max は master/shipから
	ship = KanColleDatabase.masterShip.get(ship.api_ship_id);

	info.fuel_max = parseInt(ship.api_fuel_max, 10);
	info.bull_max = parseInt(ship.api_bull_max, 10);

	return info;
    } catch (x) {
    }
    return undefined;
}

/*
 * Tree
 */
var ShipInfoTree = {
    /* Columns*/
    COLLIST: [
	{ label: '艦隊', id: 'fleet', flex: 1, },
	{ label: 'ID', id: 'id', flex: 1, },
	//{ label: '艦種', id: 'type', flex: 2, },
	{ label: '艦種', id: 'stype', flex: 1,
	  sortspecs: [
	    {
		sortspec: '_stype',
		label: '艦種',
		skipdump: true,
	    },
	  ],
	},
	{ label: '艦名', id: 'name', flex: 3, always: true,
	  sortspecs: [
	    {
		sortspec: 'id',
		label: 'ID',
		skipdump: true,
	    },
	    {
		sortspec: '_stype',
		label: '艦種',
		skipdump: true,
	    },
	    {
		sortspec: '_yomi',
		label: 'ヨミ',
	    },
	  ],
	},
	{ label: 'Lv', id: 'lv', flex: 1,
	  subdump: true,
	  sortspecs: [
	    {
		sortspec: '_lv',
		label: 'Lv',
	    },
	    {
		sortspec: '_lvupg',
		label: '次改装Lv',
	    },
	    {
		sortspec: '_lvupgremain',
		label: '次改装Lv残',
	    },
	  ],
	},
	{ label: '経験値', id: 'exp', flex: 2,
	  subdump: true,
	  sortspecs: [
	    {
		sortspec: '_exp',
		label: '経験値',
	    },
	    {
		sortspec: '_expnext',
		label: '次Lv経験値',
	    },
	    {
		sortspec: '_expnextremain',
		label: '次Lv経験値残',
	    },
	    {
		sortspec: '_expupg',
		label: '次改装Lv経験値',
	    },
	    {
		sortspec: '_expupgremain',
		label: '次改装Lv経験値残',
	    },
	  ],
	},
	{ label: 'HP', id: 'hp', flex: 1,
	  subdump: true,
	  sortspecs: [
	    {
		sortspec: '_hp',
		label: 'HP',
	    },
	//    {
	//	sortspec: 'hpratio',
	//	label: 'HP%',
	//    },
	    {
		sortspec: '_maxhp',
		label: 'MaxHP',
	    },
	  ],
	},
	{ label: '火力', id: 'karyoku', flex: 1,
	  subdump: true,
	  sortspecs: [
	    {	sortspec: '_karyoku',	    label: '火力',	    },
	    {	sortspec: '_karyokumax',    label: '最大火力',	    },
	    {	sortspec: '_karyokuremain', label: '火力強化余地',  },
	  ],
	},
	{ label: '雷装', id: 'raisou', flex: 1,
	  subdump: true,
	  sortspecs: [
	    {	sortspec: '_raisou',	    label: '雷装',	    },
	    {	sortspec: '_raisoumax',    label: '最大雷装',	    },
	    {	sortspec: '_raisouremain',  label: '雷装強化余地',  },
	  ],
	},
	{ label: '対空', id: 'taiku', flex: 1,
	  subdump: true,
	  sortspecs: [
	    {	sortspec: '_taiku',	    label: '対空',	    },
	    {	sortspec: '_taikumax',	    label: '最大対空',	    },
	    {	sortspec: '_taikuremain',   label: '対空強化余地',  },
	  ],
	},
	{ label: '装甲', id: 'soukou', flex: 1,
	  subdump: true,
	  sortspecs: [
	    {	sortspec: '_soukou',	    label: '装甲',	    },
	    {	sortspec: '_soukoumax',	    label: '最大装甲',	    },
	    {	sortspec: '_soukouremain',  label: '装甲強化余地',  },
	  ],
	},
	{ label: '回避', id: 'kaihi', flex: 1, },
	{ label: '対潜', id: 'taisen', flex: 1, },
	{ label: '索敵', id: 'sakuteki', flex: 1, },
	{ label: '速力', id: 'soku', flex: 1, },
	{ label: '射程', id: 'length', flex: 1, },
	{ label: '運', id: 'lucky', flex: 1,
	  subdump: true,
	  sortspecs: [
	    {	sortspec: '_lucky',	    label: '運',	    },
	    {	sortspec: '_luckymax',	    label: '最大運',	    },
	    {	sortspec: '_luckyremain',   label: '運強化余地',    },
	  ],
	},
	{ label: '士気', id: 'cond', flex: 1, },
	{ label: '入渠', id: 'ndock', flex: 1,
	  subdump: true,
	  sortspecs: [
	    {
		sortspec: '_ndock',
		label: '入渠時間',
	    },
	  ],
	},
	{ label: '装備1', id: 'slotitem1', flex: 1, },
	{ label: '装備2', id: 'slotitem2', flex: 1, },
	{ label: '装備3', id: 'slotitem3', flex: 1, },
	{ label: '装備4', id: 'slotitem4', flex: 1, },
    ],
    collisthash: {},
    /* Filter */
    filterspec: null,
    /* Sorting */
    sortkey: null,
    sortspec: null,
    sortorder: null,
};

// Filter by Stype (Ship Class)
function KanColleStypeFilterTemplate(){
    let stypegroup = [
	{ label: '駆逐系',
	  types: [
	    { id: 2, }	    //駆逐
	  ],
	},
	{ label: '軽巡系',
	  types: [
	    { id: 3, },	    //軽巡
	    { id: 4, },	    //雷巡
	  ],
	},
	{ label: '重巡系',
	  types: [
	    { id: 5, },	    //重巡
	    { id: 6, },	    //航巡
	  ]
	},
	{ label: '戦艦系',
	  types: [
	    { id: 8, label: '高速戦艦' },
	    { id: 9, },	    //戦艦
	    { id: 10, },    //航空戦艦
	  ]
	},
	{ label: '空母系',
	  types: [
	    { id: 7, },	    //水母
	    { id: 11, },    //軽水母
	    { id: 16, },    //空母
	    { id: 18, },    //装甲空母
	  ],
	},
	{ label: '潜水艦系',
	  types: [
	    { id: 13, },    //潜水艦
	    { id: 14, },    //潜母
	  ],
	},
	{ label: '輸送艦系',
	  types: [
	    { id: 17, },    //揚陸艦
	  ],
	},
    ];
    let menu = [];
    for( let i = 0; i < stypegroup.length; i++ ){
	let submenu = {
	    label: stypegroup[i].label,
	    menu: [],
	};
	if (stypegroup[i].types.length > 1) {
	    let spec = [];
	    let label = stypegroup[i].label + 'すべて';
	    for( let j = 0; j < stypegroup[i].types.length; j++ )
		spec.push(stypegroup[i].types[j].id);
	    spec = 'stype' + spec.join('-');
	    submenu.menu.push({
				label: label,
				spec: spec,
			      });
	}
	for( let j = 0; j < stypegroup[i].types.length; j++ ){
	    let spec;
	    let label = stypegroup[i].types[j].label;
	    if (!label)
		label = KanColleData.type_name[stypegroup[i].types[j].id];
	    spec = 'stype' + stypegroup[i].types[j].id;
	    submenu.menu.push({
				label: label,
				spec: spec,
			      });
	}
	menu.push(submenu);
    }
    return {
	label: '艦種',
	menu: menu,
    };
}

// Filter by Slotitems
function KanColleSlotitemFilterTemplate(){
    let menu = [];
    let submenu = null;

    let itemlist = Object.keys(KanColleRemainInfo.slotitemowners).sort(function(a,b){
	let type_a = KanColleRemainInfo.slotitemowners[a].type[2];
	let type_b = KanColleRemainInfo.slotitemowners[b].type[2];
	let id_a = KanColleRemainInfo.slotitemowners[a].id;
	let id_b = KanColleRemainInfo.slotitemowners[b].id;
	let diff = type_a - type_b;
	if (!diff)
	    diff = id_a - id_b;
	return diff;
    });

    for (let i = 0; i < itemlist.length; i++) {
	let k = itemlist[i];
	let itemname = KanColleRemainInfo.slotitemowners[k].name;
	let itemtype = KanColleRemainInfo.slotitemowners[k].type[2];
	let itemtypename = KanColleData.slotitem_type[itemtype];
	let itemnum = KanColleRemainInfo.slotitemowners[k].num;
	let itemtotalnum = KanColleRemainInfo.slotitemowners[k].totalnum;
	let itemmenutitle;
	let itemval = 'slotitem' + k;

	if (!itemtypename)
	    itemtypename = 'UNKNOWN_' + itemtype;

	/*
	if (!itemname)
	    itemname = KanColleDatabase.masterSlotitem.get(k).api_name;
	*/
	//debugprint(itemname + ': slotitem' + k);

	itemmenutitle = itemname + '(' + itemnum + '/' + itemtotalnum + ')';

	if (!submenu || lastitemtype != itemtypename) {
	    submenu = {
		label: itemtypename,
		menu: [],
	    };
	    menu.push(submenu);
	    lastitemtype = itemtypename;
	}

	submenu.menu.push({
			    label: itemmenutitle,
			    spec: itemval,
			  });
    }

    return {
	    label: '装備',
	    menu: menu,
    };
}

function KanColleUpgradeFilterTemplate(){
    return {
	    label: '近代化',
	    menu: [
		{
		    label: '改修可能',
		    spec: 'upgrade0',
		},{
		    label: '最高改造段階で改修可能',
		    spec: 'upgrade1',
		},
		{
		    label: '運改修可能',
		    spec: 'upgrade2',
		},{
		    label: '最高改造段階で運改修可能',
		    spec: 'upgrade3',
		},
	    ],
    };
}

function KanColleEvolutionFilterTemplate(){
    return {
	    label: '改造',
	    menu: [
		{
		    label: '非最高改造段階',
		    spec: 'evolution0',
		},{
		    label: '保護下で非最高改造段階',
		    spec: 'evolution1',
		},
	    ],
    };
}

function KanColleBuildFilterMenuList(id){
    let menulist;
    let menupopup;
    let menu;
    let menuitems = [];
    var defaultmenu = null;

    function buildmenuitem(label, value){
	let item = document.createElementNS(XUL_NS, 'menuitem');
	item.setAttribute('label', label);
	if (value)
	    item.setAttribute('value', value);
	item.setAttribute('oncommand', 'ShipListFilter(this);');
	return item;
    }

    function createmenu(templ) {
	let popup;
	let menu;
	let mlist;

	if (!templ)
	    return;

	//debugprint(templ.toSource());

	if (templ.spec) {
	    if (ShipInfoTree.shipfilterspec == templ.spec)
		defaultmenu = buildmenuitem(templ.label, templ.spec);
	    return buildmenuitem(templ.label, templ.spec);
	}

	mlist = [];
	popup = document.createElementNS(XUL_NS, 'menupopup');
	menu = document.createElementNS(XUL_NS, 'menu');

	menu.setAttribute('label', templ.label);
	menu.appendChild(popup);

	if (templ.menu) {
	    for (let i = 0; i < templ.menu.length; i++)
		mlist.push(createmenu(templ.menu[i]));
	}
	for( let i = 0; i < mlist.length; i++ )
	    popup.appendChild(mlist[i]);

	return menu;
    }

    menulist = document.createElementNS(XUL_NS, 'menulist');
    menulist.setAttribute('label', 'XXX');
    menulist.setAttribute('id', id);

    menupopup = document.createElementNS(XUL_NS, 'menupopup');
    menupopup.setAttribute('id', id + '-popup');

    // Default
    menu = buildmenuitem('すべて', null);
    menuitems.push(menu);

    // Build menu by Stype (ship class)
    menu = createmenu(KanColleStypeFilterTemplate());
    if (menu)
	menuitems.push(menu);

    // Build menu by Slotitem
    menu = createmenu(KanColleSlotitemFilterTemplate());
    if (menu)
	menuitems.push(menu);

    // Build menu by upgradability
    menu = createmenu(KanColleUpgradeFilterTemplate());
    if (menu)
	menuitems.push(menu);

    // Build menu by upgradability
    menu = createmenu(KanColleEvolutionFilterTemplate());
    if (menu)
	menuitems.push(menu);

    // Finally build menu
    if (defaultmenu)
	menupopup.appendChild(defaultmenu);
    for (let i = 0; i < menuitems.length; i++)
	menupopup.appendChild(menuitems[i]);

    menulist.appendChild(menupopup);

    return menulist;
}

function ShipListFilter(item){
    let itemval = item ? item.value : null;

    debugprint('ShipListFilter(' + itemval + ')');

    if (itemval)
	ShipInfoTree.shipfilterspec = itemval;
    else
	ShipInfoTree.shipfilterspec = null;

    $('shipinfo-filtermenu').setAttribute('label', item.getAttribute('label'));

    KanColleShipInfoSetView();
}

function KanColleCreateFilterMenuList(box,id)
{
    let oldmenulist = $(id);
    let menulist = KanColleBuildFilterMenuList(id);
    let hbox;

    // Replace existing one or add new one.
    if (oldmenulist) {
	hbox = oldmenulist.parentNode;
	hbox.replaceChild(menulist, oldmenulist);
    }else {
	hbox = CreateElement('hbox');
	hbox.appendChild(menulist);
	box.appendChild(hbox);
    }
}

function KanColleSortMenuPopup(that){
    let value = that.value;
    debugprint('KanColleSortMenuPopup(' + value + ')');

    if (value.match(/:/)) {
	let key = RegExp.leftContext;
	let order = RegExp.rightContext;
	let spec = null;

	if (key.match(/@/)) {
	    spec = RegExp.leftContext;
	    key = RegExp.rightContext;
	} else
	    spec = key;

	ShipInfoTree.sortkey = key;
	ShipInfoTree.sortspec = spec;
	ShipInfoTree.sortorder = order;

	ShipInfoTreeSort();
    }
}

function KanColleBuildSortMenuPopup(id,key){
    let menupopup;
    let idx;
    let colinfo;
    let sortspecs;

    menupopup  = document.createElementNS(XUL_NS, 'menupopup');
    menupopup.setAttribute('id', id);
    menupopup.setAttribute('position', 'overlap');

    idx = ShipInfoTree.collisthash[key];
    colinfo = ShipInfoTree.COLLIST[idx];
    sortspecs = colinfo.sortspecs;
    if (!sortspecs)
	sortspecs = [{ sortspec: colinfo.id, label: colinfo.label, }];

    for (let i = 0; i < sortspecs.length; i++) {
	let ad = [ { val:  1, label: '昇順', },
		   { val: -1, label: '降順', },
	];
	for (let j = 0; j < ad.length; j++) {
	    let menuitem = document.createElementNS(XUL_NS, 'menuitem');

	    //debugprint('key=' + key + ', spec = ' + sortspecs[i].sortspec);

	    menuitem.setAttribute('type', 'radio');
	    menuitem.setAttribute('name', id);
	    menuitem.setAttribute('label', sortspecs[i].label + ad[j].label);
	    menuitem.setAttribute('value', sortspecs[i].sortspec + '@' + key + ':' + ad[j].val);
	    menuitem.setAttribute('oncommand', 'KanColleSortMenuPopup(this);');
	    menupopup.appendChild(menuitem);
	}
    }

    return menupopup;
}

function KanColleCreateSortMenuPopup(box,id,key)
{
    let oldmenupopup = $(id);
    let menupopup = KanColleBuildSortMenuPopup(id,key);

    // Replace existing one or add new one.
    if (oldmenupopup)
	box.replaceChild(menupopup, oldmenupopup);
    else
	box.appendChild(menupopup);
}

function KanColleCreateShipTree(){
    let tree;
    let oldtree;
    let treecols;
    let treechildren;
    let box;

    debugprint('KanColleCreateShipTree()');

    // outer box
    box = $('shipinfo-box');

    // Setup hash
    ShipInfoTree.collisthash = {};
    for (let i = 0; i < ShipInfoTree.COLLIST.length; i++)
	ShipInfoTree.collisthash[ShipInfoTree.COLLIST[i].id] = i;

    // Build filter menu popup
    KanColleCreateFilterMenuList(box,'shipinfo-filtermenu');

    // Build sort menu
    for (let i = 0; i < ShipInfoTree.COLLIST.length; i++) {
	let key = ShipInfoTree.COLLIST[i].id;
	KanColleCreateSortMenuPopup(box, 'shipinfo-sortmenu-' + key, key);
    }

    // Treecols
    treecols = document.createElementNS(XUL_NS, 'treecols');
    treecols.setAttribute('context', 'shipinfo-colmenu');
    treecols.setAttribute('id', 'shipinfo-tree-columns');

    // Check selected items and build menu
    for (let i = 0; i < ShipInfoTree.COLLIST.length; i++) {
	let treecol;
	let colinfo = ShipInfoTree.COLLIST[i];
	let node = $('shipinfo-colmenu-' + colinfo.id);
	let ischecked = node &&
			node.hasAttribute('checked') &&
			node.getAttribute('checked') == 'true';

	treecol = document.createElementNS(XUL_NS, 'treecol');
	treecol.setAttribute('id', 'shipinfo-tree-column-' + colinfo.id);
	treecol.setAttribute('label', colinfo.label);
	if (colinfo.flex)
	    treecol.setAttribute('flex', colinfo.flex);
	treecol.setAttribute('popup', 'shipinfo-sortmenu-' + colinfo.id);
	treecol.setAttribute('class', 'sortDirectionIndicator');
	if (ShipInfoTree.sortkey && colinfo.id == ShipInfoTree.sortkey) {
	    treecol.setAttribute('sortDirection',
				 ShipInfoTree.sortorder > 0 ? 'ascending' : 'descending');
	}
	treecol.setAttribute('hidden', ischecked ? 'false' : 'true');

	if (i) {
	    let splitter = document.createElementNS(XUL_NS, 'splitter');
	    splitter.setAttribute('class', 'tree-splitter');
	    treecols.appendChild(splitter);
	}
	treecols.appendChild(treecol);
    }

    // Treechildren
    treechildren = document.createElementNS(XUL_NS, 'treechildren');
    treechildren.setAttribute('id', 'shipinfo-tree-children');

    // Build tree
    tree = document.createElementNS(XUL_NS, 'tree');
    tree.setAttribute('flex', '1');
    tree.setAttribute('hidecolumnpicker', 'true');
    tree.setAttribute('id', 'shipinfo-tree');

    tree.appendChild(treecols);
    tree.appendChild(treechildren);

    // Replace existing tree, or append one.
    oldtree = $('shipinfo-tree');
    if (oldtree)
	box.replaceChild(tree, oldtree);
    else
	box.appendChild(tree);
}

function ShipInfoTreeSort(){
    let order;
    let id;
    let key;
    let dir;

    debugprint('ShipInfoSort()');

    dir = ShipInfoTree.sortorder > 0 ? 'ascending' : 'descending';

    for (i = 0; i < ShipInfoTree.COLLIST.length; i++) {
	let colid = ShipInfoTree.COLLIST[i].id;
	if (colid == ShipInfoTree.sortkey)
	    $('shipinfo-tree-column-' + colid).setAttribute('sortDirection', dir);
	else
	    $('shipinfo-tree-column-' + colid).removeAttribute('sortDirection');
    }

    //debugprint('key=' + ShipInfoTree.sortkey + ', order=' + ShipInfoTree.sortorder);

    KanColleShipInfoSetView();
}

function getShipProperties(ship,name)
{
    const propmap = {
	karyoku: { kidx: 0, master: 'houg', },
	raisou:  { kidx: 1, master: 'raig', },
	taiku:   { kidx: 2, master: 'tyku', },
	soukou:  { kidx: 3, master: 'souk', },
	lucky:   { kidx: 4, master: 'luck', },
    };
    let prop = {
	cur: null,
	max: null,
	str: null,
	remain: null,
    };
    let shiptype;
    shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
    prop.cur = ship['api_' + name][0];
    prop.max = prop.cur - ship.api_kyouka[propmap[name].kidx] +
	       shiptype['api_' + propmap[name].master][1] -
	       shiptype['api_' + propmap[name].master][0];
    prop.str = prop.cur + '/' + prop.max;
    prop.remain = prop.max - prop.cur;
    return prop;
}

function getShipSlotitem(ship,slot){
    let idx = slot - 1;
    let name;

    if (idx >= ship.api_slotnum)
	return '';

    if (ship.api_slot[idx] < 0)
	return '-';

    item = KanColleDatabase.memberSlotitem.get(ship.api_slot[idx]);
    if (!item)
	return '!';

    if (item.api_name)
	name = item.api_name;
    else {
	let itemtype = KanColleDatabase.masterSlotitem.get(item.api_slotitem_id);
	if (!itemtype)
	    return '?';
	name = itemtype.api_name;
    }
    return name;
}

function DefaultSortFunc(ship_a,ship_b,order){
    let shiptype_a = KanColleDatabase.masterShip.get(ship_a.api_ship_id);
    let shiptype_b = KanColleDatabase.masterShip.get(ship_b.api_ship_id);
    let ret;
    if (shiptype_a === undefined || shiptype_b === undefined)
	return ((shiptype_a !== undefined ? 1 : 0) - (shiptype_b !== undefined ? 1 : 0)) * order;
    ret = shiptype_a.api_stype - shiptype_b.api_stype;
    if (ret)
	return ret;
    //ゲーム内ソートは艦種と艦船の順位づけが逆
    return ship_b.api_sortno - ship_a.api_sortno;
}

function ShipExp(ship){
    let ship_exp;
    if (typeof(ship.api_exp) == 'object') {
	// 2013/12/11よりAPI変更
	// 0: 現在経験値
	// 1: 次Lvまでの必要経験値
	// 2: 現在Lvでの獲得経験値(%)
	return ship.api_exp[0];
    } else
	return ship.api_exp;
}

function ShipNextLvExp(ship){
    let nextexp = KanColleData.level_accumexp[ship.api_lv];
    if (nextexp === undefined)
	return undefined;
    else if (nextexp < 0)
	return Number.POSITIVE_INFINITY;
    return nextexp;
}

function ShipUpgradeableExp(ship){
    let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
    let nextlv = shiptype ? shiptype.api_afterlv : 0;
    let nextexp;
    if (nextlv > 0) {
	nextexp = KanColleData.level_accumexp[nextlv - 1];
	if (nextexp === undefined || nextexp < 0)
	    return undefined;
    } else
	nextexp = Number.POSITIVE_INFINITY;
    return nextexp;
}

function TreeView(){
    var that = this;
    var shiplist;

    key = null;
    spec = null;
    order = null;
    let id;

    var key = ShipInfoTree.sortkey;
    var spec = ShipInfoTree.sortspec;
    var order = ShipInfoTree.sortorder;

    // getCellText function table by column ID
    var shipcellfunc = {
	fleet: function(ship) {
	    let fleet = KanColleRemainInfo.shipfleet[ship.api_id];
	    if (fleet)
		return fleet.fleet;
	    return '';
	},
	id: function(ship) {
	    return ship.api_id;
	},
	stype: function(ship) {
	    let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
	    if (!shiptype)
		return -1;
	    return KanColleData.type_name[shiptype.api_stype];
	},
	name: function(ship) {
	    return FindShipNameByCatId(ship.api_ship_id);
	},
	//_sortno: function(ship) {
	//    return ship.api_sortno;
	//},
	_yomi: function(ship) {
	    let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id)
	    if (!shiptype)
		return 0;
	    return shiptype.api_yomi;
	},
	lv: function(ship) {
	    let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
	    let nextlv = shiptype ? shiptype.api_afterlv : 0;
	    if (!nextlv)
		nextlv = '-';
	    return ship.api_lv + '/' + nextlv;
	},
	_lv: function(ship) {
	    return ship.api_lv;
	},
	_lvupg: function(ship) {
	    let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
	    let nextlv = shiptype ? shiptype.api_afterlv : 0;
	    if (!nextlv)
		nextlv = '';
	    return nextlv;
	},
	_lvupgremain: function(ship) {
	    let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
	    let nextlv = shiptype ? shiptype.api_afterlv : 0;
	    if (!nextlv)
		return '';
	    return nextlv - ship.api_lv;
	},
	exp: function(ship) {
	    let nextlvexp = ShipNextLvExp(ship);
	    let nextupgexp = ShipUpgradeableExp(ship);
	    let ship_exp = ShipExp(ship);

	    if (nextlvexp === undefined)
		nextlvexp = '?';
	    else if (nextlvexp == Number.POSITIVE_INFINITY)
		nextlvexp = '-';

	    if (nextupgexp === undefined)
		nextupgexp = '?';
	    else if (nextupgexp === Number.POSITIVE_INFINITY)
		nextupgexp = '-';

	    return ship_exp + '/' + nextlvexp + '/' + nextupgexp;
	},
	_exp: function(ship) {
	    return ShipExp(ship);
	},
	_expnext: function(ship) {
	    let expnext = ShipNextLvExp(ship);
	    if (expnext != Number.POSITIVE_INFINITY)
		return expnext;
	    return '';
	},
	_expnextremain: function(ship) {
	    let expnextremain = ShipNextLvExp(ship) - ShipExp(ship);
	    if (expnextremain != Number.POSITIVE_INFINITY)
		return expnextremain;
	    return '';
	},
	_expupg: function(ship) {
	    let expnext = ShipUpgradeableExp(ship);
	    if (expnext != Number.POSITIVE_INFINITY)
		return expnext;
	    return '';
	},
	_expupgremain: function(ship) {
	    let expnextremain = ShipUpgradeableExp(ship) - ShipExp(ship);
	    if (expnextremain != Number.POSITIVE_INFINITY)
		return expnextremain;
	    return '';
	},
	hp: function(ship) {
	    let info = FindShipStatus(ship.api_id);
	    return info ? info.nowhp + '/' + info.maxhp : '';
	},
	_hp: function(ship) {
	    let info = FindShipStatus(ship.api_id);
	    return info ? info.nowhp : '';
	},
	_maxhp: function(ship) {
	    let info = FindShipStatus(ship.api_id);
	    return info ? info.maxhp : '';
	},
	karyoku:	function(ship) { return getShipProperties(ship,'karyoku').str; },
	_karyoku:	function(ship) { return getShipProperties(ship,'karyoku').cur; },
	_karyokumax:	function(ship) { return getShipProperties(ship,'karyoku').max; },
	_karyokuremain:	function(ship) { return getShipProperties(ship,'karyoku').remain; },
	raisou:		function(ship) { return getShipProperties(ship,'raisou').str; },
	_raisou:	function(ship) { return getShipProperties(ship,'raisou').cur; },
	_raisoumax:	function(ship) { return getShipProperties(ship,'raisou').max; },
	_raisouremain:	function(ship) { return getShipProperties(ship,'raisou').remain; },
	taiku:		function(ship) { return getShipProperties(ship,'taiku').str; },
	_taiku:		function(ship) { return getShipProperties(ship,'taiku').cur; },
	_taikumax:	function(ship) { return getShipProperties(ship,'taiku').max; },
	_taikuremain:	function(ship) { return getShipProperties(ship,'taiku').remain; },
	soukou:		function(ship) { return getShipProperties(ship,'soukou').str; },
	_soukou:	function(ship) { return getShipProperties(ship,'soukou').cur; },
	_soukoumax:	function(ship) { return getShipProperties(ship,'soukou').max; },
	_soukouremain:	function(ship) { return getShipProperties(ship,'soukou').remain; },
	kaihi: function(ship) { return ship.api_kaihi[0]; },
	taisen: function(ship) { return ship.api_taisen[0]; },
	sakuteki: function(ship) { return ship.api_sakuteki[0]; },
	soku: function(ship) { return KanColleDatabase.masterShip.get(ship.api_ship_id).api_soku; },
	length: function(ship) { return ship.api_leng; },
	lucky:		function(ship) { return getShipProperties(ship,'lucky').str; },
	_lucky:		function(ship) { return getShipProperties(ship,'lucky').cur; },
	_luckymax:	function(ship) { return getShipProperties(ship,'lucky').max; },
	_luckyremain:	function(ship) { return getShipProperties(ship,'lucky').remain; },
	ndock: function(ship) {
	    let ndocktime = ship.api_ndock_time;
	    let hour;
	    let min;
	    if (!ndocktime)
		return '-';
	    min = Math.floor(ndocktime / 60000);
	    hour = Math.floor(min / 60);
	    min -= hour * 60;
	    if (min < 10)
		min = '0' + min;
	    return hour + ':' + min;
	},
	_ndock: function(ship) {
	    return ship.api_ndock_time;
	},
	cond: function(ship) {
	    return FindShipCond(ship.api_id);
	},
	slotitem1: function(ship) {
	    return getShipSlotitem(ship,1);
	},
	slotitem2: function(ship) {
	    return getShipSlotitem(ship,2);
	},
	slotitem3: function(ship) {
	    return getShipSlotitem(ship,3);
	},
	slotitem4: function(ship) {
	    return getShipSlotitem(ship,4);
	},
    };

    // Ship list
    shiplist = KanColleDatabase.memberShip2.list().slice();
    if (ShipInfoTree.shipfilterspec) {
	let filterspec = ShipInfoTree.shipfilterspec;
	if (filterspec.match(/^slotitem(\d+)$/)) {
	    let slotitemid = RegExp.$1;
	    let owners = KanColleRemainInfo.slotitemowners[slotitemid];
	    shiplist = owners ? Object.keys(owners.list) : [];
	} else if (filterspec.match(/^stype((\d+-)*\d+)$/)) {
	    let stypesearch = '-' + RegExp.$1 + '-';
	    let slist = [];
	    for (let i = 0; i < shiplist.length; i++) {
		let shiptype;
		let ship = KanColleDatabase.memberShip2.get(shiplist[i]);
		if (!ship)
		    continue;
		shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
		if (!shiptype)
		    continue;
		if (stypesearch.indexOf('-' + shiptype.api_stype + '-') != -1)
		    slist.push(shiplist[i]);
	    }
	    shiplist = slist;
	} else if (filterspec.match(/^upgrade(\d+)$/)) {
	    const proplists = [ [ 'karyoku', 'raisou', 'taiku', 'soukou' ],
			        [ 'lucky' ] ];
	    let param = parseInt(RegExp.$1, 10);
	    let upgrade = (param & 1) ? 1 : 0;
	    let proplist = proplists[(param & 2) ? 1 : 0];
	    let ships = [];
	    for( let i = 0; i < shiplist.length; i++ ){
		let ship = KanColleDatabase.memberShip2.get(shiplist[i]);
		let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
		if (upgrade && shiptype.api_afterlv)
		    continue;
		for (j = 0; j < proplist.length; j++) {
		    k = proplist[j];
		    let p = getShipProperties(ship,k);
		    if (p && p.remain) {
			ships.push(shiplist[i]);
			break;
		    }
		}
	    }
	    shiplist = ships;
	} else if (filterspec.match(/^evolution(\d+)$/)) {
	    let locked = parseInt(RegExp.$1, 10);
	    let ships = [];
	    for( let i = 0; i < shiplist.length; i++ ){
		let ship = KanColleDatabase.memberShip2.get(shiplist[i]);
		let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
		if (!shiptype.api_afterlv)
		    continue;
		if (locked && !ship.api_locked)
		    continue;
		ships.push(shiplist[i]);
	    }
	    shiplist = ships;
	} else {
	    debugprint('invalid filterspec "' + filterspec + '"; ignored');
	}
    }

    //
    // Sort ship list
    //
    // default comparison function
    var objcmp = function(a,b) {
	if (a > b)
	    return 1;
	else if (a < b)
	    return -1;
	return 0;
    };

    // special comparision function: each function takes two 'ship's
    var shipcmpfunc = {
	fleet: function(ship_a,ship_b){
	    let fleet_a = KanColleRemainInfo.shipfleet[ship_a.api_id];
	    let fleet_b = KanColleRemainInfo.shipfleet[ship_b.api_id];
	    let ret;
	    if (!fleet_a || !fleet_b)
		return ((fleet_b ? 1 : 0) - (fleet_a ? 1 : 0)) * order;
	    if (!fleet_a.fleet || !fleet_b.fleet)
		return ((fleet_b.fleet ? 1 : 0) - (fleet_a.fleet ? 1 : 0)) * order;
	    ret = fleet_a.fleet - fleet_b.fleet;
	    if (ret)
		return ret;
	    ret = (fleet_a.pos - fleet_b.pos) * order;
	    if (ret)
		return ret;
	    return DefaultSortFunc(ship_b,ship_a,order);
	},
	_stype: function(ship_a,ship_b){
	    return DefaultSortFunc(ship_a,ship_b,order);
	},
	_lvupg: function(ship_a,ship_b){
	    let shiptype_a = KanColleDatabase.masterShip.get(ship_a.api_ship_id);
	    let lv_a = shiptype ? shiptype_a.api_afterlv : 0;
	    let shiptype_b = KanColleDatabase.masterShip.get(ship_b.api_ship_id);
	    let lv_b = shiptype ? shiptype_b.api_afterlv : 0;
	    if (!lv_a)
		lv_a = Number.POSITIVE_INFINITY;
	    if (!lv_b)
		lv_b = Number.POSITIVE_INFINITY;
	    if (lv_a == Number.POSITIVE_INFINITY &&
		lv_b == Number.POSITIVE_INFINITY)
		return 0;
	    return lv_a - lv_b;
	},
	_lvupgremain: function(ship_a,ship_b){
	    let shiptype_a = KanColleDatabase.masterShip.get(ship_a.api_ship_id);
	    let lv_a = shiptype_a ? shiptype_a.api_afterlv : 0;
	    let shiptype_b = KanColleDatabase.masterShip.get(ship_b.api_ship_id);
	    let lv_b = shiptype_b ? shiptype_b.api_afterlv : 0;
	    if (!lv_a)
		lv_a = Number.POSITIVE_INFINITY;
	    if (!lv_b)
		lv_b = Number.POSITIVE_INFINITY;
	    if (lv_a == Number.POSITIVE_INFINITY &&
		lv_b == Number.POSITIVE_INFINITY)
		return 0;
	    lv_a -= ship_a.api_lv;
	    lv_b -= ship_b.api_lv;
	    return lv_a - lv_b;
	},
	_expnext: function(ship_a,ship_b) {
	    let nextexp_a = ShipNextLvExp(ship_a);
	    let nextexp_b = ShipNextLvExp(ship_b);
	    if (nextexp_a === undefined)
		nextexp_a = Number.POSITIVE_INFINITY;
	    if (nextexp_b === undefined)
		nextexp_b = Number.POSITIVE_INFINITY;
	    if (nextexp_a == Number.POSITIVE_INFINITY &&
	        nextexp_b == Number.POSITIVE_INFINITY)
		return 0;
	    return nextexp_a - nextexp_b;
	},
	_expnextremain: function(ship_a,ship_b) {
	    let nextexp_a = ShipNextLvExp(ship_a);
	    let nextexp_b = ShipNextLvExp(ship_b);
	    if (nextexp_a === undefined)
		nextexp_a = Number.POSITIVE_INFINITY;
	    if (nextexp_b === undefined)
		nextexp_b = Number.POSITIVE_INFINITY;
	    if (nextexp_a == Number.POSITIVE_INFINITY &&
	        nextexp_b == Number.POSITIVE_INFINITY)
		return 0;
	    nextexp_a -= ShipExp(ship_a);
	    nextexp_b -= ShipExp(ship_b);
	    return nextexp_a - nextexp_b;
	},
	_expupg: function(ship_a,ship_b) {
	    let nextexp_a = ShipUpgradeableExp(ship_a);
	    let nextexp_b = ShipUpgradeableExp(ship_b);
	    if (nextexp_a === undefined)
		nextexp_a = Number.POSITIVE_INFINITY;
	    if (nextexp_b === undefined)
		nextexp_b = Number.POSITIVE_INFINITY;
	    if (nextexp_a == Number.POSITIVE_INFINITY &&
	        nextexp_b == Number.POSITIVE_INFINITY)
		return 0;
	    return nextexp_a - nextexp_b;
	},
	_expupgremain: function(ship_a,ship_b) {
	    let nextexp_a = ShipUpgradeableExp(ship_a);
	    let nextexp_b = ShipUpgradeableExp(ship_b);
	    if (nextexp_a === undefined)
		nextexp_a = Number.POSITIVE_INFINITY;
	    if (nextexp_b === undefined)
		nextexp_b = Number.POSITIVE_INFINITY;
	    if (nextexp_a == Number.POSITIVE_INFINITY &&
	        nextexp_b == Number.POSITIVE_INFINITY)
		return 0;
	    nextexp_a -= ShipExp(ship_a);
	    nextexp_b -= ShipExp(ship_b);
	    return nextexp_a - nextexp_b;
	},
    };

    // default
    if (key === undefined)
	key = 'id';
    if (spec === undefined)
	spec = key;
    if (order === undefined)
	order = 1;

    shiplist = shiplist.sort(function(a, b) {
	let res = 0;

	do {
	    let ship_a = KanColleDatabase.memberShip2.get(a);
	    let ship_b = KanColleDatabase.memberShip2.get(b);

	    if (!ship_a || !ship_b)
		return ((ship_a ? 1 : 0) - (ship_b ? 1 : 0)) * order;

	    if (shipcmpfunc[spec] !== undefined)
		res = shipcmpfunc[spec](ship_a,ship_b);
	    else if (shipcellfunc[spec] !== undefined) {
		let va = shipcellfunc[spec](ship_a);
		let vb = shipcellfunc[spec](ship_b);
		res = objcmp(va,vb);
	    }
	    // tie breaker: id
	    if (res || key == 'id');
		break;
	    key = 'id';
	} while(1);
	return res * order;
    });

    // our local interface
    this.saveShipList = function(){
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	let rv;
	let cos;

	fp.init(window, "艦船リストの保存...", nsIFilePicker.modeSave);
	fp.defaultExtension = 'txt';
	fp.appendFilter("テキストCSV","*.csv; *.txt");
	fp.appendFilters(nsIFilePicker.filterText);
	fp.appendFilters(nsIFilePicker.filterAll);
	rv = fp.show();

	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    let file = fp.file;
	    let path = fp.file.path;
	    let os = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
	    let flags = 0x02|0x08|0x20;// writeonly|create|truncate
	    os.init(file,flags,0664,0);
	    cos = GetUTF8ConverterOutputStream(os);
	}

	// ZERO-WIDTH NO-BREAK SPACE (used as BOM)
	// とある表計算ソフトでは、UTF-8な.csvファイルにはこれがないと
	// "文字化け"する。一方、.txtなら問題ない。
	//cos.writeString('\ufeff');
	for (let i = -1; i < shiplist.length; i++) {
	    let a = [];
	    let ship = KanColleDatabase.memberShip2.get(shiplist[i]);
	    for (let j = 0; j < ShipInfoTree.COLLIST.length; j++){
		if (!ShipInfoTree.COLLIST[j].subdump) {
		    let val;
		    if (i < 0)
			val = ShipInfoTree.COLLIST[j].label;
		    else
			val = '' + shipcellfunc[ShipInfoTree.COLLIST[j].id](ship);
		    a.push(val.replace(/,/g,'_').replace(/"/g,'_'));
		}
		if (!ShipInfoTree.COLLIST[j].sortspecs)
		    continue;
		for (let k = 0; k < ShipInfoTree.COLLIST[j].sortspecs.length; k++) {
		    let val;
		    if (ShipInfoTree.COLLIST[j].sortspecs[k].skipdump)
			continue;
		    if (!shipcellfunc[ShipInfoTree.COLLIST[j].sortspecs[k].sortspec]) {
			a.push('<'+ShipInfoTree.COLLIST[j].sortspecs[k].sortspec+'>');
			continue;
		    }
		    if (i < 0)
			val = ShipInfoTree.COLLIST[j].sortspecs[k].label;
		    else
			val = '' + shipcellfunc[ShipInfoTree.COLLIST[j].sortspecs[k].sortspec](ship);
		    a.push(val.replace(/,/g,'_').replace(/"/g,'_'));
		}
	    }
	    cos.writeString(a.join(',')+'\n');
	}
	cos.close();
    };

    //
    // the nsITreeView object interface
    //
    this.rowCount = shiplist.length;
    this.getCellText = function(row,column){
	let colid = column.id.replace(/^shipinfo-tree-column-/, '');
	let ship;
	let func;

	if (row >= this.rowCount)
	    return 'N/A';

	ship = KanColleDatabase.memberShip2.get(shiplist[row]);
	if (!ship)
	    return 'N/A';

	func = shipcellfunc[colid];
	if (func)
	    ret = func(ship);
	else
	    ret = colid + '_' + row;
	return ret;
    };
    this.setTree = function(treebox){ this.treebox = treebox; };
    this.isContainer = function(row){ return false; };
    this.isSeparator = function(row){ return false; };
    this.isSorted = function(){ return false; };
    this.getLevel = function(row){ return 0; };
    this.getImageSrc = function(row,col){ return null; };
    this.getRowProperties = function(row,props){};
    this.getCellProperties = function(row,col,props){};
    this.getColumnProperties = function(col,props){};
    this.cycleHeader = function(col,elem){};
};

function KanColleShipInfoSetView(){
    let menu = $('saveshiplist-menu');
    debugprint('KanColleShipInfoSetView()');
    ShipListView = new TreeView();
    if (menu)
	menu.setAttribute('disabled', 'false');
    $('shipinfo-tree').view = ShipListView;
}

function ShipInfoTreeMenuPopup(){
    debugprint('ShipInfoTreeMenuPopup()');
    KanColleCreateShipTree();
    KanColleShipInfoSetView();
}

function KanColleShipInfoInit(){
    debugprint('KanColleShipInfoInit()');
    KanColleCreateShipTree();
    KanColleShipInfoSetView();
}

/**
 * ライブラリ初期化/後始末
 */
function KanColleTimerLibInit(){
    KanColleShipInfoInit();
    KanColleKdockMouseEventHandler.init();
}

function KanColleTimerLibExit(){
    KanColleKdockMouseEventHandler.exit();
}

/**
 * Style
 */
function SetStyleProperty(node, prop, value, prio){
    if (value === undefined || value === null)
	node.style.removeProperty(prop);
    else {
	if (prio === undefined || prio === null)
	    prio = '';
	node.style.setProperty(prop,value,prio);
    }
}

/**
 * 艦これを開いているタブを返す
 * @return Tabを返す。なければnull
 */
function FindKanColleTab(){
    let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    let browserEnumerator = wm.getEnumerator("navigator:browser");
    let url = "www.dmm.com/netgame/social/-/gadgets/=/app_id=854854";
    while(browserEnumerator.hasMoreElements()) {
	let browserInstance = browserEnumerator.getNext().gBrowser;
	// browser インスタンスの全てのタブを確認する.
	let numTabs = browserInstance.tabContainer.childNodes.length;
	for(let index=0; index<numTabs; index++) {
	    let currentBrowser = browserInstance.getBrowserAtIndex(index);
	    if (currentBrowser.currentURI.spec.indexOf(url) != -1) {
		return browserInstance.tabContainer.childNodes[index];
	    }
	}
    }
    return null;
}

/**
 * 指定のURLを開く.
 * @param url URL
 * @param hasfocus 開いたタブがフォーカスを得るか
 */
function OpenDefaultBrowser(url, hasfocus){
    let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    let browserEnumerator = wm.getEnumerator("navigator:browser");
    let browserInstance;
    while(browserEnumerator.hasMoreElements()) {
	browserInstance = browserEnumerator.getNext().gBrowser;
    }

    let tab = browserInstance.addTab( url );
    if( hasfocus ){
	browserInstance.selectedTab = tab;
    }
    return tab;
}

/**
 * Windowの最前面表示設定をする.
 * @note Windows/Firefox 17以降でのみ有効
 * @param win Window
 * @param istop 最前面にするならtrue
 */
function WindowOnTop(win, istop){
    try{
	let baseWin = win.QueryInterface(Ci.nsIInterfaceRequestor)
	    .getInterface(Ci.nsIWebNavigation)
	    .QueryInterface(Ci.nsIDocShellTreeItem)
	    .treeOwner
	    .QueryInterface(Ci.nsIInterfaceRequestor)
	    .nsIBaseWindow;
	let nativeHandle = baseWin.nativeHandle;

	let lib = ctypes.open('user32.dll');

	let HWND_TOPMOST = -1;
	let HWND_NOTOPMOST = -2;
	let SWP_NOMOVE = 2;
	let SWP_NOSIZE = 1;

	/*
	 WINUSERAPI BOOL WINAPI SetWindowPos(
	 __in HWND hWnd, 
	 __in_opt HWND hWndInsertAfter,
	 __in int X,
	 __in int Y,
	 __in int cx,
	 __in int cy,
	 __in UINT uFlags );
	 */
	let SetWindowPos = lib.declare("SetWindowPos",
				       ctypes.winapi_abi, // abi
				       ctypes.int32_t,     // return type
				       ctypes.int32_t,     // hWnd arg 1 HWNDはint32_tでOK
				       ctypes.int32_t,     // hWndInsertAfter
				       ctypes.int32_t,     // X
				       ctypes.int32_t,     // Y
				       ctypes.int32_t,     // cx
				       ctypes.int32_t,     // cy
				       ctypes.uint32_t);   // uFlags
	SetWindowPos( parseInt(nativeHandle), istop?HWND_TOPMOST:HWND_NOTOPMOST,
		      0, 0, 0, 0,
		      SWP_NOMOVE | SWP_NOSIZE);
	lib.close();
    } catch (x) {
    }
}

/**
 * サウンド再生をする.
 * @param path ファイルのパス
 */
function PlaySound( path ){
    try{
	//debugprint(path);
	let IOService = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
	let localFile = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
	let sound = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
	localFile.initWithPath( path );
	sound.play(IOService.newFileURI(localFile));
	//sound.playEventSound(0);
    } catch (x) {
    }
}


function $(tag){
    return document.getElementById(tag);
}

function $$(tag){
    return document.getElementsByTagName(tag);
}

/**
 * オブジェクトをマージする.
 * @param a オブジェクト1
 * @param b オブジェクト2
 * @param aにbをマージしたオブジェクトを返す
 */
function MergeSimpleObject(a,b)
{
    for(let k in b){
	a[k] = b[k];
    }
    return a;
}

/**
 * 配列をシャッフルする.
 * @param list 配列
 */
function ShuffleArray( list ){
    let i = list.length;
    while(i){
	let j = Math.floor(Math.random()*i);
	let t = list[--i];
	list[i] = list[j];
	list[j] = t;
    }
}


function GetAddonVersion()
{
    let version;
    try{
	let em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
	let addon = em.getItemForID("kancolletimer@miku39.jp");
	version = addon.version;
    } catch (x) {
	// Fx4
	AddonManager.getAddonByID("kancolletimer@miku39.jp",
				  function(addon) {
				      version = addon.version;
				  });
	// Piroさん(http://piro.sakura.ne.jp/)が値が設定されるまで待つことをやっていたので真似してしまう.
	let thread = Components.classes['@mozilla.org/thread-manager;1'].getService().mainThread;
	while (version === void(0)) {
	    thread.processNextEvent(true);
	}
    }
    return version;
}

function GetXmlText(xml,path){
    try{
	let tmp = evaluateXPath(xml,path);
	if( tmp.length<=0 ) return null;
	return tmp[0].textContent;
    } catch (x) {
	debugprint(x);
	return null;
    }
}

// 特定の DOM ノードもしくは Document オブジェクト (aNode) に対して
// XPath 式 aExpression を評価し、その結果を配列として返す。
// 最初の作業を行った wanderingstan at morethanwarm dot mail dot com に感謝します。
function evaluateXPath(aNode, aExpr) {
    let xpe = new XPathEvaluator();
    let nsResolver = xpe.createNSResolver(aNode.ownerDocument == null ?
					  aNode.documentElement : aNode.ownerDocument.documentElement);
    let result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
    let found = [];
    let res;
    while (res = result.iterateNext())
	found.push(res);
    return found;
}
function evaluateXPath2(aNode, aExpr) {
    let xpe = new XPathEvaluator();
    let nsResolver = function(){ return XUL_NS; };
    let result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
    let found = [];
    let res;
    while (res = result.iterateNext())
	found.push(res);
    return found;
}

function CreateElement(part){
    let elem;
    elem = document.createElementNS(XUL_NS,part);
    return elem;
}
function CreateHTMLElement(part){
    let elem;
    elem = document.createElementNS(HTML_NS,part);
    return elem;
}

/**
 * 指定の要素を削除する.
 * @param elem 削除したい要素
 */
function RemoveElement(elem){
    elem.parentNode.removeChild(elem);
}

/**
 * 指定の要素の子要素を全削除する.
 * @param elem 対象の要素
 */
function RemoveChildren(elem){
    while(elem.hasChildNodes()) { 
	elem.removeChild(elem.childNodes[0]);
    }
}

function CreateMenuItem(label,value){
    let elem;
    elem = document.createElementNS(XUL_NS,'menuitem');
    elem.setAttribute('label',label);
    elem.setAttribute('value',value);
    return elem;
};

function CreateButton(label){
    let elem;
    elem = document.createElementNS(XUL_NS,'button');
    elem.setAttribute('label',label);
    return elem;
}

function CreateLabel(label){
    let elem;
    elem = document.createElementNS(XUL_NS,'label');
    elem.setAttribute('value',label);
    return elem;
}

function CreateListCell(label){
    let elem;
    elem = document.createElementNS(XUL_NS,'listcell');
    elem.setAttribute('label',label);
    return elem;
}

/** ディレクトリを作成する.
 * ディレクトリ掘ったらtrue、掘らなかったらfalseを返す.
 */
function CreateFolder(path){
    let file = OpenFile(path);
    if( !file.exists() || !file.isDirectory() ) {   // if it doesn't exist, create
	file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
	return true;
    }
    return false;
}

/**
 * ファイルを開く
 */
function OpenFile(path){
    let localfileCID = '@mozilla.org/file/local;1';
    let localfileIID =Components.interfaces.nsILocalFile;
    try {
	let file = Components.classes[localfileCID].createInstance(localfileIID);
	file.initWithPath(path);
	return file;
    }
    catch(e) {
	return false;
    }
}

// NicoLiveHelperのインストールパスを返す.
function GetExtensionPath(){
    let id = "kancolletimer@miku39.jp";
    let ext;
    try{
	ext = Components.classes["@mozilla.org/extensions/manager;1"]
            .getService(Components.interfaces.nsIExtensionManager)
            .getInstallLocation(id)
            .getItemLocation(id);
    } catch (x) {
	let _addon;
	AddonManager.getAddonByID("kancolletimer@miku39.jp",
				  function(addon) {
				      _addon = addon;
				  });
	// Piroさん(http://piro.sakura.ne.jp/)が値が設定されるまで待つことをやっていたので真似してしまう.
	let thread = Components.classes['@mozilla.org/thread-manager;1'].getService().mainThread;
	while (_addon === void(0)) {
	    thread.processNextEvent(true);
	}
	ext = _addon.getResourceURI('/').QueryInterface(Components.interfaces.nsIFileURL).file.clone();
    }
    return ext;
}

function PlayAlertSound(){
    let sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
    sound.playSystemSound("_moz_alertdialog");
}

function AlertPrompt(text,caption){
    let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    let result = prompts.alert(window, caption, text);
    return result;
}

function ConfirmPrompt(text,caption){
    let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    let result = prompts.confirm(window, caption, text);
    return result;
}

function InputPrompt(text,caption,input){
    let check = {value: false};
    let input_ = {value: input};

    let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    let result = prompts.prompt(window, caption, text, input_, null, check);
    if( result ){
	return input_.value;
    }else{
	return null;
    }
}

function InputPromptWithCheck(text,caption,input,checktext){
    let check = {value: false};
    let input_ = {value: input};

    let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    let result = prompts.prompt(window, caption, text, input_, checktext, check);
    if( result ){
	return input_.value;
    }else{
	return null;
    }
}

/**
 *  Javascriptオブジェクトをファイルに保存する.
 * @param obj Javascriptオブジェクト
 * @param caption ファイル保存ダイアログに表示するキャプション
 */
function SaveObjectToFile(obj,caption)
{
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, caption, nsIFilePicker.modeSave);
    fp.appendFilters(nsIFilePicker.filterAll);
    let rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	let file = fp.file;
	let path = fp.file.path;
	let os = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
	let flags = 0x02|0x08|0x20;// wronly|create|truncate
	os.init(file,flags,0664,0);
	let cos = GetUTF8ConverterOutputStream(os);
	cos.writeString( JSON.stringify(obj) );
	cos.close();
    }
}

/**
 *  ファイルからJavascriptオブジェクトを読み込む.
 * @param caption ファイル読み込みダイアログに表示するキャプション
 */
function LoadObjectFromFile(caption)
{
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, caption, nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterAll);
    let rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	let file = fp.file;
	let path = fp.file.path;
	let istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(file, 0x01, 0444, 0);
	istream.QueryInterface(Components.interfaces.nsILineInputStream);
	let cis = GetUTF8ConverterInputStream(istream);
	// 行を配列に読み込む
	let line = {}, hasmore;
	let str = "";
	do {
	    hasmore = cis.readString(1024,line);
	    str += line.value;
	} while(hasmore);
	istream.close();

	try{
	    let obj = JSON.parse(str);
	    return obj;
	} catch (x) {
	    debugprint(x);
	    return null;
	}
    }
    return null;
}


/**
 * 指定タグを持つ親要素を探す.
 * @param elem 検索の起点となる要素
 * @param tag 親要素で探したいタグ名
 */
function FindParentElement(elem,tag){
    //debugprint("Element:"+elem+" Tag:"+tag);
    while(elem.parentNode &&
	  (!elem.tagName || (elem.tagName.toUpperCase()!=tag.toUpperCase()))){
	elem = elem.parentNode;
    }
    return elem;
}


/**
 * クリップボードにテキストをコピーする.
 * @param str コピーする文字列
 */
function CopyToClipboard(str){
    if(str.length<=0) return;
    let gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].  
	getService(Components.interfaces.nsIClipboardHelper);  
    gClipboardHelper.copyString(str);
}

function htmlspecialchars(ch){
    ch = ch.replace(/&/g,"&amp;");
    ch = ch.replace(/"/g,"&quot;");
    //ch = ch.replace(/'/g,"&#039;");
    ch = ch.replace(/</g,"&lt;");
    ch = ch.replace(/>/g,"&gt;");
    return ch ;
}

function restorehtmlspecialchars(ch){
    ch = ch.replace(/&quot;/g,"\"");
    ch = ch.replace(/&amp;/g,"&");
    ch = ch.replace(/&lt;/g,"<");
    ch = ch.replace(/&gt;/g,">");
    ch = ch.replace(/&nbsp;/g," ");
    ch = ch.replace(/&apos;/g,"'");
    return ch;
}

function syslog(txt){
    let tmp = GetDateString( GetCurrentTime()*1000 );
    txt = tmp + " " +txt;
    if( $('syslog-textbox') )
	$('syslog-textbox').value += txt + "\n";
}

function debugprint(txt){
    /*
    if( $('debug-textbox') )
	$('debug-textbox').value += txt + "\n";
     */
    Application.console.log(txt);
}

function debugconsole(txt){
    Application.console.log(txt);
}

function debugalert(txt){
    AlertPrompt(txt,'');
}

function ShowPopupNotification(imageURL,title,text,cookie){
    let listener = null;
    let clickable = false;
    try {
	let alertserv = Components.classes['@mozilla.org/alerts-service;1'].getService(Components.interfaces.nsIAlertsService);
	//	    alertserv.showAlertNotification(imageURL, title, text, clickable, cookie, listener, 'NicoLiveAlertExtension');
	alertserv.showAlertNotification(imageURL, title, text, clickable, cookie, listener);
    } catch(e) {
	// prevents runtime error on platforms that don't implement nsIAlertsService
	let image = imageURL;
	let win = Components.classes['@mozilla.org/embedcomp/window-watcher;1'].getService(Components.interfaces.nsIWindowWatcher)
	    .openWindow(null, 'chrome://global/content/alerts/alert.xul','_blank', 'chrome,titlebar=no,popup=yes', null);
	win.arguments = [image, title, text, clickable, cookie, 0, listener];
    }
}


function GetUTF8ConverterInputStream(istream)
{
    let cis = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
    cis.init(istream,"UTF-8",0,Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
    return cis;
}

function GetUTF8ConverterOutputStream(os)
{
    let cos = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
    cos.init(os,"UTF-8",0,Components.interfaces.nsIConverterOutputStream.DEFAULT_REPLACEMENT_CHARACTER);
    return cos;
}


/**
 *  現在時刻を秒で返す(UNIX時間).
 */
function GetCurrentTime(){
    let d = new Date();
    return Math.floor(d.getTime()/1000);
}

function GetDateString(ms){
    let d = new Date(ms);
    return d.toLocaleFormat("%m-%d %H:%M:%S");
}

function GetFormattedDateString(format,ms){
    let d = new Date(ms);
    return d.toLocaleFormat(format);
}

// string bundleから文字列を読みこむ.
function LoadString(name){
    return $('string-bundle').getString(name);
}
function LoadFormattedString(name,array){
    return $('string-bundle').getFormattedString(name,array);
}

// hour:min:sec の文字列を返す.
function GetTimeString(sec){
    sec = Math.abs(sec);

    let hour = parseInt( sec / 60 / 60 );
    let min = parseInt( sec / 60 ) - hour*60;
    let s = sec % 60;

    let str = hour<10?"0"+hour:hour;
    str += ":";
    str += min<10?"0"+min:min;
    str += ":";
    str += s<10?"0"+s:s;
    return str;
}

// min以上、max以下の範囲で乱数を返す.
function GetRandomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


// LCGの疑似乱数はランダム再生専用のため、他の用途では使用禁止.
var g_randomseed = GetCurrentTime();
function srand(seed)
{
    g_randomseed = seed;
}
function rand()
{
    g_randomseed = (g_randomseed * 214013 + 2531011) & 0x7fffffff;
    return g_randomseed;
}
// min以上、max以下の範囲で乱数を返す.
function GetRandomIntLCG(min,max)
{
    let tmp = rand() >> 4;
    return (tmp % (max-min+1)) + min;
}

function ZenToHan(str){
    return str.replace(/[ａ-ｚＡ-Ｚ０-９－（）＠]/g,
		       function(s){ return String.fromCharCode(s.charCodeAt(0)-65248); });
}

function HiraToKana(str){
    return str.replace(/[\u3041-\u3094]/g,
		      function(s){ return String.fromCharCode(s.charCodeAt(0)+0x60); });
}

/*
 *  convertKana JavaScript Library beta4
 *  
 *  MIT-style license. 
 *  
 *  2007 Kazuma Nishihata [to-R]
 *  http://www.webcreativepark.net
 * 
 * よりアルゴリズムを拝借.
 */
function HanToZenKana(str){
    let fullKana = new Array("ヴ","ガ","ギ","グ","ゲ","ゴ","ザ","ジ","ズ","ゼ","ゾ","ダ","ヂ","ヅ","デ","ド","バ","ビ","ブ","ベ","ボ","パ","ピ","プ","ペ","ポ","゛","。","「","」","、","・","ヲ","ァ","ィ","ゥ","ェ","ォ","ャ","ュ","ョ","ッ","ー","ア","イ","ウ","エ","オ","カ","キ","ク","ケ","コ","サ","シ","ス","セ","ソ","タ","チ","ツ","テ","ト","ナ","ニ","ヌ","ネ","ノ","ハ","ヒ","フ","ヘ","ホ","マ","ミ","ム","メ","モ","ヤ","ユ","ヨ","ラ","リ","ル","レ","ロ","ワ","ン","゜");
    let halfKana = new Array("ｳﾞ","ｶﾞ","ｷﾞ","ｸﾞ","ｹﾞ","ｺﾞ","ｻﾞ","ｼﾞ","ｽﾞ","ｾﾞ","ｿﾞ","ﾀﾞ","ﾁﾞ","ﾂﾞ","ﾃﾞ","ﾄﾞ","ﾊﾞ","ﾋﾞ","ﾌﾞ","ﾍﾞ","ﾎﾞ","ﾊﾟ","ﾋﾟ","ﾌﾟ","ﾍﾟ","ﾎﾟ","ﾞ","｡","｢","｣","､","･","ｦ","ｧ","ｨ","ｩ","ｪ","ｫ","ｬ","ｭ","ｮ","ｯ","ｰ","ｱ","ｲ","ｳ","ｴ","ｵ","ｶ","ｷ","ｸ","ｹ","ｺ","ｻ","ｼ","ｽ","ｾ","ｿ","ﾀ","ﾁ","ﾂ","ﾃ","ﾄ","ﾅ","ﾆ","ﾇ","ﾈ","ﾉ","ﾊ","ﾋ","ﾌ","ﾍ","ﾎ","ﾏ","ﾐ","ﾑ","ﾒ","ﾓ","ﾔ","ﾕ","ﾖ","ﾗ","ﾘ","ﾙ","ﾚ","ﾛ","ﾜ","ﾝ","ﾟ");
    for(let i = 0; i < 89; i++){
	let re = new RegExp(halfKana[i],"g");
	str=str.replace(re, fullKana[i]);
    }
    return str;
}

function FormatCommas(str){
    try{
	return str.toString().replace(/(\d)(?=(?:\d{3})+$)/g,"$1,");
    } catch (x) {
	return str;
    }
}

function clearTable(tbody)
{
   while(tbody.rows.length>0){
      tbody.deleteRow(0);
   }
}

function IsWINNT()
{
    let osString = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULRuntime).OS;
    if(osString=="WINNT"){
	return true;
    }
    return false;
}

function IsDarwin()
{
    let osString = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULRuntime).OS;
    if(osString=="Darwin"){
	return true;
    }
    return false;
}

function IsLinux()
{
    let osString = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULRuntime).OS;
    if(osString=="Linux"){
	return true;
    }
    return false;
}
