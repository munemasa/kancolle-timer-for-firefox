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
 * デッキ/遠征
 *  member/deck		: api_data
 *  member/deck_port	: api_data
 *  member/ship2	: api_data_deck
 */
function KanColleTimerDeckHandler(now,api_data){
    for( let i in api_data ){
	i = parseInt(i);
	var k = i+1;
	var nameid = 'fleetname'+k;
	var ftime_str = 'fleet'+k;
	var d = api_data[i];
	KanColleRemainInfo.fleet[i] = new Object();
	KanColleRemainInfo.fleet_name[i] = d.api_name;
	$(nameid).value = d.api_name; // 艦隊名
	if( d.api_mission[0] ){
	    let mission_id = d.api_mission[1]; // 遠征ID
	    // 遠征名を表示
	    let mission_name = KanColleData.mission_name[mission_id];
	    KanColleRemainInfo.mission_name[i] = mission_name;
	    $('mission_name'+k).value = mission_name;

	    let ftime = GetDateString( d.api_mission[2] ); // 遠征終了時刻
	    KanColleRemainInfo.fleet_time[i] = ftime;
	    $(ftime_str).value = ftime;

	    var finishedtime = parseInt( d.api_mission[2]/1000 );
	    if( now<finishedtime ){
		KanColleRemainInfo.fleet[i].mission_finishedtime = finishedtime;
	    }

	    let diff = finishedtime - now;
		    $(ftime_str).style.color = diff<60?"red":"black";
	}else{
	    $(ftime_str).value = "";
	    KanColleRemainInfo.fleet[i].mission_finishedtime = -1;
	}
    }
}

/*
 * 入渠ドック
 *  member/ndock	: api_data
 */
function KanColleTimerNdockHandler(now,api_data){
    // 入渠ドック
    for( let i in api_data ){
	i = parseInt(i);
	var ftime_str = 'ndock'+(i+1);
	KanColleRemainInfo.ndock[i] = new Object();
	if( api_data[i].api_complete_time ){
	    let name = FindShipName( api_data[i].api_ship_id );
	    $("ndock-label"+(i+1)).setAttribute('tooltiptext', name);
	    if( name ){
		$("ndock-label"+(i+1)).value = name;
	    }

	    try{
		var tmp = api_data[i].api_complete_time_str;
		var finishedtime_str = tmp.substring( tmp.indexOf('-')+1 );
		$(ftime_str).value = finishedtime_str;
		KanColleRemainInfo.ndock_time[i] = finishedtime_str;
	    } catch (x) {}

	    var finishedtime = parseInt( api_data[i].api_complete_time/1000 );
	    if( now<finishedtime ){
		KanColleRemainInfo.ndock[i].finishedtime = finishedtime;
	    }

	    let diff = finishedtime - now;
	    $(ftime_str).style.color = diff<60?"red":"black";
	}else{
	    $("ndock-label"+(i+1)).value = "No."+(i+1);
	    $("ndock-label"+(i+1)).setAttribute('tooltiptext', "");
	    KanColleRemainInfo.ndock_time[i] = "";
	    $(ftime_str).value = "";
	    KanColleRemainInfo.ndock[i].finishedtime = -1;
	}
    }
}

/*
 * 建造
 *  member/kdock	: api_data
 */
function KanColleTimerKdockHandler(now,api_data){
    // 建造ドック
    for( let i in api_data ){
	i = parseInt(i);
	var k = i+1;
	KanColleRemainInfo.kdock[i] = new Object();
	var ftime_str = 'kdock'+k;
	if( api_data[i].api_complete_time ){
	    // 建造完了時刻の表示
	    try{
		var tmp = api_data[i].api_complete_time_str;
		var finishedtime_str = tmp.substring( tmp.indexOf('-')+1 );
		$(ftime_str).value = finishedtime_str;
		KanColleRemainInfo.kdock_time[i] = finishedtime_str;
	    } catch (x) {}

	    // 残り時間とツールチップの設定
	    var finishedtime = parseInt( api_data[i].api_complete_time/1000 );
	    if( now < finishedtime ){
		// 建造予定艦をツールチップで表示
		let created_time = KanColleTimerConfig.getInt("kdock-created-time"+k);
		if( !created_time ){
		    // ブラウザを起動して初回タイマー起動時に
		    // 建造開始時刻を復元するため
		    created_time = now;
		    KanColleTimerConfig.setInt( "kdock-created-time"+k, now );
		}
		let name = GetConstructionShipName(created_time,finishedtime);
		KanColleRemainInfo.construction_shipname[i] = name;
		$('kdock-box'+k).setAttribute('tooltiptext',name);

		KanColleRemainInfo.kdock[i].finishedtime = finishedtime;
	    }

	    let diff = finishedtime - now;
	    $(ftime_str).style.color = diff<60?"red":"black";

	    // 建造艦艇の表示…はあらかじめ分かってしまうと面白みがないのでやらない
	    /*
	    let ship_id = parseInt( api_data[i].api_created_ship_id );
	    let ship_name = FindShipNameByCatId(ship_id);
	    $('kdock-box'+k).setAttribute('tooltiptext',ship_name);
	     */
	}else{
	    // 建造していない
	    KanColleRemainInfo.kdock_time[i] = "";
	    $(ftime_str).value = "";
	    KanColleRemainInfo.kdock[i].finishedtime = -1;
	    $('kdock-box'+k).setAttribute('tooltiptext','');
	    KanColleTimerConfig.setInt( "kdock-created-time"+k, 0 );
	}
    }
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
	    debugprint(db[k].name + ': ' + s.join(','));
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

    // 艦隊/遠征情報
    for ( let i = 0; i < l.length; i++ ){
	let fi = KanColleDatabase.memberDeck.get(l[i]);
	let id = parseInt(fi.api_id, 10);
	$('shipstatus-'+ id +'-0').setAttribute('tooltiptext', fi.api_name);
	for ( let j = 0; j < fi.api_ship.length; j++ ){
	    let ship_id = fi.api_ship[j];
	    let ship_name = FindShipName(ship_id);
	    let ship_info = FindShipStatus(ship_id);
	    let ship_cond = FindShipCond(ship_id);
	    let ship_bgcolor;
	    let ship_border;
	    let ship_color;

	    $('shipstatus-' + id + '-' + (j + 1)).setAttribute('tooltiptext', ship_name);

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

	    $('shipstatus-' + id + '-' + (j + 1)).value = ship_cond;
	    $('shipstatus-' + id + '-' + (j + 1)).style.backgroundColor = ship_bgcolor;

	    if (ship_info === undefined) {
		ship_border = null;
		ship_color = null;
	    } else {
		if (ship_info.bull_max > ship_info.bull ||
		    ship_info.fuel_max > ship_info.fuel) {
		    ship_border = 'solid red';
		} else {
		    ship_border = null;
		}
		if (ship_info.maxhp > ship_info.nowhp) {
		    ship_color = 'red';
		} else {
		    ship_color = null;
		}
	    }

	    $('shipstatus-' + id + '-' + (j + 1)).style.border = ship_border;
	    $('shipstatus-' + id + '-' + (j + 1)).style.color = ship_color;
	}
    }
}

/*
 * 基本情報
 *  member/basic	: api_data
 */
function KanColleTimerBasicHandler(now,api_data){
    let d = api_data;
    let f = function( elems, n ){
        for( let i=1; i<4; i++ ){
	    elems[i].style.display = i<n ? "":"none";
	}
    };
    let tmp = parseInt( d.api_count_deck );
    if( tmp==1 ){
	$('group-mission').style.display = "none";
    }else{
	let fleets = document.getElementsByClassName("fleet");
	f( fleets, tmp );
    }
    let ndocks = document.getElementsByClassName("ndock-box");
    let kdocks = document.getElementsByClassName("kdock-box");
    f( ndocks, parseInt(d.api_count_ndock) );
    f( kdocks, parseInt(d.api_count_kdock) );
}

function KanColleTimerRegisterCallback(){
    let db = KanColleDatabase;
    db.memberBasic.appendCallback(KanColleTimerBasicHandler, true);
    db.memberDeck.appendCallback(KanColleTimerDeckHandler, true);
    db.memberDeck.appendCallback(KanColleTimerMemberShip2FleetHandler, false);
    db.memberNdock.appendCallback(KanColleTimerNdockHandler, true);
    db.memberKdock.appendCallback(KanColleTimerKdockHandler, true);
    db.memberShip2.appendCallback(KanColleTimerShipInfoHandler, false);
    db.memberSlotitem.appendCallback(KanColleTimerShipInfoHandler, false);
    db.masterSlotitem.appendCallback(KanColleTimerShipInfoHandler, false);
}

function KanColleTimerUnregisterCallback(){
    let db = KanColleDatabase;
    db.masterSlotitem.removeCallback(KanColleTimerShipInfoHandler, false);
    db.memberSlotitem.removeCallback(KanColleTimerShipInfoHandler, false);
    db.memberShip2.removeCallback(KanColleTimerShipInfoHandler, false);
    db.memberKdock.removeCallback(KanColleTimerKdockHandler, true);
    db.memberNdock.removeCallback(KanColleTimerNdockHandler, true);
    db.memberDeck.removeCallback(KanColleTimerMemberShip2FleetHandler, false);
    db.memberDeck.removeCallback(KanColleTimerDeckHandler, true);
    db.memberBasic.removeCallback(KanColleTimerBasicHandler, true);
}

function AddLog(str){
    $('log').value = str + $('log').value;
}

function OpenAboutDialog(){
    var f='chrome,toolbar,modal=yes,resizable=no,centerscreen';
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

function FindShipNameByCatId( id ){
    try{
	// 全艦データから艦艇型IDをキーに艦名を取得
	return KanColleDatabase.masterShip.get(id).api_name;
    } catch (x) {
    }
    return "";
}

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
	{ label: 'ID', id: 'id', flex: 1, },
	//{ label: '艦種', id: 'type', flex: 2, },
	{ label: '艦名', id: 'name', flex: 3, always: true, },
	{ label: 'Lv', id: 'lv', flex: 1, },
	{ label: 'HP', id: 'hp', flex: 1, },
	{ label: 'MaxHP', id: 'maxhp', flex: 1, },
	{ label: 'Cond', id: 'cond', flex: 1, },
    ],
    collisthash: {},
    columns: [
	'id',
	//'type',
	'name',
	'lv',
	'hp',
	'cond',
    ],
    /* Filter */
    filterspec: null,
};

function KanColleBuildFilterMenuList(id){
    let menulist;
    let menupopup;
    let menu;
    let itemlist;
    let lastitemtype = null;
    let menugrp = null;

    function buildmenuitem(label, value){
	let item = document.createElementNS(XUL_NS, 'menuitem');
	item.setAttribute('label', label);
	if (!value)
	    value = '0';
	item.setAttribute('value', value);
	item.setAttribute('id', id + '-popup-' + value);
	item.setAttribute('oncommand', 'ShipListFilter(this);');
	return item;
    }

    menulist = document.createElementNS(XUL_NS, 'menulist');
    menulist.setAttribute('label', 'XXX');
    menulist.setAttribute('id', id);

    menupopup = document.createElementNS(XUL_NS, 'menupopup');
    menupopup.setAttribute('id', id + '-popup');

    menupopup.appendChild(buildmenuitem('すべて', null));

    itemlist = Object.keys(KanColleRemainInfo.slotitemowners).sort(function(a,b){
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

	if (!itemtypename)
	    itemtypename = 'UNKNOWN_' + itemtype;

	/*
	if (!itemname)
	    itemname = KanColleDatabase.masterSlotitem.get(k).api_name;
	*/
	debugprint(itemname + ': slotitem' + k);

	itemmenutitle = itemname + '(' + itemnum + '/' + itemtotalnum + ')';

	if (!menugrp || lastitemtype != itemtypename) {
	    let menugrpmenu;

	    menugrp = document.createElementNS(XUL_NS, 'menupopup');

	    menugrpmenu = document.createElementNS(XUL_NS, 'menu');
	    menugrpmenu.setAttribute('label', itemtypename);
	    menugrpmenu.appendChild(menugrp);

	    menupopup.appendChild(menugrpmenu);
	    lastitemtype = itemtypename;
	}

	menugrp.appendChild(buildmenuitem(itemmenutitle, 'slotitem' + k));
    }
    menulist.appendChild(menupopup);

    return menulist;
}

function ShipListFilter(item){
    let itemid = item ? item.id : null;
    let filterspec = null;

    debugprint('ShipListFilter(' + itemid + ')');

    if (!itemid)
	return;

    filterspec = itemid.replace(/^shipinfo-filtermenu-popup-/, '');
    if (filterspec && filterspec != '0')
	ShipInfoTree.shipfilterspec = filterspec;
    else
	ShipInfoTree.shipfilterspec = null;

    $('shipinfo-filtermenu').setAttribute('label', $(itemid).getAttribute('label'));

    KanColleShipInfoSetView();
}

function KanColleCreateFilterMenuList(box,id)
{
    let oldmenulist = $(id);
    let menulist = KanColleBuildFilterMenuList(id);

    // Replace existing one or add new one.
    if (oldmenulist)
	box.replaceChild(menulist, oldmenulist);
    else
	box.appendChild(menulist);
}

function KanColleCreateShipTree(){
    let menulist;
    let oldmenulist;
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

    // Build "menuitem"s
    menulist = document.createElementNS(XUL_NS, 'menupopup');
    menulist.setAttribute('id', 'shipinfo-colmenu');

    for (let i = 0; i < ShipInfoTree.COLLIST.length; i++) {
	let colinfo = ShipInfoTree.COLLIST[i];
	let menuitem = document.createElementNS(XUL_NS, 'menuitem');
	menuitem.setAttribute('id', 'shipinfo-colmenu-' + colinfo.id);
	menuitem.setAttribute('type', 'checkbox');
	menuitem.setAttribute('label', colinfo.label);
	if (colinfo.always)
	    menuitem.setAttribute('disabled', 'true');
	menuitem.setAttribute('oncommand', 'ShipInfoTreeMenuPopup();');
	menulist.appendChild(menuitem);
    }

    // Treecols
    treecols = document.createElementNS(XUL_NS, 'treecols');
    treecols.setAttribute('context', 'shipinfo-colmenu');
    treecols.setAttribute('id', 'shipinfo-tree-columns');

    // Check selected items and build menu
    for (let i = 0; i < ShipInfoTree.columns.length; i++) {
	let treecol;
	let idx = ShipInfoTree.collisthash[ShipInfoTree.columns[i]];
	let colinfo = ShipInfoTree.COLLIST[idx];

	menulist.childNodes[idx].setAttribute('checked', 'true');

	treecol = document.createElementNS(XUL_NS, 'treecol');
	treecol.setAttribute('id', 'shipinfo-tree-column-' + colinfo.id);
	treecol.setAttribute('label', colinfo.label);
	if (colinfo.flex)
	    treecol.setAttribute('flex', colinfo.flex);
	treecol.setAttribute('onclick', 'ShipInfoTreeSort(this);');
	treecol.setAttribute('class', 'sortDirectionIndicator');

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
    tree.setAttribute('sortDirection', 'ascending');
    tree.setAttribute('sortResource', 'id');

    tree.appendChild(treecols);
    tree.appendChild(treechildren);

    // Refresh existing menulist or append one.
    oldmenulist = $('shipinfo-colmenu');
    if (oldmenulist)
	box.replaceChild(menulist, oldmenulist);
    else
	box.appendChild(menulist);

    // Replace existing tree, or append one.
    oldtree = $('shipinfo-tree');
    if (oldtree)
	box.replaceChild(tree, oldtree);
    else
	box.appendChild(tree);
}

function ShipInfoTreeSort(col){
    let order;
    let tree;
    let id;
    let key;
    let dir;

    debugprint('ShipInfoSort(): ' + (col ? col.id : 'undefined'));

    tree = $('shipinfo-tree');
    order = tree.getAttribute('sortDirection') == 'ascending' ? 1 : -1;

    if (col) {
	id = col.id;
	if (tree.getAttribute('sortResource') == id)
	    order = -order;
    } else {
	id = tree.getAttribute('sortResource');
    }

    dir = order > 0 ? 'ascending' : 'descending';

    key = id.replace(/^shipinfo-tree-column-/, '');

    for (i = 0; i < ShipInfoTree.columns.length; i++) {
	let idx = ShipInfoTree.collisthash[ShipInfoTree.columns[i]];
	let colid = ShipInfoTree.COLLIST[idx].id;
	if (colid == key)
	    $('shipinfo-tree-column-' + colid).setAttribute('sortDirection', dir);
	else
	    $('shipinfo-tree-column-' + colid).removeAttribute('sortDirection');
    }

    tree.setAttribute('sortResource', id);
    tree.setAttribute('sortDirection', dir);

    tree.view = new TreeView();
}

function TreeView(){
    var that = this;
    var shiplist;

    let tree;
    let id;

    tree = $('shipinfo-tree');
    order = tree.getAttribute('sortDirection') == 'ascending' ? 1 : -1;
    id = tree.getAttribute('sortResource');
    key = id.replace(/^shipinfo-tree-column-/, '');

    // getCellText function table by column ID
    var shipcellfunc = {
	id: function(ship) {
	    return ship.api_id;
	},
	name: function(ship) {
	    return FindShipNameByCatId(ship.api_ship_id);
	},
	lv: function(ship) {
	    return ship.api_lv;
	},
	hp: function(ship) {
	    let info = FindShipStatus(ship.api_id);
	    return info ? info.nowhp : '';
	},
	maxhp: function(ship) {
	    let info = FindShipStatus(ship.api_id);
	    return info ? info.maxhp : '';
	},
	cond: function(ship) {
	    return FindShipCond(ship.api_id);
	},
    };

    // Ship list
    shiplist = KanColleDatabase.memberShip2.list();
    if (ShipInfoTree.shipfilterspec) {
	let filterspec = ShipInfoTree.shipfilterspec;
	if (filterspec.match(/^slotitem(\d+)$/)) {
	    let slotitemid = RegExp.$1;
	    shiplist = Object.keys(KanColleRemainInfo.slotitemowners[slotitemid].list);
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
    };

    // default
    if (key === undefined)
	key = 'id';
    if (order === undefined)
	order = 1;

    shiplist = shiplist.sort(function(a, b) {
	let res = 0;

	do {
	    let ship_a = KanColleDatabase.memberShip2.get(a);
	    let ship_b = KanColleDatabase.memberShip2.get(b);

	    if (shipcmpfunc[key] !== undefined)
		res = shipcmpfunc[key](ship_a,ship_b);
	    else if (shipcellfunc[key] !== undefined) {
		let va = shipcellfunc[key](ship_a);
		let vb = shipcellfunc[key](ship_b);
		res = objcmp(va,vb);
	    }
	    // tie breaker: id
	    if (res || key == 'id');
		break;
	    key = 'id';
	} while(1);
	return res * order;
    });

    //
    // the nsITreeView object interface
    //
    this.rowCount = shiplist.length;
    this.getCellText = function(row,column){
	let colid = column.id.replace(/^shipinfo-tree-column-/, '');
	let ship;

	if (row >= this.rowCount)
	    return null;

	ship = KanColleDatabase.memberShip2.get(shiplist[row]);

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
    this.getColumnProperties = function(colid,col,props){};
    this.cycleHeader = function(col,elem){};
};

function KanColleShipInfoSetView(){
    debugprint('KanColleShipInfoSetView()');
    $('shipinfo-tree').view = new TreeView();
}

function ShipInfoTreeMenuPopup(){
    debugprint('ShipInfoTreeMenuPopup()');
    let cols = [];
    let str = '';
    for (let i = 0; i < ShipInfoTree.COLLIST.length; i++) {
	let id = ShipInfoTree.COLLIST[i].id;
	let nodeid = 'shipinfo-colmenu-' + id;
	str += id + ': ' + ($(nodeid).hasAttribute('checked') ? 'true' : 'false') + '\n';
	if ($(nodeid).hasAttribute('checked')) {
	    str += 'true';
	    cols.push(id);
	} else
	    str += 'false';
	str += '\n';
    }

    ShipInfoTree.columns = cols;

    KanColleCreateShipTree();
    KanColleShipInfoSetView();
}

function KanColleShipInfoInit(){
    debugprint('KanColleShipInfoInit()');
    KanColleCreateShipTree();
    KanColleShipInfoSetView();
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


/** ディレクトリを作成する.
 * ディレクトリ掘ったらtrue、掘らなかったらfalseを返す.
 */
function CreateFolder(path){
    let file = OpenFile(path);
    if( !file.exists() || !file.isDirectory() ) {   // if it doesn't exist, create
	file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
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
