// vim: set ts=8 sw=4 sts=4 ff=dos :

var SSTweet = {

    getTempFile:function(){
        let file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", Components.interfaces.nsIFile);
        file.append("kancolletimer-ss-temp.jpg");
	return file;
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

	setTimeout( function(){
	    let text = $('text').value;
	    Twitter.updateStatusWithMedia(text, File(file.path));
	    //Twitter.updateStatus(text);
	    setTimeout( function(){ $('send-button').disabled = false; }, 5000 );
	}, 2000 );
    },

    init:function(){
	if( window.arguments ){
	    let pic = window.arguments[0];
	    let data = pic || TakeKanColleScreenshot(true);
	    $('ss-image').src = data.spec;
	}else{
	    let data = TakeKanColleScreenshot(true);
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
