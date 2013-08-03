var KanColleTimer = {

    // HTTP監視
    observe:function(subject, topic, data){
	if( topic=="http-on-modify-request" ){
	    var httpChannel = subject.QueryInterface(Components.interfaces.nsIHttpChannel);

	    //debugprint(httpChannel.URI.spec);
	    if( httpChannel.requestMethod=='POST' ){
		if( httpChannel.URI.spec.match(/^http.*\/kcsapi\/api_reg_mission\/start$/) ){
		    httpChannel.QueryInterface(Components.interfaces.nsIUploadChannel);
		    var us = httpChannel.uploadStream;
		    us.QueryInterface(Components.interfaces.nsISeekableStream);
		
		    var ss = Components.classes["@mozilla.org/scriptableinputstream;1"]
			.createInstance(Components.interfaces. nsIScriptableInputStream);
		    ss.init(us);
		    us.seek(0, 0);
		    var n = ss.available();
		    var postdata = ss.read(n); // POSTするデータを読み取って
		    us.seek(0,0);              // 先頭に戻す

		}
	    }
	}
    },

    /**
     * ウィンドウを開くときに真っ先に呼ばれる初期化関数.
     */
    init: function(){
	this.observerService = Components.classes["@mozilla.org/observer-service;1"]
	    .getService(Components.interfaces.nsIObserverService);
	this.observerService.addObserver(this, "http-on-modify-request", false);
	debugprint("begin http observe.");

    },

    destroy: function(){
	this.observerService.removeObserver(this, "http-on-modify-request");
	debugprint("end http observe.");
    }
};


window.addEventListener("load", function(e){ KanColleTimer.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimer.destroy(); }, false);
