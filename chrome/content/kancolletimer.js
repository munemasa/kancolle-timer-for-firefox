// vim: set ts=8 sw=4 sts=4 ff=dos :

// http://www.dmm.com/netgame/social/application/-/detail/=/app_id=854854/

Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

var KanColleTimer = {
    imageURL: "http://pics.dmm.com/freegame/app/854854/200.jpg",

    ndock: [],
    kdock: [],
    fleet: [],

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

    // 完了の通知
    noticeRepairFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.ndock');
	$('sound.ndock').play();

	if( KanColleTimerConfig.getBool('popup.ndock') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"repair"+i);
	}
    },
    noticeConstructionFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.kdock');
	$('sound.kdock').play();

	if( KanColleTimerConfig.getBool('popup.kdock') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"construction"+i);
	}
    },
    noticeMissionFinished: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.mission');
	$('sound.mission').play();

	if( KanColleTimerConfig.getBool('popup.mission') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"mission"+i);
	}
    },

    // 1分前の通知
    noticeRepair1min: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.1min.ndock');
	$('sound.1min.ndock').play();

	if( KanColleTimerConfig.getBool('popup.ndock') &&
	    KanColleTimerConfig.getBool('popup.1min-before') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"repair"+i);
	}
    },
    noticeConstruction1min: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.1min.kdock');
	$('sound.1min.kdock').play();

	if( KanColleTimerConfig.getBool('popup.kdock') &&
	    KanColleTimerConfig.getBool('popup.1min-before') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"construction"+i);
	}
    },
    noticeMission1min: function(i,str){
	let path = KanColleTimerConfig.getUnichar('sound.1min.mission');
	$('sound.1min.mission').play();

	if( KanColleTimerConfig.getBool('popup.1min-before') &&
	    KanColleTimerConfig.getBool('popup.mission') ){
	    ShowPopupNotification(this.imageURL,"艦これタイマー",str,"mission"+i);
	}
    },

    // ウィンドウを最前面にする
    setWindowOnTop:function(){
	WindowOnTop( window, $('window-stay-on-top').hasAttribute('checked') );
    },

    // 汎用タイマーの時間設定
    setGeneralTimer: function(sec){
	sec = parseInt(sec);
	this.general_timer = GetCurrentTime() + sec;
    },

    updateGeneralTimer:function(){
	let now = GetCurrentTime();
	if( !this.general_timer ) return;
	let remain = this.general_timer-now;
	if( remain<0 ){
	    remain = 0;
	    this.general_timer = 0;
	    $('sound.default').play();
	    if( KanColleTimerConfig.getBool('popup.general-timer') ){
		let str = "時間になりました。";
		ShowPopupNotification(this.imageURL,"艦これタイマー",str,"general-timer");
	    }
	}
	$('general-timer').value = GetTimeString( remain );
    },

    updateDailyJob: function(){
	let now = new Date();
	let d = now.getDate();
	let h = now.getHours();
	let m = now.getMinutes();
	let s = now.getSeconds();
	// 毎日午前5時になったときに任務を一旦クリアする
	if( h==5 && m==0 && this._date!=d ){
	    for( let i in KanColleRemainInfo.gMission ){
		delete KanColleRemainInfo.gMission[i];
	    }
	    this._date = d;
	    SetQuestName();
	}
    },

    update: function(){
	this.updateDailyJob();
	this.updateGeneralTimer();

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
		if( d<60 ){
		    fleet_time[i].style.color = "red";
		    fleetremain[i].style.color = KanColleTimerConfig.isShortDisplay()?"red":"black";
		}else{
		    fleet_time[i].style.color = "black";
		    fleetremain[i].style.color = "black";
		}

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

		if( d<60 ){
		    ndock_time[i].style.color = "red";
		    ndockremain[i].style.color = KanColleTimerConfig.isShortDisplay()?"red":"black";
		}else{
		    ndock_time[i].style.color = "black";
		    ndockremain[i].style.color = "black";
		}

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

		if( d<60 ){
		    kdock_time[i].style.color = "red";
		    kdockremain[i].style.color = KanColleTimerConfig.isShortDisplay()?"red":"black";
		}else{
		    kdock_time[i].style.color = "black";
		    kdockremain[i].style.color = "black";
		}
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

    createMissionBalanceTable:function(){
	let balance = KanColleData.mission_hourly_balance;
	let rows = $('hourly_balance');
	for( let i in balance ){
	    let row = CreateElement('row');
	    let name = KanColleData.mission_name[i];
	    name = name.substring(0,7);
	    row.appendChild( CreateLabel( name ) );
	    for( let j=0; j<4; j++ ){
		row.appendChild( CreateLabel(balance[i][j]) );
	    }
	    row.setAttribute("style","border-bottom: 1px solid gray;");
	    row.setAttribute("tooltiptext", KanColleData.mission_help[i] );
	    rows.appendChild( row );
	}
    },

    findWindow: function(){
	let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	let win = wm.getMostRecentWindow("KanColleTimerMainWindow");
	return win;
    },
    open: function(){
	let feature="chrome,resizable=yes";
	let win = this.findWindow();
	if(win){
	    win.focus();
	}else{
	    let w = window.open("chrome://kancolletimer/content/mainwindow.xul","KanColleTimer",feature);
	    w.focus();
	}
    },

    readResourceData: function(){
	let data = Storage.readObject( "resourcehistory", [] );
	let d = KanColleRemainInfo.gResourceData;

	let t1 = data.length && data[ data.length-1 ].recorded_time;
	let t2 = d.length && d[ d.length-1 ].recorded_time;
	if( t2 < t1 ){
	    KanColleRemainInfo.gResourceData = data;
	}
    },
    writeResourceData: function(){
	let month_ago = GetCurrentTime() - 60*60*24*31;
	
	let data = KanColleRemainInfo.gResourceData.filter(
	    function( elem, index, array ){
		return elem.recorded_time > month_ago;
	});
	Storage.writeObject( "resourcehistory", data );
    },

    startTimer: function() {
	if (this._timer)
	    return;
	this._timer = setInterval(this.update.bind(this), 1000);
    },

    stopTimer: function() {
	if (!this._timer)
	    return;
	clearInterval(this._timer);
	this._timer = null;
    },

    init: function(){
	KanColleHttpRequestObserver.init();

	KanColleTimerHeadQuarterInfoStart();
	KanColleTImerDeckInfoStart();
	KanColleTimerNdockInfoStart();
	KanColleTimerKdockInfoStart();
	KanColleTimerQuestInfoStart();
	KanColleTimerFleetOrgInfoStart();
	KanColleTimerFleetCondInfoStart();
	KanColleTimerMaterialLogStart();

	this.startTimer();

	KanColleTimerDeckInfoRestore();
	KanColleTimerKdockInfoRestore();
	KanColleTimerNdockInfoRestore();

	this.createMissionBalanceTable();

	SetQuestName();
	SetAllFleetOrganization();
	SetFleetsCondition();

	KanColleTimerSetHeadQuarterInformation();

	this.readResourceData();
    },

    destroy: function(){
	this.stopTimer();

	KanColleTimerMaterialLogStop();
	KanColleTimerFleetCondInfoStop();
	KanColleTimerFleetOrgInfoStop();
	KanColleTimerQuestInfoStop();
	KanColleTimerKdockInfoStop();
	KanColleTimerNdockInfoStop();
	KanColleTImerDeckInfoStop();
	KanColleTimerHeadQuarterInfoStop();

	KanColleHttpRequestObserver.destroy();

	this.writeResourceData();
    }
};
