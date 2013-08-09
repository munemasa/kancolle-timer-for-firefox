
var KanColleData = {

    mission_name:[
	"",
	"練習航海",
	"長距離練習航海",
	"警備任務",
	"対潜警戒任務",
	"海上護衛任務",
	"防空射撃演習",
	"観艦式予行",
	"観艦式",
	"タンカー護衛任務",
	"強行偵察任務",
	"ボーキサイト輸送任務",
	"資源輸送任務",
	"鼠輸送作戦",
	"包囲陸戦隊撤収作戦",
	"囮機動部隊支援作戦",
	"艦隊決戦援護作戦",
	"敵地偵察作戦",
	"航空機輸送作戦",
	"北号作戦",
	"潜水艦哨戒任務",
	"",
	"",
	"",
	"",
	"通商破壊作戦",
	"敵母港空襲作戦",
	"潜水艦通商破壊作戦",
    ],

    construction_shipname:{
	18:"駆逐艦(睦月型)",
	20:"駆逐艦(吹雪型/綾波型/暁型/初春型)",
	22:"駆逐艦(白露型/朝潮型)",
	24:"駆逐艦(陽炎型/雪風)",
	30:"駆逐艦(島風)",
	60:"軽巡(天龍型/球磨型/長良型/川内型)\n重巡(古鷹型/青葉型)",
	75:"軽巡(阿武隈/鬼怒)",
	80:"重巡(妙高型)",
	82:"重巡(夕張)",
	85:"重巡(高雄型)",
	90:"重巡(最上型/利根型)",
	120:"軽空母(鳳翔)",
	140:"水上機母艦(千歳/千代田)",
	160:"軽空母(祥鳳/瑞鳳)",
	170:"軽空母(龍驤)",
	180:"軽空母(飛鷹/隼鷹)",
	240:"戦艦(金剛/比叡/榛名/霧島)",
	250:"空母(飛龍/蒼龍)",
	260:"戦艦(扶桑/山城)/空母(加賀)",
	270:"戦艦(伊勢/日向)/空母(赤城)",
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
