Components.utils.import("resource://gre/modules/ctypes.jsm");
Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

/**
 * いろいろと便利関数などを.
 */
try{
    // Fx4.0
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
} catch (x) {
} 

const Cc = Components.classes;
const Ci = Components.interfaces;

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const HTML_NS= "http://www.w3.org/1999/xhtml";

function KanColleTimerCallback(request,s){
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
		var k = i+1;
		var nameid = 'fleetname'+k;
		var ftime_str = 'fleet'+k;
		var d = data.api_data[i];
		KanColleRemainInfo.fleet[i] = new Object();
		KanColleRemainInfo.fleet_name[i] = d.api_name;
		$(nameid).value = d.api_name; // 艦隊名
		if( d.api_mission[0] ){
		    let mission_id = d.api_mission[1]; // 遠征ID
		    // 遠征名を表示
		    let mission_name = KanColleData.mission_name[mission_id];
		    KanColleRemainInfo.mission_name[i] = mission_name;
		    $('mission_name'+k).value = mission_name;

		    let ftime = GetDateString( d.api_mission[2] ); // 遠征終了時刻
		    KanColleRemainInfo.fleet_time[i] = ftime;
		    $(ftime_str).value = ftime;

		    var finishedtime = parseInt( d.api_mission[2]/1000 );
		    if( now<finishedtime ){
			KanColleRemainInfo.fleet[i].mission_finishedtime = finishedtime;
		    }

		    let diff = finishedtime - now;
		    $(ftime_str).style.color = diff<60?"red":"black";
		}else{
		    $(ftime_str).value = "";
		    KanColleRemainInfo.fleet[i].mission_finishedtime = -1;
		}
	    }
	}
    }else if( url.match(/kcsapi\/api_get_member\/ndock/) ){
	// 入渠ドック
	if( data.api_result==1 ){
	    for( let i in data.api_data ){
		i = parseInt(i);
		var ftime_str = 'ndock'+(i+1);
		KanColleRemainInfo.ndock[i] = new Object();
		if( data.api_data[i].api_complete_time ){
		    let name = FindShipName( data.api_data[i].api_ship_id );
		    $("ndock-label"+(i+1)).setAttribute('tooltiptext', name);

		    var finishedtime_str = data.api_data[i].api_complete_time_str;
		    $(ftime_str).value = finishedtime_str;
		    KanColleRemainInfo.ndock_time[i] = finishedtime_str;

		    var finishedtime = parseInt( data.api_data[i].api_complete_time/1000 );
		    if( now<finishedtime ){
			KanColleRemainInfo.ndock[i].finishedtime = finishedtime;
		    }

		    let diff = finishedtime - now;
		    $(ftime_str).style.color = diff<60?"red":"black";
		}else{
		    $("ndock-label"+(i+1)).setAttribute('tooltiptext', "");
		    KanColleRemainInfo.ndock_time[i] = "";
		    $(ftime_str).value = "";
		    KanColleRemainInfo.ndock[i].finishedtime = -1;
		}
	    }
	}
    }else if( url.match(/kcsapi\/api_get_member\/kdock/) ){
	// 建造ドック
	if( data.api_result==1 ){
	    for( let i in data.api_data ){
		i = parseInt(i);
		var k = i+1;
		KanColleRemainInfo.kdock[i] = new Object();
		var ftime_str = 'kdock'+k;
		if( data.api_data[i].api_complete_time ){
		    // 建造完了時刻の表示
		    var finishedtime_str = data.api_data[i].api_complete_time_str;
		    $(ftime_str).value = finishedtime_str;
		    KanColleRemainInfo.kdock_time[i] = finishedtime_str;

		    // 残り時間とツールチップの設定
		    var finishedtime = parseInt( data.api_data[i].api_complete_time/1000 );
		    if( now < finishedtime ){
			// 建造予定艦をツールチップで表示
			let created_time = KanColleTimerConfig.getInt("kdock-created-time"+k);
			if( !created_time ){
			    // ブラウザを起動して初回タイマー起動時に
			    // 建造開始時刻を復元するため
			    created_time = now;
			    KanColleTimerConfig.setInt( "kdock-created-time"+k, now );
			}
			let name = GetConstructionShipName(created_time,finishedtime);
			KanColleRemainInfo.construction_shipname[i] = name;
			$('kdock-box'+k).setAttribute('tooltiptext',name);

			KanColleRemainInfo.kdock[i].finishedtime = finishedtime;
		    }

		    let diff = finishedtime - now;
		    $(ftime_str).style.color = diff<60?"red":"black";

		    // 建造艦艇の表示…はあらかじめ分かってしまうと面白みがないのでやらない
		    /*
		    let ship_id = parseInt( data.api_data[i].api_created_ship_id );
		    let ship_name = KanColleRemainInfo.gShipList[ ship_id-1 ].api_name;
		    $('kdock-box'+k).setAttribute('tooltiptext',ship_name);
		     */
		}else{
		    // 建造していない
		    KanColleRemainInfo.kdock_time[i] = "";
		    $(ftime_str).value = "";
		    KanColleRemainInfo.kdock[i].finishedtime = -1;
		    $('kdock-box'+k).setAttribute('tooltiptext','');
		    KanColleTimerConfig.setInt( "kdock-created-time"+k, 0 );
		}
	    }
	}
    }else if( url.match(/kcsapi\/api_get_master\/ship/) ){
	KanColleRemainInfo.gShipList = data.api_data;
    }else if( url.match(/kcsapi\/api_get_member\/ship/) ){
	KanColleRemainInfo.gOwnedShipList = data.api_data;
    }
}

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

function FindShipName( ship_id ){
    let sort;
    try{
	for( let k in KanColleRemainInfo.gOwnedShipList ){
	    let ship = KanColleRemainInfo.gOwnedShipList[k];
	    let id = ship.api_id; // 所有艦艇の持つID
	    sort = ship.api_sortno;
	    if( id==ship_id ) break;
	}

	for( let k in KanColleRemainInfo.gShipList ){
	    let ship = KanColleRemainInfo.gShipList[k];
	    if( ship.api_sortno==sort ){
		return ship.api_name;
	    }
	}
	
    } catch (x) {

    }
    return "";
}

function FindKanColleTab(){
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
}

function WindowOnTop(win, istop){
    try{
	let baseWin = win.QueryInterface(Ci.nsIInterfaceRequestor)
	    .getInterface(Ci.nsIWebNavigation)
	    .QueryInterface(Ci.nsIDocShellTreeItem)
	    .treeOwner
	    .QueryInterface(Ci.nsIInterfaceRequestor)
	    .nsIBaseWindow;
	let nativeHandle = baseWin.nativeHandle;

	let lib = ctypes.open('user32.dll');

	let HWND_TOPMOST = -1;
	let HWND_NOTOPMOST = -2;
	let SWP_NOMOVE = 2;
	let SWP_NOSIZE = 1;

	/*
	 WINUSERAPI BOOL WINAPI SetWindowPos(
	 __in HWND hWnd, 
	 __in_opt HWND hWndInsertAfter,
	 __in int X,
	 __in int Y,
	 __in int cx,
	 __in int cy,
	 __in UINT uFlags );
	 */
	let SetWindowPos = lib.declare("SetWindowPos",
				       ctypes.winapi_abi, // abi
				       ctypes.int32_t,     // return type
				       ctypes.int32_t,     // hWnd arg 1 HWNDはint32_tでOK
				       ctypes.int32_t,     // hWndInsertAfter
				       ctypes.int32_t,     // X
				       ctypes.int32_t,     // Y
				       ctypes.int32_t,     // cx
				       ctypes.int32_t,     // cy
				       ctypes.uint32_t);   // uFlags
	SetWindowPos( parseInt(nativeHandle), istop?HWND_TOPMOST:HWND_NOTOPMOST,
		      0, 0, 0, 0,
		      SWP_NOMOVE | SWP_NOSIZE);
	lib.close();
    } catch (x) {
    }
}


function $(tag){
    return document.getElementById(tag);
}

function $$(tag){
    return document.getElementsByTagName(tag);
}

/**
 * オブジェクトをマージする.
 * @param a オブジェクト1
 * @param b オブジェクト2
 * @param aにbをマージしたオブジェクトを返す
 */
function MergeSimpleObject(a,b)
{
    for(let k in b){
	a[k] = b[k];
    }
    return a;
}

/**
 * 配列をシャッフルする.
 * @param list 配列
 */
function ShuffleArray( list ){
    let i = list.length;
    while(i){
	let j = Math.floor(Math.random()*i);
	let t = list[--i];
	list[i] = list[j];
	list[j] = t;
    }
}


function GetAddonVersion()
{
    let version;
    try{
	let em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
	let addon = em.getItemForID("kancolletimer@miku39.jp");
	version = addon.version;
    } catch (x) {
	// Fx4
	AddonManager.getAddonByID("kancolletimer@miku39.jp",
				  function(addon) {
				      version = addon.version;
				  });
	// Piroさん(http://piro.sakura.ne.jp/)が値が設定されるまで待つことをやっていたので真似してしまう.
	let thread = Components.classes['@mozilla.org/thread-manager;1'].getService().mainThread;
	while (version === void(0)) {
	    thread.processNextEvent(true);
	}
    }
    return version;
}

function GetXmlText(xml,path){
    try{
	let tmp = evaluateXPath(xml,path);
	if( tmp.length<=0 ) return null;
	return tmp[0].textContent;
    } catch (x) {
	debugprint(x);
	return null;
    }
}

// 特定の DOM ノードもしくは Document オブジェクト (aNode) に対して
// XPath 式 aExpression を評価し、その結果を配列として返す。
// 最初の作業を行った wanderingstan at morethanwarm dot mail dot com に感謝します。
function evaluateXPath(aNode, aExpr) {
    let xpe = new XPathEvaluator();
    let nsResolver = xpe.createNSResolver(aNode.ownerDocument == null ?
					  aNode.documentElement : aNode.ownerDocument.documentElement);
    let result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
    let found = [];
    let res;
    while (res = result.iterateNext())
	found.push(res);
    return found;
}
function evaluateXPath2(aNode, aExpr) {
    let xpe = new XPathEvaluator();
    let nsResolver = function(){ return XUL_NS; };
    let result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
    let found = [];
    let res;
    while (res = result.iterateNext())
	found.push(res);
    return found;
}

function CreateElement(part){
    let elem;
    elem = document.createElementNS(XUL_NS,part);
    return elem;
}
function CreateHTMLElement(part){
    let elem;
    elem = document.createElementNS(HTML_NS,part);
    return elem;
}

/**
 * 指定の要素を削除する.
 * @param elem 削除したい要素
 */
function RemoveElement(elem){
    elem.parentNode.removeChild(elem);
}

/**
 * 指定の要素の子要素を全削除する.
 * @param elem 対象の要素
 */
function RemoveChildren(elem){
    while(elem.hasChildNodes()) { 
	elem.removeChild(elem.childNodes[0]);
    }
}

function CreateMenuItem(label,value){
    let elem;
    elem = document.createElementNS(XUL_NS,'menuitem');
    elem.setAttribute('label',label);
    elem.setAttribute('value',value);
    return elem;
};

function CreateButton(label){
    let elem;
    elem = document.createElementNS(XUL_NS,'button');
    elem.setAttribute('label',label);
    return elem;
}

function CreateLabel(label){
    let elem;
    elem = document.createElementNS(XUL_NS,'label');
    elem.setAttribute('value',label);
    return elem;
}


/** ディレクトリを作成する.
 * ディレクトリ掘ったらtrue、掘らなかったらfalseを返す.
 */
function CreateFolder(path){
    let file = OpenFile(path);
    if( !file.exists() || !file.isDirectory() ) {   // if it doesn't exist, create
	file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
	return true;
    }
    return false;
}

/**
 * ファイルを開く
 */
function OpenFile(path){
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
}

// NicoLiveHelperのインストールパスを返す.
function GetExtensionPath(){
    let id = "kancolletimer@miku39.jp";
    let ext;
    try{
	ext = Components.classes["@mozilla.org/extensions/manager;1"]
            .getService(Components.interfaces.nsIExtensionManager)
            .getInstallLocation(id)
            .getItemLocation(id);
    } catch (x) {
	let _addon;
	AddonManager.getAddonByID("kancolletimer@miku39.jp",
				  function(addon) {
				      _addon = addon;
				  });
	// Piroさん(http://piro.sakura.ne.jp/)が値が設定されるまで待つことをやっていたので真似してしまう.
	let thread = Components.classes['@mozilla.org/thread-manager;1'].getService().mainThread;
	while (_addon === void(0)) {
	    thread.processNextEvent(true);
	}
	ext = _addon.getResourceURI('/').QueryInterface(Components.interfaces.nsIFileURL).file.clone();
    }
    return ext;
}

function PlayAlertSound(){
    let sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
    sound.playSystemSound("_moz_alertdialog");
}

function AlertPrompt(text,caption){
    let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    let result = prompts.alert(window, caption, text);
    return result;
}

function ConfirmPrompt(text,caption){
    let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    let result = prompts.confirm(window, caption, text);
    return result;
}

function InputPrompt(text,caption,input){
    let check = {value: false};
    let input_ = {value: input};

    let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    let result = prompts.prompt(window, caption, text, input_, null, check);
    if( result ){
	return input_.value;
    }else{
	return null;
    }
}

function InputPromptWithCheck(text,caption,input,checktext){
    let check = {value: false};
    let input_ = {value: input};

    let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    let result = prompts.prompt(window, caption, text, input_, checktext, check);
    if( result ){
	return input_.value;
    }else{
	return null;
    }
}

/**
 *  Javascriptオブジェクトをファイルに保存する.
 * @param obj Javascriptオブジェクト
 * @param caption ファイル保存ダイアログに表示するキャプション
 */
function SaveObjectToFile(obj,caption)
{
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, caption, nsIFilePicker.modeSave);
    fp.appendFilters(nsIFilePicker.filterAll);
    let rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	let file = fp.file;
	let path = fp.file.path;
	let os = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
	let flags = 0x02|0x08|0x20;// wronly|create|truncate
	os.init(file,flags,0664,0);
	let cos = GetUTF8ConverterOutputStream(os);
	cos.writeString( JSON.stringify(obj) );
	cos.close();
    }
}

/**
 *  ファイルからJavascriptオブジェクトを読み込む.
 * @param caption ファイル読み込みダイアログに表示するキャプション
 */
function LoadObjectFromFile(caption)
{
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, caption, nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterAll);
    let rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	let file = fp.file;
	let path = fp.file.path;
	let istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(file, 0x01, 0444, 0);
	istream.QueryInterface(Components.interfaces.nsILineInputStream);
	let cis = GetUTF8ConverterInputStream(istream);
	// 行を配列に読み込む
	let line = {}, hasmore;
	let str = "";
	do {
	    hasmore = cis.readString(1024,line);
	    str += line.value;
	} while(hasmore);
	istream.close();

	try{
	    let obj = JSON.parse(str);
	    return obj;
	} catch (x) {
	    debugprint(x);
	    return null;
	}
    }
    return null;
}


/**
 * 指定タグを持つ親要素を探す.
 * @param elem 検索の起点となる要素
 * @param tag 親要素で探したいタグ名
 */
function FindParentElement(elem,tag){
    //debugprint("Element:"+elem+" Tag:"+tag);
    while(elem.parentNode &&
	  (!elem.tagName || (elem.tagName.toUpperCase()!=tag.toUpperCase()))){
	elem = elem.parentNode;
    }
    return elem;
}


/**
 * クリップボードにテキストをコピーする.
 * @param str コピーする文字列
 */
function CopyToClipboard(str){
    if(str.length<=0) return;
    let gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].  
	getService(Components.interfaces.nsIClipboardHelper);  
    gClipboardHelper.copyString(str);
}

function htmlspecialchars(ch){
    ch = ch.replace(/&/g,"&amp;");
    ch = ch.replace(/"/g,"&quot;");
    //ch = ch.replace(/'/g,"&#039;");
    ch = ch.replace(/</g,"&lt;");
    ch = ch.replace(/>/g,"&gt;");
    return ch ;
}

function restorehtmlspecialchars(ch){
    ch = ch.replace(/&quot;/g,"\"");
    ch = ch.replace(/&amp;/g,"&");
    ch = ch.replace(/&lt;/g,"<");
    ch = ch.replace(/&gt;/g,">");
    ch = ch.replace(/&nbsp;/g," ");
    ch = ch.replace(/&apos;/g,"'");
    return ch;
}

function syslog(txt){
    let tmp = GetDateString( GetCurrentTime()*1000 );
    txt = tmp + " " +txt;
    if( $('syslog-textbox') )
	$('syslog-textbox').value += txt + "\n";
}

function debugprint(txt){
    /*
    if( $('debug-textbox') )
	$('debug-textbox').value += txt + "\n";
     */
    Application.console.log(txt);
}

function debugconsole(txt){
    Application.console.log(txt);
}

function debugalert(txt){
    AlertPrompt(txt,'');
}

function ShowPopupNotification(imageURL,title,text,cookie){
    let listener = null;
    let clickable = false;
    try {
	let alertserv = Components.classes['@mozilla.org/alerts-service;1'].getService(Components.interfaces.nsIAlertsService);
	//	    alertserv.showAlertNotification(imageURL, title, text, clickable, cookie, listener, 'NicoLiveAlertExtension');
	alertserv.showAlertNotification(imageURL, title, text, clickable, cookie, listener);
    } catch(e) {
	// prevents runtime error on platforms that don't implement nsIAlertsService
	let image = imageURL;
	let win = Components.classes['@mozilla.org/embedcomp/window-watcher;1'].getService(Components.interfaces.nsIWindowWatcher)
	    .openWindow(null, 'chrome://global/content/alerts/alert.xul','_blank', 'chrome,titlebar=no,popup=yes', null);
	win.arguments = [image, title, text, clickable, cookie, 0, listener];
    }
}


function GetUTF8ConverterInputStream(istream)
{
    let cis = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
    cis.init(istream,"UTF-8",0,Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
    return cis;
}

function GetUTF8ConverterOutputStream(os)
{
    let cos = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
    cos.init(os,"UTF-8",0,Components.interfaces.nsIConverterOutputStream.DEFAULT_REPLACEMENT_CHARACTER);
    return cos;
}


/**
 *  現在時刻を秒で返す(UNIX時間).
 */
function GetCurrentTime(){
    let d = new Date();
    return Math.floor(d.getTime()/1000);
}

function GetDateString(ms){
    let d = new Date(ms);
    return d.toLocaleFormat("%Y-%m-%d %H:%M:%S");
}

function GetFormattedDateString(format,ms){
    let d = new Date(ms);
    return d.toLocaleFormat(format);
}

// string bundleから文字列を読みこむ.
function LoadString(name){
    return $('string-bundle').getString(name);
}
function LoadFormattedString(name,array){
    return $('string-bundle').getFormattedString(name,array);
}

// hour:min:sec の文字列を返す.
function GetTimeString(sec){
    sec = Math.abs(sec);

    let hour = parseInt( sec / 60 / 60 );
    let min = parseInt( sec / 60 ) - hour*60;
    let s = sec % 60;

    let str = hour<10?"0"+hour:hour;
    str += ":";
    str += min<10?"0"+min:min;
    str += ":";
    str += s<10?"0"+s:s;
    return str;
}

// min以上、max以下の範囲で乱数を返す.
function GetRandomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


// LCGの疑似乱数はランダム再生専用のため、他の用途では使用禁止.
var g_randomseed = GetCurrentTime();
function srand(seed)
{
    g_randomseed = seed;
}
function rand()
{
    g_randomseed = (g_randomseed * 214013 + 2531011) & 0x7fffffff;
    return g_randomseed;
}
// min以上、max以下の範囲で乱数を返す.
function GetRandomIntLCG(min,max)
{
    let tmp = rand() >> 4;
    return (tmp % (max-min+1)) + min;
}

function ZenToHan(str){
    return str.replace(/[ａ-ｚＡ-Ｚ０-９－（）＠]/g,
		       function(s){ return String.fromCharCode(s.charCodeAt(0)-65248); });
}

function HiraToKana(str){
    return str.replace(/[\u3041-\u3094]/g,
		      function(s){ return String.fromCharCode(s.charCodeAt(0)+0x60); });
}

/*
 *  convertKana JavaScript Library beta4
 *  
 *  MIT-style license. 
 *  
 *  2007 Kazuma Nishihata [to-R]
 *  http://www.webcreativepark.net
 * 
 * よりアルゴリズムを拝借.
 */
function HanToZenKana(str){
    let fullKana = new Array("ヴ","ガ","ギ","グ","ゲ","ゴ","ザ","ジ","ズ","ゼ","ゾ","ダ","ヂ","ヅ","デ","ド","バ","ビ","ブ","ベ","ボ","パ","ピ","プ","ペ","ポ","゛","。","「","」","、","・","ヲ","ァ","ィ","ゥ","ェ","ォ","ャ","ュ","ョ","ッ","ー","ア","イ","ウ","エ","オ","カ","キ","ク","ケ","コ","サ","シ","ス","セ","ソ","タ","チ","ツ","テ","ト","ナ","ニ","ヌ","ネ","ノ","ハ","ヒ","フ","ヘ","ホ","マ","ミ","ム","メ","モ","ヤ","ユ","ヨ","ラ","リ","ル","レ","ロ","ワ","ン","゜");
    let halfKana = new Array("ｳﾞ","ｶﾞ","ｷﾞ","ｸﾞ","ｹﾞ","ｺﾞ","ｻﾞ","ｼﾞ","ｽﾞ","ｾﾞ","ｿﾞ","ﾀﾞ","ﾁﾞ","ﾂﾞ","ﾃﾞ","ﾄﾞ","ﾊﾞ","ﾋﾞ","ﾌﾞ","ﾍﾞ","ﾎﾞ","ﾊﾟ","ﾋﾟ","ﾌﾟ","ﾍﾟ","ﾎﾟ","ﾞ","｡","｢","｣","､","･","ｦ","ｧ","ｨ","ｩ","ｪ","ｫ","ｬ","ｭ","ｮ","ｯ","ｰ","ｱ","ｲ","ｳ","ｴ","ｵ","ｶ","ｷ","ｸ","ｹ","ｺ","ｻ","ｼ","ｽ","ｾ","ｿ","ﾀ","ﾁ","ﾂ","ﾃ","ﾄ","ﾅ","ﾆ","ﾇ","ﾈ","ﾉ","ﾊ","ﾋ","ﾌ","ﾍ","ﾎ","ﾏ","ﾐ","ﾑ","ﾒ","ﾓ","ﾔ","ﾕ","ﾖ","ﾗ","ﾘ","ﾙ","ﾚ","ﾛ","ﾜ","ﾝ","ﾟ");
    for(let i = 0; i < 89; i++){
	let re = new RegExp(halfKana[i],"g");
	str=str.replace(re, fullKana[i]);
    }
    return str;
}

function FormatCommas(str){
    try{
	return str.toString().replace(/(\d)(?=(?:\d{3})+$)/g,"$1,");
    } catch (x) {
	return str;
    }
}

function clearTable(tbody)
{
   while(tbody.rows.length>0){
      tbody.deleteRow(0);
   }
}

function IsWINNT()
{
    let osString = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULRuntime).OS;
    if(osString=="WINNT"){
	return true;
    }
    return false;
}

function IsDarwin()
{
    let osString = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULRuntime).OS;
    if(osString=="Darwin"){
	return true;
    }
    return false;
}

function IsLinux()
{
    let osString = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULRuntime).OS;
    if(osString=="Linux"){
	return true;
    }
    return false;
}
