var KanColleTimerPreference = {

    debugprint:function(txt){
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

    init:function(){
    },
    destroy:function(){
    }
};

window.addEventListener("load", function(e){ KanColleTimerPreference.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimerPreference.destroy(); }, false);
