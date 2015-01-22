// vim: set ts=8 sw=4 sts=4 ff=dos :

Components.utils.import( "resource://kancolletimermodules/httpobserve.jsm" );

function make_x_axis( x ){
    return d3.svg.axis()
	.scale( x )
	.orient( "bottom" )
	.ticks( 5 );
}

function make_y_axis( y ){
    return d3.svg.axis()
	.scale( y )
	.orient( "left" )
	.ticks( 5 );
}

let ResourceGraph = {
    width:  960,
    height: 500,
    zoomRate: 1.1,

    color: {
	"fuel": "#69aa60",
	"bullet": "#ccbf8e",
	"steel": "#6d6d6d",
	"bauxite": "#e6a97a",
	"bucket": "#8888ff"
    },

    openSaveFolder: function(){
	let profdir = GetProfileDir();
	profdir.append( "kancolletimer.dat" );
	let profileDir = profdir.path;

	// Show the profile directory.
	let nsLocalFile = Components.Constructor("@mozilla.org/file/local;1",
						 "nsILocalFile", "initWithPath");
	new nsLocalFile(profileDir).reveal();
    },

    saveToFile: function(){
	let file = OpenFileDialog( "CSVファイルに保存", MODE_SAVE );
	if( !file ) return;

	let os = Cc['@mozilla.org/network/file-output-stream;1'].createInstance( Ci.nsIFileOutputStream );
	let flags = 0x02 | 0x08 | 0x20;// wronly|create|truncate
	os.init( file, flags, 0644, 0 );
	let cos = GetUTF8ConverterOutputStream( os );

	cos.writeString( "時刻,燃料,弾薬,鋼材,ボーキサイト,バケツ\n" );

	let data = KanColleRemainInfo.gResourceData;
	for( let i = 0; i < data.length; i++ ){
	    let d = data[i];
	    d.bucket = d.bucket || 0;
	    let str = d.recorded_time + "," +
		d.fuel + "," +
		d.bullet + "," +
		d.steel + "," +
		d.bauxite + "," +
		d.bucket + "\n";
	    cos.writeString( str );
	}
	cos.close();
    },

    /**
     * スクリーンショット撮影
     * TODO:画面のキャプチャまわりは似通ったコードがあるので整理したい
     * @param path 保存先のパス(指定なしだとファイル保存ダイアログを出す)
     */
    takeScreenshot: function( path ){
	let isjpeg = KanColleTimerConfig.getBool( "screenshot.jpeg" );
	let url = this.takePicture( isjpeg );
	if( !url ){
	    AlertPrompt( "画像データを生成できませんでした。", "艦これタイマー" );
	    return null;
	}

	let file = null;
	if( !path ){
	    let fp = Components.classes['@mozilla.org/filepicker;1']
		.createInstance( Components.interfaces.nsIFilePicker );
	    fp.init( window, "画像の保存", fp.modeSave );
	    fp.appendFilters( fp.filterImages );
	    fp.defaultExtension = isjpeg ? "jpg":"png";
	    if( KanColleTimerConfig.getUnichar( "screenshot.path" ) ){
		fp.displayDirectory = OpenFile( KanColleTimerConfig.getUnichar( "screenshot.path" ) );
	    }

	    let datestr = this.getNowDateString();
	    fp.defaultString = "screenshot-" + datestr + (isjpeg ? ".jpg":".png");
	    if( fp.show() == fp.returnCancel || !fp.file ) return null;

	    file = fp.file;
	}else{
	    let localfileCID = '@mozilla.org/file/local;1';
	    let localfileIID = Components.interfaces.nsILocalFile;
	    file = Components.classes[localfileCID].createInstance( localfileIID );
	    file.initWithPath( path );
	    let datestr = this.getNowDateString();
	    let filename = "screenshot-" + datestr + (isjpeg ? ".jpg":".png");
	    file.append( filename );
	}

	let wbp = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
	    .createInstance( Components.interfaces.nsIWebBrowserPersist );
	wbp.saveURI( url, null, null, null, null, file, null );
	return true;
    },
    getNowDateString: function(){
	let d = new Date();
	let month = d.getMonth() + 1;
	month = month < 10 ? "0" + month:month;
	let date = d.getDate() < 10 ? "0" + d.getDate():d.getDate();
	let hour = d.getHours() < 10 ? "0" + d.getHours():d.getHours();
	let min = d.getMinutes() < 10 ? "0" + d.getMinutes():d.getMinutes();
	let sec = d.getSeconds() < 10 ? "0" + d.getSeconds():d.getSeconds();
	let ms = d.getMilliseconds();
	if( ms < 10 ){
	    ms = "000" + ms;
	}else if( ms < 100 ){
	    ms = "00" + ms;
	}else if( ms < 1000 ){
	    ms = "0" + ms;
	}
	return "" + d.getFullYear() + month + date + hour + min + sec + ms;
    },

    takePicture: function( isjpeg ){
	let canvas = document.getElementById( "KanColleTimerCapture" );
	canvas.style.display = "inline";

	// document.getElementsByTagName('vbox')[0].boxObject
	let x = $( 'box' ).boxObject.x;
	let y = $( 'box' ).boxObject.y;
	let w = parseInt( $( 'graph' ).getAttribute( 'width' ) );
	let h = parseInt( $( 'graph' ).getAttribute( 'height' ) );
	canvas.width = w;
	canvas.height = h;

	let ctx = canvas.getContext( "2d" );
	ctx.clearRect( 0, 0, canvas.width, canvas.height );
	ctx.save();
	ctx.scale( 1.0, 1.0 );
	// x,y,w,h
	ctx.drawWindow( window, x, y, w, h, "rgb(255,255,255)" );
	ctx.restore();

	let pic;
	if( isjpeg ){
	    pic = canvas.toDataURL( "image/jpeg" );
	}else{
	    pic = canvas.toDataURL( "image/png" );
	}
	const IO_SERVICE = Components.classes['@mozilla.org/network/io-service;1']
	    .getService( Components.interfaces.nsIIOService );
	pic = IO_SERVICE.newURI( pic, null, null );

	canvas.style.display = "none";
	canvas.width = 1;
	canvas.height = 1;

	return pic;
    },

    tweet: function(){
	let isjpeg = KanColleTimerConfig.getBool( "screenshot.jpeg" );
	let pic = this.takePicture( isjpeg );
	OpenTweetDialog( true, pic );
    },

    changeColor: function(){
	let color = d3.scale.category10();
	this._flg = !this._flg;

	d3.selectAll( ".line" ).style( "stroke", function( d, i ){
	    return ResourceGraph._flg ? color( d.name ):ResourceGraph.color[ d.name ];
	} );
    },

    createGraph: function(){
	RemoveElement( $( 'graph' ) );

	let data = KanColleRemainInfo.gResourceData;

	let margin = {top: 20, right: 80, bottom: 42, left: 50};
	let width = this.width - margin.left - margin.right;
	let height = this.height - margin.top - margin.bottom;

	// バケツだけ縦軸のスケールが違うので hoge2 として区別する
	let x = d3.time.scale().range( [0, width] );
	let y = d3.scale.linear().range( [height, 0] );
	let y2 = d3.scale.linear().range( [height, 0] );
	let xAxis = d3.svg.axis().scale( x ).orient( "bottom" ).tickFormat( d3.time.format( "%m/%d %H:%M" ) );
	let yAxis = d3.svg.axis().scale( y ).orient( "left" );
	let yAxis2 = d3.svg.axis().scale( y2 ).orient( "left" );

	let line = d3.svg.line().interpolate( "step-after" )
	    .x( function( d ){
		return x( d.date );
	    } )
	    .y( function( d ){
		return y( d.value );
	    } );
	let line2 = d3.svg.line().interpolate( "step-after" )
	    .x( function( d ){
		    return x( d.date );
		} )
	    .y( function( d ){
		    d.value = d.value || 0;
		    return y2( d.value );
		} );

	let w = width + margin.left + margin.right;
	let h = height + margin.top + margin.bottom;
	let svg = d3.select( "vbox" ).append( "svg" ).attr( "id", "graph" )
	    .attr( "width", w )
	    .attr( "height", h )
	    .attr( "viewBox", "0 0 " + w + " " + h )
	    .append( "g" )
	    .attr( "transform", "translate(" + margin.left + "," + margin.top + ")" );

	let keys = d3.keys( data[ data.length-1 ] ).filter( function( k ){
	    let ids = ["fuel", "bullet", "steel", "bauxite", "bucket" ];
	    for( let i = 0; i < ids.length; i++ ){
		if( !$( ids[i] ).checked && k == ids[i] ){
		    return false;
		}
	    }
	    return k !== "recorded_time" && k !== "date";
	} );

	data.forEach( function( d ){
	    d.date = new Date( d.recorded_time * 1000 );
	} );

	let resources = keys.map( function( k ){
	    return {
		name:   k,
		values: data.map( function( d ){
		    return {date: d.date, value: +d[k]};
		} )
	    };
	} );

	x.domain( d3.extent( data, function( d ){
	    return d.date;
	} ) );
	// バケツを無視して資源の最大、最小値を得る
	let min = d3.min( resources, function( r ){
	    if( r.name == "bucket" ) return Number.MAX_VALUE;

	    return d3.min( r.values, function( v ){
		return v.value;
	    } );
	} );
	let max = d3.max( resources, function( r ){
	    if( r.name == "bucket" ) return 0;
	    return d3.max( r.values, function( v ){
		return v.value;
	    } );
	} );
	min = d3.max( [min - 1000, 0] );
	max = max + 500;
	if( max > 300000 ){
	    max = 300000;
	}
	y.domain( [ min, max ] );

	min = d3.min( resources, function( r ){
	    if( r.name != "bucket" ) return Number.MAX_VALUE;

	    return d3.min( r.values, function( v ){
		return v.value;
	    } );
	} );
	max = d3.max( resources, function( r ){
	    if( r.name != "bucket" ) return 0;
	    return d3.max( r.values, function( v ){
		return v.value;
	    } );
	} );
	min = d3.max( [min - 50, 0] );
	max = d3.min( [3000, max + 50] );
	if( max > 3000 ){
	    max = 3000;
	}
	y2.domain( [min, max] );

	// 日付軸
	svg.append( "g" )
	    .attr( "class", "x axis" )
	    .attr( "transform", "translate(0," + height + ")" )
	    .call( xAxis )
	    .selectAll( "text" )
	    .attr( "transform", "rotate(0)" )
	    .attr( "transform", function( d, i ){
		       // ひとつごとに位置をずらす
		       return "translate(0," + 12 * (i % 2) + ")";
		   } )
	    .style( "text-anchor", "center" );

	svg.append( "g" )
	    .attr( "class", "y axis" )
	    .call( yAxis )
	    .append( "text" )
	    .attr( "transform", "rotate(-90)" )
	    .attr( "y", 6 )
	    .attr( "dy", ".71em" )
	    .style( "text-anchor", "end" )
	    .text( "資源量" );

	// バケツ軸 右側に表示
	svg.append( "g" )
	    .attr( "class", "y axis" )
	    .attr( "transform", "translate(" + width + ",0)" )
	    .call( yAxis2 );

	svg.append( "g" )
	    .attr( "class", "grid" )
	    .attr( "transform", "translate(0," + height + ")" )
	    .call( make_x_axis( x )
		.tickSize( -height, 0, 0 )
		.tickFormat( "" )
	    );

	svg.append( "g" )
	    .attr( "class", "grid" )
	    .call( make_y_axis( y )
		.tickSize( -width, 0, 0 )
		.tickFormat( "" )
	    );

	// 折れ線グラフの作成
	let resource = svg.selectAll( ".resource" )
	    .data( resources )
	    .enter().append( "g" )
	    .attr( "class", "resource" );

	resource.append( "path" )
	    .attr( "class", "line" )
	    .attr( "d", function( d ){
		       if( d.name == "bucket" ){
			   return line2( d.values );
		       }
		       return line( d.values );
		   } )
	    .style( "stroke", function( d ){
			return ResourceGraph.color[d.name];
		    } );

	// 現在値の位置にラベルを表示
	let resource_name = {
	    "fuel": "燃料",
	    "bullet": "弾薬",
	    "steel": "鋼材",
	    "bauxite": "ボーキサイト",
	    "bucket" : "バケツ"
	};

	// ラベルの表示位置を事前計算
	let ypos = new Array();
	for( let i = 0; i < resources.length; i++ ){
	    let t = new Object();
	    t.name = resources[i].name;
	    let v = resources[i].values[resources[i].values.length - 1].value;
	    if( resources[i].name == "bucket" ){
		t.value = y2( v )
	    }else{
		t.value = y( v );
	    }
	    ypos.push( t );
	}
	// 上から順に並べ替え
	ypos.sort( function( a, b ){
	    return a.value - b.value;
	} );

	ypos[ ypos[0].name ] = ypos[0].value;
	// 重ならないように位置をずらす
	for( let i = 1; i < ypos.length; i++ ){
	    let y1 = ypos[i - 1].value;
	    let y2 = ypos[i].value;
	    // 文字サイズが12px指定になっているので即値で12を使用
	    if( y2 <= y1 + 12 ){
		ypos[i].value = y1 + 12;
	    }
	    ypos[ ypos[i].name ] = ypos[i].value;
	}

	resource.append( "text" )
	    .datum( function( d ){
			return {name: d.name, value: d.values[d.values.length - 1]};
		    } )
	    .attr( "transform",
		   function( d ){
		       let y_tmp = ypos[d.name];
		       return "translate(" + x( d.value.date ) + "," + y_tmp + ")";
		   } )
	    .attr( "x", 3 )
	    .attr( "dy", ".35em" )
	    .text( function( d ){
		       return resource_name[d.name];
		   } );
    },

    zoom: function( zoomType ){
	// MSDNのサンプルから
	let theSvgElement = $( 'graph' );
	let viewBox = theSvgElement.getAttribute( 'viewBox' );	// Grab the object representing the SVG element's viewBox attribute.
	let viewBoxValues = viewBox.split( ' ' );				// Create an array and insert each individual view box attribute value (assume they're seperated by a single whitespace character).

	viewBoxValues[2] = parseFloat( viewBoxValues[2] );		// Convert string "numeric" values to actual numeric values.
	viewBoxValues[3] = parseFloat( viewBoxValues[3] );

	if( zoomType == 'zoomIn' ){
	    viewBoxValues[2] /= this.zoomRate;	// Decrease the width and height attributes of the viewBox attribute to zoom in.
	    viewBoxValues[3] /= this.zoomRate;
	}
	else if( zoomType == 'zoomOut' ){
	    viewBoxValues[2] *= this.zoomRate;	// Increase the width and height attributes of the viewBox attribute to zoom out.
	    viewBoxValues[3] *= this.zoomRate;
	}
	else{
	    alert( "function zoom(zoomType) given invalid zoomType parameter." );
	}

	theSvgElement.setAttribute( 'viewBox', viewBoxValues.join( ' ' ) );	// Convert the viewBoxValues array into a string with a white space character between the given values.
    },

    zoomViaMouseWheel: function( mouseWheelEvent ){
	if( mouseWheelEvent.deltaY < 0 ){
	    this.zoom( 'zoomIn' );
	}else{
	    this.zoom( 'zoomOut' );
	}
	/* When the mouse is over the webpage, don't let the mouse wheel scroll the entire webpage: */
	mouseWheelEvent.cancelBubble = true;
	return false;
    },

    mouseDown: function( e ){
	this._down = true;
	this._x = e.layerX;
	this._y = e.layerY;
    },
    mouseMove: function( e ){
	if( this._down ){
	    let theSvgElement = $( 'graph' );
	    let viewBox = theSvgElement.getAttribute( 'viewBox' );
	    let viewBoxValues = viewBox.split( ' ' );

	    viewBoxValues[0] = parseFloat( viewBoxValues[0] );
	    viewBoxValues[1] = parseFloat( viewBoxValues[1] );

	    let dx = this._x - e.layerX;
	    let dy = this._y - e.layerY;

	    dx *= parseFloat(viewBoxValues[2]) / this.width;
	    dy *= parseFloat(viewBoxValues[3]) / this.height;

	    viewBoxValues[0] += dx;
	    viewBoxValues[1] += dy;

	    this._x = e.layerX;
	    this._y = e.layerY;

	    theSvgElement.setAttribute( 'viewBox', viewBoxValues.join( ' ' ) );
	}
    },
    mouseUp: function( e ){
	this._down = false;
    },

    init: function(){
	document.title += " " + new Date();
	this.createGraph();
    }

};


window.addEventListener( "load", function( e ){
    ResourceGraph.init();
    //WindowOnTop( window, $('window-stay-on-top').hasAttribute('checked') );
}, false );

window.addEventListener( 'wheel', function( e ){
    ResourceGraph.zoomViaMouseWheel(e);
}, false );

window.addEventListener( 'mousedown', function( e ){
    ResourceGraph.mouseDown( e );
}, false );
window.addEventListener( 'mousemove', function( e ){
    ResourceGraph.mouseMove( e );
}, false );
window.addEventListener( 'mouseup', function( e ){
    ResourceGraph.mouseUp( e );
}, false );

