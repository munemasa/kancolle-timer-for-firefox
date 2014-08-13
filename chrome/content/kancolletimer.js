// vim: set ts=8 sw=4 sts=4 ff=dos :

// http://www.dmm.com/netgame/social/application/-/detail/=/app_id=854854/

Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");
KanColleDatabase.typeName = KanColleData.type_name;

var KanColleTimer = {
    imageURL: "http://pics.dmm.com/freegame/app/854854/200.jpg",

    ndock: [],
    kdock: [],
    fleet: [],

    cookie:{},
    general_timer: 0,

    // 通知
    notify: function(type,i,str){
	let coretype = type.replace(/^1min\./,'');
	let sound_conf = 'sound.' + type;
	let popup_conf = 'popup.' + coretype;
	let is1min = type != coretype;
	let cookie = 'kancolletimer.' + coretype + '.' + i;
	let path = KanColleTimerConfig.getUnichar(sound_conf);

	$(sound_conf).play();
	if( KanColleTimerConfig.getBool(popup_conf) &&
	    (!is1min || KanColleTimerConfig.getBool('popup.1min-before')) ){

	    if( KanColleTimerConfig.getBool("use-notificationbox") ){
		let notification = GetGlobalNotificationBox();
		if( notification ){
		    str += "["+ GetDateString( (new Date()).getTime() ) + "]";
		    notification.appendNotification( str, null,
						     "chrome://kancolletimer/content/data/icon.png",
						     notification.PRIORITY_INFO_HIGH, null );
		}
	    }else{
		ShowPopupNotification(this.imageURL,"艦これタイマー",str,cookie);
	    }
	}
    },

    // ウィンドウを最前面にする
    setWindowOnTop:function(){
	let checkbox = $('window-stay-on-top');
	if (checkbox)
	    WindowOnTop( window, checkbox.hasAttribute('checked') );
    },

    setGeneralTimerByTime: function(timeout){
	if (timeout) {
	    this.general_timer = timeout;
	    $('general-timer').finishTime = timeout;
	} else {
	    this.general_timer = 0;
	    $('general-timer').finishTime = '';
	}
    },

    // 汎用タイマーの時間設定
    // 負の値を指定すると、回復時間をセットする。
    setGeneralTimer: function(sec){
	if( sec<0 ){
	    let t = $('refresh-timer').getAttribute('refresh-time');
	    this.general_timer = parseInt(t);
	}else{
	    sec = parseInt(sec);
	    this.general_timer = GetCurrentTime() + sec;
	}
    },

    updateGeneralTimer:function(){
	let now = GetCurrentTime();
	if( !this.general_timer ) return;
	let remain = this.general_timer-now;
	if( remain<0 ){
	    remain = 0;
	    this.general_timer = 0;
	    $('sound.default').play();
	    if( KanColleTimerConfig.getBool('popup.general-timer') ){
		let str = "時間になりました。";

		if( KanColleTimerConfig.getBool("use-notificationbox") ){
		    let notification = GetGlobalNotificationBox();
		    if( notification ){
			str += "["+ GetDateString( (new Date()).getTime() ) + "]";
			notification.appendNotification( str, null,
							 "chrome://kancolletimer/content/data/icon.png",
							 notification.PRIORITY_INFO_HIGH, null );
		    }
		}else{
		    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"general-timer");
		}
	    }
	}
	$( 'general-timer' ).setAttribute( 'value', GetTimeString( remain ) );
    },

    updateRefreshTimer: function(){
	let t = $( 'refresh-timer' ).getAttribute( 'refresh-time' );
	let now = GetCurrentTime();
	if( t && t > now ){
	    $( 'refresh-timer' ).setAttribute( 'value', GetTimeString( t - now ).substring( 3 ) );
	}else{
	    $( 'refresh-timer' ).removeAttribute( 'refresh-time' );
	    $( 'refresh-timer' ).setAttribute( 'value', "00:00" );
	}
    },

    /**
     * カウントダウンタイマーのラベルを全更新する
     */
    updateTimers: function(){
	let timers = document.getElementsByClassName('timer');

	for(let i= 0,elem; elem=timers[i]; i++){
	    let ft;
	    let fstr;
	    let rstr;
	    let rcolor;
	    let next = -1;

	    ft = parseInt( elem.getAttribute('finishTime') );

	    if (!isNaN(ft) && ft) {
		let now = (new Date()).getTime();
		let diff;
		diff = ft - now;
		next = diff;
		if (diff < 0)
		    diff = 0;

		if (elem.getAttribute('mode') == 'target') {
		    if (diff > 60000)
			next = diff - 60000;
		    rstr = GetDateString(ft);
		} else {
		    if (diff > 0) {
			next %= 1000;
			if (!next)
			    next = 1000;
		    }
		    rstr = GetTimeString(Math.ceil(diff/1000));
		}

		rcolor = diff <= 60000 ? 'red' : null;
	    } else {
		rstr = '';
		rcolor = null;
	    }

	    elem.setAttribute('value', rstr);
	    if (rcolor)
		elem.style.setProperty('color', rcolor, '');
	    else
		elem.style.removeProperty('color');
	}
    },

    update: function(){
	let cur = (new Date).getTime();
	let that = this;

	function check_cookie(cookie,type,no,time) {
	    let k;
	    let v;
	    k = type + '_' + no;
	    v = cookie[k];

	    //debugprint('k=' + k + '; v=' + v + ', time=' + time);

	    if (!v || time > cur) {
		ret = v != time;
		if (ret)
		    cookie[k] = time;
	    } else {
		cookie[k] = time;
		ret = false;
	    }
	    return ret;
	}

	function check_timeout(type,list,titlefunc){
	    for( let i in KanColleRemainInfo[list] ){
		i = parseInt(i,10);
		let t = KanColleRemainInfo[list][i].finishedtime;
		let d = t - cur;

		if (isNaN(t)) {
		    check_cookie(that.cookie,type,i,0);
		    check_cookie(KanColleRemainInfo.cookie,type,i,0);
		    continue;
		}

		if (d < 0) {
		    let str = titlefunc(i) + 'しました。\n';
		    if (check_cookie(that.cookie,type,i,t))
			AddLog(str);
		    if (check_cookie(KanColleRemainInfo.cookie,type,i,t))
			that.notify(type,i, str);
		} else if (d < 60000) {
		    let str = 'まもなく' + titlefunc(i) + 'します。\n';
		    if (check_cookie(KanColleRemainInfo.cookie,'1min.' + type,i,t))
			that.notify('1min.' + type,i,str);
		} else {
		    check_cookie(that.cookie,type,i,0);
		    check_cookie(KanColleRemainInfo.cookie,type,i,0);
		}
	    }
	}

	this.updateGeneralTimer();
	this.updateRefreshTimer();

	this.updateTimers();

	check_timeout('mission', 'fleet', function(i){ return KanColleRemainInfo.fleet_name[i] + 'が遠征から帰還'; });
	check_timeout('ndock',   'ndock', function(i){ return 'ドック' + (i+1) + 'の修理が完了'; });
	check_timeout('kdock',   'kdock', function(i){ return 'ドック' + (i+1) + 'の建造が完了'; });
    },

    getNowDateString: function(){
	var d = new Date();
	var month = d.getMonth()+1;
	month = month<10 ? "0"+month : month;
	var date = d.getDate()<10 ? "0"+d.getDate() : d.getDate();
	var hour = d.getHours()<10 ? "0"+d.getHours() : d.getHours();
	var min = d.getMinutes()<10 ? "0"+d.getMinutes() : d.getMinutes();
	var sec = d.getSeconds()<10 ? "0"+d.getSeconds() : d.getSeconds();
	var ms = d.getMilliseconds();
	if( ms<10 ){
	    ms = "000" + ms;
	}else if( ms<100 ){
	    ms = "00" + ms;
	}else if( ms<1000 ){
	    ms = "0" + ms;
	}
	return "" + d.getFullYear() + month + date + hour + min + sec + ms;
    },

    /**
     * スクリーンショット保存
     * @param file 保存ファイル名(nsIFile)
     * @param url 保存オブジェクト
     */
    _saveScreenshot: function(file,url){
	if (!file || !url)
	    return;
	Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
	    .createInstance(Components.interfaces.nsIWebBrowserPersist)
	    .saveURI(url, null, null, null, null, file, null);
    },
    /**
     * スクリーンショット撮影
     * @param isjpeg JPEGかどうか
     */
    _takeScreenshot: function(isjpeg){
	let url = TakeKanColleScreenshot(isjpeg);
	if (!url) {
	    AlertPrompt("艦隊これくしょんのページが見つかりませんでした。","艦これタイマー");
	    return null;
	}
	return url;
    },

    /**
     * スクリーンショット撮影
     */
    takeScreenshot: function(){
	let ret;
	let defaultdir = KanColleTimerConfig.getUnichar("screenshot.path");
	let isjpeg = KanColleTimerConfig.getBool("screenshot.jpeg");
	let nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	let url = this._takeScreenshot(isjpeg);

	if (!url)
	    return;

	fp.init(window, "保存ファイルを選んでください", nsIFilePicker.modeSave);
	if (defaultdir) {
	    let file = Components.classes['@mozilla.org/file/local;1']
		       .createInstance(Components.interfaces.nsILocalFile);
	    file.initWithPath(defaultdir);
	    if (file.exists() && file.isDirectory())
		fp.displayDirectory = file;
	}
	fp.appendFilters(nsIFilePicker.filterImages);
	fp.defaultString = "screenshot-"+ this.getNowDateString() + (isjpeg?".jpg":".png");
	fp.defaultExtension = isjpeg ? "jpg" : "png";
	ret = fp.show();
	if ((ret != nsIFilePicker.returnOK && ret != nsIFilePicker.returnReplace) || !fp.file)
	    return null;

	this._saveScreenshot(fp.file, url);
    },

    /**
     * スクリーンショット連続撮影用フォルダ選択
     * @return nsIFile
     */
    takeScreenshotSeriographySelectFolder: function(){
	let defaultdir = KanColleTimerConfig.getUnichar("screenshot.path");
	let ret;
	let nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

	fp.init(window, "保存フォルダを選んでください", nsIFilePicker.modeGetFolder);
	if (defaultdir) {
	    let file = Components.classes['@mozilla.org/file/local;1']
		       .createInstance(Components.interfaces.nsILocalFile);
	    file.initWithPath(defaultdir);
	    if (file.exists() && file.isDirectory())
		fp.displayDirectory = file;
	}
	ret = fp.show();
	if (ret != nsIFilePicker.returnOK || !fp.file)
	    return null;

	KanColleTimerConfig.setUnichar("screenshot.path", fp.file.path);

	return fp.file;
    },

    /**
     * スクリーンショット連続撮影
     */
    takeScreenshotSeriography: function(){
	let isjpeg = KanColleTimerConfig.getBool("screenshot.jpeg");
	let url = this._takeScreenshot(isjpeg);
	let file = null;
	let dir;

	if (!url)
	    return;

	dir = KanColleTimerConfig.getUnichar("screenshot.path");
	if (dir) {
	    file = Components.classes['@mozilla.org/file/local;1']
		   .createInstance(Components.interfaces.nsILocalFile);
	    file.initWithPath(dir);
	}

	// フォルダのチェック。フォルダでなければ、(再)選択
	do {
	    if (file && file.exists() && file.isDirectory())
		break;
	    file = this.takeScreenshotSeriographySelectFolder();
	} while(file);

	// エラー
	if (!file)
	    return;

	file.append("screenshot-" + this.getNowDateString() + (isjpeg ? '.jpg' : '.png'));

	this._saveScreenshot(file, url);
    },

    onClickAkashiTimerButton: function(){
	if( this._akashi_timer ){
	    $( 'akashi-timer-button' ).src = "chrome://kancolletimer/content/data/start.png";
	    $( 'akashi-timer-bar' ).value = 0;
	    $( 'akashi-timer-label' ).setAttribute( 'value', "00:00" );
	    clearInterval( this._akashi_timer_id );
	    this._akashi_timer = 0;
	}else{
	    $( 'akashi-timer-button' ).src = "chrome://kancolletimer/content/data/stop.png";
	    this._akashi_timer = GetCurrentTime();
	    this._akashi_timer_id = setInterval( function(){
		let now = GetCurrentTime();
		let progress = now - KanColleTimer._akashi_timer;
		$( 'akashi-timer-label' ).setAttribute( 'value', GetTimeString( progress ).substring( 3 ) );
		$( 'akashi-timer-bar' ).value = Math.floor( progress * 100 / (20 * 60) );
		if( progress >= 20 * 60 ){
		    KanColleTimer._akashi_timer = now;
		}
	    }, 1000 );
	}
    },

    findWindow:function(){
	return FindWindow( "KanColleTimerMainWindow" );
    },

    /**
     * 艦これタイマーを開く
     */
    open:function(){
	let feature="chrome,resizable=yes";

	let win = this.findWindow();
	if(win){
	    win.focus();
	}else{
	    let w = window.open("chrome://kancolletimer/content/mainwindow.xul","KanColleTimer",feature);
	    w.focus();
	}
    },

    startTimer: function() {
	if (this._timer)
	    return;
	this._timer = setInterval(this.update.bind(this), 1000);
    },

    stopTimer: function() {
	if (!this._timer)
	    return;
	clearInterval(this._timer);
	this._timer = null;
    },

    /**
     * 遠征表示を折りたたむ
     * 間近に帰投する艦隊のみを表示するように折りたたむ。
     * 各艦隊の出征状態によって表示する項目を変更する場合にも使用する。
     */
    collapseExpeditionView: function(){
	let fleets_remain = ["fleetremain2", "fleetremain3", "fleetremain4"];
	let fleets = document.getElementsByClassName( "fleet" );
	let nearest = Number.MAX_VALUE;
	let nearest_i = -1;

	for( let i = 0; i < fleets_remain.length; i++ ){
	    let elem = document.getElementById( fleets_remain[i] );
	    if( !elem.finishTime ) continue;
	    if( elem.finishTime < nearest ){
		nearest = elem.finishTime;
		nearest_i = i;
	    }
	}
	for( let i = 0; i < fleets_remain.length; i++ ){
	    let elem = fleets[i + 1];
	    elem.style.display = i == nearest_i ? '' : 'none';
	}
	$( 'expedition-collapsed' ).src = "data/collapsed.png";
    },

    /**
     * 遠征艦隊をすべて表示する
     */
    expandExpeditionView: function(){
	$( 'expedition-collapsed' ).src = "data/expanded.png";

	let d = KanColleDatabase.memberBasic.get();
	let fleets;
	if( !d )
	    return;
	fleets = document.getElementsByClassName( "fleet" );
	for( let i = 0; i < 4; i++ )
	    SetStyleProperty( fleets[i], 'display',
			      (i != 0 && i < d.api_count_deck) ? "" : "none" );
    },

    _expand_kdock_ndock: function( k ){
	let elems = document.getElementsByClassName( k );
	for( let i = 0; i < elems.length; i++ ){
	    elems[i].style.display = '';
	}
    },

    /**
     * k1とk2で得られる要素数は同じにならないといけない
     * @param k1 残り時間表示しているクラス名
     * @param k2 表示する項目のクラス名
     * @private
     */
    _collapse_kdock_ndock: function( k1, k2 ){
	let remains = document.getElementsByClassName( k1 );
	let nearest = Number.MAX_VALUE;
	let nearest_i = -1;
	for( let i = 0; i < remains.length; i++ ){
	    if( !remains[i].finishTime ) continue;
	    if( remains[i].finishTime < nearest ){
		nearest = remains[i].finishTime;
		nearest_i = i;
	    }
	}

	let elems = document.getElementsByClassName( k2 );
	for( let i = 0; i < elems.length; i++ ){
	    if( i == nearest_i ){
		elems[i].style.display = '';
	    }else{
		elems[i].style.display = 'none';
	    }
	}
    },

    collapseRepairView: function(){
	this._collapse_kdock_ndock( "ndockremain", "ndock-box" );
	$( 'repair-collapsed' ).src = "data/collapsed.png";
    },
    expandRepairView: function(){
	this._expand_kdock_ndock( "ndock-box" );
	$( 'repair-collapsed' ).src = "data/expanded.png";

	// 未拡張分を非表示にする
	let docks = KanColleDatabase.memberNdock.list();
	for( let i = 0; i < docks.length; i++ ){
	    let d = KanColleDatabase.memberNdock.get( docks[i] );
	    if( d.api_state < 0 ){
		$( 'ndock-box' + (i + 1) ).style.display = 'none';
	    }
	}
    },

    collapseConstructionView: function(){
	this._collapse_kdock_ndock( "kdockremain", "kdock-box" );
	$( 'construction-collapsed' ).src = "data/collapsed.png";
    },

    expandConstructionView: function(){
	this._expand_kdock_ndock( "kdock-box" );
	$( 'construction-collapsed' ).src = "data/expanded.png";

	// 未拡張分を非表示にする
	let docks = KanColleDatabase.kdock.list();
	for( let i = 0; i < docks.length; i++ ){
	    let d = KanColleDatabase.kdock.get( docks[i] );
	    if( d.api_state < 0 ){
		let k = d.api_id;
		$( 'kdock-box' + k ).style.display = 'none';
	    }
	}
    },

    changeCollapseState: function( type ){
	try{
	let e, v;
	switch( type ){
	case 0:
	    // 遠征
	    e = $( 'expedition-collapsed' );
	    if( e.src == "data/expanded.png" ){
		this.collapseExpeditionView();
		v = 1;
	    }else{
		this.expandExpeditionView();
		v = 0;
	    }
	    break;
	case 1:
	    // 入渠
	    e = $( 'repair-collapsed' );
	    if( $( 'repair-collapsed' ).src == "data/expanded.png" ){
		this.collapseRepairView();
		v = 1;
	    }else{
		this.expandRepairView();
		v = 0;
	    }
	    break;
	case 2:
	    // 工廠
	    e = $( 'construction-collapsed' );
	    if( $( 'construction-collapsed' ).src == "data/expanded.png" ){
		this.collapseConstructionView();
		v = 1;
	    }else{
		this.expandConstructionView();
		v = 0;
	    }
	    break;
	default:
	    return;
	}
	e.setAttribute('collapsed', v);
	}catch(e){
	    debugprint(e);
	}
    },
    updateCollapseState: function( type ){
	try{
	switch( type ){
	case 0:
	    // 遠征
	    if( $( 'expedition-collapsed' ).src != "data/expanded.png" ){
		this.collapseExpeditionView();
	    }else{
		this.expandExpeditionView();
	    }
	    break;
	case 1:
	    // 入渠
	    if( $( 'repair-collapsed' ).src != "data/expanded.png" ){
		this.collapseRepairView();
	    }else{
		this.expandRepairView();
	    }
	    break;
	case 2:
	    // 工廠
	    if( $( 'construction-collapsed' ).src != "data/expanded.png" ){
		this.collapseConstructionView();
	    }else{
		this.expandConstructionView();
	    }
	    break;
	}
	}catch(e){
	    debugprint(e);
	}
    },

    createMissionBalanceTable:function(){
	let balance = KanColleData.mission_hourly_balance;
	let rows = $('hourly_balance');
	for( let i in balance ){
	    let row = CreateElement('row');
	    let name = KanColleData.mission_name[i];
	    name = name.substring(0,7);
	    row.appendChild( CreateLabel( name ) );
	    for( let j=0; j<4; j++ ){
		let value = balance[i][j];
		let order = value * 10 % 10;
		let label = CreateLabel( parseInt(value) );
		let styles = ["color:blue; font-weight:bold;", "font-weight:bold;", "font-weight:bold;"];
		if( order ){
		    label.setAttribute( "style", styles[order-1] );
		}
		row.appendChild( label );
	    }
	    row.setAttribute("style","border-bottom: 1px solid gray;");
	    row.setAttribute("tooltiptext", KanColleData.mission_help[i] );
	    rows.appendChild( row );
	}
    },

    init: function(){
	KanColleDatabase.init();
	KanColleTimerHeadQuarterInfo.init();
	KanColleTimerDeckInfo.init();
	KanColleTimerNdockInfo.init();
	KanColleTimerKdockInfo.init();
	KanColleTimerQuestInfo.init();
	KanColleTimerFleetInfo.init();
	KanColleTimerShipTableInit();
	KanColleTimerMaterialLog.init();
	KanColleTimerMissionBalanceInfo.init();

	this.startTimer();

	KanColleTimerDeckInfo.restore();
	KanColleTimerNdockInfo.restore();
	KanColleTimerKdockInfo.restore();
	KanColleTimerQuestInfo.restore();
	//KanColleTimerFleetInfo.restore();

	KanColleTimerHeadQuarterInfo.start();
	KanColleTimerDeckInfo.start();
	KanColleTimerKdockInfo.start();
	KanColleTimerNdockInfo.start();
	KanColleTimerQuestInfo.start();
	KanColleTimerFleetInfo.start();
	KanColleTimerShipTableStart();
	KanColleTimerMaterialLog.start();

	setTimeout( function(){
	    KanColleTimer.setWindowOnTop();
	}, 1000 );

	let k = ["expedition-collapsed", "repair-collapsed", "construction-collapsed"];
	for( let i = 0; i < k.length; i++ ){
	    let collapsed = document.getElementById( k[i] ).getAttribute( "collapsed" );
	    collapsed = parseInt( collapsed );
	    if( collapsed ){
		this.changeCollapseState(i);
	    }
	}
    },

    destroy: function(){
	KanColleTimerMaterialLog.stop();
	KanColleTimerShipTableStop();
	KanColleTimerFleetInfo.stop();
	KanColleTimerQuestInfo.stop();
	KanColleTimerKdockInfo.stop();
	KanColleTimerNdockInfo.stop();
	KanColleTimerDeckInfo.stop();
	KanColleTimerHeadQuarterInfo.stop();

	this.stopTimer();

	KanColleTimerMissionBalanceInfo.exit();
	KanColleTimerMaterialLog.exit();
	KanColleTimerShipTableExit();
	KanColleTimerFleetInfo.exit();
	KanColleTimerQuestInfo.exit();
	KanColleTimerKdockInfo.exit();
	KanColleTimerNdockInfo.exit();
	KanColleTimerDeckInfo.exit();
	KanColleTimerHeadQuarterInfo.exit();
	KanColleDatabase.exit();
    }
};
