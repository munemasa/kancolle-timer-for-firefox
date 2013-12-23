function debugprint(txt){
    Application.console.log(txt);
}

var KanColleTimerPreference = {
    startDragging:function(event){
	let dt = event.dataTransfer;
	dt.mozSetDataAt('application/x-moz-node', event.target , 0 );
    },
    dropTab:function(event){
	let dt = event.dataTransfer;
	let target = event.target;

	let node = dt.mozGetDataAt("application/x-moz-node", 0);
	//debugprint( target.parentNode.tagName );
	if( target.parentNode.tagName=='listbox' ){
	    target.parentNode.insertBefore(node,target);
	}else{
	    $('order-of-dashboard').appendChild(node);
	}
	this.changeDashboardOrder();
    },
    checkDrag:function(event){
	let b = event.dataTransfer.types.contains("application/x-moz-node");
	if( b ){
	    event.preventDefault();
	}
	return true;
    },

    changeDashboardOrder: function(){
	let items = evaluateXPath2(document,"//xul:listbox[@id='order-of-dashboard']/xul:listitem");

	let i = items.length-1;
	let tmp = new Array();
	for( ; i>=0; i--){
	    if( items[i].checked ){
		tmp.push( items[i].value );
	    }
	}
	$('pref-dashboard-order').value = JSON.stringify( tmp );
    },

    /**
     * 音声再生を行う(nsISound)
     * @param path ファイルのパス
     */
    _playSound: function(path){
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

    /**
     * 音声通知を行う.
     * 設定によって再生方式を変えて再生する。
     * @param elem audio要素
     * @param path ファイルのパス
     */
    playNotice: function( elem, path ){
	let i = $('pref-sound-api').value;
	switch( i ){
	case 1:// nsISound
	    this._playSound( path );
	    break;
	default:// HTML5 audio
	    elem.play();
	    break;
	}
    },

    playSound: function(target){
	debugprint(target);
	let path = $(target).value;
	$('audio-playback').src = "file://"+ path;

	this.playNotice( $('audio-playback'), path );
    },

    /**
     * サウンド通知用のサウンドファイル選択.
     * @param target 設定対象
     */
    refSoundFileToNotice:function( target ){
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "通知に使用するサウンドファイル", nsIFilePicker.modeOpen);
	fp.appendFilters(nsIFilePicker.filterAudio);
	let rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    let file = fp.file;
	    let path = fp.file.path;
	    debugprint("「"+path+"」を通知に使用します");

	    $(target).value = path;
	}
    },

    /**
     * 画像選択.
     * @param target 設定対象
     */
    refPictureFile:function( target ){
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "画像ファイルの選択", nsIFilePicker.modeOpen);
	fp.appendFilters(nsIFilePicker.filterImages);
	let rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    let file = fp.file;
	    let path = fp.file.path;
	    $(target).value = path;
	}
    },

    /**
     * スクリーンショット保存先の選択
     * @param target 設定対象
     */
    refDirectory:function( target ){
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "スクリーンショット保存先の選択", nsIFilePicker.modeGetFolder);
	let rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    let file = fp.file;
	    let path = fp.file.path;
	    $(target).value = path;
	}
    },

    buildFontList:function(){
	FontBuilder.buildFontList($('font.language.group').value,null,$('select-font'));
	let elem = evaluateXPath2(document,"//xul:menulist[@id='select-font']//xul:menuitem[@value='"+$('e.n.font').value+"']");
	if(elem.length==1){
	    $('select-font').selectedItem = elem[0];
	}
    },

    init:function(){
	let alpha = $('pref-wallpaper-alpha').value;
	$('wallpaper-alpha').value = alpha;
	this.buildFontList();

	try{
	    let order = JSON.parse( $('pref-dashboard-order').value );
	    let listbox = $('order-of-dashboard');
	    for( let i in order ){
		let elem = $( order[i] );
		elem.checked = true;
		listbox.insertBefore( elem, listbox.firstChild );
	    }
	}catch(x){
	}
    },
    destroy:function(){
    }
};

window.addEventListener("load", function(e){ KanColleTimerPreference.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimerPreference.destroy(); }, false);
