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
    createGraph: function(){
	var data = KanColleRemainInfo.gResourceData;
	var margin = {top: 20, right: 80, bottom: 30, left: 50};
	var width = 960 - margin.left - margin.right;
	var height = 500 - margin.top - margin.bottom;

	var x = d3.time.scale().range([0, width]);
	var y = d3.scale.linear().range([height, 0]);
	var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(d3.time.format("%m/%d %H:%M"));
	var yAxis = d3.svg.axis().scale(y).orient("left");

	var line = d3.svg.line().interpolate("liner")
	 .x(function(d) { return x(d.date); })
	 .y(function(d) { return y(d.value); });

	var svg = d3.select("vbox").append("svg")
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
