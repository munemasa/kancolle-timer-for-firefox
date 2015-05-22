// vim: set ts=8 sw=4 sts=4 ff=dos :
Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

var KanColleTimer = KanColleTimer || {};

// libs.jsからコピペなのであとでなんとかする
var __KanColleTimerPanel = {
    update: null,
    _update_bound: null,

    _update_start: function() {
	for (let k in this._update_bound)
	    KanColleDatabase[k].appendCallback(this._update_bound[k]);
    },
    _update_stop: function() {
	for (let k in this._update_bound)
	    KanColleDatabase[k].removeCallback(this._update_bound[k]);
    },

    _update_init: function() {
	if (!this._update_bound) {
	    this._update_bound = {};
	    if (this.update) {
		for (let k in this.update) {
		    let f = this.update[k];
		    let visited = {};   // loop detection
		    while (typeof(f) == 'string' && !visited[f]) {
			visited[f] = true;
			f = this.update[f];
		    }
		    this._update_bound[k] = f.bind(this);
		}
	    }
	}
    },
    _update_exit: function() {
	this._update_bound = null;
    },

    start: function() {
	this._update_start();
    },
    stop: function() {
	this._update_stop();
    },

    init: function() {
	this._update_init();
    },
    exit: function() {
	this._update_exit();
    },
};

// 資源情報
KanColleTimer.MaterialLog = {
    update: {
	material: function() {
	    let now = Math.floor(KanColleDatabase.material.timestamp() / 1000);
	    let resnames = ["fuel", "bullet", "steel", "bauxite", "bucket"];

	    if (!now)
		return;

	    let v,elem;
	    for (let k in resnames) {
		v = KanColleDatabase.material.get( resnames[k] );
		if (isNaN(v))
		    continue;
		elem = document.getElementById('kancolletimer-'+resnames[k]);
		if( elem ){
		    elem.value = v;
		}
	    }
	},
	memberBasic: function() {
	    let d = KanColleDatabase.memberBasic.get();
	    if( !d )
		return;
	    let rank = ["", "元帥", "大将", "中将", "少将",
		"大佐", "中佐", "新米中佐",
		"少佐", "中堅少佐", "新米少佐", "", "", "", "" ];
	    try{
		document.getElementById( 'kancolletimer-nickname' ).value = d.api_nickname;
		document.getElementById( 'kancolletimer-level' ).value = "Lv" + d.api_level;
		document.getElementById( 'kancolletimer-rank' ).value = rank[d.api_rank];
	    }catch(e){}
	},
	headQuarter: function() {
	    let headquarter;
	    let maxships;
	    let maxslotitems;
	    let ships;
	    let slotitems;
	    let shipnumfree = KanColleTimer.Overlay.getPref().getIntPref('display.ship-num-free');
	    let ship_color = null;
	    let slotitem_color = null;

	    function convnan( t ){
		return isNaN( t ) ? '-' : t;
	    }

	    function numcolor( cur, mark, max ){
		let style = null;
		if( !isNaN( cur ) ){
		    if( !isNaN( max ) && cur >= max )
			style = 'no-free-space';
		    else if( !isNaN( mark ) && cur >= mark )
			style = 'low-free-space';
		    else
			style = '';
		}
		return style;
	    }

	    headquarter = KanColleDatabase.headQuarter.get();

	    ships = convnan( headquarter.ship_cur );
	    maxships = convnan( headquarter.ship_max );
	    ship_color = numcolor( ships, maxships - shipnumfree, maxships );

	    slotitems = convnan( headquarter.slotitem_cur );
	    maxslotitems = convnan( headquarter.slotitem_max );
	    slotitem_color = numcolor( slotitems, maxslotitems - shipnumfree * 4, maxslotitems );

	    let elem;
	    try{
		elem = document.getElementById( 'kancolletimer-ships' );
		elem.value = ships + "/" + maxships + "隻";
		elem.setAttribute('cond', ship_color);

		elem = document.getElementById( 'kancolletimer-items' );
		elem.value = slotitems + "/" + maxslotitems;
		elem.setAttribute( 'cond', slotitem_color );
	    }catch(e){}
	}
    },

    init: function() {
	this._update_init();
    },

    exit: function() {
	this._update_exit();
    }
};
KanColleTimer.MaterialLog.__proto__ = __KanColleTimerPanel;


KanColleTimer.Overlay = {
    debugprint:function(txt){
	//Application.console.log(txt);
    },

    getPref:function(){
	return new PrefsWrapper1("extensions.kancolletimer.");
    },
    getSpecificBranch:function(branch){
	var prefs = new PrefsWrapper1(branch);
	return prefs;
    },

    findWindow:function(){
	let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	let win = wm.getMostRecentWindow("KanColleTimerMainWindow");
	return win;
    },

    FindKanColleTab:function(){
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
    },

    GetKanColleTabMessageManager: function(){
	let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService( Components.interfaces.nsIWindowMediator );
	let browserEnumerator = wm.getEnumerator( "navigator:browser" );
	let url = "www.dmm.com/netgame/social/-/gadgets/=/app_id=854854";
	while( browserEnumerator.hasMoreElements() ){
	    let browserInstance = browserEnumerator.getNext().gBrowser;
	    // browser インスタンスの全てのタブを確認する.
	    let numTabs = browserInstance.tabContainer.childNodes.length;
	    for( let index = 0; index < numTabs; index++ ){
		let currentBrowser = browserInstance.getBrowserAtIndex( index );
		if( currentBrowser.currentURI.spec.indexOf( url ) != -1 ){
		    return currentBrowser.messageManager;
		}
	    }
	}
	return null;
    },

    /**
     * ファイルを開く
     */
    OpenFile:function(path){
	let localfileCID = '@mozilla.org/file/local;1';
	let localfileIID =Components.interfaces.nsIFile;
	try {
	    let file = Components.classes[localfileCID].createInstance(localfileIID);
	file.initWithPath(path);
	    return file;
	}
	catch(e) {
	    return false;
	}
    },

    SaveUrlToFile: function( url, file ){
	let Downloads = Components.utils.import("resource://gre/modules/Downloads.jsm").Downloads;
	let Task = Components.utils.import("resource://gre/modules/Task.jsm").Task;

	Task.spawn(function () {
	    yield Downloads.fetch( url, file );
	}).then(null, Components.utils.reportError);
    },

    RequestKanColleScreenshot: function( route, callback ){
	let isjpeg = this.getPref().getBoolPref( "screenshot.jpeg" );
	let do_masking = this.getPref().getBoolPref( "screenshot.mask-name" );

	if( !this.e10sEnabled() ){
	    let url = this.TakeKanColleScreenshot( isjpeg );
	    if( typeof(callback) == 'function' ){
		callback( url );
	    }
	    return;
	}

	// 用事が済んだらメッセージのリスナーを削除するので
	// 動画撮影用じゃなくてワンショット撮影用
	// 動画のときはリスナー維持してリクエスト送りまくる方がいい
	let mm = this.GetKanColleTabMessageManager();
	if( !mm ) return;

	//let script = "chrome://kancolletimer/content/framescripts/capture-script.js";
	//mm.loadFrameScript(script, false);

	let handleMessage = function( message ){
	    let url = message.objects.image;
	    const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
		.getService( Components.interfaces.nsIIOService );
	    let urlobject = IO_SERVICE.newURI( url, null, null );

	    if( typeof(callback) == 'function' ){
		callback( urlobject );
	    }
	    mm.removeMessageListener( route, handleMessage );
	};

	mm.addMessageListener( route, handleMessage );

	mm.sendAsyncMessage( "kancolletimer@miku39.jp:capture", {}, {
	    route: route,
	    is_jpeg: isjpeg,
	    do_masking: do_masking
	} );
    },

    e10sEnabled: function(){
	// Firefox nightly (Firefox 40) browser.tabs.remote.autostart で e10s のオン・オフが分かる
	try{
	    let e10s = this.getSpecificBranch( "browser.tabs.remote." ).getBoolPref( "autostart" );
	    return e10s;
	}catch( e ){
	    return false;
	}
    },

    TakeKanColleScreenshot: function( isjpeg ){
	var tab = this.FindKanColleTab();
	if( !tab ) return null;
	var win = tab.linkedBrowser._contentWindow.wrappedJSObject;

	var game_frame = win.window.document.getElementById( "game_frame" );
	if( !game_frame ) return null;
	let rect = game_frame.getBoundingClientRect();
	var offset_x = rect.x + win.pageXOffset;
	var offset_y = rect.y + win.pageYOffset;

	//    var flash = game_frame.contentWindow.document.getElementById("flashWrap");
	var flash = game_frame.contentWindow.document.getElementsByTagName( "embed" )[0];
	offset_x += flash.offsetLeft;
	offset_y += flash.offsetTop;

	var w = flash.clientWidth;
	var h = flash.clientHeight;
	var x = offset_x;
	var y = offset_y;

	var canvas = document.createElementNS( "http://www.w3.org/1999/xhtml", "canvas" );
	canvas.style.display = "inline";
	canvas.width = w;
	canvas.height = h;

	var ctx = canvas.getContext( "2d" );
	ctx.clearRect( 0, 0, canvas.width, canvas.height );
	ctx.save();
	ctx.scale( 1.0, 1.0 );

	// x,y,w,h
	ctx.drawWindow( win, x, y, w, h, "rgb(255,255,255)" );
	ctx.restore();

	let mask_admiral_name = this.getPref().getBoolPref( "screenshot.mask-name" );
	if( mask_admiral_name ){
	    ctx.fillStyle = "rgb(0,0,0)";
	    ctx.fillRect( 110, 5, 145, 20 );
	}

	var url;
	if( isjpeg ){
	    url = canvas.toDataURL( "image/jpeg" );
	}else{
	    url = canvas.toDataURL( "image/png" );
	}
	const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
	    .getService( Components.interfaces.nsIIOService );
	url = IO_SERVICE.newURI( url, null, null );

	canvas.style.display = "none";
	canvas.width = 1;
	canvas.height = 1;
	return url;
    },

    /**
     * スクリーンショット撮影
     * @param path 保存先のパス(指定なしだとファイル保存ダイアログを出す)
     */
    takeScreenshot: function( path ){
	// e10s対応
	this.RequestKanColleScreenshot( "kancolletimer@miku39.jp:save-image-ovr", function( url ){
	    var isjpeg = KanColleTimer.Overlay.getPref().getBoolPref( "screenshot.jpeg" );

	    var file = null;
	    if( !path ){
		var fp = Components.classes['@mozilla.org/filepicker;1']
		    .createInstance( Components.interfaces.nsIFilePicker );
		fp.init( window, "艦これスクリーンショットの保存", fp.modeSave );
		fp.appendFilters( fp.filterImages );
		fp.defaultExtension = isjpeg ? "jpg" : "png";
		if( KanColleTimer.Overlay.getPref().getUnicharPref( "screenshot.path" ) ){
		    fp.displayDirectory = KanColleTimer.Overlay.OpenFile( KanColleTimer.Overlay.getPref().getUnicharPref( "screenshot.path" ) );
		}

		var datestr = KanColleTimer.Overlay.getNowDateString();
		fp.defaultString = "screenshot-" + datestr + (isjpeg ? ".jpg" : ".png");
		if( fp.show() == fp.returnCancel || !fp.file ) return null;

		file = fp.file;
	    }else{
		let localfileCID = '@mozilla.org/file/local;1';
		let localfileIID = Components.interfaces.nsIFile;
		file = Components.classes[localfileCID].createInstance( localfileIID );
		file.initWithPath( path );
		var datestr = KanColleTimer.Overlay.getNowDateString();
		var filename = "screenshot-" + datestr + (isjpeg ? ".jpg" : ".png");
		file.append( filename );
	    }
	    KanColleTimer.Overlay.SaveUrlToFile( url, file );
	} );
    },

    takeScreenshotSeriography:function(){
	var path = this.getPref().getUnicharPref("screenshot.path");
	this.takeScreenshot(path);
    },

    openTweetDialog: function(){
	var f='chrome,toolbar,modal=no,resizable=no,centerscreen';
	var w = window.openDialog('chrome://kancolletimer/content/sstweet.xul','KanColleTimerTweet',f);
	w.focus();
    },

    openResourceGraph: function(){
	window.open('chrome://kancolletimer/content/resourcegraph.xul','KanColleTimerResourceGraph','chrome,resizable=yes').focus();
    },
    openChrome: function( url, name ){
	window.open( url, name, 'chrome,resizable=yes' ).focus();
	event.stopPropagation();
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

    openBrowserTab: function( url ){
	var tab = getBrowser().addTab( url );
	getBrowser().selectedTab = tab;

	event.stopPropagation(); // 呼び出し元が限られているので一括してここで止める
    },

    openKanCollePage: function(){
	var url = "http://www.dmm.com/netgame/social/-/gadgets/=/app_id=854854/";
	var tab = this.FindKanColleTab();
	if( !tab ){
	    tab = getBrowser().addTab( url );
	}
	getBrowser().selectedTab = tab;
    },

    openSettingsDialog: function(){
	var f='chrome,toolbar,modal=no,resizable=yes,centerscreen';
	var w = window.openDialog('chrome://kancolletimer/content/preferences.xul','KanColleTimerPreference',f);
	w.focus();
    },

    onClickToolbar: function(){
	var action = this.getPref().getIntPref("default-action.toolbar");

	switch( action ){
	case 0: // サイドバーの開閉
	    toggleSidebar('viewKanColleTimerSidebar');
	    break;

	case 1: // スクリーンショットの撮影
	    this.takeScreenshot();
	    break;

	case 2: // 連続撮影
	    var path = this.getPref().getUnicharPref("screenshot.path");
	    this.takeScreenshot(path);
	    break;
	}
    },

    setDefaultAction:function(){
	if( document.getElementById('kt-open-sidebar').hasAttribute('checked') ){
	    this.getPref().setIntPref("default-action.toolbar",0);
	}
	if( document.getElementById('kt-take-screenshot').hasAttribute('checked') ){
	    this.getPref().setIntPref("default-action.toolbar",1);
	}
	if( document.getElementById('kt-take-screenshot-seriography').hasAttribute('checked') ){
	    this.getPref().setIntPref("default-action.toolbar",2);
	}
    },

    onDefaultActionMenuShowing: function(){
	var action = this.getPref().getIntPref("default-action.toolbar");

	switch( action ){
	case 0: // サイドバーの開閉
	    document.getElementById('kt-open-sidebar').setAttribute('checked',"true");
	    break;

	case 1: // スクリーンショットの撮影
	    document.getElementById('kt-take-screenshot').setAttribute('checked',"true");
	    break;

	case 2: // 連続撮影
	    document.getElementById('kt-take-screenshot-seriography').setAttribute('checked',"true");
	    break;
	}
	
	return true;
    },

    // 艦娘リストを開く
    openShipList: function(){
	let feature="chrome,resizable=yes";
	let w = window.open("chrome://kancolletimer/content/shiplist.xul","KanColleTimerShipList",feature);
	w.focus();
    },
    openDropList: function(){
	let feature = "chrome,resizable=yes";
	let w = window.open( "chrome://kancolletimer/content/droplist.xul", "KanColleTimerDropList", feature );
	w.focus();
    },

    openAbout: function(){
	let feature="chrome,resizable=yes,centerscreen";
	let w = window.open("chrome://kancolletimer/content/about.xul","KanColleTimerAbout",feature);
	w.focus();
	event.stopPropagation();
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

    /**
     * ページロード時の自動処理.
     * @param e DOMイベント
     */
    onPageLoad:function(e){
	let url = e.target.location.href;
	let prefs = this.getPref();
	let auto_open = prefs.getBoolPref("window.auto-open");

	if( auto_open && url.match(/http:\/\/.*dmm\.com\/netgame\/.*app_id=854854/) ){
	    this.open();
	}
    },

    init: function(){
	let appcontent = document.getElementById("appcontent");   // ブラウザ
	if(appcontent){
	    appcontent.addEventListener("DOMContentLoaded",
					function(e){
					    KanColleTimer.Overlay.onPageLoad(e);
					},true);
	}

	KanColleDatabase.init();
	KanColleTimer.MaterialLog.init();
	KanColleTimer.MaterialLog.start();
    },

    destroy: function(){
	KanColleTimer.MaterialLog.stop();
	KanColleTimer.MaterialLog.exit();
	KanColleDatabase.exit();
    }
};

window.addEventListener("load", function(){
    KanColleTimer.Overlay.init();

    // 艦これページのあるbrowserだけにフレームスクリプトがあればいいのだけど
    // フレームスクリプトのロード済みの確認やアンロードの手段が今のところないので、
    // スクショ撮るたびにフレームスクリプトをロードするわけにもいかず、
    // 仕方なくグローバルMMに遅延ロードを指定して、
    // すべてのbrowserに1回はキャプチャスクリプトを読ませる方法を取ることにする
    let windowMM = window.messageManager;
    let script = "chrome://kancolletimer/content/framescripts/capture-script.js";
    windowMM.loadFrameScript( script, true );
}, false);

window.addEventListener("unload", function(){
    KanColleTimer.Overlay.destroy();
}, false);
