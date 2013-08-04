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

function CCIN(cName, ifaceName) {
    return Cc[cName].createInstance(Ci[ifaceName]);
}

function TracingListener() {
    this.originalListener = null;
}
TracingListener.prototype =
{
    onDataAvailable: function(request, context, inputStream, offset, count) {
        var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1",
				     "nsIBinaryInputStream");
        var storageStream = CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
        var binaryOutputStream = CCIN("@mozilla.org/binaryoutputstream;1",
				      "nsIBinaryOutputStream");

        binaryInputStream.setInputStream(inputStream);
        storageStream.init(8192, count, null);
        binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));

        // Copy received data as they come.
        var data = binaryInputStream.readBytes(count);
        this.receivedData.push(data);

        binaryOutputStream.writeBytes(data, count);

        this.originalListener.onDataAvailable(request, context,
					      storageStream.newInputStream(0), offset, count);
    },

    onStartRequest: function(request, context) {
        this.originalListener.onStartRequest(request, context);
	this.receivedData = new Array();
    },

    onStopRequest: function(request, context, statusCode) {
        this.originalListener.onStopRequest(request, context, statusCode);

	var now = GetCurrentTime();
	var url = request.name;
	//debugprint( url );

	var s = this.receivedData.join('');
	s = s.substring( s.indexOf('svdata=')+7 );
	var data = JSON.parse(s);

	if( url.match(/kcsapi\/api_req_mission\/start/) ){
	    // 遠征開始
	    // 遠征開始後にdeckが呼ばれるので見る必要なさそう
	    /*
	    // POSTのapi_deck_idを見る
	    //data.api_data.api_complatetime_str;
	    var httpChannel = request.QueryInterface(Components.interfaces.nsIHttpChannel);
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

	    if( postdata.match(/api%5fdeck%5fid=(\d+)&/i) ){
		var deck_id = parseInt( RegExp.$1 );
		debugprint('deck_id='+deck_id);
	    }
	     */

	}else if( url.match(/kcsapi\/api_get_member\/deck_port/) ||
		  url.match(/kcsapi\/api_get_member\/deck/) ){
	    // 遠征リスト
	    if( data.api_result==1 ){
		for( let i in data.api_data ){
		    i = parseInt(i);
		    var nameid = 'fleetname'+(i+1);
		    var statusid = 'fleet'+(i+1);
		    var d = data.api_data[i];
		    KanColleTimer.fleet[i] = new Object();
		    if( d.api_mission[0] ){
			$(nameid).value = d.api_name; // 艦隊名
			$(statusid).value = GetDateString( d.api_mission[2] ); // 遠征終了時刻

			var finishedtime = parseInt( d.api_mission[2]/1000 );
			KanColleTimer.fleet[i].fleet_name = d.api_name;
			if( now<finishedtime ){
			    KanColleTimer.fleet[i].mission_finishedtime = finishedtime;
			}
		    }else{
			$(nameid).value = d.api_name;
			$(statusid).value = "";
			KanColleTimer.fleet[i].mission_finishedtime = 0;
		    }
		}
	    }	    
	}else if( url.match(/kcsapi\/api_get_member\/ndock/) ){
	    // 入渠ドック
	    if( data.api_result==1 ){
		for( let i in data.api_data ){
		    i = parseInt(i);
		    var id = 'ndock'+(i+1);
		    KanColleTimer.ndock[i] = new Object();
		    if( data.api_data[i].api_complete_time ){
			var finishedtime_str = data.api_data[i].api_complete_time_str;
			$(id).value = finishedtime_str;

			var finishedtime = parseInt( data.api_data[i].api_complete_time/1000 );
			if( now<finishedtime ){
			    KanColleTimer.ndock[i].finishedtime = finishedtime;
			}
		    }else{
			$(id).value = "";
			KanColleTimer.ndock[i].finishedtime = 0;
		    }
		}
	    }
	}else if( url.match(/kcsapi\/api_get_member\/kdock/) ){
	    // 建造ドック
	    if( data.api_result==1 ){
		for( let i in data.api_data ){
		    i = parseInt(i);
		    KanColleTimer.kdock[i] = new Object();
		    var id = 'kdock'+(i+1);
		    if( data.api_data[i].api_complete_time ){
			var finishedtime_str = data.api_data[i].api_complete_time_str;
			$(id).value = finishedtime_str;

			var finishedtime = parseInt( data.api_data[i].api_complete_time/1000 );
			if( now<finishedtime ){
			    KanColleTimer.kdock[i].finishedtime = finishedtime;
			}
		    }else{
			$(id).value = "";
			KanColleTimer.kdock[i].finishedtime = 0;
		    }
		}
	    }
	}
    },

    QueryInterface: function (aIID) {
        if (aIID.equals(Ci.nsIStreamListener) ||
            aIID.equals(Ci.nsISupports)) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    }
};

var httpRequestObserver =
{
    observe: function(aSubject, aTopic, aData){
        if (aTopic == "http-on-examine-response"){
	    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
	    if( httpChannel.URI.spec.match(/^http.*\/kcsapi\//) ){
		//debugprint(httpChannel.URI.spec);
		var newListener = new TracingListener();
		aSubject.QueryInterface(Ci.nsITraceableChannel);
		newListener.originalListener = aSubject.setNewListener(newListener);
	    }
        }
    },

    QueryInterface : function (aIID) {
        if (aIID.equals(Ci.nsIObserver) || aIID.equals(Ci.nsISupports)){
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    }
};

var KanColleTimer = {
    ndock: [],
    kdock: [],
    fleet: [],

    playSound: function(path){
	//debugprint(path);
	let IOService = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
	let localFile = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
	let sound = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
	localFile.initWithPath( path );
	sound.play(IOService.newFileURI(localFile));
	//sound.playEventSound(0);
    },

    noticeRepairFinished: function(){
	let path = Config.getUnichar('sound.ndock');
	this.playSound(path);
    },
    noticeConstructionFinished: function(){
	let path = Config.getUnichar('sound.kdock');
	this.playSound(path);
    },
    noticeMissionFinished: function(){
	let path = Config.getUnichar('sound.mission');
	this.playSound(path);
    },

    update: function(){
	let i;
	let now = GetCurrentTime();
	let fleetremain = evaluateXPath(document,"//*[@class='fleetremain']");
	let ndockremain = evaluateXPath(document,"//*[@class='ndockremain']");
	let kdockremain = evaluateXPath(document,"//*[@class='kdockremain']");

	for(i in this.fleet){
	    i = parseInt(i);
	    if( this.fleet[i].mission_finishedtime ){
		let d = this.fleet[i].mission_finishedtime - now;
		if( d<0 ){
		    AddLog(this.fleet[i].fleet_name+"が遠征から帰還しました。\n");
		    this.fleet[i].mission_finishedtime = 0;
		    this.noticeMissionFinished();
		}else{
		    fleetremain[i].value = GetTimeString( d );
		}
	    }else{
		fleetremain[i].value = "";
	    }
	}

	for(i in this.ndock){
	    i = parseInt(i);
	    if( this.ndock[i].finishedtime ){
		let d = this.ndock[i].finishedtime - now;
		if( d<0 ){
		    AddLog("ドック"+(i+1)+"の修理が完了しました。\n");
		    this.ndock[i].finishedtime = 0;
		    this.noticeRepairFinished();
		}else{
		    ndockremain[i].value = GetTimeString( d );
		}
	    }else{
		ndockremain[i].value = "";
	    }
	}

	for(i in this.kdock){
	    i = parseInt(i);
	    if( this.kdock[i].finishedtime ){
		let d = this.kdock[i].finishedtime - now;
		if( d<0 ){
		    AddLog("ドック"+(i+1)+"の建造が完了しました。\n");
		    this.kdock[i].finishedtime = 0;
		    this.noticeConstructionFinished();
		}else{
		    kdockremain[i].value = GetTimeString( d );
		}
	    }else{
		kdockremain[i].value = "";
	    }
	}
    },

    init: function(){
	this.observerService = Components.classes["@mozilla.org/observer-service;1"]
	    .getService(Components.interfaces.nsIObserverService);
	this.observerService.addObserver(httpRequestObserver, "http-on-modify-request", false);
	this.observerService.addObserver(httpRequestObserver, "http-on-examine-response", false);

	setInterval( function(){
			 KanColleTimer.update();
		     }, 1000 );
    },

    destroy: function(){
	this.observerService.removeObserver(httpRequestObserver, "http-on-modify-request");
	this.observerService.removeObserver(httpRequestObserver, "http-on-examine-response");
    }
};


window.addEventListener("load", function(e){ KanColleTimer.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimer.destroy(); }, false);
