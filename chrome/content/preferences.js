// vim: set ts=8 sw=4 sts=4 ff=dos :

function debugprint(txt){
    Application.console.log(txt);
}

var KanColleTimerPreference = {
    // ダッシュボード表示項目の移動用D&D処理
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
    /**
     * ダッシュボードの並び順に変化があったときに呼び出して設定に記録する
     */
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
    moveToUpper: function(){
	let listbox = $( 'order-of-dashboard' );
	if( listbox.selectedIndex <= 0 ) return;
	let n = listbox.selectedIndex - 1;
	let elem = listbox.getItemAtIndex( n );
	listbox.insertBefore( listbox.currentItem, elem );
	listbox.selectItem( listbox.getItemAtIndex( n ) );
	listbox.ensureIndexIsVisible( n );
	this.changeDashboardOrder();
    },
    moveToLower: function(){
	let listbox = $( 'order-of-dashboard' );
	if( listbox.selectedIndex < 0 ) return; // 未選択
	let n;
	if( listbox.selectedIndex + 2 >= listbox.getRowCount() ){
	    listbox.appendChild( listbox.currentItem );
	    n = listbox.getRowCount() - 1;
	}else{
	    n = listbox.selectedIndex + 2;
	    let elem = listbox.getItemAtIndex( n );
	    listbox.insertBefore( listbox.currentItem, elem );
	    n--;
	}
	listbox.selectItem( listbox.getItemAtIndex( n ) );
	listbox.ensureIndexIsVisible( n );
	this.changeDashboardOrder();
    },

    playSound: function(target) {
	debugprint(target);
	let path = $(target).value;
	let elem = $('audio-playback');
	elem.path = path;
	elem.play();
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

	$('window-font-scale').value = $('e.n.font-size').value;
	$('font-scale-label').value = $('e.n.font-size').value + 'pt';
	$('audio-playback').method = $('pref-sound-api').value ? 'nsisound' : 'html';
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
