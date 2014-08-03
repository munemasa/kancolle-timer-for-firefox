var AndroidGCM = {

    _notify_url: "http://kancolletimer-gae.appspot.com/gcm/notify",

    sync: function(){
	let url = "";
	let req = CreateXHR( "POST", this._notify_url );
	if( !req ) return;

	let k1 = KanColleTimerConfig.getUnichar( 'key1' ) || "";
	let k2 = KanColleTimerConfig.getUnichar( 'key2' ) || "";

	if( !k1 || !k2 ){
	    debugprint( "nothing to sync" );
	}

	let expedition = document.getElementsByClassName( "fleetremain" );
	let repair = document.getElementsByClassName( "ndockremain" );

	let tmp = new Array();
	for( let i = 1; i < expedition.length; i++ ){
	    let v = isNaN( expedition[i].finishTime ) ? 0 : expedition[i].finishTime;
	    v = parseInt( v/1000 );
	    tmp.push( v );
	}
	for( let i = 0; i < repair.length; i++ ){
	    let v = isNaN( repair[i].finishTime ) ? 0 : repair[i].finishTime;
	    v = parseInt( v/1000 );
	    tmp.push( v );
	}

	let timer = tmp.join( "," );
	let str = new Array();
	str.push( "key1=" + k1 );
	str.push( "key2=" + k2 );
	str.push( "timer=" + timer );

	req.onreadystatechange = function(){
	    if( req.readyState == 4 && req.status == 200 ){
	    }
	};
	req.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded' );
	req.send( str.join( '&' ) );
    }

};
