var KanColleTimerPreference = {

    debugprint:function(txt){
	Application.console.log(txt);
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
	this.debugprint(target);
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
	    this.debugprint("「"+path+"」を通知に使用します");

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

    init:function(){
	let alpha = $('pref-wallpaper-alpha').value;
	$('wallpaper-alpha').value = alpha;
    },
    destroy:function(){
    }
};

window.addEventListener("load", function(e){ KanColleTimerPreference.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimerPreference.destroy(); }, false);
