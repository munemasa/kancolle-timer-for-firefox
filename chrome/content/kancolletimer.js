// vim: set ts=8 sw=4 sts=4 ff=dos :

// http://www.dmm.com/netgame/social/application/-/detail/=/app_id=854854/

Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

var KanColleTimer = {
    imageURL: "http://pics.dmm.com/freegame/app/854854/200.jpg",

    ndock: [],
    kdock: [],
    fleet: [],

    cookie:{},
    general_timer: 0,

    // 入渠ドックのメモ作成
    createRepairMemo: function(){
	let elem = $('popup-ndock-memo').triggerNode;
	let hbox = FindParentElement(elem,"row");
	let oldstr = hbox.getAttribute('tooltiptext') || "";
	let text = "入渠ドック"+hbox.firstChild.value+"のメモを入力してください。\nツールチップとして表示されるようになります。";
	let str = InputPrompt(text,"入渠ドックメモ", oldstr);
	if( str==null ) return;
	hbox.setAttribute('tooltiptext',str);

	let ndock_hbox = evaluateXPath(document,"//*[@class='ndock-box']");
	for(let k in ndock_hbox){
	    k = parseInt(k);
	    let elem = ndock_hbox[k];
	    KanColleRemainInfo.ndock_memo[k] = ndock_hbox[k].getAttribute('tooltiptext');
	}
    },

    /**
     * 音声通知を行う.
     * 設定によって再生方式を変えて再生する。
     * @param elem sound要素
     */
    playNotice: function(elem){
	elem.play();
    },

    // 完了の通知
    noticeRepairFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.ndock');
	this.playNotice( $('sound.ndock') );

	if( KanColleTimerConfig.getBool('popup.ndock') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"repair"+i);
	}
    },
    noticeConstructionFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.kdock');
	this.playNotice( $('sound.kdock') );

	if( KanColleTimerConfig.getBool('popup.kdock') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"construction"+i);
	}
    },
    noticeMissionFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.mission');
	this.playNotice( $('sound.mission') );

	if( KanColleTimerConfig.getBool('popup.mission') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"mission"+i);
	}
    },

    // 1分前の通知
    noticeRepair1min: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.1min.ndock');
	this.playNotice( $('sound.1min.ndock') );

	if( KanColleTimerConfig.getBool('popup.ndock') &&
	    KanColleTimerConfig.getBool('popup.1min-before') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"repair"+i);
	}
    },
    noticeConstruction1min: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.1min.kdock');
	this.playNotice( $('sound.1min.kdock') );

	if( KanColleTimerConfig.getBool('popup.kdock') &&
	    KanColleTimerConfig.getBool('popup.1min-before') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"construction"+i);
	}
    },
    noticeMission1min: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.1min.mission');
	this.playNotice( $('sound.1min.mission') );

	if( KanColleTimerConfig.getBool('popup.mission') &&
	    KanColleTimerConfig.getBool('popup.1min-before') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"mission"+i);
	}
    },

    playDefaultSound: function(){
	$('sound.default').play();
    },

    // ウィンドウを最前面にする
    setWindowOnTop:function(){
	let checkbox = $('window-stay-on-top');
	if (checkbox)
	    WindowOnTop( window, checkbox.hasAttribute('checked') );
    },

    setGeneralTimer: function(sec){
	sec = parseInt(sec,10);
	if (sec) {
	    this.general_timer = (new Date).getTime() + sec * 1000;
	    $('general-timer').finishTime = (new Date().getTime()) + sec * 1000;
	} else {
	    this.general_timer = 0;
	    $('general-timer').finishTime = '';
	}
    },

    updateGeneralTimer: function(){
	let now = (new Date).getTime();
	if( !this.general_timer) return;
	if (now > this.general_timer) {
	    this.general_timer = 0;
	    this.playDefaultSound();
	    if( KanColleTimerConfig.getBool('popup.general-timer') ){
		let str = "時間になりました。";
		ShowPopupNotification(this.imageURL,"艦これタイマー",str,"general-timer");
	    }
	}
    },

    update: function(){
	let i;
	let now = GetCurrentTime();
	let cur = (new Date).getTime();
	let kdockremain = evaluateXPath(document,"//*[@class='kdockremain']");

	function check_cookie(cookie,type,no,time) {
	    let k;
	    let v;
	    k = type + '_' + no;
	    v = cookie[k];
	    ret = v != time;
	    if (ret)
		cookie[k] = time;
	    return ret;
	}

	this.updateGeneralTimer();

	// 遠征
	for(i in KanColleRemainInfo.fleet){
	    i = parseInt(i);
	    let t = KanColleRemainInfo.fleet[i].finishedtime;
	    if( t > 0 ){
		let d = t - cur;
		if (d < 0) {
		    let str = KanColleRemainInfo.fleet_name[i]+"が遠征から帰還しました。\n";
		    if (check_cookie(this.cookie,'mission',i,t))
			AddLog(str);
		    if (check_cookie(KanColleRemainInfo.cookie,'mission',i,t))
			this.noticeMissionFinished(i, str);
		} else if (d < 60000) {
		    let str = "まもなく"+KanColleRemainInfo.fleet_name[i]+"が遠征から帰還します。\n";
		    if (check_cookie(KanColleRemainInfo.cookie,'1min.mission',i,t))
			this.noticeMission1min(i,str);
		}
	    }
	}

	// 入渠ドック
	for(i in KanColleRemainInfo.ndock){
	    i = parseInt(i);
	    let t = KanColleRemainInfo.ndock[i].finishedtime;
	    if( t > 0 ){
		let d = t - cur;
		if (d < 0) {
		    let str = "ドック"+(i+1)+"の修理が完了しました。\n";
		    if (check_cookie(this.cookie,'ndock',i,t))
			AddLog(str);
		    if (check_cookie(KanColleRemainInfo.cookie,'ndock',i,t))
			this.noticeRepairFinished(i,str);
		} else if (d < 60000) {
		    let str = "まもなくドック"+(i+1)+"の修理が完了します。\n";
		    if (check_cookie(KanColleRemainInfo.cookie,'1min.ndock',i,t))
			this.noticeRepair1min(i,str);
		}
	    }
	}

	// 建造ドック
	for(i in KanColleRemainInfo.kdock){
	    i = parseInt(i);
	    let t = KanColleRemainInfo.kdock[i].finishedtime;
	    if( t > 0 ){
		let d = t - cur;
		if (d < 0) {
		    let str = "ドック"+(i+1)+"の建造が完了しました。\n";
		    if (check_cookie(this.cookie,'kdock',i,t))
			AddLog(str);
		    if (check_cookie(KanColleRemainInfo.cookie,'kdock',i,t))
			this.noticeRepairFinished(i,str);
		} else if (d < 60000) {
		    let str = "まもなくドック"+(i+1)+"の建造が完了します。\n";
		    if (check_cookie(KanColleRemainInfo.cookie,'1min.kdock',i,t))
			this.noticeRepair1min(i,str);
		}
	    }
	}
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
	    return null;

	file.append("screenshot-" + this.getNowDateString() + (isjpeg ? '.jpg' : '.png'));

	this._saveScreenshot(file, url);
    },

    findWindow:function(){
	let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	let win = wm.getMostRecentWindow("KanColleTimerMainWindow");
	return win;
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

    createMissionBalanceTable:function(){
	let balance = KanColleData.mission_hourly_balance;
	let rows = $('hourly_balance');
	for( let i in balance ){
	    let row = CreateElement('row');
	    let name = KanColleData.mission_name[i];
	    name = name.substring(0,7);
	    row.appendChild( CreateLabel( name ) );
	    for( let j=0; j<4; j++ ){
		row.appendChild( CreateLabel(balance[i][j]) );
	    }
	    row.setAttribute("style","border-bottom: 1px solid gray;");
	    rows.appendChild( row );
	}
    },

    init: function(){
	KanColleHttpRequestObserver.init();
	KanColleTimerRegisterCallback();

	setInterval( function(){
			 KanColleTimer.update();
		     }, 1000 );

	KanColleTimerDeckRestore();
	KanColleTimerNdockRestore();
	KanColleTimerKdockRestore();

	KanColleTimerLibInit();

	this.createMissionBalanceTable();
	this.setWindowOnTop();

	SetMissionName();
    },

    destroy: function(){
	KanColleTimerLibExit();
	KanColleTimerUnregisterCallback();
	KanColleHttpRequestObserver.destroy();
    }
};


window.addEventListener("load", function(e){ KanColleTimer.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimer.destroy(); }, false);
