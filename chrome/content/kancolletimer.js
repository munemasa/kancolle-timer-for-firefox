Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

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

function callback(request,s){
    var now = GetCurrentTime();
    var url = request.name;

    s = s.substring( s.indexOf('svdata=')+7 );
    var data = JSON.parse(s);

    if( url.match(/kcsapi\/api_req_mission\/start/) ){
	// 遠征開始
	// 遠征開始後にdeckが呼ばれるので見る必要なさそう
    }else if( url.match(/kcsapi\/api_get_member\/deck_port/) ||
	      url.match(/kcsapi\/api_get_member\/deck/) ){
	// 遠征リスト
	if( data.api_result==1 ){
	    for( let i in data.api_data ){
		i = parseInt(i);
		var nameid = 'fleetname'+(i+1);
		var statusid = 'fleet'+(i+1);
		var d = data.api_data[i];
		KanColleRemainInfo.fleet[i] = new Object();
		KanColleRemainInfo.fleet_name[i] = d.api_name;
		$(nameid).value = d.api_name; // 艦隊名
		if( d.api_mission[0] ){
		    let ftime = GetDateString( d.api_mission[2] ); // 遠征終了時刻
		    KanColleRemainInfo.fleet_time[i] = ftime;
		    $(statusid).value = ftime;

		    var finishedtime = parseInt( d.api_mission[2]/1000 );
		    if( now<finishedtime ){
			KanColleRemainInfo.fleet[i].mission_finishedtime = finishedtime;
		    }
		}else{
		    $(statusid).value = "";
		    KanColleRemainInfo.fleet[i].mission_finishedtime = -1;
		}
	    }
	}	    
    }else if( url.match(/kcsapi\/api_get_member\/ndock/) ){
	// 入渠ドック
	if( data.api_result==1 ){
	    for( let i in data.api_data ){
		i = parseInt(i);
		var id = 'ndock'+(i+1);
		KanColleRemainInfo.ndock[i] = new Object();
		if( data.api_data[i].api_complete_time ){
		    var finishedtime_str = data.api_data[i].api_complete_time_str;
		    $(id).value = finishedtime_str;
		    KanColleRemainInfo.ndock_time[i] = finishedtime_str;

		    var finishedtime = parseInt( data.api_data[i].api_complete_time/1000 );
		    if( now<finishedtime ){
			KanColleRemainInfo.ndock[i].finishedtime = finishedtime;
		    }
		}else{
		    $(id).value = "";
		    KanColleRemainInfo.ndock[i].finishedtime = -1;
		}
	    }
	}
    }else if( url.match(/kcsapi\/api_get_member\/kdock/) ){
	// 建造ドック
	if( data.api_result==1 ){
	    for( let i in data.api_data ){
		i = parseInt(i);
		KanColleRemainInfo.kdock[i] = new Object();
		var id = 'kdock'+(i+1);
		if( data.api_data[i].api_complete_time ){
		    var finishedtime_str = data.api_data[i].api_complete_time_str;
		    $(id).value = finishedtime_str;
		    KanColleRemainInfo.kdock_time[i] = finishedtime_str;
		    
		    var finishedtime = parseInt( data.api_data[i].api_complete_time/1000 );
		    if( now<finishedtime ){
			KanColleRemainInfo.kdock[i].finishedtime = finishedtime;
		    }
		}else{
		    $(id).value = "";
		    KanColleRemainInfo.kdock[i].finishedtime = -1;
		}
	    }
	}
    }    
}

var KanColleTimer = {
    imageURL: "http://pics.dmm.com/freegame/app/854854/200.jpg",

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

    // 完了の通知
    noticeRepairFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.ndock');
	this.playSound(path);

	if( KanColleTimerConfig.getBool('popup.ndock') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"repair"+i);
	}
    },
    noticeConstructionFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.kdock');
	this.playSound(path);
	if( KanColleTimerConfig.getBool('popup.kdock') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"construction"+i);
	}
    },
    noticeMissionFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.mission');
	this.playSound(path);
	if( KanColleTimerConfig.getBool('popup.mission') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"mission"+i);
	}
    },

    // 1分前の通知
    noticeRepair1min: function(i){
	let path = KanColleTimerConfig.getUnichar('sound.1min.ndock');
	this.playSound(path);
    },
    noticeConstruction1min: function(i){
	let path = KanColleTimerConfig.getUnichar('sound.1min.kdock');
	this.playSound(path);
    },
    noticeMission1min: function(i){
	let path = KanColleTimerConfig.getUnichar('sound.1min.mission');
	this.playSound(path);
    },

    update: function(){
	let i;
	let now = GetCurrentTime();
	let fleetremain = evaluateXPath(document,"//*[@class='fleetremain']");
	let ndockremain = evaluateXPath(document,"//*[@class='ndockremain']");
	let kdockremain = evaluateXPath(document,"//*[@class='kdockremain']");
	let fleet_time = evaluateXPath(document,"//*[@class='fleet-time']");
	let ndock_time = evaluateXPath(document,"//*[@class='ndock-time']");
	let kdock_time = evaluateXPath(document,"//*[@class='kdock-time']");

	// 遠征
	for(i in KanColleRemainInfo.fleet){
	    i = parseInt(i);
	    let t = KanColleRemainInfo.fleet[i].mission_finishedtime;
	    if( t > 0 ){
		let d = t - now;
		if( fleet_time[i].style.color=="black" ){
		    if( d<60 ){
			this.noticeMission1min(i);
		    }
		}
		fleet_time[i].style.color = d<60?"red":"black";

		if( d<0 ){
		    let str = KanColleRemainInfo.fleet_name[i]+"が遠征から帰還しました。\n";
		    AddLog(str);
		    KanColleRemainInfo.fleet[i].mission_finishedtime = 0;
		    this.noticeMissionFinished(i, str);
		}else{
		    fleetremain[i].value = GetTimeString( d );
		}
	    }else{
		fleetremain[i].value = "";
	    }
	}

	// 入渠ドック
	for(i in KanColleRemainInfo.ndock){
	    i = parseInt(i);
	    let t = KanColleRemainInfo.ndock[i].finishedtime;
	    if( t > 0 ){
		let d = KanColleRemainInfo.ndock[i].finishedtime - now;

		if( ndock_time[i].style.color=="black" ){
		    if( d<60 ){
			this.noticeRepair1min(i);
		    }
		}
		ndock_time[i].style.color = d<60?"red":"black";
		if( d<0 ){
		    let str = "ドック"+(i+1)+"の修理が完了しました。\n";
		    AddLog(str);
		    KanColleRemainInfo.ndock[i].finishedtime = 0;
		    this.noticeRepairFinished(i,str);
		}else{
		    ndockremain[i].value = GetTimeString( d );
		}
	    }else{
		ndockremain[i].value = "";
	    }
	}

	// 建造ドック
	for(i in KanColleRemainInfo.kdock){
	    i = parseInt(i);
	    let t = KanColleRemainInfo.kdock[i].finishedtime;
	    if( t > 0 ){
		let d = KanColleRemainInfo.kdock[i].finishedtime - now;

		if( kdock_time[i].style.color=="black" ){
		    if( d<60 ){
			this.noticeConstruction1min(i);
		    }
		}
		kdock_time[i].style.color = d<60?"red":"black";
		if( d<0 ){
		    let str = "ドック"+(i+1)+"の建造が完了しました。\n";
		    AddLog(str);
		    KanColleRemainInfo.kdock[i].finishedtime = 0;
		    this.noticeConstructionFinished(i,str);
		}else{
		    kdockremain[i].value = GetTimeString( d );
		}
	    }else{
		kdockremain[i].value = "";
	    }
	}
    },

    init: function(){
	KanColleHttpRequestObserver.init();
	KanColleHttpRequestObserver.addCallback( callback );

	setInterval( function(){
			 KanColleTimer.update();
		     }, 1000 );

	try{
	    for(let i=0; i<4; i++){
		let k = i+1;
		if( KanColleRemainInfo.fleet_name[i] ){
		    $('fleetname'+k).value = KanColleRemainInfo.fleet_name[i];
		}
		if( KanColleRemainInfo.fleet_time[i] ){
		    $('fleet'+k).value = KanColleRemainInfo.fleet_time[i];
		}
		if( KanColleRemainInfo.ndock_time[i] ){
		    $('ndock'+k).value = KanColleRemainInfo.ndock_time[i];
		}
		if( KanColleRemainInfo.kdock_time[i] ){
		    $('kdock'+k).value = KanColleRemainInfo.kdock_time[i];
		}
	    }
	} catch (x) {
	}
    },

    destroy: function(){
	KanColleHttpRequestObserver.removeCallback( callback );
	KanColleHttpRequestObserver.destroy();
    }
};


window.addEventListener("load", function(e){ KanColleTimer.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimer.destroy(); }, false);
