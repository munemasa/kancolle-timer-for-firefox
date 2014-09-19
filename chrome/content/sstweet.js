// vim: set ts=8 sw=4 sts=4 ff=dos :

var SSTweet = {

    getTempFile:function(){
	var file = FileUtils.getFile( "TmpD", ["sskancolle.tmp"] );
	file.createUnique( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE );
	return file;
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

    save: function(){
	let ret;
	let defaultdir = KanColleTimerConfig.getUnichar("screenshot.path");
	let isjpeg = KanColleTimerConfig.getBool("screenshot.jpeg");
	let nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

	fp.init(window, "保存ファイルを選んでください", nsIFilePicker.modeSave);
	if (defaultdir) {
	    let file = Components.classes['@mozilla.org/file/local;1']
		.createInstance(Components.interfaces.nsILocalFile);
	    file.initWithPath(defaultdir);
	    if (file.exists() && file.isDirectory())
		fp.displayDirectory = file;
	}
	fp.appendFilters(nsIFilePicker.filterImages);
	fp.defaultString = "screenshot-"+ this.getNowDateString() + (isjpeg?".jpg":".png");
	fp.defaultExtension = isjpeg ? "jpg" : "png";
	ret = fp.show();
	if ((ret != nsIFilePicker.returnOK && ret != nsIFilePicker.returnReplace) || !fp.file)
	    return null;

	var wbp = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
	    .createInstance(Components.interfaces.nsIWebBrowserPersist);

	const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
	    .getService(Components.interfaces.nsIIOService);

	let data = $('ss-image').src;
	data = IO_SERVICE.newURI(data, null, null);
	wbp.saveURI(data, null, null, null, null, fp.file, null);
    },

    send: function(){
	$('send-button').disabled = true;

	let data = $('ss-image').src;

	let file = this.getTempFile();
	debugprint(file.path);
	var wbp = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
            .createInstance(Components.interfaces.nsIWebBrowserPersist);

	const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
            .getService(Components.interfaces.nsIIOService);
	data = IO_SERVICE.newURI(data, null, null);
	wbp.saveURI(data, null, null, null, null, file, null);

	ShowNotice( "スクリーンショットを送信しています...", true );
	setTimeout( function(){
	    let text = $('text').value;
	    Twitter.updateStatusWithMedia(text, File(file.path));
	    //Twitter.updateStatus(text);
	    setTimeout( function(){ $('send-button').disabled = false; }, 5000 );
	}, 2000 );
    },

    init:function(){
	let isjpeg = KanColleTimerConfig.getBool("screenshot.jpeg");
	// PNGでアップロードを試すと、サイズ1MBになってつぶやくのに時間がかかるのがネックか
	if( window.arguments ){
	    let pic = window.arguments[0];
	    let data = pic || TakeKanColleScreenshot(isjpeg);
	    $('ss-image').src = data.spec;
	}else{
	    let data = TakeKanColleScreenshot(isjpeg);
	    $('ss-image').src = data.spec;
	}
	$('text').focus();

	if( !Twitter.getScreenName() ){
	    Twitter.getRequestToken();
	}else{
	    $('screen-name').value = "@" + Twitter.getScreenName();
	}
    },
    destroy: function(){
    }

};

window.addEventListener("load", function(e){ SSTweet.init(); }, false);
window.addEventListener("unload", function(e){ SSTweet.destroy(); }, false);
