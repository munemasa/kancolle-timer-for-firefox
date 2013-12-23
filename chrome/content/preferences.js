// vim: set ts=8 sw=4 sts=4 ff=dos :

var KanColleTimerPreference = {

    debugprint:function(txt){
	Application.console.log(txt);
    },

    /**
     * 音声通知を行う.
     * 設定によって再生方式を変えて再生する。
     * @param elem sound要素
     */
    playNotice: function( elem ){
	elem.play();
    },

    playSound: function(target){
	this.debugprint(target);
	let path = $(target).value;
	$('audio-playback').path = path;

	this.playNotice( $('audio-playback') );
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

    refFontSize:function( target, label, value ){
	let t = $(target);
	t.label = label;
	t.value = value;
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

	$('audio-playback').method = $('pref-sound-api') ? 'nsisound' : 'html';
    },
    destroy:function(){
    }
};

window.addEventListener("load", function(e){ KanColleTimerPreference.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimerPreference.destroy(); }, false);
