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

var KanColleMaterialDB = function() {
    this._init();

    this._db = {
	fuel: Number.NaN,
	bullet: Number.NaN,
	steel: Number.NaN,
	bauxite: Number.NaN,
	burner: Number.NaN,
	bucket: Number.NaN,
	devkit: Number.NaN,
	screw: Number.NaN,
    };

    this._update = {
	memberMaterial: function() {
	    let t = KanColleDatabase.memberMaterial.timestamp();
	    let keys = {
		fuel: 1,
		bullet: 2,
		steel: 3,
		bauxite: 4,
		burner: 5,
		bucket: 6,
		devkit: 7,
		screw: 8,
	    };
	    let ok = 0;

	    for (let k in keys) {
		let d = KanColleDatabase.memberMaterial.get(keys[k]);
		if (typeof(d) != 'object' || d == null)
		    continue;
		this._db[k] = d.api_value;
		ok++;
	    }

	    if (!ok)
		return;

	    this._ts = t;
	    this._notify();
	},

	reqHokyuCharge: function() {
	    let t = KanColleDatabase.reqHokyuCharge.timestamp();
	    let data = KanColleDatabase.reqHokyuCharge.get();

	    if (!this._ts)
		return;

	    this._db.fuel    = data.api_material[0];
	    this._db.bullet  = data.api_material[1];
	    this._db.steel   = data.api_material[2];
	    this._db.bauxite = data.api_material[3];

	    this._ts = t;
	    this._notify();
	},

	reqNyukyoStart: function() {
	    let t = KanColleDatabase.reqNyukyoStart.timestamp();
	    let req = KanColleDatabase.reqNyukyoStart.get_req();
	    let req_highspeed = parseInt(req.api_highspeed, 10);

	    if (!this._ts || isNaN(this._db.bucket) ||
		isNaN(req_highspeed) || !req_highspeed)
		return;

	    this._db.bucket--;

	    this._ts = t;
	    this._notify();
	},

	reqKousyouCreateShipSpeedChange: function() {
	    let t = KanColleDatabase.reqKousyouCreateShipSpeedChange.timestamp();
	    let req = KanColleDatabase.reqKousyouCreateShipSpeedChange.get_req();
	    let req_kdock_id = parseInt(req.api_kdock_id, 10);
	    let req_highspeed = parseInt(req.api_highspeed, 10);
	    let kdock;
	    let delta_burner = 1;

	    if (!this._ts || isNaN(this._db.burner) ||
		isNaN(req_highspeed) || !req_highspeed ||
		isNaN(req_kdock_id))
		return;

	    kdock = KanColleDatabase.kdock.get(req_kdock_id);
	    if (kdock &&
		(kdock.api_item1 >= 1000 || kdock.api_item2 >= 1000 ||
		 kdock.api_item3 >= 1000 || kdock.api_item4 >= 1000 ||
		 kdock.api_item5 > 1)) {
		// 大型建造
		delta_burner = 10;
	    }

	    this._db.burner -= delta_burner;

	    this._ts = t;
	    this._notify();
	},

	reqKousyouRemodelSlot: function() {
	    let t = KanColleDatabase.reqKousyouRemodelSlot.timestamp();
	    let data = KanColleDatabase.reqKousyouRemodelSlot.get();

	    if (!this._ts || !data)
		return;

	    this._db.fuel    = data.api_after_material[0];
	    this._db.bullet  = data.api_after_material[1];
	    this._db.steel   = data.api_after_material[2];
	    this._db.bauxite = data.api_after_material[3];
	    this._db.burner  = data.api_after_material[4];
	    this._db.bucket  = data.api_after_material[5];
	    this._db.devkit  = data.api_after_material[6];
	    this._db.screw   = data.api_after_material[7];

	    this._ts = t;
	    this._notify();
	},

	reqNyukyoSpeedChange: function() {
	    let t = KanColleDatabase.reqNyukyoStart.timestamp();

	    if (!this._ts || isNaN(this._db.bucket))
		return;

	    this._db.bucket--;

	    this._ts = t;
	    this._notify();
	},
    };

    this.get = function(key) { return this._db[key]; };

    this._update_init();
};
KanColleMaterialDB.prototype = new KanColleCombinedDB();

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

	// リクエストに api_shipid が含まれる場合のみ呼ばれる
	//  XXX: リクエストの api_shipid と整合性を確認すべき?
	_memberShip3: function() {
	    let data = KanColleDatabase._memberShip3.get();

	    if (!this._ts)
		return;

	    this._ts = KanColleDatabase._memberShip3.timestamp();
	    this._deepcopy();

	    for (let i = 0; i < data.length; i++) {
		let ship_id = data[i].api_id;
		this._db.ship[ship_id] = data[i];
	    }

	    // 念のため
	    this._db.list = Object.keys(this._db.ship);

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
		debugprint('deleting ' + ship_id);
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

	reqNyukyoStart: function() {
	    let t = KanColleDatabase.reqNyukyoStart.timestamp();
	    let req = KanColleDatabase.reqNyukyoStart.get_req();
	    let req_ndock_id = parseInt(req.api_ndock_id, 10);
	    let req_ship_id = parseInt(req.api_ship_id, 10);
	    let req_highspeed = parseInt(req.api_highspeed, 10);
	    let ship;

	    if (!this._ts ||
		isNaN(req_ndock_id) || isNaN(req_ship_id) || isNaN(req_highspeed))
		return;

	    this._deepcopy();

	    ship = this._db.ship[req_ship_id];
	    if (!ship)
		return;

	    // 高速修復 または 1分以下
	    if (req_highspeed || ship.api_ndock_time <= 60000) {
		ship.api_nowhp = ship.api_maxhp;
		ship.api_ndock_time = 0;
		for (let i = 0; i < ship.api_ndock_item.length; i++)
		    ship.api_ndock_item[i] = 0;
		if (ship.api_cond < 40)
		    ship.api_cond = 40;
	    }

	    this._ts = t;
	    this._notify();
	},

	reqNyukyoSpeedChange: function() {
	    let t = KanColleDatabase.reqNyukyoStart.timestamp();
	    let req = KanColleDatabase.reqNyukyoStart.get_req();
	    let req_ndock_id = parseInt(req.api_ndock_id, 10);
	    let req_highspeed = parseInt(req.api_highspeed, 10);
	    let ndock;

	    if (!this._ts || isNaN(req_ndock_id) ||
		isNaN(req_highspeed) || !req_highspeed)
		return;

	    ndock = KanColleDatabase.memberNdock.get(req_ndock_id);
	    if (!ndock || ndock.api_state != 1 && !ndock.api_ship_id)
		return;

	    this._deepcopy();

	    ship = this._db.ship[ndock.api_ship_id];
	    if (!ship)
		return;

	    // 高速修復
	    ship.api_nowhp = ship.api_maxhp;
	    ship.api_ndock_time = 0;
	    for (let i = 0; i < ship.api_ndock_item.length; i++)
		ship.api_ndock_item[i] = 0;
	    if (ship.api_cond < 40)
		ship.api_cond = 40;

	    this._ts = t;
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
		// 配置換え

		// 現在艦隊に所属する艦船ID
		let ship_id = deck.api_ship[req_ship_idx];
		// 配置しようとする艦の所属艦隊
		let ship_fleet = req_ship_id >= 0 ? KanColleDatabase.deck.lookup(req_ship_id) : null;

		// 新しい艦を配置
		deck.api_ship[req_ship_idx] = req_ship_id;
		if (ship_fleet) {
		    // 所属元艦隊での処理
		    let odeck = this._db.deck[ship_fleet.fleet];
		    if (ship_id >= 0) {
			// 配置
			odeck.api_ship[ship_fleet.pos] = ship_id;
		    } else {
			// 解除
			odeck.api_ship.splice(ship_fleet.pos, 1);
			odeck.api_ship.push(-1);
		    }
		}
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
	    this._db.deck[fleet.fleet].api_ship.splice(fleet.pos,1);
	    this._db.deck[fleet.fleet].api_ship.push(-1);

	    this._update_fleet();
	    this._notify();
	},
	reqMemberUpdateDeckName: function() {
	    let req = KanColleDatabase.reqMemberUpdateDeckName.get_req();
	    let req_deck_id;
	    let deck;

	    if (!this._ts)
		return;

	    req_deck_id = parseInt(req.api_deck_id, 10);
	    if (isNaN(req_deck_id))
		return;

	    this._deepcopy();

	    deck = this.get(req_deck_id);
	    if (!deck)
		return;

	    deck.api_name = req.api_name;

	    this._ts = KanColleDatabase.reqMemberUpdateDeckName.timestamp();
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
		    debugprint('deleting slotitem: ' + ship.api_slot[j]);
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

	    if (!this._ts || !slotitem)
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

	    for (let i = 0; i < req_slotitem_ids.length; i++) {
		debugprint('deleting slotitem: ' + req_slotitem_ids[i]);
		delete(this._db.hash[req_slotitem_ids[i]]);
	    }
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
		debugprint('deleting slotitem: ' + ship.api_slot[i]);
		delete(this._db.hash[ship.api_slot[i]]);
	    }
	    this._db.list = Object.keys(this._db.hash);

	    this._ts = t;
	    this._update_owner();
	    this._notify();
	},

	reqKousyouGetShip: function() {
	    let data = KanColleDatabase.reqKousyouGetShip.get().api_slotitem || [];
	    let t = KanColleDatabase.reqKousyouGetShip.timestamp();

	    if (!this._ts || !data)
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

var KanCollePracticeDB = function() {
    this._init();

    this._db = {
	hash: {},
	info: {},
    };

    this._update = {
	memberPractice: function() {
	    let t = KanColleDatabase.memberPractice.timestamp();
	    let list = KanColleDatabase.memberPractice.list();

	    // 演習は午前3時(0時/12時UTC)に更新
	    if (!this._ts || Math.floor(this._ts / 43200000) < Math.floor(t / 43200000)) {
		this._db.hash = {};
		this._db.info = {};
	    };

	    for (let i = 0; i < list.length; i++) {
		let p = KanColleDatabase.memberPractice.get(list[i]);
		this._db.hash[p.api_id] = p;
	    }

	    this._ts = t;
	    this._notify();
	},

	reqMemberGetPracticeEnemyInfo: function() {
	    let t = KanColleDatabase.reqMemberGetPracticeEnemyInfo.timestamp();
	    let info = KanColleDatabase.reqMemberGetPracticeEnemyInfo.get();

	    if (!this._ts)
		return;

	    this._db.info[info.api_member_id] = info;

	    this._ts = t;
	    this._notify();
	},
    };

    this.get = function(id) {
	return this._db.hash[id];
    };

    this.list = function() {
	return Object.keys(this._db.hash);
    };

    this.find = function(id) {
	return this._db.info[id];
    };

    this._update_init();
};
KanCollePracticeDB.prototype = new KanColleCombinedDB();

//
// 建造ドックデータベース
//
var KanColleKdockDB = function() {
    this._init();

    this._db = {
	hash: null,
	list: null,
    };

    this._deepcopy = function() {
	if (!this._db.hash) {
	    let ids = KanColleDatabase._memberKdock.list();
	    if (!ids)
		return;

	    this._db.hash = new Object;

	    for (let i = 0; i < ids.length; i++)
		this._db.hash[ids[i]] = JSON.parse(JSON.stringify(KanColleDatabase._memberKdock.get(ids[i])));

	    this._db.list = Object.keys(this._db.hash);

	    //debugprint('hash: ' + this._db.hash.toSource());
	    //debugprint('list: ' + this._db.list.toSource());
	}
    };

    this._update = {
	_memberKdock: function() {
	    let t = KanColleDatabase._memberKdock.timestamp();
	    let list = KanColleDatabase._memberKdock.list();

	    this._db.hash = null;
	    this._db.list = null;

	    this._ts = t;
	    this._notify();
	},

	reqKousyouCreateShipSpeedChange: function() {
	    let t = KanColleDatabase.reqKousyouCreateShipSpeedChange.timestamp();
	    let req = KanColleDatabase.reqKousyouCreateShipSpeedChange.get_req();
	    let req_kdock_id = req.api_kdock_id;
	    let req_highspeed = parseInt(req.api_highspeed, 10);

	    if (!this._ts || isNaN(req_highspeed) || !req_highspeed)
		return;

	    this._deepcopy();

	    kdock = this._db.hash[req_kdock_id];
	    kdock.api_state = 3;	    // completed
	    kdock.api_complete_time = 0;

	    this._ts = t;
	    this._notify();
	},
    };

    this.get = function(id) {
	return this._db.hash ? this._db.hash[id] : KanColleDatabase._memberKdock.get(id);
    };

    this.list = function() {
	if (!this._db.hash)
	    return KanColleDatabase._memberKdock.list();
	if (!this._db.list)
	    this._db.list = Object.keys(this._db.hash);
	return this._db.list;
    };

    this.count = function() {
	return this._db.hash ? this._db.list.length : KanColleDatabase._memberKdock.count();
    };

    this._update_init();
};
KanColleKdockDB.prototype = new KanColleCombinedDB();

var KanColleDatabase = {
    typeName: {},		// 艦種データ

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
    _memberKdock: null,		// member/kdock
    memberMaterial: null,	// member/material
    memberNdock: null,		// member/ndock
    memberPractice: null,	// member/practice
    memberQuestlist: null,	// member/questlist
    memberRecord: null,		// member/record
    _memberShip2: null,		// member/ship2
    _memberShip3: null,		// member/ship3
    _memberSlotitem: null,	// member/slotitem
    memberUnsetslot: null,	// member/unsetslot
				// or member/ship3[api_data.api_slot_data]
    questClearitemget: null,	// quest/clearitemget
    reqHenseiChange: null,	// req_hensei/change
    reqHokyuCharge: null,	// req_hokyu/charge
    reqKaisouPowerup: null,	// req_kaisou/powerup
    reqKousyouCreateShipSppedChange: null,  // req_kousyou/createship_speedchange
    reqKousyouCreateItem: null,	// req_kousyou/createitem
    reqKousyouDestroyItem2: null,	// req_kousyou/destroyitem2
    reqKousyouDestroyShip: null,// req_kousyou/destroyship
    reqKousyouGetShip: null,	// req_kousyou/getship
    reqKousyouRemodelSlot: null,// req_kousyou/remodel_slot
    reqMemberUpdateDeckName: null,  //req_member/updatedeckname
    reqMemberGetPracticeEnemyInfo: null,    // req_member/get_practice_enemyinfo
    reqNyukyoSpeedChange: null,	// req_nyukyo/speedchange
    reqNyukyoStart: null,	// req_nyukyo/start

    headQuarter: null,		// 艦船/装備
    ship: null,			// 艦船
    deck: null,			// デッキ
    slotitem: null,		// 装備保持艦船
    quest: null,		// 任務(クエスト)
    practice: null,		// 演習
    material: null,		// 資源/資材
    kdock: null,		// 建造ドック

    // Internal variable
    _refcnt: null,

    /**
     * Profileディレクトリ内に用意しているデータ保管場所のパスを返す
     * @returns nsIFileの形式で返す
     */
    getDir: function(){
	var dirname = "kancolletimer.dat";
	var profdir = Components.classes["@mozilla.org/file/directory_service;1"]
	    .getService( Components.interfaces.nsIProperties )
	    .get( "ProfD", Components.interfaces.nsIFile );
	profdir.append( dirname );
	return profdir;
    },

    getPrefs: function(){
	const CI = Components.interfaces;
	let prefSvc = Components.classes["@mozilla.org/preferences-service;1"]
	    .getService( CI.nsIPrefService );
	prefSvc.QueryInterface( CI.nsIPrefBranch );
	let branch = prefSvc.getBranch( "extensions.kancolletimer." );

	branch.QueryInterface( CI.nsIPrefBranchInternal );
	return branch;
    },

    isDevMode: function(){
	try{
	    return this.getPrefs().getBoolPref( "devmode" );
	}catch(e){
	    return false;
	}
    },

    // 通信データを ProfD/kancolletimer.dat/ に保存する.
    save: function(url, text){
	if( !this.isDevMode() ){
	    return;
	}

	url = url.match( /^http.*\/kcsapi\/(.*)/ )[1];
	url = url.replace( '/', '__' );

	var profdir = this.getDir();
	profdir.append( url );

	var os = Components.classes['@mozilla.org/network/file-output-stream;1']
	    .createInstance( Components.interfaces.nsIFileOutputStream );
	var flags = 0x02 | 0x08 | 0x20;// wronly|create|truncate
	os.init( profdir, flags, 0664, 0 );
	var cos = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
	    .createInstance( Components.interfaces.nsIConverterOutputStream );
	cos.init( os, "UTF-8", 0, Components.interfaces.nsIConverterOutputStream.DEFAULT_REPLACEMENT_CHARACTER );
	cos.writeString( text );
	cos.close();
    },

    // ファイルにテキストを追記する
    appendText: function( file, text ){
	var os = Components.classes['@mozilla.org/network/file-output-stream;1']
	    .createInstance( Components.interfaces.nsIFileOutputStream );
	let flags = 0x02|0x10|0x08;// wronly|append|create
	os.init( file, flags, 0664, 0 );
	var cos = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
	    .createInstance( Components.interfaces.nsIConverterOutputStream );
	cos.init( os, "UTF-8", 0, Components.interfaces.nsIConverterOutputStream.DEFAULT_REPLACEMENT_CHARACTER );
	cos.writeString( text );
	cos.close();
    },

    // ドロップ艦をファイルに記録
    // CSVでフォーマットは 海域名(or建造),敵艦隊名(orなし),艦種,艦名,取得時UNIX時間
    recordDroppedShip: function( data ){
	try{
	    if( !this.getPrefs().getBoolPref("record.ships") ){
		return;
	    }

	    let file = this.getDir();
	    file.append( 'getship.dat' );

	    let d = new Date();
	    d = Math.floor( d.getTime() / 1000 );
	    let str = data.api_data.api_quest_name
		+ ","
		+ data.api_data.api_enemy_info.api_deck_name
		+ ","
		+ data.api_data.api_get_ship.api_ship_type
		+ ","
		+ data.api_data.api_get_ship.api_ship_name
		+ ","
		+ d + ","
		+ data.api_data.api_win_rank
		+"\n";
	    this.appendText( file, str );
	}catch(e){
	    debugprint(e);
	}
    },
    // 建造艦をファイルに記録
    recordCreatedShip: function( data ){
	if( !this.getPrefs().getBoolPref("record.ships") ){
	    return;
	}
	let file = this.getDir();
	file.append( 'getship.dat' );

	let ship = KanColleDatabase.masterShip.get( data.api_data.api_ship_id );
	let d = new Date();
	d = Math.floor( d.getTime() / 1000 );
	// なぜか"建造"の文字だと文字化けするので、"Created"にする.
	let str = "Created,,"
	    + KanColleDatabase.typeName[ship.api_stype]
	    + ","
	    + ship.api_name
	    + ","
	    + d + "\n";
	this.appendText( file, str );
    },

    // Callback
    _callback: function(req, s, mode) {
	let url = req.name;
	if (!mode || mode == 'http-on-examine-response') {
	    let text = s.substring(s.indexOf('svdata=') + 7);
	    let data = JSON.parse(text);

	    this.save( url, text );
	    if( 'function' == typeof this.__devfunc && this.isDevMode() ){
		// 外部から__devfuncに関数突っ込んでやるとそれを呼び出すような仕様
		this.__devfunc( req, data );
	    }

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
		this._memberKdock.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_get_member\/material/)) {
		this.memberMaterial.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_get_member\/ndock/)) {
		this.memberNdock.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_get_member\/practice/)) {
		this.memberPractice.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_get_member\/questlist/)) {
		this.memberQuestlist.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_get_member\/record/)) {
		this.memberRecord.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_get_member\/ship2/)) {
		this._memberShip2.update(data.api_data);
		this.memberDeck.update(data.api_data_deck);
	    } else if (url.match(/kcsapi\/api_get_member\/ship3/)) {
		// もし request に api_shipid が含まれていたら、
		// その艦船についてのみ送られてくる
		if (KanColleDatabase._memberShip3.get_req().api_shipid)
		    this._memberShip3.update(data.api_data.api_ship_data);
		else
		    this._memberShip2.update(data.api_data.api_ship_data);

		this.memberDeck.update(data.api_data.api_deck_data);
		this.memberUnsetslot.update(data.api_data.api_slot_data);
	    } else if (url.match(/kcsapi\/api_get_member\/slotitem/)) {
		this._memberSlotitem.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_get_member\/slot_item/)) {
		this._memberSlotitem.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_get_member\/unsetslot/)) {
		this.memberUnsetslot.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_port\/port/)) {
		this.memberBasic.update(data.api_data.api_basic);
		this.memberDeck.update(data.api_data.api_deck_port);
		this.memberMaterial.update(data.api_data.api_material);
		this.memberNdock.update(data.api_data.api_ndock);
		this._memberShip2.update(data.api_data.api_ship);
	    } else if (url.match(/kcsapi\/api_req_battle_midnight\/(sp_)?(battle|midnight)/)) {
		this.reqBattleMidnightBattle.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_combined_battle\/battleresult/)) {
		//this.reqCombinedBattleBattleResult.update(data.api_data);
		this.recordDroppedShip( data );
	    } else if (url.match(/kcsapi\/api_req_combined_battle\/(air)?battle/)) {
		this.reqCombinedBattleBattle.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_combined_battle\/(midnight_battle|sp_midnight)/)) {
		this.reqCombinedBattleMidnightBattle.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_hensei\/change/)) {
		this.reqHenseiChange.update();
	    } else if (url.match(/kcsapi\/api_req_hokyu\/charge/)) {
		this.reqHokyuCharge.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_kaisou\/powerup/)) {
		this.reqKaisouPowerup.update(data.api_data);
		this.memberDeck.update(data.api_data.api_deck);
		if (data.api_data.api_ship)
		    this._memberShip3.update([data.api_data.api_ship]);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/createitem/)) {
		this.reqKousyouCreateItem.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/createship_speedchange/)) {
		this.reqKousyouCreateShipSpeedChange.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/destroyitem2/)) {
		this.reqKousyouDestroyItem2.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/destroyship/)) {
		this.reqKousyouDestroyShip.update();
	    } else if (url.match(/kcsapi\/api_req_kousyou\/getship/)) {
		this.reqKousyouGetShip.update(data.api_data);
		this._memberKdock.update(data.api_data.api_kdock);
		this.recordCreatedShip( data );
	    } else if (url.match(/kcsapi\/api_req_kousyou\/remodel_slot$/)) {
		this.reqKousyouRemodelSlot.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_member\/get_practice_enemyinfo/)) {
		this.reqMemberGetPracticeEnemyInfo.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_member\/updatedeckname/)) {
		this.reqMemberUpdateDeckName.update();
	    } else if (url.match(/kcsapi\/api_req_nyukyo\/speedchange/)) {
		this.reqNyukyoSpeedChange.update();
	    } else if (url.match(/kcsapi\/api_req_nyukyo\/start/)) {
		this.reqNyukyoStart.update();
	    }else if( url.match( /kcsapi\/api_req_sortie\/battleresult/ ) ||
		url.match( /kcsapi\/api_req_combined_battle\/battleresult/ ) ){
		this.reqSortieBattleResult.update(data.api_data);
		this.recordDroppedShip( data );
	    } else if (url.match(/kcsapi\/api_req_sortie\/battle/)) {
		this.reqSortieBattle.update(data.api_data);
	    } else if (url.match(/kcsapi\/api_req_quest\/clearitemget/)) {
		this.questClearitemget.update(data.api_data);
	    }
	} else if (mode == 'http-on-modify-request') {
	    this.save( url + ".post", s );

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
			k = decodeURIComponent(t.substring(0, idx));
			v = decodeURIComponent(t.substring(idx + 1));
		    }
		    if (data[k])
			debugprint('overriding data for ' + k + '; ' + data[k]);
		    data[k] = v;
		} catch(e) {
		}
	    }

	    //debugprint('url=' + url + ', data=' + data.toSource());
	    if (url.match(/kcsapi\/api_get_member\/ship3/)) {
		this._memberShip3.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_hensei\/change/)) {
		this.reqHenseiChange.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_kaisou\/powerup/)) {
		this.reqKaisouPowerup.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/createship_speedchange/)) {
		this.reqKousyouCreateShipSpeedChange.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/destroyitem2/)) {
		this.reqKousyouDestroyItem2.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_kousyou\/destroyship/)) {
		this.reqKousyouDestroyShip.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_member\/updatedeckname/)) {
		this.reqMemberUpdateDeckName.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_nyukyo\/speedchange/)) {
		this.reqNyukyoSpeedChange.prepare(data);
	    } else if (url.match(/kcsapi\/api_req_nyukyo\/start/)) {
		this.reqNyukyoStart.prepare(data);
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
	    this._memberKdock = new KanColleDB();
	    this.memberMaterial = new KanColleDB();
	    this.memberNdock = new KanColleDB();
	    this.memberPractice = new KanColleDB();
	    this.memberQuestlist = new KanColleSimpleDB();
	    this.memberRecord = new KanColleSimpleDB();
	    this._memberShip2 = new KanColleDB();
	    this._memberShip3 = new KanColleSimpleDB();
	    this._memberSlotitem = new KanColleDB();
	    this.memberUnsetslot = new KanColleSimpleDB();
	    this.questClearitemget = new KanColleSimpleDB();
	    this.reqHenseiChange = new KanColleSimpleDB();
	    this.reqKaisouPowerup = new KanColleSimpleDB();
	    this.reqKousyouCreateItem = new KanColleSimpleDB();
	    this.reqKousyouCreateShipSpeedChange = new KanColleSimpleDB();
	    this.reqKousyouDestroyItem2 = new KanColleSimpleDB();
	    this.reqKousyouDestroyShip = new KanColleSimpleDB();
	    this.reqKousyouGetShip = new KanColleSimpleDB();
	    this.reqKousyouRemodelSlot = new KanColleSimpleDB();
	    this.reqHokyuCharge = new KanColleSimpleDB();
	    this.reqMemberGetPracticeEnemyInfo = new KanColleSimpleDB();
	    this.reqMemberUpdateDeckName = new KanColleSimpleDB();
	    this.reqNyukyoSpeedChange = new KanColleSimpleDB();
	    this.reqNyukyoStart = new KanColleSimpleDB();
	    this.reqSortieBattle = new KanColleSimpleDB();
	    this.reqBattleMidnightBattle = new KanColleSimpleDB();
	    this.reqSortieBattleResult = new KanColleSimpleDB();
	    this.reqCombinedBattleBattle = new KanColleSimpleDB();
	    this.reqCombinedBattleMidnightBattle = new KanColleSimpleDB();

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
	    this.practice = new KanCollePracticeDB();
	    this.practice.init();
	    this.material = new KanColleMaterialDB();
	    this.material.init();
	    this.kdock = new KanColleKdockDB();
	    this.kdock.init();

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
	    this.kdock.exit();
	    this.kdock= null;
	    this.material.exit();
	    this.material = null;
	    this.practice.exit();
	    this.practice = null;
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

	    this.reqSortieBattleResult = null;
	    this.reqCombinedBattleMidnightBattle = null;
	    this.reqCombinedBattleBattle = null;
	    this.reqBattleMidnightBattle = null;
	    this.reqSortieBattle = null;
	    this.reqNyukyoStart = null;
	    this.reqNyukyoSpeedChange = null;
	    this.reqMemberUpdateDeckName = null;
	    this.reqMemberGetPracticeEnemyInfo = null;
	    this.reqKousyouRemodelSlot = null;
	    this.reqKousyouGetShip = null;
	    this.reqKousyouDestroyShip = null;
	    this.reqKousyouDestroyItem2 = null;
	    this.reqKousyouCreateShipSppedChange = null;
	    this.reqKousyouCreateItem = null;
	    this.reqKaisouPowerup = null;
	    this.reqHokyuCharge = null;
	    this.reqHenseiChange = null;
	    this.questClearitemget = null;
	    this.memberQuestlist = null;
	    this.memberPractice = null;
	    this.memberMaterial = null;
	    this.memberRecord = null;
	    this.memberBasic = null;
	    this._memberKdock = null;
	    this.memberNdock = null;
	    this.memberDeck = null;
	    this._memberSlotitem = null;
	    this.memberUnsetslot = null;
	    this._memberShip3 = null;
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
