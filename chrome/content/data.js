// vim: set ts=8 sw=4 sts=4 ff=dos :

var KanColleData = {


    type_name:      {
	2:  "駆逐艦",
	3:  "軽巡洋艦",
	4:  "重雷装巡洋艦",
	5:  "重巡洋艦",
	6:  "航空巡洋艦",
	7:  "軽空母",
	8:  "戦艦",
	9:  "戦艦",
	10: "航空戦艦",
	11: "正規空母",
	13: "潜水艦",
	14: "潜水空母",
	15: "補給艦",
	16: "水上機母艦",
	17: "揚陸艦",
	18: "装甲空母",
    },

    /*
     主砲 #d15b5b
     副砲 #ffea00
     対空砲 #66cc77
     魚雷 #5887ab
     艦載機 #39b74e
     偵察機 #8fcc99
     電探 #e89a35
     対潜 #7eccd8
     タービン #fdc24c
     三式弾 #71cd7e
     徹甲弾 #d15b5b
     機銃 #66cc77
     ダメコン #ffffff
     大発 #9aa55d
     カ号 #66cc77
     三式指揮 #7fccd8
     バルジ #9a7eaa
     ドラム缶 #a3a3a3
     */
    slotitem_color: {
	1:  '#d15b5b',	// 主砲 1-16が高角砲
	2:  '#d15b5b',	// 主砲
	3:  '#d15b5b',	// 主砲
	4:  '#ffea00',	// 副砲 4-16が高角砲
	5:  '#5887ab',	// 魚雷
	6:  '#39b74e',	// 制空戦闘機
	7:  '#39b74e',	// 艦爆
	8:  '#39b74e',	// 艦攻
	9:  '#39b74e',	// 彩雲
	10: '#8fcc99',	// 偵察機・観測機
	11: '#8fcc99',	// 瑞雲・晴嵐
	12: '#e89a35',	// 電探
	13: '#e89a35',	// 電探
	14: '#7eccd8',	// 対潜兵器
	15: '#7eccd8',	// 対潜兵器
	17: '#fdc24c',	// タービン
	18: '#71cd7e',	// 三式弾
	19: '#d15b5b',	// 徹甲弾
	21: '#66cc77',	// 機銃
	22: '#5887ab',	// 甲標的
	23: '#ffffff',	// ダメコン
	24: '#9aa55d',	// 大発
	25: '#66cc77',	// カ号
	26: '#7fccd8',	// 三式式連絡機
	27: '#9a7eaa',	// バルジ
	28: '#9a7eaa',	// バルジ
	30: '#a3a3a3',  // ドラム缶
    },

    mission_name:           {
	1:   "練習航海",
	2:   "長距離練習航海",
	3:   "警備任務",
	4:   "対潜警戒任務",
	5:   "海上護衛任務",
	6:   "防空射撃演習",
	7:   "観艦式予行",
	8:   "観艦式",
	9:   "タンカー護衛任務",
	10:  "強行偵察任務",  // 10
	11:  "ボーキサイト輸送任務",
	12:  "資源輸送任務",
	13:  "鼠輸送作戦",
	14:  "包囲陸戦隊撤収作戦",
	15:  "囮機動部隊支援作戦",
	16:  "艦隊決戦援護作戦",
	17:  "敵地偵察作戦",
	18:  "航空機輸送作戦",
	19:  "北号作戦",
	20:  "潜水艦哨戒任務", // 20
	25:  "通商破壊作戦", // 25
	26:  "敵母港空襲作戦",
	27:  "潜水艦通商破壊作戦",
	28:  "西方海域封鎖作戦",
	29:  "潜水艦派遣演習",
	30:  "潜水艦派遣作戦",
	33:  "前衛支援任務",
	34:  "艦隊決戦支援任務",
	35:  "ＭＯ作戦",
	36:  "水上機基地建設",
	109: "前衛支援任務",
	110: "艦隊決戦支援任務",
    },

    // 燃料,弾薬,鋼材,ボーキサイト
    // 小数点以下第一位に何番目に収入が多いか示す数字を入れています
    mission_hourly_balance: {
	1:  [-40, 120.3, 0, 0],
	2:  [-64, 200.1, 60, 0],
	3:  [45, 54, 120.1, 0],
	4:  [-35, 72, 0, 0],
	5:  [109.1, 133.2, 13, 13],
	6:  [-30, -24, 0, 120.1],
	7:  [-48, 0, 50, 30],
	8:  [1, 25, 17, 17],
	9:  [78.2, 0, 0, 0],
	10: [-14, 33, 0, 20],
	11: [-6, 0, 0, 50.2],
	12: [2, 31, 25, 6],
	13: [47, 62, 0, 0],
	14: [-9, 40, 33, 0],
	15: [-6, -5, 25, 33],
	16: [30, 30, 13, 13],
	17: [49.3, 24, 67.3, 0],
	18: [-17, -7, 60, 20],
	19: [45, -19, 8, 5],
	20: [-9, -11, 75.2, 0],
	25: [16, -3, 8, 0],
	26: [-1, -1, 0, 11],
	27: [-1, -2, 40, 0],
	28: [-1, -2, 36, 14],
	29: [-1, -1, 0, 4],
	30: [-1, -2, 0, 2],
	35: [-18, -23, 34, 40.3],
	36: [21, -16, 17, 17],
    },

    mission_help: {
	1:  "Lv1 15m 全2",
	2:  "Lv2 30m 全4",
	3:  "Lv3 20m 全3",
	4:  "Lv3 50m 軽巡1駆逐2",
	5:  "Lv3 1h30m 軽巡1駆逐2全1",
	6:  "Lv4 40m 全4",
	7:  "Lv5 1h 全6",
	8:  "Lv8 3h 全6",
	9:  "Lv3 4h 軽巡1駆逐2全1",
	10: "Lv3 1h30m 軽巡2全1",
	11: "Lv6 5h 駆逐2全2",
	12: "Lv4 8h 駆逐2全2",
	13: "Lv5 4h 軽巡1駆逐4全1",
	14: "Lv6 6h 軽巡1駆逐3全2",
	15: "Lv8 12h 空母(軽母 水母可)2 駆逐2 全2",
	16: "Lv10 15h 軽巡1駆逐2全3",
	17: "Lv20 45m 軽巡1駆逐3全2",
	18: "Lv15 5h 空母(軽母 水母可)3 駆逐 2全1",
	19: "Lv20 6h 航戦2駆逐2全2",
	20: "Lv1 2h 潜水(アプデにより潜母可)1 軽巡1",
	25: "Lv25 40h 重巡2駆逐2",
	26: "Lv30 80h 空母(軽母 水母可)1軽巡1駆逐2",
	27: "Lv1 20h 潜水(アプデにより潜母可)2",
	28: "Lv30 25h 潜水(アプデにより潜母可)3",
	29: "Lv50 24h 潜水3",
	30: "Lv55 48h 潜水4",
	35: "Lv40 7h 空母(軽母 水母可)2重巡1駆逐2全1",
	36: "Lv30 9h 水母2軽巡1駆逐1全2 ",
    },

    construction_shipname: {
	17:  "三式潜航輸送挺(まるゆ)",
	18:  "駆逐艦(睦月型)",
	20:  "駆逐艦(吹雪型/綾波型/暁型/初春型)",
	22:  "駆逐艦(白露型/朝潮型)\n潜水艦",
	24:  "駆逐艦(陽炎型/雪風)",
	30:  "駆逐艦(島風)",
	60:  "軽巡(天龍型/球磨型/長良型/川内型/阿賀野型)\n重巡(古鷹型/青葉型)",
	75:  "軽巡(阿武隈/鬼怒)",
	80:  "重巡(妙高型)",
	82:  "軽巡(夕張)",
	85:  "重巡(高雄型)",
	90:  "重巡(最上型/利根型)",
	120: "軽空母(鳳翔)",
	140: "水上機母艦(千歳/千代田)",
	150: "強襲揚陸艦(あきつ丸)",
	160: "軽空母(祥鳳/瑞鳳)",
	170: "軽空母(龍驤)",
	180: "軽空母(飛鷹/隼鷹)",
	240: "戦艦(金剛/比叡/榛名/霧島)",
	250: "空母(飛龍/蒼龍)",
	260: "戦艦(扶桑/山城)\n空母(加賀)",
	270: "戦艦(伊勢/日向)\n空母(赤城)",
	300: "戦艦(長門/陸奥)",
	360: "空母(翔鶴/瑞鶴)",
	400: "装甲空母(大鳳)",
	480: "戦艦(大和)",
    }

};

function GetConstructionShipName( now, finishedtime ){
    let remain = finishedtime - now;
    for( let k in KanColleData.construction_shipname ){
	let shipname = KanColleData.construction_shipname[k];
	k = parseInt( k );
	k *= 60;

	let t1 = k - 30;
	let t2 = k + 30;

	if( t1 < remain && remain < t2 ){
	    return shipname;
	}
    }
    return "建造艦種不明";
}
