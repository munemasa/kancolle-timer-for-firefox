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
     * 音声再生を行う(nsISound)
     * @param path ファイルのパス
     */
    playSound: function(path){
	PlaySound( path );
    },

    /**
     * 音声通知を行う.
     * 設定によって再生方式を変えて再生する。
     * @param elem audio要素
     * @param path ファイルのパス
     */
    playNotice: function( elem, path ){
	let i = KanColleTimerConfig.getInt('sound.api');
	switch( i ){
	case 1:// nsISound
	    this.playSound( path );
	    break;
	default:// HTML5 audio
	    elem.play();
	    break;
	}
    },

    // 完了の通知
    noticeRepairFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.ndock');
	this.playNotice( this.audios[0], path );

	if( KanColleTimerConfig.getBool('popup.ndock') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"repair"+i);
	}
    },
    noticeConstructionFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.kdock');
	this.playNotice( this.audios[1], path );

	if( KanColleTimerConfig.getBool('popup.kdock') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"construction"+i);
	}
    },
    noticeMissionFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.mission');
	this.playNotice( this.audios[2], path );

	if( KanColleTimerConfig.getBool('popup.mission') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"mission"+i);
	}
    },

    // 1分前の通知
    noticeRepair1min: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.1min.ndock');
	this.playNotice( this.audios[3], path );

	if( KanColleTimerConfig.getBool('popup.ndock') &&
	    KanColleTimerConfig.getBool('popup.1min-before') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"repair"+i);
	}
    },
    noticeConstruction1min: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.1min.kdock');
	this.playNotice( this.audios[4], path );

	if( KanColleTimerConfig.getBool('popup.kdock') &&
	    KanColleTimerConfig.getBool('popup.1min-before') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"construction"+i);
	}
    },
    noticeMission1min: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.1min.mission');
	this.playNotice( this.audios[5], path );

	if( KanColleTimerConfig.getBool('popup.1min-before') &&
	    KanColleTimerConfig.getBool('popup.mission') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"mission"+i);
	}
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
			let str = "まもなく"+KanColleRemainInfo.fleet_name[i]+"が遠征から帰還します。\n";
			this.noticeMission1min(i,str);
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
			let str = "まもなくドック"+(i+1)+"の修理が完了します。\n";
			this.noticeRepair1min(i,str);
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
			let str = "まもなくドック"+(i+1)+"の建造が完了します。\n";
			this.noticeConstruction1min(i,str);
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

    /**
     * スクリーンショット撮影
     * @param path 保存先のパス(指定なしだとファイル保存ダイアログを出す)
     */
    takeScreenshot: function(path){
	let isjpeg = KanColleTimerConfig.getBool("screenshot.jpeg");
	var url = TakeKanColleScreenshot( isjpeg );
	if( !url ){
	    AlertPrompt("艦隊これくしょんのページが見つかりませんでした。","艦これタイマー");
	    return null;
	}

	var file = null;
	if( !path ){
	    var fp = Components.classes['@mozilla.org/filepicker;1']
		.createInstance(Components.interfaces.nsIFilePicker);
	    fp.init(window, "艦これスクリーンショットの保存", fp.modeSave);
	    fp.appendFilters(fp.filterImages);
	    fp.defaultExtension = isjpeg?"jpg":"png";
	    if( KanColleTimerConfig.getUnichar("screenshot.path") ){
		fp.displayDirectory = OpenFile(KanColleTimerConfig.getUnichar("screenshot.path"));
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
	var path = KanColleTimerConfig.getUnichar("screenshot.path");
	this.takeScreenshot(path);
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
