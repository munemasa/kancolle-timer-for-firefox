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

function KanColleTimerSidebarCallback(request,s){
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
		//$(nameid).value = d.api_name; // 艦隊名
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

var KanColleTimerSidebar = {
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
	if( KanColleTimerConfig.getBool('popup.missionk') ){
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

	// 遠征
	for(i in KanColleRemainInfo.fleet){
	    i = parseInt(i);
	    let t = KanColleRemainInfo.fleet[i].mission_finishedtime;
	    if( t > 0 ){
		let d = t - now;

		if( fleetremain[i].style.color=="black" ){
		    if( d<60 ){
			this.noticeMission1min(i);
		    }
		}
		fleetremain[i].style.color = d<60?"red":"black";

		if( d<0 ){
		    let str = KanColleRemainInfo.fleet[i].fleet_name+"が遠征から帰還しました。\n";
		    AddLog(str);
		    KanColleRemainInfo.fleet[i].mission_finishedtime = 0;
		    this.noticeMissionFinished(i, str);
		}else{
		    fleetremain[i].value = GetTimeString( d );
		}
	    }else{
		fleetremain[i].value = t==0?"00:00:00":"";
	    }
	}

	// 入渠ドック
	for(i in KanColleRemainInfo.ndock){
	    i = parseInt(i);
	    let t = KanColleRemainInfo.ndock[i].finishedtime;
	    if( t > 0 ){
		let d = t - now;

		if( ndockremain[i].style.color=="black" ){
		    if( d<60 ){
			this.noticeRepair1min(i);
		    }
		}
		ndockremain[i].style.color = d<60?"red":"black";
		if( d<0 ){
		    let str = "ドック"+(i+1)+"の修理が完了しました。\n";
		    AddLog(str);
		    KanColleRemainInfo.ndock[i].finishedtime = 0;
		    this.noticeRepairFinished(i,str);
		}else{
		    ndockremain[i].value = GetTimeString( d );
		}
	    }else{
		ndockremain[i].value = t==0?"00:00:00":"";
	    }
	}

	// 建造ドック
	for(i in KanColleRemainInfo.kdock){
	    i = parseInt(i);
	    let t = KanColleRemainInfo.kdock[i].finishedtime;
	    if( t > 0 ){
		let d = t - now;

		if( kdockremain[i].style.color=="black" ){
		    if( d<60 ){
			this.noticeConstruction1min(i);
		    }
		}
		kdockremain[i].style.color = d<60?"red":"black";
		if( d<0 ){
		    let str = "ドック"+(i+1)+"の建造が完了しました。\n";
		    AddLog(str);
		    KanColleRemainInfo.kdock[i].finishedtime = 0;
		    this.noticeConstructionFinished(i,str);
		}else{
		    kdockremain[i].value = GetTimeString( d );
		}
	    }else{
		kdockremain[i].value = t==0?"00:00:00":"";
	    }
	}
    },

    init: function(){
	Application.console.log('KanColle Timer sidebar init.');
	KanColleHttpRequestObserver.init();
	KanColleHttpRequestObserver.addCallback( KanColleTimerSidebarCallback );
	setInterval( function(){
			 KanColleTimerSidebar.update();
		     }, 1000 );
    },

    destroy: function(){
	Application.console.log('KanColle Timer sidebar destroy.');
	KanColleHttpRequestObserver.removeCallback( KanColleTimerSidebarCallback );
	KanColleHttpRequestObserver.destroy();
    }
};


window.addEventListener("load", function(e){ KanColleTimerSidebar.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimerSidebar.destroy(); }, false);
