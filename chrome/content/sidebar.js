Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

var KanColleTimerSidebar = Object.create(KanColleTimer);

KanColleTimerSidebar.findWindow = function(){
    let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    let win = wm.getMostRecentWindow("KanColleTimerMainWindow");
    return win;
};

KanColleTimerSidebar.open = function(){
    let feature="chrome,resizable=yes";

    let win = this.findWindow();
    if(win){
	win.focus();
    }else{
	let w = window.open("chrome://kancolletimer/content/mainwindow.xul","KanColleTimer",feature);
	w.focus();
    }
};
