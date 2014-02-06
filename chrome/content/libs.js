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

const MODE_SAVE = Ci.nsIFilePicker.modeSave;

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const HTML_NS= "http://www.w3.org/1999/xhtml";

// 艦隊情報 / 遠征リスト
function KanColleTimerMemberDeckHandler() {
    let now = Math.floor(KanColleDatabase.memberDeck.timestamp() / 1000);
    let decks = KanColleDatabase.memberDeck.list();
    // 遠征リスト
    for (let j = 0; j < decks.length; j++) {
	let d = KanColleDatabase.memberDeck.get(decks[j]);
	let k = d.api_id;
	let i = k - 1;
	var nameid = 'fleetname'+k;
	var ftime_str = 'fleet'+k;
	KanColleRemainInfo.fleet[i] = new Object();
	KanColleRemainInfo.fleet_name[i] = d.api_name;
	$(nameid).value = d.api_name; // 艦隊名
	if( k==1 ){
	    // 第1艦隊の名前
	    $('first-fleet-name').value = d.api_name;
	}
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

// 入渠ドック
function KanColleTimerMemberNdockHandler() {
    let docks = KanColleDatabase.memberNdock.list();
    let now = Math.floor(KanColleDatabase.memberNdock.timestamp() / 1000);

    for (let j = 0; j < docks.length; j++) {
	let d = KanColleDatabase.memberNdock.get(docks[j]);
	let k = d.api_id;
	let i = k - 1;
	var ftime_str = 'ndock'+k;
	KanColleRemainInfo.ndock[i] = new Object();
	if( d.api_complete_time ){
	    let ship_id = d.api_ship_id;
	    KanColleRemainInfo.ndock_ship_id[i] = ship_id;
	    let name = FindShipName( ship_id );
	    $("ndock-label"+k).setAttribute('tooltiptext', name);
	    if( name ){
		$("ndock-label"+k).value = name;
	    }

	    try{
		var tmp = d.api_complete_time_str;
		var finishedtime_str = tmp.substring( tmp.indexOf('-')+1 );
		$(ftime_str).value = finishedtime_str;
		KanColleRemainInfo.ndock_time[i] = finishedtime_str;
	    } catch (x) {}

	    var finishedtime = parseInt( d.api_complete_time/1000 );
	    if( now<finishedtime ){
		KanColleRemainInfo.ndock[i].finishedtime = finishedtime;
	    }

	    let diff = finishedtime - now;
	    $(ftime_str).style.color = diff<60?"red":"black";
	}else{
	    $("ndock-label"+k).value = "No."+(i+1);
	    $("ndock-label"+k).setAttribute('tooltiptext', "");
	    KanColleRemainInfo.ndock_ship_id[i] = 0;
	    KanColleRemainInfo.ndock_time[i] = "";
	    $(ftime_str).value = "";
	    KanColleRemainInfo.ndock[i].finishedtime = -1;
	}
    }
}

// 建造ドック
function KanColleTimerMemberKdockHandler() {
    let docks = KanColleDatabase.memberKdock.list();
    let now = Math.floor(KanColleDatabase.memberKdock.timestamp() / 1000);

    for (let j = 0; j < docks.length; j++) {
	let d = KanColleDatabase.memberKdock.get(docks[j]);
	let k = d.api_id;
	let i = k - 1;
	KanColleRemainInfo.kdock[i] = new Object();
	var ftime_str = 'kdock'+k;
	if( d.api_complete_time ){
	    // 建造完了時刻の表示
	    try{
		var tmp = d.api_complete_time_str;
		var finishedtime_str = tmp.substring( tmp.indexOf('-')+1 );
		$(ftime_str).value = finishedtime_str;
		KanColleRemainInfo.kdock_time[i] = finishedtime_str;
	    } catch (x) {}

	    // 残り時間とツールチップの設定
	    var finishedtime = parseInt( d.api_complete_time/1000 );
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
	     let ship_id = parseInt( d.api_created_ship_id );
	     let shiptype = KanColleDatabase.masterShip.get(ship_id);
	     let ship_name = shiptype ? shiptype.api_name : ('UNKNOWN' + ship_id);
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

// 所持艦船情報 / 装備情報
function KanColleTimerSetHeadQuarterInformation() {
    function convnan(v) {
	return isNaN(v) ? '' : v;
    }
    $('number-of-ships').value = convnan(KanColleDatabase.memberShip2.count())+"隻";
    $('number-of-items').value = convnan(KanColleDatabase.memberSlotitem.count());
}

// 艦隊司令部情報
function KanColleTimerMemberBasicHandler() {
    let d = KanColleDatabase.memberBasic.get();
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

    $('max-number-of-ships').value = d.api_max_chara+"隻";
    $('max-number-of-items').value = d.api_max_slotitem;
}

// 資源情報
function KanColleTimerMemberMaterialHandler() {
    let d = KanColleDatabase.memberMaterial.get(5);
    $('repairkit-number').value = d.api_value;
}

function KanColleTimerMemberMaterialLogging() {
    // TODO あとで、毎回この設定を見にいくのはやめるように修正する
    if( !KanColleTimerConfig.getBool("record.resource-history") ) return;

    let res = KanColleRemainInfo.gResourceData;
    let last_data = res[ res.length-1 ];
    let data = new Object();
    let count = 0;
    let resnames = {
	fuel: 1,    // 燃料
	bullet: 2,  // 弾薬
	steel: 3,   // 鋼材
	bauxite: 4, // ボーキサイト
    };

    for (let k in resnames) {
	let v = KanColleDatabase.memberMaterial.get(resnames[k]);
	data[k] = v.api_value;
	if (!length || last_data[k] != data[k])
	    count++;
    }

    if (count) {
	data.recorded_time = Math.floor(KanColleDatabase.memberMaterial.timestamp() / 1000);
	res.push(data);
    }
}

// 任務
function KanColleTimerMemberQuestlistHandler() {
    let now = Math.floor(KanColleDatabase.memberQuestlist.timestamp() / 1000);
    let api_data = KanColleDatabase.memberQuestlist.get();
    for( let i in api_data.api_list ){
	let mission = api_data.api_list[i];
	let no = mission.api_no;
	let state = mission.api_state; // 2だと遂行中,3だと達成
	switch(state){
	case 3:
	    delete KanColleRemainInfo.gMission[no];
	    break;
	default:
	    KanColleRemainInfo.gMission[no] = mission;
	    break;
	}
    }
    SetQuestName();
}

function KanColleTimerCallback(request, s) {
    var now = GetCurrentTime();
    var url = request.name;

    s = s.substring(s.indexOf('svdata=') + 7);
    var data = JSON.parse(s);

    if (data.api_result != 1)
	return;

    if (url.match(/kcsapi\/api_req_mission\/start/)) {
	// 遠征開始
	// 遠征開始後にdeckが呼ばれるので見る必要なさそう
    } else if (url.match(/kcsapi\/api_get_member\/deck_port/) ||
	       url.match(/kcsapi\/api_get_member\/deck/)) {
	// 艦隊情報 / 遠征リスト
	SetAllFleetOrganization();
	SetFleetsCondition();
	KanColleTimerMemberDeckHandler();
    } else if (url.match(/kcsapi\/api_get_member\/ndock/)) {
	// 入渠ドック
	KanColleTimerMemberNdockHandler();
    } else if (url.match(/kcsapi\/api_get_member\/kdock/)) {
	// 建造ドック
	KanColleTimerMemberKdockHandler();
    } else if (url.match(/kcsapi\/api_get_member\/ship2/)) {
	// 所持艦船情報 / 艦隊情報 / 遠征リスト
	KanColleTimerSetHeadQuarterInformation();
	KanColleTimerMemberDeckHandler();
	SetAllFleetOrganization();
	SetFleetsCondition();
    } else if (url.match(/kcsapi\/api_get_member\/ship3/)) {
	// 所持艦船情報 / 艦隊情報 / 遠征リスト / 装備情報
	KanColleTimerSetHeadQuarterInformation();
	KanColleTimerMemberDeckHandler();
	SetAllFleetOrganization();
	SetFleetsCondition();
    } else if (url.match(/kcsapi\/api_get_member\/slotitem/)) {
	// 装備情報
	KanColleTimerSetHeadQuarterInformation();
    } else if (url.match(/kcsapi\/api_get_member\/basic/)) {
	// 艦隊司令部情報
	KanColleTimerMemberBasicHandler();
    } else if (url.match(/kcsapi\/api_get_member\/material/)) {
	// 資源情報
	KanColleTimerMemberMaterialHandler();
	KanColleTimerMemberMaterialLogging();
    } else if (url.match(/kcsapi\/api_get_member\/questlist/)) {
	// 任務
	KanColleTimerMemberQuestlistHandler();
    }
}

// 第1艦隊編成
function SetFirstFleetOrganization(){
    // 第1艦隊編成
    let fleets = KanColleDatabase.memberDeck.list();
    let fleet = KanColleDatabase.memberDeck.get(1);
    if( !fleet ) return;
    let rows = $('fleet-1');
    RemoveChildren(rows);
    for( let i=0; fleet.api_ship[i]!=-1 && i<6; i++){
	let row = CreateElement('row');
	let data = FindOwnShipData( fleet.api_ship[i] );
	let masterdata = FindShipData( fleet.api_ship[i] );
	row.appendChild( CreateLabel(KanColleData.type_name[masterdata.api_stype],'') );
	row.appendChild( CreateLabel(masterdata.api_name) );
	row.appendChild( CreateListCell( data.api_nowhp + "/" + data.api_maxhp) );
	let hbox = CreateElement('hbox');
	hbox.appendChild( CreateLabel(""+data.api_cond) );
	row.appendChild( hbox );
	if( masterdata.api_fuel_max!=data.api_fuel ||
	    masterdata.api_bull_max!=data.api_bull ){
		hbox.setAttribute('warning','1');
	}
	if( IsRepairing( data.api_id ) ){
	    hbox.setAttribute('repair','1');
	}

	let maxhp = parseInt(data.api_maxhp);
	let nowhp = parseInt(data.api_nowhp);
	if( nowhp-1 <= maxhp*0.25 ){
	    row.style.backgroundColor = '#ff8080';
	}else{
	    if( $('show-gage').hasAttribute('checked') ){
		let percentage = parseInt( nowhp/maxhp*100 );
		let image;
		if(nowhp==maxhp){
		    image = "greenbar.png";
		}else if( percentage<=25 ){
		    image = "redbar.png";
		}else if( percentage<=50 ){
		    image = "orangebar.png";
		}else if( percentage<=75 ){
		    image = "yellowbar.png";
		}else{
		    image = "lightgreenbar.png";
		}
		let style = 'background-image: url("chrome://kancolletimer/content/data/'+image+'"); background-position:left bottom; background-repeat:no-repeat; background-size:'+percentage+'% 4px;';
		row.setAttribute('style',style);
	    }else{
		row.removeAttribute('style');
	    }
	}

	rows.appendChild( row );
    }
}

function SetAllFleetOrganization(){
    for(let i=1;i<5;i++){
	SetFleetOrganization(i);
    }
}

/**
 * 第n艦隊の編成を表示する
 * @param n 1,2,3,4
 */
function SetFleetOrganization( n ){
    // 第1艦隊編成
    let fleets = KanColleDatabase.memberDeck.list();
    let fleet = KanColleDatabase.memberDeck.get(n);
    if( !fleet ) return;
    let rows = $('fleet-'+n);
    RemoveChildren(rows);
    for( let i=0; fleet.api_ship[i]!=-1 && i<6; i++){
	let row = CreateElement('row');
	let data = FindOwnShipData( fleet.api_ship[i] );
	let masterdata = FindShipData( fleet.api_ship[i] );
	if (!masterdata)
	    continue;
	row.appendChild( CreateLabel(KanColleData.type_name[masterdata.api_stype],'') );
	row.appendChild( CreateLabel(masterdata.api_name) );
	row.appendChild( CreateListCell( data.api_nowhp + "/" + data.api_maxhp) );
	let hbox = CreateElement('hbox');
	hbox.appendChild( CreateLabel(""+data.api_cond) );
	row.appendChild( hbox );
	if( masterdata.api_fuel_max!=data.api_fuel ||
	    masterdata.api_bull_max!=data.api_bull ){
		hbox.setAttribute('warning','1');
	}
	if( IsRepairing( data.api_id ) ){
	    hbox.setAttribute('repair','1');
	}

	let maxhp = parseInt(data.api_maxhp);
	let nowhp = parseInt(data.api_nowhp);
	if( nowhp-1 <= maxhp*0.25 ){
	    row.style.backgroundColor = '#ff8080';
	}else{
	    if( n==1 && $('show-gage').hasAttribute('checked') ){
		// 第1艦隊のみ
		let percentage = parseInt( nowhp/maxhp*100 );
		let image;
		if(nowhp==maxhp){
		    image = "greenbar.png";
		}else if( percentage<=25 ){
		    image = "redbar.png";
		}else if( percentage<=50 ){
		    image = "orangebar.png";
		}else if( percentage<=75 ){
		    image = "yellowbar.png";
		}else{
		    image = "lightgreenbar.png";
		}
		let style = 'background-image: url("chrome://kancolletimer/content/data/'+image+'"); background-position:left bottom; background-repeat:no-repeat; background-size:'+percentage+'% 4px;';
		row.setAttribute('style',style);
	    }else{
		row.removeAttribute('style');
	    }
	}

	rows.appendChild( row );
    }
}

// 第1〜第3艦隊のコンディション表示
function SetFleetsCondition(){
    // color="#d36363" // red 0-19
    // color="#f3a473" // orange 20-29

    let table = $('fleet-condition');
    RemoveChildren( table );

    let fleets = KanColleDatabase.memberDeck.list();
    for (let i = 0; i < fleets.length; i++) {
	let fleet = KanColleDatabase.memberDeck.get(fleets[i]);

	let row = CreateElement('row');
	row.appendChild( CreateLabel('第'+fleet.api_id+'艦隊') );
	for( let i=0; fleet.api_ship[i]!=-1 && i<6; i++){
	    let data = FindOwnShipData( fleet.api_ship[i] );
	    if (!data)
		continue;
	    let cond = CreateLabel(""+data.api_cond);
	    if( data.api_cond<=19 ){
		cond.style.backgroundColor = "#d36363";
	    }else if( data.api_cond<=29 ){
		cond.style.backgroundColor = "#f3a473";
	    }
	    row.appendChild( cond );
	}
	table.appendChild( row );
    }
}

function IsRepairing(ship_id){
    for(let i in KanColleRemainInfo.ndock_ship_id ){
	if( KanColleRemainInfo.ndock_ship_id[i]==ship_id ) return true;
    }
    return false;
}

// 任務名称を表示
function SetQuestName(){
    let quest_name = document.getElementsByClassName('quest-name');
    while(quest_name.length > 0){
        quest_name[0].parentNode.removeChild(quest_name[0]);
    }    

    let cnt=0;
    for( let i in KanColleRemainInfo.gMission ){
	let mission = KanColleRemainInfo.gMission[i];
	if( mission && mission.api_state==2 ){
	    let label = CreateLabel( mission.api_title );
	    label.setAttribute('class','quest-name');
	    label.setAttribute('tooltiptext', mission.api_detail);
	    $('group-quest').appendChild( label );
	}
    }
}

function AddLog(str){
    $('log').value = str + $('log').value;
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
    var f='chrome,toolbar,modal=yes,resizable=no,centerscreen';
    var w = window.openDialog('chrome://kancolletimer/content/about.xul','KanColleTimerAbout',f);
    w.focus();
}

function OpenSettingsDialog(){
    var f='chrome,toolbar,modal=no,resizable=yes,centerscreen';
    var w = window.openDialog('chrome://kancolletimer/content/preferences.xul','KanColleTimerPreference',f);
    w.focus();
}

function OpenTweetDialog(nomodal, param){
    var f;
    nomodal = true;
    if( nomodal ){
	f='chrome,toolbar,modal=no,resizable=no,centerscreen';
    }else{
	f='chrome,toolbar,modal=yes,resizable=no,centerscreen';
    }
    var w = window.openDialog('chrome://kancolletimer/content/sstweet.xul','KanColleTimerTweet',f, param);
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
    return "[Unknown]";
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
    if (ship) {
	let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
	return shiptype;
    }
    return undefined;
}

/**
 * 艦艇の名前を返す
 */
function FindShipName( ship_id ){
    let shiptype = FindShipData(ship_id);
    if (shiptype)
	return shiptype.api_name;
    return "";
}

/**
 * 艦これゲームページのズーム倍率を設定する.
 * 艦これページがselectedTabにないとズーム倍率変更できないので、
 * 仕様か、もしくは他の手段があるか。
 */
function ZoomContent( scale ){
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
		currentBrowser.markupDocumentViewer.fullZoom = scale;
		return scale;
	    }
	}
    }
    return 0;
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
 * @return nsIFileを返す
 */
function OpenFileDialog( caption, mode )
{
    const nsIFilePicker = Ci.nsIFilePicker;
    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init( window, caption, mode );
    fp.appendFilters(nsIFilePicker.filterAll);
    let rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	let file = fp.file;
	return file;
    }
    return null;
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
