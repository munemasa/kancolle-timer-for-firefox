Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");


var KanColleTimerSidebar = {
    imageURL: "http://pics.dmm.com/freegame/app/854854/200.jpg",

    ndock: [],
    kdock: [],
    fleet: [],

    audios:[],

    playSound: function(path){
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
    },

    // 完了の通知
    noticeRepairFinished: function(i,str){
	this.audios[0].play();

	if( KanColleTimerConfig.getBool('popup.ndock') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"repair"+i);
	}
    },
    noticeConstructionFinished: function(i,str){
	this.audios[1].play();

	if( KanColleTimerConfig.getBool('popup.kdock') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"construction"+i);
	}
    },
    noticeMissionFinished: function(i,str){
	this.audios[2].play();

	if( KanColleTimerConfig.getBool('popup.missionk') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"mission"+i);
	}
    },

    // 1分前の通知
    noticeRepair1min: function(i){
	this.audios[3].play();
    },
    noticeConstruction1min: function(i){
	this.audios[4].play();
    },
    noticeMission1min: function(i){
	this.audios[5].play();
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
		    let str = KanColleRemainInfo.fleet_name[i]+"が遠征から帰還しました。\n";
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

    init: function(){
	Application.console.log('KanColle Timer sidebar init.');
	KanColleHttpRequestObserver.init();
	KanColleHttpRequestObserver.addCallback( KanColleTimerSidebarCallback );
	setInterval( function(){
			 KanColleTimerSidebar.update();
		     }, 1000 );

	try{
	    for(let i=0; i<4; i++){
		let k = i+1;
		if( KanColleRemainInfo.fleet_name[i] ){
		    $('fleetname'+k).value = KanColleRemainInfo.fleet_name[i];
		}
		if( KanColleRemainInfo.mission_name[i] ){
		    let mission_name = KanColleRemainInfo.mission_name[i];
		    $('mission_name'+k).value=mission_name;
		}
		if( KanColleRemainInfo.fleet_time[i] ){
		    $('fleet'+k).value = KanColleRemainInfo.fleet_time[i];
		}
		if( KanColleRemainInfo.ndock_memo[i] ){
		    $('ndock-box'+k).setAttribute('tooltiptext',
						  KanColleRemainInfo.ndock_memo[i] );
		}

		if( KanColleRemainInfo.ndock_time[i] ){
		    $('ndock'+k).value = KanColleRemainInfo.ndock_time[i];
		}
		if( KanColleRemainInfo.kdock_time[i] ){
		    $('kdock'+k).value = KanColleRemainInfo.kdock_time[i];
		}
		// 建造中艦艇の表示復元
		if( KanColleRemainInfo.construction_shipname[i] ){
		    $('kdock-box'+k).setAttribute('tooltiptext',KanColleRemainInfo.construction_shipname[i]);
		}
	    }
	} catch (x) {
	}

	this.audios = document.getElementsByTagName('html:audio');
    },

    destroy: function(){
	Application.console.log('KanColle Timer sidebar destroy.');
	KanColleHttpRequestObserver.removeCallback( KanColleTimerSidebarCallback );
	KanColleHttpRequestObserver.destroy();
    }
};


window.addEventListener("load", function(e){ KanColleTimerSidebar.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimerSidebar.destroy(); }, false);
