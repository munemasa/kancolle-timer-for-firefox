var KanColleTimerConfig = {
    getBranch:function(){
	var prefs = new PrefsWrapper1("extensions.kancolletimer.");
	return prefs;
    },
    getSpecificBranch:function(branch){
	var prefs = new PrefsWrapper1(branch);
	return prefs;
    },

    getInt:function(path){
	var branch = this.getBranch();
	var b;
	try{
	    b = branch.getIntPref(path);	    
	} catch (x) {
	    b = 0;
	}
	return b;
    },
    setInt:function(path, value){
	var branch = this.getBranch();
	branch.setIntPref(path, value);
    },

    getBool:function(path){
	var branch = this.getBranch();
	var b;
	try{
	    b = branch.getBoolPref(path);	    
	} catch (x) {
	    b = false;
	}
	return b;
    },
    getUnichar:function(path){
	var branch = this.getBranch();
	var b;
	try{
	    b = branch.getUnicharPref(path);	    
	} catch (x) {
	    b = "";
	}
	return b;
    },
    setUnichar:function(path,str){
	var branch = this.getBranch();
	branch.setUnicharPref(path,str);
    },

    register:function(){
	let prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	this._branch = prefService.getBranch("extensions.kancolletimer.");
	this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
	this._branch.addObserver("", this, false);
    },
    unregister:function(){
	if(!this._branch) return;
	this._branch.removeObserver("", this);
    },

    loadPrefs: function(){
	let b = KanColleTimerConfig.getBool('display.short');
	// fleet-time, ndock-time, kdock-time
	let classname = ['fleet-time','ndock-time','kdock-time'];
	for(let cn in classname){
	    let elems = document.getElementsByClassName(classname[cn]);
	    for(let i=0; i<elems.length; i++){
		elems[i].style.display = b?"none":"block";
	    }
	}

	let wallpaper = KanColleTimerConfig.getUnichar('wallpaper');
	if( wallpaper ){
	    let alpha = KanColleTimerConfig.getInt('wallpaper.alpha') / 100.0;
	    let sheet = document.styleSheets[1];
	    wallpaper = wallpaper.replace(/\\/g,'/');
	    let rule = "background-image: url('file://"+wallpaper+"'); opacity: "+alpha+";";
	    $('wallpaper').setAttribute('style',rule);
	    //sheet.insertRule(rule,1);
	}

	let col = this.getUnichar('display.font-color') || "";
	try{
	    $('sbKanColleTimerSidebar').style.color = col;
	} catch (x) {}
	try{
	    $('kancolletimermainwindow').style.color = col;
	} catch (x) {}

	try{
	    let audios = document.getElementsByTagName('html:audio');
	    
	    audios[0].src = "file://"+KanColleTimerConfig.getUnichar('sound.ndock');
	    audios[1].src = "file://"+KanColleTimerConfig.getUnichar('sound.kdock');
	    audios[2].src = "file://"+KanColleTimerConfig.getUnichar('sound.mission');
	    audios[3].src = "file://"+KanColleTimerConfig.getUnichar('sound.1min.ndock');
	    audios[4].src = "file://"+KanColleTimerConfig.getUnichar('sound.1min.kdock');
	    audios[5].src = "file://"+KanColleTimerConfig.getUnichar('sound.1min.mission');
	    audios[6].src = "file://"+KanColleTimerConfig.getUnichar('sound.default');

	} catch (x) {
	    //AddLog(x);
	}
    },

    observe:function(aSubject, aTopic, aData){
	if(aTopic != "nsPref:changed") return;
	this.loadPrefs();
    },

    init: function(){
	try{
	    this.register();
	    this.loadPrefs();
	} catch (x) {
	}
    },
    destroy: function(){
	this.unregister();
    }
};

window.addEventListener("load", function(e){ KanColleTimerConfig.init(); }, false);
window.addEventListener("unload", function(e){ KanColleTimerConfig.destroy(); }, false);
