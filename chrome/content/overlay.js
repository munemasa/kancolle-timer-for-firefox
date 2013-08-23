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

    takeScreenshot: function(){
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

	var url = canvas.toDataURL("image/png");
	const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
            .getService(Components.interfaces.nsIIOService);
	url = IO_SERVICE.newURI(url, null, null);

	var fp = Components.classes['@mozilla.org/filepicker;1']
            .createInstance(Components.interfaces.nsIFilePicker);
	fp.init(window, "艦これスクリーンショットの保存", fp.modeSave);
	fp.appendFilters(fp.filterImages);
	fp.defaultExtension = "png";

	var datestr = this.getNowDateString();
	fp.defaultString = "screenshot-"+ datestr +".png";
	if ( fp.show() == fp.returnCancel || !fp.file ) return null;
	
	var wbp = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
            .createInstance(Components.interfaces.nsIWebBrowserPersist);
	wbp.saveURI(url, null, null, null, null, fp.file, null);
	
	canvas.style.display = "none";
	canvas.width = 1;
	canvas.height = 1;
	return true;
    },

    openTweetDialog: function(){
	var f='chrome,toolbar,modal=yes,resizable=no,centerscreen';
	var w = window.openDialog('chrome://kancolletimer/content/sstweet.xul','KanColleTimerTweet',f);
	w.focus();
    },

    getNowDateString: function(){
	var d = new Date();
	var month = d.getMonth()+1;
	month = month<10 ? "0"+month : month;
	var date = d.getDate()<10 ? "0"+d.getDate() : d.getDate();
	var hour = d.getHours()<10 ? "0"+d.getHours() : d.getHours();
	var min = d.getMinutes()<10 ? "0"+d.getMinutes() : d.getMinutes();
	var sec = d.getSeconds()<10 ? "0"+d.getSeconds() : d.getSeconds();
	return "" + d.getFullYear() + month + date + hour + min + sec;
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
    }
};
