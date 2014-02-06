/* -*- mode: js2;-*- */
// vim: set ts=8 sw=4 sts=4 ff=dos :

var EXPORTED_SYMBOLS = ["KanColleHttpRequestObserver","KanColleRemainInfo",
		        "KanColleDatabase"];

/*
 * Database
 */
//
// タイムスタンプ管理
//
var Timestamp = function() {};
Timestamp.prototype = {
    _ts: 0,
    get: function() { return this._ts; },
    set: function() { this._ts = (new Date).getTime(); return this._ts; },
};

//
// ハンドラ管理
//
var Callback = function(opt) {
    this._cb = [];
    if (opt && opt.match)
	this._match = opt.match;
};
Callback.prototype = {
    _cb: null,
    _match: function(f1, o1, f2, o2) {
	return f1 == f2;
    },
    gen: function() {
	for (let i = 0; i < this._cb.length; i++) {
	    yield this._cb[i];
	}
	yield null;
    },
    append: function(f, o) {
	this._cb.push({ func: f, opt: o, });
    },
    remove: function(f, o) {
	let count = 0;
	for (let i = 0; i < this._cb.length; i++) {
	    if (this._match(this._cb[i].func, this._cb[i].opt,
			    f, o)) {
		this._cb.splice(i, 1);
		i--;
	    }
	}
	return count;
    },
    flush: function() {
	let count = 0;
	while (this._cb.length > 0) {
	    let e = this._cb.shift();
	    if (e)
		count++;
	}
	return count;
    },
};

//
// 単純データベース(IDキーなし)
//
var KanColleSimpleDB = function() {
    this._init.apply(this);
};
KanColleSimpleDB.prototype = {
    _cb: null,
    _ts: null,
    _raw: null,

    timestamp: function() { return this._ts.get(); },

    update: function(data) {
	let now = this._ts.set();
	let g = this._cb.gen();
	let e;

	this._raw = data;

	while ((e = g.next()) != null) {
	    if (e.opt)
		e.func(Math.floor(now / 1000), data);
	    else
		e.func();
	}
	g.close();
    },

    get: function() { return this._raw; },

    appendCallback: function(f, c) { this._cb.append(f, c); },
    removeCallback: function(f) { this._cb.remove(f); },

    _init: function() {
	this._ts = new Timestamp;
	this._cb = new Callback;
    },
};

//
// データベース(IDキーつき)
//
var KanColleDB = function() {
    this._init.apply(this, arguments);
};
KanColleDB.prototype = {
    _cb: null,
    _ts: null,
    _raw: null,
    _db: null,
    _keys: null,
    _pkey: null,

    timestamp: function() { return this._ts.get(); },

    update: function(data) {
	let now = this._ts.set();
	let g = this._cb.gen();
	let e;

	this._raw = data;
	this._db = null;
	this._keys = null;

	while ((e = g.next()) != null) {
	    if (e.opt)
		e.func(Math.floor(now / 1000), data);
	    else
		e.func();
	}
	g.close();
    },

    _parse: function() {
	let hash = {};
	if (!this._raw || this._db)
	    return this._db;
	for (let i = 0; i < this._raw.length; i++)
	    hash[this._raw[i][this._pkey]] = this._raw[i];
	this._db = hash;
	this._keys = null;
	return hash;
    },

    get: function(key) {
	let db = this._parse();
	return db ? db[key] : null;
    },

    _list: function() {
	if (!this._keys)
	    this._keys = Object.keys(this._parse());
	return this._keys;
    },

    list: function() {
	return this._raw ? this._list() : [];
    },

    count: function() {
	return this._raw ? this._list().length : undefined;
    },

    appendCallback: function(f, c) { this._cb.append(f, c); },
    removeCallback: function(f) { this._cb.remove(f); },

    _init: function(opt) {
	this._ts = new Timestamp;
	this._cb = new Callback;
	this._pkey = 'api_' + (opt && opt.primary_key ? opt_primary_key : 'id');
    },
};

var KanColleDatabase = {
    // Database
    masterShip: null,		// master/ship
    masterSlotitem: null,	// master/slotitem
    memberDeck: null,		// member/deck,member/deck_port,
				// or member/ship2[api_data_deck]
				// or member/ship3[api_deck_data]
    memberKdock: null,		// member/kdock
    memberMaterial: null,	// member/material
    memberNdock: null,		// member/ndock
    memberQuestlist: null,	// member/questlist
    memberShip2: null,		// member/ship2
    memberSlotitem: null,	// member/slotitem

    _callback: null,
    callback: function(req, s) {
	let now = (new Date).getTime();
	let url = req.name;
	let data = JSON.parse(s.substring(s.indexOf('svdata=') + 7));

	if (data.api_result != 1)
	    return;

	if (url.match(/kcsapi\/api_get_master\/ship/)) {
	    this.masterShip.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_master\/slotitem/)) {
	    this.masterSlotitem.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_member\/deck_port/) ||
		   url.match(/kcsapi\/api_get_member\/deck/)) {
	    this.memberDeck.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_member\/kdock/)) {
	    this.memberKdock.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_member\/material/)) {
	    this.memberMaterial.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_member\/ndock/)) {
	    this.memberNdock.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_member\/questlist/)) {
	    this.memberQuestlist.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_member\/ship2/)) {
	    this.memberShip2.update(data.api_data);
	    this.memberDeck.update(data.api_data_deck);
	} else if (url.match(/kcsapi\/api_get_member\/ship3/)) {
	    this.memberShip2.update(data.api_data.api_ship_data);
	    this.memberDeck.update(data.api_data.api_deck_data);
	} else if (url.match(/kcsapi\/api_get_member\/slotitem/)) {
	    this.memberSlotitem.update(data.api_data);
	}
    },

    // Initialization
    init: function(){
	if (!this._callback)
	    this._callback = this.callback.bind(this);

	if (!this.masterShip)
	    this.masterShip = new KanColleDB();
	if (!this.masterSlotitem)
	    this.masterSlotitem = new KanColleDB();
	this.memberDeck = new KanColleDB();
	this.memberKdock = new KanColleDB();
	this.memberMaterial = new KanColleDB();
	this.memberNdock = new KanColleDB();
	this.memberQuestlist = new KanColleSimpleDB();
	this.memberShip2 = new KanColleDB();
	this.memberSlotitem = new KanColleDB();
	debugprint("KanColleDatabase initialized.");
    },
    exit: function(){
	this.memberSlotitem = null;
	this.memberShip2 = null;
	this.memberQuestlist = null;
	this.memberNdock = null;
	this.memberMaterial = null;
	this.memberKdock = null;
	this.memberDeck = null;
	//マスタ情報は再送されないので削除しない
	//this.masterSlotitem = null;
	//this.masterShip = null;
	debugprint("KanColleDatabase cleared.");
    },
};
var KanColleRemainInfo = {
    gMission: {},

    gResourceData: [], // 資源の履歴

    fleet_name: [], // 艦隊名
    mission_name:[],// 遠征名
    construction_shipname:[], // 建造艦種

    ndock_memo: [], // 入渠ドック用のメモ

    ndock_ship_id: [], // 入渠中の艦船ID
    // 終了時刻文字列
    fleet_time: [],
    ndock_time: [],
    kdock_time: [],
    // 残り時間
    ndock: [],
    kdock: [],
    fleet: []
};

const Cc = Components.classes;
const Ci = Components.interfaces;

function debugprint(str){
    var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"].
	getService(Components.interfaces.nsIConsoleService);
    aConsoleService.logStringMessage(str);
}

function CCIN(cName, ifaceName) {
    return Cc[cName].createInstance(Ci[ifaceName]);
}

var callback = new Array();

function TracingListener() {
    this.originalListener = null;
}
TracingListener.prototype =
{
    onDataAvailable: function(request, context, inputStream, offset, count) {
        var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1",
				     "nsIBinaryInputStream");
        var storageStream = CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
        var binaryOutputStream = CCIN("@mozilla.org/binaryoutputstream;1",
				      "nsIBinaryOutputStream");

        binaryInputStream.setInputStream(inputStream);
        storageStream.init(8192, count, null);
        binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));

        // Copy received data as they come.
        var data = binaryInputStream.readBytes(count);
        this.receivedData.push(data);

        binaryOutputStream.writeBytes(data, count);

        this.originalListener.onDataAvailable(request, context,
					      storageStream.newInputStream(0), offset, count);
    },

    onStartRequest: function(request, context) {
        this.originalListener.onStartRequest(request, context);
	this.receivedData = new Array();
    },

    onStopRequest: function(request, context, statusCode) {
        this.originalListener.onStopRequest(request, context, statusCode);

	var s = this.receivedData.join('');
	for( var k in  callback ){
	    var f = callback[k];
	    if( typeof f=='function' ){
		f( request, s );
	    }
	}
    },

    QueryInterface: function (aIID) {
        if (aIID.equals(Ci.nsIStreamListener) ||
            aIID.equals(Ci.nsISupports)) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    }
};

var KanColleHttpRequestObserver =
{
    counter: 0,

    observe: function(aSubject, aTopic, aData){
        if (aTopic == "http-on-examine-response"){
	    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
	    if( httpChannel.URI.spec.match(/^http.*\/kcsapi\//) ){
		//debugprint(httpChannel.URI.spec);
		var newListener = new TracingListener();
		aSubject.QueryInterface(Ci.nsITraceableChannel);
		newListener.originalListener = aSubject.setNewListener(newListener);
	    }
        }
    },

    QueryInterface : function (aIID) {
        if (aIID.equals(Ci.nsIObserver) || aIID.equals(Ci.nsISupports)){
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    },

    addCallback: function(f){
	callback.push( f );
	debugprint( 'add callback='+callback.length );
    },

    removeCallback: function( f ){
	for( var k in callback ){
	    if( callback[k]==f ){
		callback.splice(k,1);
		debugprint( 'remove callback='+callback.length );
	    }
	}
    },

    init: function(){
	if( this.counter==0 ){
	    this.observerService = Components.classes["@mozilla.org/observer-service;1"]
		.getService(Components.interfaces.nsIObserverService);
	    this.observerService.addObserver(this, "http-on-examine-response", false);
	    debugprint("start kancolle observer.");

	    KanColleDatabase.init();
	    this.addCallback(KanColleDatabase._callback);
	}
	this.counter++;
    },

    destroy: function(){
	this.counter--;
	if( this.counter<=0 ){
	    this.removeCallback(KanColleDatabase._callback);
	    KanColleDatabase.exit();

	    this.observerService.removeObserver(this, "http-on-examine-response");
	    this.counter = 0;
	    debugprint("stop kancolle observer.");
	}
    }

};
