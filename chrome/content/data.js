
var KanColleData = {

    type_name: {
	2:"駆逐艦",
	3:"軽巡洋艦",
	4:"重雷装巡洋艦",
	5:"重巡洋艦",
	6:"航空巡洋艦",
	7:"軽空母",
	8:"戦艦",
	9:"戦艦",
	10:"航空戦艦",
	11:"正規空母",
	13:"潜水艦",
	14:"潜水空母",
	16:"水上機母艦",
    },

    mission_name:{
	1:"練習航海",
	2:"長距離練習航海",
	3:"警備任務",
	4:"対潜警戒任務",
	5:"海上護衛任務",
	6:"防空射撃演習",
	7:"観艦式予行",
	8:"観艦式",
	9:"タンカー護衛任務",
	10:"強行偵察任務",  // 10
	11:"ボーキサイト輸送任務",
	12:"資源輸送任務",
	13:"鼠輸送作戦",
	14:"包囲陸戦隊撤収作戦",
	15:"囮機動部隊支援作戦",
	16:"艦隊決戦援護作戦",
	17:"敵地偵察作戦",
	18:"航空機輸送作戦",
	19:"北号作戦",
	20:"潜水艦哨戒任務", // 20
	25:"通商破壊作戦", // 25
	26:"敵母港空襲作戦",
	27:"潜水艦通商破壊作戦",
	28:"西方海域封鎖作戦",
	29:"潜水艦派遣演習",
	30:"潜水艦派遣作戦",
	33:"前衛支援任務",
	34:"艦隊決戦支援任務",
	35:"ＭＯ作戦",
	36:"水上機基地建設",
	109:"前衛支援任務",
	110:"艦隊決戦支援任務",
    },

    construction_shipname:{
	18:"駆逐艦(睦月型)",
	20:"駆逐艦(吹雪型/綾波型/暁型/初春型)",
	22:"駆逐艦(白露型/朝潮型)\n潜水艦",
	24:"駆逐艦(陽炎型/雪風)",
	30:"駆逐艦(島風)",
	60:"軽巡(天龍型/球磨型/長良型/川内型)\n重巡(古鷹型/青葉型)",
	75:"軽巡(阿武隈/鬼怒)",
	80:"重巡(妙高型)",
	82:"軽巡(夕張)",
	85:"重巡(高雄型)",
	90:"重巡(最上型/利根型)",
	120:"軽空母(鳳翔)",
	140:"水上機母艦(千歳/千代田)",
	160:"軽空母(祥鳳/瑞鳳)",
	170:"軽空母(龍驤)",
	180:"軽空母(飛鷹/隼鷹)",
	240:"戦艦(金剛/比叡/榛名/霧島)",
	250:"空母(飛龍/蒼龍)",
	260:"戦艦(扶桑/山城)\n空母(加賀)",
	270:"戦艦(伊勢/日向)\n空母(赤城)",
	300:"戦艦(長門/陸奥)",
	360:"空母(翔鶴/瑞鶴)",
    }

};

function GetConstructionShipName(now,finishedtime){
    let remain = finishedtime - now;
    for(let k in KanColleData.construction_shipname ){
	let shipname = KanColleData.construction_shipname[k];
	k = parseInt(k);
	k *= 60;

	let t1 = k-30;
	let t2 = k+30;

	if( t1<remain && remain<t2 ){
	    return shipname;
	}
    }
    return "建造艦種不明";
}
