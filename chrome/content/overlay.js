// vim: set ts=8 sw=4 sts=4 ff=dos :

var KanColleTimerOverlay = {
    debugprint:function(txt){
	//Application.console.log(txt);
    },

    getPref:function(){
	return new PrefsWrapper1("extensions.kancolletimer.");
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

    /**
     * ファイルを開く
     */
    OpenFile:function(path){
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
    },

    /**
     * スクリーンショット撮影
     * @param path 保存先のパス(指定なしだとファイル保存ダイアログを出す)
     */
    takeScreenshot: function( path ){
	var isjpeg = this.getPref().getBoolPref("screenshot.jpeg");
	var tab = this.FindKanColleTab();
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

	let mask_admiral_name = this.getPref().getBoolPref("screenshot.mask-name");
	if( mask_admiral_name ){
	    ctx.fillStyle = "rgb(0,0,0)";
	    ctx.fillRect(110, 5, 145, 20);
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

	var file = null;
	if( !path ){
	    var fp = Components.classes['@mozilla.org/filepicker;1']
		.createInstance(Components.interfaces.nsIFilePicker);
	    fp.init(window, "艦これスクリーンショットの保存", fp.modeSave);
	    fp.appendFilters(fp.filterImages);
	    fp.defaultExtension = isjpeg?"jpg":"png";
	    if( this.getPref().getUnicharPref("screenshot.path") ){
		fp.displayDirectory = this.OpenFile( this.getPref().getUnicharPref("screenshot.path"));
	    }

	    var datestr = this.getNowDateString();
	    fp.defaultString = "screenshot-"+ datestr + (isjpeg?".jpg":".png");
	    if ( fp.show() == fp.returnCancel || !fp.file ) return null;

	    file = fp.file;
	}else{
	    let localfileCID = '@mozilla.org/file/local;1';
	    let localfileIID =Components.interfaces.nsILocalFile;
	    file = Components.classes[localfileCID].createInstance(localfileIID);
	    file.initWithPath(path);
	    var datestr = this.getNowDateString();
	    var filename = "screenshot-"+ datestr + (isjpeg?".jpg":".png");
	    file.append(filename);
	}
	var wbp = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
	    .createInstance(Components.interfaces.nsIWebBrowserPersist);
	wbp.saveURI(url, null, null, null, null, file, null);

	return true;
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

    openShipList: function(){
	let feature="chrome,resizable=yes";
	let w = window.open("chrome://kancolletimer/content/shiplist.xul","KanColleTimerShipList",feature);
	w.focus();
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
					    KanColleTimerOverlay.onPageLoad(e);
					},true);
	}
    }
};

window.addEventListener("load", function(){
    KanColleTimerOverlay.init();
}, false);
