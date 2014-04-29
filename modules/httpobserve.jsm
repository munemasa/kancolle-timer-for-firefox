/* -*- mode: js2;-*- */
// vim: set ts=8 sw=4 sts=4 ff=dos :

var EXPORTED_SYMBOLS = ["KanColleRemainInfo", "KanColleDatabase"];

// API version (detected)
var KanColleAPIversion = 20131127;  // 20131127 (ship3)
				    // 20140423 (port/port; partial ship3)

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
    _req: null,

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

    prepare: function(data) {
	this._req = data;
    },

    get: function() { return this._raw; },
    get_req: function() { return this._req; },

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
		if (!KanColleDatabase[k]) {
		    debugprint('KanColleDatabase["' + k + '"] is not initialized yet.  Please fix it.');
		    continue;
		}
		KanColleDatabase[k].appendCallback(this._update[k]);
	    }
	}
    },

    exit: function() {
	if (this._update_list) {
	    for (let i = this._update_list.length - 1; i >= 0; i--) {
		let k = this._update_list[i];
		if (!KanColleDatabase[k])
		    continue;
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
	    let t = KanColleDatabase.memberBasic.timestamp();
	    let d = KanColleDatabase.memberBasic.get();

	    if (!t || !d)
		return;

	    this._ts = t;
	    this._db.ship_max = d.api_max_chara;
	    this._db.slotitem_max = d.api_max_slotitem;

	    this._notify();
	},

	ship: function() {
	    let t = KanColleDatabase.ship.timestamp();
	    let n = KanColleDatabase.ship.count();

	    if (!t)
		return;

	    this._ts = t;
	    this._db.ship_cur = n;

	    this._notify();
	},

	slotitem: function() {
	    let t = KanColleDatabase.slotitem.timestamp();
	    let n = KanColleDatabase.slotitem.count();

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
//
var KanColleShipDB = function() {
    this._init();

    this._db = {
	ship: null,
	dead: {},   // 艦船解体/改装時において、消滅する艦船の装備を
		    // 削除する必要がある。艦船を先に削除してしまうと
		    // 装備がわからなくなってしまうので、完全には削除
		    // せず、暫時IDで検索できるようにする。
		    // 次の全体更新で完全削除。
	list: null,
    };

    this._deepcopy = function() {
	if (!this._db.ship) {
	    let ships = KanColleDatabase._memberShip2.list();
	    if (!ships)
		return;

	    this._db.ship = new Object;

	    for (let i = 0; i < ships.length; i++)
		this._db.ship[ships[i]] = JSON.parse(JSON.stringify(KanColleDatabase._memberShip2.get(ships[i])));

	    this._db.list = Object.keys(this._db.ship);

	    //debugprint('hash: ' + this._db.ship.toSource());
	    //debugprint('list: ' + this._db.list.toSource());
	}
    };

    this._update = {
	_memberShip2: function() {
	    this._ts = KanColleDatabase._memberShip2.timestamp();
	    this._db.ship = null;
	    this._db.list = null;
	    this._db.dead = {};
	    this._notify();
	},

	reqHokyuCharge: function() {
	    let data = KanColleDatabase.reqHokyuCharge.get().api_ship;

	    if (!this._ts)
		return;

	    this._ts = KanColleDatabase.reqHokyuCharge.timestamp();

	    this._deepcopy();

	    // Update
	    for (let i = 0; i < data.length; i++) {
		let ship_id = data[i].api_id;
		for (let k in data[i])
		    this._db.ship[ship_id][k] = data[i][k];
	    }

	    // Notification
	    this._notify();
	},

	reqKaisouPowerup: function() {
	    let t = KanColleDatabase.reqKaisouPowerup.timestamp();
	    let req = KanColleDatabase.reqKaisouPowerup.get_req();
	    let req_id_items = req.api_id_items;

	    if (!this._ts || !req_id_items)
		return;

	    req_id_items = req_id_items.split(/,/).map(function(v) {
							return parseInt(v,10);
						       });
	    if (req_id_items.some(function(v) {
				    return isNaN(v);
				  }))
		return;

	    this._deepcopy();

	    for (let i = 0; i < req_id_items.length; i++) {
		let ship_id = req_id_items[i];
		this._db.dead[ship_id] = this._db.ship[ship_id];
		delete(this._db.ship[ship_id]);
	    }

	    this._db.list = Object.keys(this._db.ship);

	    this._notify();
	},

	reqKousyouDestroyShip: function() {
	    let req = KanColleDatabase.reqKousyouDestroyShip.get_req();
	    let req_ship_id;
	    let fleet;

	    if (!this._ts)
		return;

	    req_ship_id = parseInt(req.api_ship_id, 10);
	    if (isNaN(req_ship_id))
		return;

	    this._ts = KanColleDatabase.reqKousyouDestroyShip.timestamp();

	    this._deepcopy();
	    this._db.dead[req_ship_id] = this._db.ship[req_ship_id];
	    delete(this._db.ship[req_ship_id]);
	    this._db.list = Object.keys(this._db.ship);

	    this._notify();
	},

	reqKousyouGetShip: function() {
	    let data = KanColleDatabase.reqKousyouGetShip.get().api_ship;

	    if (!this._ts)
		return;

	    this._ts = KanColleDatabase.reqKousyouGetShip.timestamp();
	    this._deepcopy();
	    this._db.ship[data.api_id] = data;
	    this._db.list = Object.keys(this._db.ship);
	    this._notify();
	},
    };

    this.get = function(id, key) {
	if (key == null) {
	    let ret;
	    if (this._db.ship) {
		ret = this._db.ship[id];
		if (!ret)
		    ret = this._db.dead[id];
	    } else
		ret = KanColleDatabase._memberShip2.get(id);
	    return ret;
	}
    };

    this.list = function() {
	if (!this._db.ship)
	    return KanColleDatabase._memberShip2.list();
	if (!this._db.list)
	    this._db.list = Object.keys(this._db.ship);
	return this._db.list;
    };

    this.count = function() {
	return this._db.ship ? this._db.list.length : KanColleDatabase._memberShip2.count();
    };

    this._update_init();
};
KanColleShipDB.prototype = new KanColleCombinedDB();

//
// デッキ
//
var KanColleDeckDB = function() {
    this._init();

    this._db = {
	fleet: {},
	deck: null,
	list: null,
    };

    this._update_fleet = function() {
	let db = {};
	let ids = this.list();
	for (let i = 0; i < ids.length; i++) {
	    let deck = this.get(ids[i]);
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
    };

    this._deepcopy = function() {
	if (!this._db.deck) {
	    let decks = KanColleDatabase.memberDeck.list();
	    if (!decks)
		return;

	    this._db.deck = new Object;

	    for (let i = 0; i < decks.length; i++)
		this._db.deck[decks[i]] = JSON.parse(JSON.stringify(KanColleDatabase.memberDeck.get(decks[i])));

	    this._db.list = Object.keys(this._db.deck);

	    //debugprint('hash: ' + this._db.deck.toSource());
	    //debugprint('list: ' + this._db.list.toSource());
	}
    };

    this._update = {
	memberDeck: function() {
	    this._ts = KanColleDatabase.memberDeck.timestamp();
	    this._db.deck = null;
	    this._db.list = null;
	    this._update_fleet();
	    this._notify();
	},
	reqHenseiChange: function() {
	    let req = KanColleDatabase.reqHenseiChange.get_req();
	    let deck;
	    let req_id;
	    let req_ship_id;
	    let req_ship_idx;

	    if (!this._ts)
		return;

	    this._ts = KanColleDatabase.reqHenseiChange.timestamp();

	    this._deepcopy();

	    // 編成
	    //	req.api_id: 艦隊ID(or -1)
	    //	req.api_ship_idx: 艦隊でのindex(or -1)
	    //	req.api_ship_id: 変更後のID(or -1 or -2)

	    req_id = parseInt(req.api_id, 10);
	    if (isNaN(req_id))
		return;
	    req_ship_id = parseInt(req.api_ship_id, 10);
	    if (isNaN(req_ship_id))
		return;
	    req_ship_idx = parseInt(req.api_ship_idx, 10);
	    if (isNaN(req_ship_idx))
		return;

	    deck = this._db.deck[req_id];
	    if (!deck)
		return;

	    if (req_ship_id == -2) {
		// 随伴艦解除
		for (let i = 1; i < deck.api_ship.length; i++)
		    deck.api_ship[i] = -1;
	    } else if (req_ship_id == -1) {
		// 解除
		deck.api_ship.splice(req_ship_idx, 1);
		deck.api_ship.push(-1);
	    } else if (req_ship_id >= 0) {
		// 交換

		// 現在の艦船ID
		let ship_id = deck.api_ship[req_ship_idx];
		// 新しい艦の旧所属艦隊
		let ship_fleet = req_ship_id >= 0 ? KanColleDatabase.deck.lookup(req_ship_id) : null;

		deck.api_ship[req_ship_idx] = req_ship_id;
		if (ship_fleet)
		    this._db.deck[ship_fleet.fleet].api_ship[ship_fleet.pos] = ship_id;
	    }
	    this._update_fleet();
	    this._notify();
	},
	reqKousyouDestroyShip: function() {
	    let req = KanColleDatabase.reqKousyouDestroyShip.get_req();
	    let req_ship_id;
	    let fleet;

	    if (!this._ts)
		return;

	    req_ship_id = parseInt(req.api_ship_id, 10);
	    if (isNaN(req_ship_id))
		return;

	    fleet = KanColleDatabase.deck.lookup(req_ship_id);
	    if (!fleet)
		return;

	    this._ts = KanColleDatabase.reqKousyouDestroyShip.timestamp();

	    this._deepcopy();
	    this._db.deck[fleet.fleet].splice(fleet.pos,1);
	    this._db.deck[fleet.fleet].push(-1);

	    this._update_fleet();
	    this._notify();
	},
    };

    this.lookup = function(ship_id) {
	return this._db.fleet[ship_id];
    };

    this.get = function(id, key) {
	if (key == null) {
	    return this._db.deck ? this._db.deck[id] : KanColleDatabase.memberDeck.get(id);
	}
    };

    this.list = function() {
	if (!this._db.deck)
	    return KanColleDatabase.memberDeck.list();
	if (!this._db.list)
	    this._db.list = Object.keys(this._db.deck);
	return this._db.list;
    };

    this.count = function() {
	return this._db.deck ? this._db.list.length : KanColleDatabase.memberDeck.count();
    };

    this._update_init();
};
KanColleDeckDB.prototype = new KanColleCombinedDB();

//
// 装備データベース
//  owner: 装備保持艦船
//
var KanColleSlotitemDB = function() {
    this._init();

    this._db = {
	owner: {},
	hash: null,
	list: null,
    };

    this._deepcopy = function() {
	if (!this._db.hash) {
	    let ids = KanColleDatabase._memberSlotitem.list();
	    if (!ids)
		return;

	    this._db.hash = new Object;

	    for (let i = 0; i < ids.length; i++)
		this._db.hash[ids[i]] = JSON.parse(JSON.stringify(KanColleDatabase._memberSlotitem.get(ids[i])));

	    this._db.list = Object.keys(this._db.hash);

	    //debugprint('hash: ' + this._db.hash.toSource());
	    //debugprint('list: ' + this._db.list.toSource());
	}
    };

    this._shipname = function(ship_id) {
	try{
	    // member/ship2 には艦名がない。艦艇型から取得
	    let ship = KanColleDatabase.ship.get(ship_id);
	    let shiptype = KanColleDatabase.masterShip.get(ship.api_ship_id);
	    return shiptype.api_name;
	} catch (x) {
	}
	return "";
    },

    this._update_owner = function() {
	let db = {};
	let items;
	let ships;

	if (!this._ts || !KanColleDatabase.ship.timestamp() ||
	    !KanColleDatabase.masterSlotitem.timestamp())
	    return -1;

	items = KanColleDatabase.slotitem.list();
	ships = KanColleDatabase.ship.list();

	for (let i = 0; i < items.length; i++) {
	    let item = KanColleDatabase.slotitem.get(items[i]);
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
	    let ship = KanColleDatabase.ship.get(ships[i]);
	    let ship_slot = ship.api_slot;

	    //debugprint(this._shipname(ship.api_id) + ': ');

	    for (let j = 0; j < ship_slot.length; j++) {
		let item;
		let itemtypeid;

		if (ship_slot[j] < 0)
		    continue;

		item = KanColleDatabase.slotitem.get(ship_slot[j]);
		// member/slotitem might be out-of-date for a while.
		if (!item)
		    return -1;

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

	//debugprint(db.toSource());
	this._db.owner = db;

	return 0;
    };

    this._update = {
	ship: function() {
	    let t = KanColleDatabase.ship.timestamp();

	    if (!this._ts)
		return;

	    this._ts = t;
	    this._update_owner();
	    this._notify();
	},

	_memberSlotitem: function() {
	    let t = KanColleDatabase._memberSlotitem.timestamp();
	    this._db.hash = null;
	    this._db.list = null;
	    this._ts = t;
	    this._update_owner();
	    this._notify();
	},

	reqKaisouPowerup: function() {
	    let t = KanColleDatabase.reqKaisouPowerup.timestamp();
	    let req = KanColleDatabase.reqKaisouPowerup.get_req();
	    let req_id_items = req.api_id_items;

	    if (!this._ts || !req_id_items)
		return;

	    req_id_items = req_id_items.split(/,/).map(function(v) {
							return parseInt(v,10);
						       });
	    if (req_id_items.some(function(v) {
				    return isNaN(v);
				  }))
		return;

	    this._deepcopy();

	    for (let i = 0; i < req_id_items.length; i++) {
		let ship = KanColleDatabase.ship.get(req_id_items[i]);
		if (!ship)
		    continue;
		for (let j = 0; j < ship.api_slot.length; j++) {
		    if (ship.api_slot[j] < 0)
			continue;
		    delete(this._db.hash[ship.api_slot[j]]);
		}
	    }

	    this._db.list = Object.keys(this._db.hash);

	    this._ts = t;
	    this._update_owner();
	    this._notify();
	},

	reqKousyouCreateItem: function() {
	    let t = KanColleDatabase.reqKousyouCreateItem.timestamp();
	    let data = KanColleDatabase.reqKousyouCreateItem.get();
	    let slotitem = data.api_slot_item;

	    if (!this._ts)
		return;

	    this._deepcopy();
	    this._db.hash[slotitem.api_id] = slotitem;
	    this._db.list = Object.keys(this._db.hash);

	    this._ts = t;
	    this._update_owner();
	    this._notify();
	},

	reqKousyouDestroyItem2: function() {
	    let t = KanColleDatabase.reqKousyouDestroyItem2.timestamp();
	    let req = KanColleDatabase.reqKousyouDestroyItem2.get_req();
	    let req_slotitem_ids = req.api_slotitem_ids;

	    if (!this._ts || !req_slotitem_ids)
		return;

	    req_slotitem_ids = req_slotitem_ids.split(/,/).map(function(v) {
								return parseInt(v,10);
							       });
	    if (req_slotitem_ids.some(function(v) {
					return isNaN(v);
				      }))
		return;

	    this._deepcopy();

	    for (let i = 0; i < req_slotitem_ids.length; i++)
		delete(this._db.hash[req_slotitem_ids[i]]);
	    this._db.list = Object.keys(this._db.hash);

	    this._ts = t;
	    this._update_owner();
	    this._notify();
	},

	reqKousyouDestroyShip: function() {
	    let t = KanColleDatabase.reqKousyouDestroyShip.timestamp();
	    let req = KanColleDatabase.reqKousyouDestroyShip.get_req();
	    let api_ship_id = parseInt(req.api_ship_id, 10);
	    let ship;

	    if (!this._ts || isNaN(api_ship_id))
		return;

	    ship = KanColleDatabase.ship.get(api_ship_id);
	    if (!ship)
		return;

	    this._deepcopy();

	    for (let i = 0; i < ship.api_slot.length; i++) {
		if (ship.api_slot[i] < 0)
		    continue;
		delete(this._db.hash[ship.api_slot[i]]);
	    }
	    this._db.list = Object.keys(this._db.hash);

	    this._ts = t;
	    this._update_owner();
	    this._notify();
	},

	reqKousyouGetShip: function() {
	    let data = KanColleDatabase.reqKousyouGetShip.get().api_slotitem;
	    let t = KanColleDatabase.reqKousyouGetShip.timestamp();

	    if (!this._ts)
		return;

	    this._deepcopy();
	    for (let i = 0; i < data.length; i++)
		this._db.hash[data[i].api_id] = data[i];
	    this._db.list = Object.keys(this._db.hash);
	    this._ts = t;
	    this._update_owner();
	    this._notify();
	},
    };

    this.get = function(id, key) {
	if (key == 'owner') {
	    return id ? this._db.owner[id] : this._db.owner;
	} else if (key == null) {
	    return this._db.hash ? this._db.hash[id] : KanColleDatabase._memberSlotitem.get(id);
	}
    };

    this.list = function() {
	if (!this._db.hash)
	    return KanColleDatabase._memberSlotitem.list();
	if (!this._db.list)
	    this._db.list = Object.keys(this._db.hash);
	return this._db.list;
    };

    this.count = function() {
	return this._db.hash ? this._db.list.length : KanColleDatabase._memberSlotitem.count();
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
    postData: new Object(),

    // Database
    masterMission: null,	// master/mission
    masterShip: null,		// master/ship
    masterSlotitem: null,	// master/slotitem
    masterSlotitemEquiptype: null,	// mst_slotitem_equiptype
    memberBasic: null,		// member/basic
    memberDeck: null,		// member/deck,member/deck_port,
				// or member/ship2[api_data_deck]
				// or member/ship3[api_deck_data]
    memberKdock: null,		// member/kdock
    memberMaterial: null,	// member/material
    memberNdock: null,		// member/ndock
    memberQuestlist: null,	// member/questlist
    memberRecord: null,		// member/record
    _memberShip2: null,		// member/ship2
    _memberSlotitem: null,	// member/slotitem
    memberUnsetslot: null,	// member/unsetslot
				// or member/ship3[api_data.api_slot_data]
    questClearitemget: null,	// quest/clearitemget
    reqHenseiChange: null,	// req_hensei/change
    reqHokyuCharge: null,	// req_hokyu/charge
    reqKaisouPowerup: null,	// req_kaisou/powerup
    reqKousyouCreateItem: null,	// req_kousyou/createitem
    reqKousyouDestroyItem2: null,	// req_kousyou/destroyitem2
    reqKousyouDestroyShip: null,// req_kousyou/destroyship
    reqKousyouGetShip: null,	// req_kousyou/getship

    headQuarter: null,		// 艦船/装備
    ship: null,			// 艦船
    deck: null,			// デッキ
    slotitem: null,		// 装備保持艦船
    quest: null,		// 任務(クエスト)

    // Internal variable
    _refcnt: null,

    // Callback
    _callback: function(req, s, mode) {
	let url = req.name;
	if (!mode || mode == 'http-on-examine-response') {
	    let data = JSON.parse(s.substring(s.indexOf('svdata=') + 7));

	    if (data.api_result != 1)
		return;

	    if (url.match(/kcsapi\/api_start2/)) {
		this.masterMission.update(data.api_data.api_mst_mission);
		this.masterShip.update(data.api_data.api_mst_ship);
		this.masterSlotitem.update(data.api_data.api_mst_slotitem);
		this.masterSlotitemEquiptype.update(data.api_data.api_mst_slotitem_equiptype);
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
		this._memberShip2.update(data.api_data);
		this.memberDeck.update(data.api_data_deck);
	    } else if (url.match(/kcsapi\/api_get_member\/ship3/)) {
		if (KanColleAPIversion < 20140423) {
		    this._memberShip2.update(data.api_data.api_ship_data);
		    this.memberDeck.update(data.api_data.api_deck_data);
		    this.memberUnsetslot.update(data.api_data.api_slot_data);
		}
	    } else if (url.match(/kcsapi\/api_get_member\/slotitem/)) {
		this._memberSlotitem.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_get_member\/slot_item/)) {
		this._memberSlotitem.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_get_member\/unsetslot/)) {
		this.memberUnsetslot.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_port\/port/)) {
		KanColleAPIversion = 20140423;
		this.memberBasic.update(data.api_data.api_basic);
		this.memberDeck.update(data.api_data.api_deck_port);
		this.memberMaterial.update(data.api_data.api_material);
		this._memberShip2.update(data.api_data.api_ship);
		this.memberNdock.update(data.api_data.api_ndock);
	    } else if (url.match(/kcsapi\/api_req_hensei\/change/)) {
		this.reqHenseiChange.update();
	    } else if (url.match(/kcsapi\/api_req_hokyu\/charge/)) {
		this.reqHokyuCharge.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_kaisou\/powerup/)) {
		this.reqKaisouPowerup.update(data.api_data);
		this.memberDeck.update(data.api_data.api_deck);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/createitem/)) {
		this.reqKousyouCreateItem.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/destroyitem2/)) {
		this.reqKousyouDestroyItem2.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/destroyship/)) {
		this.reqKousyouDestroyShip.update();
	    } else if (url.match(/kcsapi\/api_req_kousyou\/getship/)) {
		this.reqKousyouGetShip.update(data.api_data);
		this.memberKdock.update(data.api_data.api_kdock);
	    } else if (url.match(/kcsapi\/api_req_quest\/clearitemget/)) {
		this.questClearitemget.update(data.api_data);
	    }
	} else if (mode == 'http-on-modify-request') {
	    let postdata = s.substring(s.indexOf('\r\n\r\n') + 4).split('&');
	    let k,v,t;
	    let data = new Object();
	    for (let i = 0; i < postdata.length; i++){
		let idx;
		let e;

		t = postdata[i];
		idx = t.indexOf('=');
		try{
		    if (idx >= 0) {
			k = decodeURI(t.substring(0, idx));
			v = decodeURI(t.substring(idx + 1));
		    }
		    if (data[k])
			debugprint('overriding data for ' + k + '; ' + data[k]);
		    data[k] = v;
		} catch(e) {
		}
	    }

	    //debugprint('url=' + url + ', data=' + data.toSource());
	    if (url.match(/kcsapi\/api_req_hensei\/change/)) {
		this.reqHenseiChange.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_kaisou\/powerup/)) {
		this.reqKaisouPowerup.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/destroyitem2/)) {
		this.reqKousyouDestroyItem2.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/destroyship/)) {
		this.reqKousyouDestroyShip.prepare(data);
	    }
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
	    if (!this.masterSlotitemEquiptype)
		this.masterSlotitemEquiptype = new KanColleDB();

	    this.memberBasic = new KanColleSimpleDB();
	    this.memberDeck = new KanColleDB();
	    this.memberKdock = new KanColleDB();
	    this.memberMaterial = new KanColleDB();
	    this.memberNdock = new KanColleDB();
	    this.memberQuestlist = new KanColleSimpleDB();
	    this.memberRecord = new KanColleSimpleDB();
	    this._memberShip2 = new KanColleDB();
	    this._memberSlotitem = new KanColleDB();
	    this.memberUnsetslot = new KanColleSimpleDB();
	    this.questClearitemget = new KanColleSimpleDB();
	    this.reqHenseiChange = new KanColleSimpleDB();
	    this.reqKaisouPowerup = new KanColleSimpleDB();
	    this.reqKousyouCreateItem = new KanColleSimpleDB();
	    this.reqKousyouDestroyItem2 = new KanColleSimpleDB();
	    this.reqKousyouDestroyShip = new KanColleSimpleDB();
	    this.reqKousyouGetShip = new KanColleSimpleDB();
	    this.reqHokyuCharge = new KanColleSimpleDB();

	    this.ship = new KanColleShipDB();
	    this.ship.init();
	    this.deck = new KanColleDeckDB();
	    this.deck.init();
	    this.slotitem = new KanColleSlotitemDB();
	    this.slotitem .init();
	    this.headQuarter = new KanColleHeadQuarterDB();
	    this.headQuarter.init();
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
	    this.headQuarter.exit();
	    this.headQuarter = null;
	    this.slotitem.exit();
	    this.slotitem = null;
	    this.deck.exit();
	    this.deck = null;
	    this.ship.exit();
	    this.ship = null;

	    this.reqKousyouGetShip = null;
	    this.reqKousyouDestroyShip = null;
	    this.reqKousyouDestroyItem2 = null;
	    this.reqKousyouCreateItem = null;
	    this.reqKaisouPowerup = null;
	    this.reqHokyuCharge = null;
	    this.reqHenseiChange = null;
	    this.questClearitemget = null;
	    this.memberQuestlist = null;
	    this.memberMaterial = null;
	    this.memberRecord = null;
	    this.memberBasic = null;
	    this.memberKdock = null;
	    this.memberNdock = null;
	    this.memberDeck = null;
	    this._memberSlotitem = null;
	    this.memberUnsetslot = null;
	    this._memberShip2 = null;
	    //マスタ情報は再送されないので削除しない
	    //this.masterSlotitemEquiptype = null;
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
		f( request, s, 'http-on-examine-response' );
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

	if( aTopic=="http-on-modify-request" ){
	    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
	    if( httpChannel.requestMethod=='POST' &&
		httpChannel.URI.spec.match(/^http.*\/kcsapi\//) ){
		httpChannel.QueryInterface(Components.interfaces.nsIUploadChannel);
		var us = httpChannel.uploadStream;
		us.QueryInterface(Components.interfaces.nsISeekableStream);
		var ss = Components.classes["@mozilla.org/scriptableinputstream;1"]
			.createInstance(Components.interfaces. nsIScriptableInputStream);
		ss.init(us);
		us.seek(0, 0);
		var n = ss.available();
		var postdata = ss.read(n);
		us.seek(0, 0);

		for( let k in callback ){
		    let f = callback[k];
		    if (typeof(f) == 'function')
			f({ name: httpChannel.URI.spec }, postdata, aTopic);
		}

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
	    this.observerService.addObserver(this, "http-on-modify-request", false);
	    debugprint("start kancolle observer.");
	}
	this.counter++;
    },

    destroy: function(){
	this.counter--;
	if( this.counter<=0 ){
	    this.observerService.removeObserver(this, "http-on-examine-response");
	    this.observerService.removeObserver(this, "http-on-modify-request");
	    this.counter = 0;
	    debugprint("stop kancolle observer.");
	}
    }

};
