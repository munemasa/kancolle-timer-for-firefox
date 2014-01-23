// vim: set ts=8 sw=4 sts=4 ff=dos :

Components.utils.import("resource://kancolletimermodules/httpobserve.jsm");

function make_x_axis(x) {        
    return d3.svg.axis()
	.scale(x)
	.orient("bottom")
	.ticks(5);
}

function make_y_axis(y) {        
    return d3.svg.axis()
	.scale(y)
	.orient("left")
	.ticks(5);
}

var ResourceGraph = {
    width: 960,
    height: 500,

    /**
     * スクリーンショット撮影
     * TODO:画面のキャプチャまわりは似通ったコードがあるので整理したい
     * @param path 保存先のパス(指定なしだとファイル保存ダイアログを出す)
     */
    takeScreenshot: function(path){
	let isjpeg = KanColleTimerConfig.getBool("screenshot.jpeg");
	var url = this.takePicture( isjpeg );
	if( !url ){
	    AlertPrompt("画像データを生成できませんでした。","艦これタイマー");
	    return null;
	}

	var file = null;
	if( !path ){
	    var fp = Components.classes['@mozilla.org/filepicker;1']
		.createInstance(Components.interfaces.nsIFilePicker);
	    fp.init(window, "画像の保存", fp.modeSave);
	    fp.appendFilters(fp.filterImages);
	    fp.defaultExtension = isjpeg?"jpg":"png";
	    if( KanColleTimerConfig.getUnichar("screenshot.path") ){
		fp.displayDirectory = OpenFile(KanColleTimerConfig.getUnichar("screenshot.path"));
	    }

	    var datestr = this.getNowDateString();
	    fp.defaultString = "screenshot-"+ datestr + (isjpeg?".jpg":".png");
	    if ( fp.show() == fp.returnCancel || !fp.file ) return null;
	    
	    file = fp.file;
	}else{
	    let localfileCID = '@mozilla.org/file/local;1';
	    let localfileIID =Components.interfaces.nsILocalFile;
	    file = Components.classes[localfileCID].createInstance(localfileIID);
	    file.initWithPath(path);
	    var datestr = this.getNowDateString();
	    var filename = "screenshot-"+ datestr + (isjpeg?".jpg":".png");
	    file.append(filename);
	}
	
	var wbp = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
            .createInstance(Components.interfaces.nsIWebBrowserPersist);
	wbp.saveURI(url, null, null, null, null, file, null);
	return true;
    },
    getNowDateString: function(){
	var d = new Date();
	var month = d.getMonth()+1;
	month = month<10 ? "0"+month : month;
	var date = d.getDate()<10 ? "0"+d.getDate() : d.getDate();
	var hour = d.getHours()<10 ? "0"+d.getHours() : d.getHours();
	var min = d.getMinutes()<10 ? "0"+d.getMinutes() : d.getMinutes();
	var sec = d.getSeconds()<10 ? "0"+d.getSeconds() : d.getSeconds();
	var ms = d.getMilliseconds();
	if( ms<10 ){
	    ms = "000" + ms;
	}else if( ms<100 ){
	    ms = "00" + ms;
	}else if( ms<1000 ){
	    ms = "0" + ms;
	}
	return "" + d.getFullYear() + month + date + hour + min + sec + ms;
    },

    takePicture: function( isjpeg ){
	let canvas = document.getElementById("KanColleTimerCapture");
	canvas.style.display = "inline";

	// document.getElementsByTagName('vbox')[0].boxObject
	let x = $('box').boxObject.x;
	let y = $('box').boxObject.y;
	let w = parseInt( $('graph').getAttribute('width') );
	let h = parseInt( $('graph').getAttribute('height') );
	canvas.width = w;
	canvas.height = h;

	let ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.save();
	ctx.scale(1.0, 1.0);
	// x,y,w,h
	ctx.drawWindow(window, x, y, w, h, "rgb(255,255,255)");
	ctx.restore();

	let pic;
	if( isjpeg ){
	    pic = canvas.toDataURL("image/jpeg");
	}else{
	    pic = canvas.toDataURL("image/png");
	}
	const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
           .getService(Components.interfaces.nsIIOService);
	pic = IO_SERVICE.newURI(pic, null, null);

	canvas.style.display = "none";
	canvas.width = 1;
	canvas.height = 1;

	return pic;
    },

    tweet: function(){
	let pic = this.takePicture( true );
	OpenTweetDialog( true, pic );
    },

    createGraph: function(){
	var data = KanColleRemainInfo.gResourceData;
	var margin = {top: 20, right: 80, bottom: 30, left: 50};
	var width = this.width - margin.left - margin.right;
	var height = this.height - margin.top - margin.bottom;

	var x = d3.time.scale().range([0, width]);
	var y = d3.scale.linear().range([height, 0]);
	var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(d3.time.format("%m/%d %H:%M"));
	var yAxis = d3.svg.axis().scale(y).orient("left");

	var line = d3.svg.line().interpolate("step-after")
	 .x(function(d) { return x(d.date); })
	 .y(function(d) { return y(d.value); });

	var svg = d3.select("vbox").append("svg").attr("id","graph")
	 .attr("width", width + margin.left + margin.right)
	 .attr("height", height + margin.top + margin.bottom)
	 .append("g")
	 .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var keys = d3.keys( data[0] ).filter( function(k){ return k!=="recorded_time" && k!=="date"; } );

	data.forEach(function(d) {
	    d.date = new Date(d.recorded_time*1000);
	});

	var resources = keys.map( function(k){
	    return {
		name: k,
		values: data.map( function(d){
		    return {date: d.date, value: +d[k]};
		} )
	    };
	});

	x.domain( d3.extent(data, function(d){ return d.date; } ));
	var min = d3.min(resources, function(r) { return d3.min(r.values, function(v) { return v.value; }); });
	var max = d3.max(resources, function(r) { return d3.max(r.values, function(v) { return v.value; }); });
	min = d3.max( [min-500, 0] );
	max = max + 500;
	y.domain( [ min, max ] );

	svg.append("g")
	    .attr("class", "x axis")
	    .attr("transform", "translate(0," + height + ")")
	    .call(xAxis);

	svg.append("g")
	    .attr("class", "y axis")
	    .call(yAxis)
	    .append("text")
	    .attr("transform", "rotate(-90)")
	    .attr("y", 6)
	    .attr("dy", ".71em")
	    .style("text-anchor", "end")
	    .text("資源量");

	svg.append("g")         
            .attr("class", "grid")
            .attr("transform", "translate(0," + height + ")")
            .call(make_x_axis(x)
		  .tickSize(-height, 0, 0)
		  .tickFormat("")
		 );

	svg.append("g")         
            .attr("class", "grid")
            .call(make_y_axis(y)
		  .tickSize(-width, 0, 0)
		  .tickFormat("")
		 );

	var resource = svg.selectAll(".resource")
	 .data(resources)
	 .enter().append("g")
	 .attr("class", "resource");

	var color = {
	    "fuel": "#69aa60",
	    "bullet": "#ccbf8e",
	    "steel": "#6d6d6d",
	    "bauxite": "#e6a97a"
	};
	resource.append("path")
	    .attr("class", "line")
	    .attr("d", function(d) { return line(d.values); })
	    .style("stroke", function(d) { return color[d.name]; });

	var resource_name = {
	    "fuel": "燃料",
	    "bullet": "弾薬",
	    "steel": "鋼材",
	    "bauxite": "ボーキサイト"
	};
	resource.append("text")
	    .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
	    .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.value) + ")"; })
	    .attr("x", 3)
	    .attr("dy", ".35em")
	    .text(function(d) { return resource_name[d.name]; });
    },

    init: function(){
	document.title += " "+ new Date();
	this.createGraph();
    }

};


window.addEventListener("load", function(e){
    ResourceGraph.init();
    //WindowOnTop( window, $('window-stay-on-top').hasAttribute('checked') );
}, false);
