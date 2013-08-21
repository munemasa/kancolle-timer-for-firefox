// http://www.dmm.com/netgame/social/application/-/detail/=/app_id=854854/

Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

var KanColleTimer = {
    imageURL: "http://pics.dmm.com/freegame/app/854854/200.jpg",

    ndock: [],
    kdock: [],
    fleet: [],

    audios:[],

    // 入渠ドックのメモ作成
    createRepairMemo: function(){
	let elem = $('popup-ndock-memo').triggerNode;
	let hbox = FindParentElement(elem,"hbox");
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

	if( KanColleTimerConfig.getBool('popup.mission') ){
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

    // ウィンドウを最前面にする
    setWindowOnTop:function(){
	WindowOnTop( window, $('window-stay-on-top').hasAttribute('checked') );
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

    takeScreenshot: function(){
	var tab = FindKanColleTab();
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

	var url;
	try {
	    url = canvas.toDataURL("image/png");
	} catch(ex) {
	    return alert("This feature requires Firefox 2.0.\n" + ex);
	}
	const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
            .getService(Components.interfaces.nsIIOService);
	url = IO_SERVICE.newURI(url, null, null);

	var fp = Components.classes['@mozilla.org/filepicker;1']
            .createInstance(Components.interfaces.nsIFilePicker);
	fp.init(window, "Save Screenshot As", fp.modeSave);
	fp.appendFilters(fp.filterImages);
	fp.defaultExtension = "png";
	fp.defaultString = "screenshot.png";
	if ( fp.show() == fp.returnCancel || !fp.file ) return null;
	
	var wbp = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
            .createInstance(Components.interfaces.nsIWebBrowserPersist);
	wbp.saveURI(url, null, null, null, null, fp.file, null);
	
	canvas.style.display = "none";
	canvas.width = 1;
	canvas.height = 1;
	return true;
    },

    initWallpaper:function(){
	let wallpaper = KanColleTimerConfig.getUnichar('wallpaper');
	if( wallpaper ){
	    let alpha = KanColleTimerConfig.getInt('wallpaper.alpha') / 100.0;
	    let sheet = document.styleSheets[1];
	    wallpaper = wallpaper.replace(/\\/g,'/');
	    let rule = "#wallpaper { background-image: url('file://"+wallpaper+"'); opacity: "+alpha+"; }";
	    sheet.insertRule(rule,1);
	}
    },

    init: function(){
	KanColleHttpRequestObserver.init();
	KanColleHttpRequestObserver.addCallback( KanColleTimerCallback );

	setInterval( function(){
			 KanColleTimer.update();
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

	this.initWallpaper();

	this.audios = document.getElementsByTagName('html:audio');

	WindowOnTop( window, $('window-stay-on-top').hasAttribute('checked') );
    },

    destroy: function(){
	KanColleHttpRequestObserver.removeCallback( KanColleTimerCallback );
	KanColleHttpRequestObserver.destroy();
    }
};


window.addEventListener("load", function(e){ KanColleTimer.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimer.destroy(); }, false);
