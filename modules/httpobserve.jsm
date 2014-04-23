/* -*- mode: js2;-*- */
// vim: set ts=8 sw=4 sts=4 ff=dos :

var EXPORTED_SYMBOLS = ["KanColleRemainInfo", "KanColleDatabase"];

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

//
// 複合データベース
//
var KanColleCombinedDB = function() {
    this._init.apply(this);
};
KanColleCombinedDB.prototype = {
    _cb: null,
    _ts: null,
    _db: null,

    timestamp: function() { return this._ts; },

    _notify: function() {
	let e;
	let g = this._cb.gen();

	while ((e = g.next()) != null) {
	    if (e.opt)
		e.func(Math.floor(t / 1000), this._db);
	    else
		e.func();
	}
	g.close();
    },

    _update: null,
    _update_list: null,
    _update_init: function() {
	let _update;

	if (this._update_list || !this._update)
	    return;

	_update  = {};

	this._update_list = Object.keys(this._update);
	for (let i = 0; i < this._update_list.length; i++) {
	    let k = this._update_list[i];
	    _update[k] = this._update[k].bind(this);
	}

	this._update = _update;
    },

    appendCallback: function(f, c) { this._cb.append(f, c); },
    removeCallback: function(f) { this._cb.remove(f); },

    init: function() {
	if (this._update_list) {
	    for (let i = 0; i < this._update_list.length; i++) {
		let k = this._update_list[i];
		KanColleDatabase[k].appendCallback(this._update[k]);
	    }
	}
    },

    exit: function() {
	if (this._update_list) {
	    for (let i = this._update_list.length - 1; i >= 0; i--) {
		let k = this._update_list[i];
		KanColleDatabase[k].removeCallback(this._update[k]);
	    }
	}
    },

    _init: function() {
	this._ts = 0;
	this._cb = new Callback;
    },
};

//
// 艦隊司令部(資源情報)データベース
//
var KanColleHeadQuarterDB = function() {
    this._init();

    this._db = {
	ship_cur: Number.NaN,
	ship_max: Number.NaN,
	slotitem_cur: Number.NaN,
	slotitem_max: Number.NaN,
    };

    this._update = {
	memberRecord: function() {
	    debugprint('memberRecord()()');
	    let t = KanColleDatabase.memberRecord.timestamp();
	    let d = KanColleDatabase.memberRecord.get();

	    if (!t || !d)
		return;

	    this._ts = t;
	    this._db.ship_cur = d.api_ship[0];
	    this._db.ship_max = d.api_ship[1];
	    this._db.slotitem_cur = d.api_slotitem[0];
	    this._db.slotitem_max = d.api_slotitem[1];

	    this._notify();
	},

	memberBasic: function() {
	    debugprint('memberBasic()()');
	    let t = KanColleDatabase.memberBasic.timestamp();
	    let d = KanColleDatabase.memberBasic.get();

	    if (!t || !d)
		return;

	    this._ts = t;
	    this._db.ship_max = d.api_max_chara;
	    this._db.slotitem_max = d.api_max_slotitem;

	    this._notify();
	},

	memberShip2: function() {
	    debugprint('memberShip2()()');
	    let t = KanColleDatabase.memberShip2.timestamp();
	    let n = KanColleDatabase.memberShip2.count();

	    if (!t)
		return;

	    this._ts = t;
	    this._db.ship_cur = n;

	    this._notify();
	},

	memberSlotitem: function() {
	    debugprint('memberSlotitem()()');
	    let t = KanColleDatabase.memberSlotitem.timestamp();
	    let n = KanColleDatabase.memberSlotitem.count();

	    if (!t)
		return;

	    this._ts = t;
	    this._db.slotitem_cur = n;

	    this._notify();
	},
    };

    this.get = function(id) { return this._db; };

    this._update_init();
};
KanColleHeadQuarterDB.prototype = new KanColleCombinedDB();

//
// 艦船データベース
//  fleet: 艦隊
//
var KanColleShipDB = function() {
    this._init();

    this._db = {
	fleet: {},
    };

    this._update = {
	memberDeck: function(t) {
	    let decks = KanColleDatabase.memberDeck.list();
	    let db = {};

	    for (let i = 0; i < decks.length; i++) {
		let deck = KanColleDatabase.memberDeck.get(decks[i]);
		for (let j = 0; j < deck.api_ship.length; j++) {
		    if (deck.api_ship[j] < 0)
			continue;
		    db[deck.api_ship[j]] = {
			fleet: deck.api_id,
			pos: j,
		    };
		}
	    }

	    this._db.fleet = db;
	},
    };

    this.get = function(key) {
	return this._db[key];
    };

    this._update_init();
};
KanColleShipDB.prototype = new KanColleCombinedDB();

//
// 装備データベース
//  owner: 装備保持艦船
//
var KanColleSlotitemDB = function() {
    this._init();

    this._db = {
	owner: {},
    };

    this._shipname = function(ship_id) {
	try{
	    // member/ship2 には艦名がない。艦艇型から取得
	    let ship = KanColleDatabase.memberShip2.get(ship_id);
	    let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
	    return shiptype.api_name;
	} catch (x) {
	}
	return "";
    },

    this._update_owner = function(t) {
	let db = {};
	let items;
	let ships;

	items = KanColleDatabase.memberSlotitem.list();
	ships = KanColleDatabase.memberShip2.list();

	if (items.length && ships.length && KanColleDatabase.masterSlotitem.timestamp()) {
	    for (let i = 0; i < items.length; i++) {
		let item = KanColleDatabase.memberSlotitem.get(items[i]);
		let itemtypeid = item.api_slotitem_id;
		let itemtype = KanColleDatabase.masterSlotitem.get(itemtypeid);
		if (!db[itemtypeid]) {
		    db[itemtypeid] = {
					id: itemtypeid,
					name: itemtype.api_name,
					type: itemtype.api_type,
					list: {},
					totalnum: 0,
					num: 0,
		    };
		}
		db[itemtypeid].totalnum++;
	    }

	    for (let i = 0; i < ships.length; i++) {
		let ship = KanColleDatabase.memberShip2.get(ships[i]);
		let ship_slot = ship.api_slot;

		//debugprint(this._shipname(ship.api_id) + ': ');

		for (let j = 0; j < ship_slot.length; j++) {
		    let item;
		    let itemtypeid;

		    if (ship_slot[j] < 0)
			continue;

		    item = KanColleDatabase.memberSlotitem.get(ship_slot[j]);
		    // member/slotitem might be out-of-date for a while.
		    if (!item)
			continue;
		    itemtypeid = item.api_slotitem_id;

		    //debugprint(itemtypeid + ': ' + item.api_name);

		    db[itemtypeid].list[ship.api_id]++;
		    db[itemtypeid].num++;
		}
	    }

	    for ( let k in db ){
		let s = [];
		for ( let l in db[k].list ){
		    s.push(this._shipname(parseInt(l, 10)));
		}
		//debugprint(db[k].name + ': ' + s.join(','));
	    }
	}
	//debugprint(db.toSource());
	this._ts = t;
	this._db.owner = db;
    };

    this._update = {
	memberShip2: function() {
	    let t = KanColleDatabase.memberShip2.timestamp();
	    this._update_owner(t);
	},

	memberSlotitem: function() {
	    let t = KanColleDatabase.memberSlotitem.timestamp();
	    this._update_owner(t);
	},
    };

    this.get = function(key) {
	return this._db[key];
    };

    this._update_init();
};
KanColleSlotitemDB.prototype = new KanColleCombinedDB();

var KanColleQuestDB = function() {
    this._init();

    this._db = {};

    this._update = {
	memberQuestlist: function() {
	    let t = KanColleDatabase.memberQuestlist.timestamp();
	    let d = KanColleDatabase.memberQuestlist.get();
	    let oldest = null;
	    let quests = this._db;
	    let cleared;
	    let cleared_page;

	    if (!t)
		return;

	    // Check last clearitem
	    cleared = KanColleDatabase.questClearitemget.timestamp();
	    if (quests.info && quests.pages &&
		quests.info.last_page &&
		quests.pages[quests.info.last_page] < cleared &&
		(d.api_disp_page == quests.info.last_page ||
		 (quests.info.last_page == quests.info.page_count &&
		 d.api_disp_page == d.api_page_count ||
		 d.api_disp_page + 1 == quests.info.last_page))) {
		cleared_page = quests.info.last_page;
	    } else {
		cleared = 0;
		cleared_page = 0;
	    }

	    quests.info = {
		count: d.api_count,
		page_count: d.api_page_count,
		last_page: d.api_disp_page,
	    };
	    if (!quests.pages)
		quests.pages = [];
	    quests.pages[d.api_disp_page] = t;

	    // Check oldest timestamp
	    oldest = null;
	    for (let i = 1; i <= d.api_page_count && i <= 10; i++) {
		if (!quests.pages[i])
		    continue;
		if (!oldest || quests.pages[i] < oldest)
		    oldest = quests.pages[i];
	    }

	    if (!quests.list)
		quests.list = {};

	    if (d.api_list) {
		for (let i = 0; i < d.api_list.length; i++){
		    let q = d.api_list[i];
		    let no;
		    let state;
		    if (typeof(q) != 'object')
			continue;
		    no = q.api_no;
		    quests.list[no] = {
			timestamp: t,
			page: d.api_disp_page,
			data: q,
		    };
		}
	    } else {
		debugprint('d.api_list is null: ' + d.toSource());
	    }

	    // Clean-up "achieved" quests.
	    if (quests.list) {
		let ids = Object.keys(quests.list);
		for (let i = 0; i < ids.length; i++) {
		    let info = quests.list[ids[i]];
		    // - エントリの最終更新が全ページの更新より古ければ、
		    //   もう表示されないエントリ。
		    // - アイテム取得前後に同一ページが表示されたなら、
		    //   アイテム取得はそのページ上のどれかで行われたと
		    //   みなし、古いエントリは消してよい。
		    debugprint(
			       't=' + t +
			       ', oldest=' + oldest +
			       ', cleared=' + cleared +
			       ', cleared_page=' + cleared_page +
			       ', info.timestamp=' + info.timestamp +
			       ', info.page=' + info.page +
		    '');
		    if ((oldest && info.timestamp < oldest) ||
			(cleared && cleared_page &&
			 info.page == cleared_page && info.timestamp < t)) {
			delete quests.list[ids[i]];
		    }
		}
	    }

	    this._notify();
	},
    };

    this.get = function() {
	return this._db;
    };

    this._update_init();
};
KanColleQuestDB.prototype = new KanColleCombinedDB();

var KanColleMissionDB = function() {
    this._init();

    this._db = {};

    this._update = {
	masterMission: function() {
	    let list = KanColleDatabase.masterMission.list();
	    for (let i = 0; i < list.length; i++) {
		this._db[list[i]] = KanColleDatabase.masterMission.get(list[i]);
	    }
	    this._notify();
	},
    };

    this.list = function() {
	return Object.keys(this._db);
    };

    this.get = function(id) {
	return this._db[id];
    };

    this._update_init();
};
KanColleMissionDB.prototype = new KanColleCombinedDB();

var KanColleDatabase = {
    // Database
    masterMission: null,	// master/mission
    masterShip: null,		// master/ship
    masterSlotitem: null,	// master/slotitem
    memberBasic: null,		// member/basic
    memberDeck: null,		// member/deck,member/deck_port,
				// or member/ship2[api_data_deck]
				// or member/ship3[api_deck_data]
    memberKdock: null,		// member/kdock
    memberMaterial: null,	// member/material
    memberNdock: null,		// member/ndock
    memberQuestlist: null,	// member/questlist
    memberRecord: null,		// member/record
    memberShip2: null,		// member/ship2
    memberSlotitem: null,	// member/slotitem
    memberUnsetslot: null,	// member/unsetslot
				// or member/ship3[api_data.api_slot_data]
    questClearitemget: null,	// quest/clearitemget

    headQuarter: null,		// 艦船/装備
    ship: null,			// 艦船
    slotitem: null,		// 装備保持艦船
    quest: null,		// 任務(クエスト)

    // Internal variable
    _refcnt: null,

    // Callback
    _callback: function(req, s) {
	let url = req.name;
	let data = JSON.parse(s.substring(s.indexOf('svdata=') + 7));

	if (data.api_result != 1)
	    return;

	if (url.match(/kcsapi\/api_start2/)) {
	    this.masterMission.update(data.api_data.api_mst_mission);
	    this.masterShip.update(data.api_data.api_mst_ship);
	    this.masterSlotitem.update(data.api_data.api_mst_slotitem);
	} else if (url.match(/kcsapi\/api_get_master\/mission/)) {
	    this.masterMission.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_master\/ship/)) {
	    this.masterShip.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_master\/slotitem/)) {
	    this.masterSlotitem.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_member\/basic/)) {
	    this.memberBasic.update(data.api_data);
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
	} else if (url.match(/kcsapi\/api_get_member\/record/)) {
	    this.memberRecord.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_member\/ship2/)) {
	    this.memberShip2.update(data.api_data);
	    this.memberDeck.update(data.api_data_deck);
	} else if (url.match(/kcsapi\/api_get_member\/ship3/)) {
	    this.memberShip2.update(data.api_data.api_ship_data);
	    this.memberDeck.update(data.api_data.api_deck_data);
	    this.memberUnsetslot.update(data.api_data.api_slot_data);
	} else if (url.match(/kcsapi\/api_get_member\/slotitem/)) {
	    this.memberSlotitem.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_member\/slot_item/)) {
	    this.memberSlotitem.update(data.api_data);
	} else if (url.match(/kcsapi\/api_get_member\/unsetslot/)) {
	    this.memberUnsetslot.update(data.api_data);
	} else if (url.match(/kcsapi\/api_port\/port/)) {
	    this.memberBasic.update(data.api_data.api_basic);
	    this.memberDeck.update(data.api_data.api_deck_port);
	    this.memberMaterial.update(data.api_data.api_material);
	    this.memberShip2.update(data.api_data.api_ship);
	    this.memberNdock.update(data.api_data.api_ndock);
	} else if (url.match(/kcsapi\/api_req_quest\/clearitemget/)) {
	    this.questClearitemget.update(data.api_data);
	}
    },

    // Initialization
    init: function() {
	if (this._refcnt === null) {
	    this._callback = this._callback.bind(this);
	    this._refcnt = 0;
	}

	if (!this._refcnt++) {
	    // Initialize
	    KanColleHttpRequestObserver.init();

	    this.masterMission = new KanColleDB();
	    if (!this.masterShip)
		this.masterShip = new KanColleDB();
	    if (!this.masterSlotitem)
		this.masterSlotitem = new KanColleDB();
	    this.memberBasic = new KanColleSimpleDB();
	    this.memberDeck = new KanColleDB();
	    this.memberKdock = new KanColleDB();
	    this.memberMaterial = new KanColleDB();
	    this.memberNdock = new KanColleDB();
	    this.memberQuestlist = new KanColleSimpleDB();
	    this.memberRecord = new KanColleSimpleDB();
	    this.memberShip2 = new KanColleDB();
	    this.memberSlotitem = new KanColleDB();
	    this.memberUnsetslot = new KanColleSimpleDB();
	    this.questClearitemget = new KanColleSimpleDB();

	    this.headQuarter = new KanColleHeadQuarterDB();
	    this.headQuarter.init();
	    this.ship = new KanColleShipDB();
	    this.ship .init();
	    this.slotitem = new KanColleSlotitemDB();
	    this.slotitem .init();
	    this.quest = new KanColleQuestDB();
	    this.quest.init();
	    this.mission = new KanColleMissionDB();
	    this.mission.init();

	    debugprint("KanColleDatabase initialized.");

	    // Start
	    KanColleHttpRequestObserver.addCallback(this._callback);
	}
    },

    exit: function() {
	if (!--this._refcnt) {
	    // Stop
	    KanColleHttpRequestObserver.removeCallback(this._callback);

	    // Clear
	    this.mission.exit();
	    this.mission = null;
	    this.quest.exit();
	    this.quest = null;
	    this.slotitem.exit();
	    this.slotitem = null;
	    this.ship.exit();
	    this.ship = null;
	    this.headQuarter.exit();
	    this.headQuarter = null;

	    this.questClearitemget = null;
	    this.memberQuestlist = null;
	    this.memberMaterial = null;
	    this.memberRecord = null;
	    this.memberBasic = null;
	    this.memberKdock = null;
	    this.memberNdock = null;
	    this.memberDeck = null;
	    this.memberSlotitem = null;
	    this.memberUnsetslot = null;
	    this.memberShip2 = null;
	    //マスタ情報は再送されないので削除しない
	    //this.masterSlotitem = null;
	    //this.masterShip = null;
	    this.masterMission = null;
	    debugprint("KanColleDatabase cleared.");

	    KanColleHttpRequestObserver.destroy();
	}
    },
};

var KanColleRemainInfo = {
    cookie: {},	//重複音対策

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
	}
	this.counter++;
    },

    destroy: function(){
	this.counter--;
	if( this.counter<=0 ){
	    this.observerService.removeObserver(this, "http-on-examine-response");
	    this.counter = 0;
	    debugprint("stop kancolle observer.");
	}
    }

};
