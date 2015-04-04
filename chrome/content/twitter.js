/*
 Copyright (c) 2009 amano <amano@miku39.jp>

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

var Twitter = {
    consumer: "xdPBjJ6WAF8YccCD7mAXQ",
    consumerSecret: "0KQ1WuRvniIu7bYp6X0kCzYf0Dhc0Yxsh3tvC1I8Go",

    requestTokenURL: "https://api.twitter.com/oauth/request_token",
    authenticateURL: "https://api.twitter.com/oauth/authenticate", // ?oauth_token=hoge
    accessTokenURL: "https://api.twitter.com/oauth/access_token",
    authorizeURL: "https://api.twitter.com/oauth/authorize",

    updateURL: "https://api.twitter.com/1.1/statuses/update.json",
    updateMediaURL: "https://api.twitter.com/1.1/statuses/update_with_media.json",

    oauth: {},

    getScreenName: function(){
	return KanColleTimerConfig.getUnichar( "twitter.screen_name" );
    },

    getSavedToken: function(){
	// ログインマネージャに保存したトークンとシークレットトークンを読み込む.
	let hostname = "chrome://kancolletimer";
	let myLoginManager = Components.classes["@mozilla.org/login-manager;1"].getService( Components.interfaces.nsILoginManager );
	let logins = myLoginManager.findLogins( {}, hostname, null, 'twitter token' );
	if( logins.length ){
	    debugprint( '# of twitter tokens:' + logins.length );
	    this.oauth = {};
	    this.oauth["oauth_token"] = logins[0].username;
	    this.oauth["oauth_token_secret"] = logins[0].password;
	}else{
	    debugprint( 'No twitter token in LoginManager.' );
	}
    },

    openAuthPage: function( url ){
	OpenDefaultBrowser( url, true );
	let pin = InputPrompt( "Twitterの認証が行われていません。\n認証を行ってPINを入力してください。", "Twitter認証" );
	if( !pin ) return;

	this.getAccessToken( this.consumer, this.consumerSecret, pin );
    },

    getRequestToken: function(){
	this._getRequestToken( this.consumer, this.consumerSecret );
    },

    _getRequestToken: function( consumer, consumerSecret ){
	// Desktop clientで7-digit PINコードを使うときに
	// まずはrequest token URLにアクセスしoauth_tokenを取得して、
	// authorize URLにoauth_tokenをGETパラメタで渡すと、
	// 7-digit PINコードを取得できる.
	let accessor = {
	    consumerSecret: consumerSecret,
	    tokenSecret: ""
	};
	let message = {
	    action: this.requestTokenURL,
	    method: "POST",
	    parameters: []
	};
	message.parameters.push( ["oauth_consumer_key", consumer] );
	message.parameters.push( ["oauth_signature_method", "HMAC-SHA1"] );
	message.parameters.push( ["oauth_timestamp", ""] );
	message.parameters.push( ["oauth_nonce", ""] );
	message.parameters.push( ["oauth_signature", ""] );
	message.parameters.push( ["oauth_callback", "oob"] );
	OAuth.setTimestampAndNonce( message );
	OAuth.SignatureMethod.sign( message, accessor );

	let req = new XMLHttpRequest();
	if( !req ) return;

	req.onreadystatechange = function(){
	    if( req.readyState != 4 ) return;
	    if( req.status == 200 ){
		let values = req.responseText.split( '&' );
		for( let i = 0, item; item = values[i]; i++ ){
		    let val = item.split( '=' );
		    Twitter.oauth[val[0]] = val[1];
		}
		let url = Twitter.authenticateURL + "?oauth_token=" + Twitter.oauth['oauth_token'];
		Twitter.openAuthPage( url );
	    }else{
		setTimeout( function(){
		    Twitter.getRequestToken();
		}, 1000 );
	    }
	    debugprint( 'request token:' + req.responseText );
	};
	let url = this.requestTokenURL;
	req.open( 'POST', url );
	req.setRequestHeader( 'Authorization',
	    OAuth.getAuthorizationHeader( 'http://miku39.jp/', message.parameters ) );
	req.send('');
    },

    // Twitterトークンを全削除.
    removeAllTwitterToken: function(){
	try{
	    let host = "chrome://kancolletimer";
	    let logins = this._login.findLogins( {}, host, null, 'twitter token' );
	    for( let i = 0; i < logins.length; ++i ){
		this._login.removeLogin( logins[i] );
	    }
	}
	catch(e){
	}
    },

    // Twitterトークンをログインマネージャに保存.
    saveTwitterToken: function( oauthobj ){
	this._login = Components.classes["@mozilla.org/login-manager;1"].getService( Components.interfaces.nsILoginManager );

	this.removeAllTwitterToken();

	let as_user = oauthobj["oauth_token"];
	let as_pass = oauthobj["oauth_token_secret"];

	let host = "chrome://kancolletimer";
	let nsLoginInfo = new Components.Constructor( "@mozilla.org/login-manager/loginInfo;1",
						      Components.interfaces.nsILoginInfo,
						      "init" );
	let loginInfo = new nsLoginInfo( host, null, "twitter token", as_user, as_pass, "", "" );
	this._login.addLogin( loginInfo );

	KanColleTimerConfig.setUnichar( "twitter.screen_name", oauthobj["screen_name"] );
    },

    getAccessToken: function( consumer, consumerSecret, pin ){
	// 7-digit PINを使ったアクセストークンの取得.
	let accessor = {
	    consumerSecret: consumerSecret,
	    tokenSecret: ""
	};
	let message = {
	    action: this.accessTokenURL,
	    method: "POST",
	    parameters: []
	};
	message.parameters.push( ["oauth_consumer_key", consumer] );
	message.parameters.push( ["oauth_nonce", ""] );
	message.parameters.push( ["oauth_signature", ""] );
	message.parameters.push( ["oauth_signature_method", "HMAC-SHA1"] );
	message.parameters.push( ["oauth_timestamp", ""] );
	message.parameters.push( ["oauth_token", this.oauth.oauth_token] );
	message.parameters.push( ["oauth_verifier", pin] );
	message.parameters.push( ["oauth_version", "1.0"] );

	OAuth.setTimestampAndNonce( message );
	OAuth.SignatureMethod.sign( message, accessor );

	let req = new XMLHttpRequest();
	if( !req ) return;

	req.onreadystatechange = function(){
	    if( req.readyState != 4 ) return;
	    if( req.status == 200 ){
		let values = req.responseText.split( '&' );
		Twitter.oauth = {};
		for( let i = 0, item; item = values[i]; i++ ){
		    let val = item.split( '=' );
		    Twitter.oauth[val[0]] = val[1];
		}
		Twitter.saveTwitterToken( Twitter.oauth );
		$( 'screen-name' ).value = "@" + Twitter.getScreenName();
	    }else{
		AlertPrompt( "認証に失敗しました。\n再度、認証を行ってみてください。", "Twitter認証" );
	    }
	    debugprint( 'status=' + req.status );
	    debugprint( req.responseText );
	};
	let url = this.accessTokenURL;
	req.open( 'POST', url );
	req.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded' );

	let xauth = new Array();
	let str = new Array();
	xauth = message.parameters;
	for( let i = 0, item; item = xauth[i]; i++ ){
	    str.push( item[0] + "=" + item[1] + "" );
	}
	req.send( str.join( '&' ) );
    },

    /**
     * ステータスを更新する(つぶやく)
     * @param text テキスト(文字数チェックしていない)
     */
    updateStatus: function( text ){
	if( !this.oauth["oauth_token_secret"] || !this.oauth["oauth_token"] ) return;
	let accessor = {
	    consumerSecret: this.consumerSecret,
	    tokenSecret: this.oauth["oauth_token_secret"]
	};
	let message = {
	    action: this.updateURL,
	    method: "POST",
	    parameters: []
	};
	message.parameters.push( ["oauth_consumer_key", this.consumer] );
	message.parameters.push( ["oauth_nonce", ""] );
	message.parameters.push( ["oauth_token", this.oauth["oauth_token"]] );
	message.parameters.push( ["oauth_signature", ""] );
	message.parameters.push( ["oauth_signature_method", "HMAC-SHA1"] );
	message.parameters.push( ["oauth_timestamp", ""] );
	message.parameters.push( ["oauth_version", "1.0"] );
	message.parameters.push( ["status", text] );

	OAuth.setTimestampAndNonce( message );
	OAuth.SignatureMethod.sign( message, accessor );

	let req = new XMLHttpRequest();
	if( !req ) return;

	req.onreadystatechange = function(){
	    if( req.readyState != 4 ) return;
	    /*
	     403 {"request":"/1/statuses/update.json","error":"Status is a duplicate."}
	     401 {"request":"/1/statuses/update.json","error":"Could not authenticate you."}
	     */
	    if( req.status != 200 ){
		debugprint( "Status=" + req.status );
		let result = JSON.parse( req.responseText );
		ShowNotice( 'Twitter:' + result.error );
	    }
	    //debugprint('update result:'+req.responseText);
	};
	let url = this.updateURL;
	req.open( 'POST', url );
	req.setRequestHeader( 'Authorization',
			      OAuth.getAuthorizationHeader( 'http://miku39.jp/', message.parameters ) );
	req.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded' );
	req.send( "status=" + encodeURIComponent( text ) );
    },

    /**
     * ステータスを更新する(つぶやく)
     * @param text テキスト(文字数チェックしていない)
     * @param picture 画像データ(nsIFile)
     * @param retry リトライ回数
     */
    updateStatusWithMedia: function( text, picture, retry ){
	if( !this.oauth["oauth_token_secret"] || !this.oauth["oauth_token"] ) return;
	let accessor = {
	    consumerSecret: this.consumerSecret,
	    tokenSecret: this.oauth["oauth_token_secret"]
	};
	let message = {
	    action: this.updateMediaURL,
	    method: "POST",
	    parameters: []
	};
	message.parameters.push( ["oauth_consumer_key", this.consumer] );
	message.parameters.push( ["oauth_nonce", ""] );
	message.parameters.push( ["oauth_token", this.oauth["oauth_token"]] );
	message.parameters.push( ["oauth_signature", ""] );
	message.parameters.push( ["oauth_signature_method", "HMAC-SHA1"] );
	message.parameters.push( ["oauth_timestamp", ""] );
	message.parameters.push( ["oauth_version", "1.0"] );
	//message.parameters.push(["status",text]);
	//message.parameters.push(["media[]",picture]);

	OAuth.setTimestampAndNonce( message );
	OAuth.SignatureMethod.sign( message, accessor );

	let req = new XMLHttpRequest();
	if( !req ) return;

	req.onreadystatechange = function(){
	    if( req.readyState != 4 ) return;
	    /*
	     403 {"request":"/1/statuses/update.json","error":"Status is a duplicate."}
	     401 {"request":"/1/statuses/update.json","error":"Could not authenticate you."}
	     */
	    if( req.status != 200 ){
		debugprint( "Status=" + req.status );
		let result;
		try{
		    result = JSON.parse( req.responseText );
		    debugprint( 'Twitter:' + result.error );
		}catch(e){
		}
		retry = retry || 0;
		if( retry < 5 ){
		    // 5回までリトライ
		    retry++;
		    let delay = 3000 * retry;
		    let str = "つぶやきに失敗しました。" + parseInt( delay / 1000 ) + "秒後にリトライします(" + retry + "/5)";
		    ShowNotice( str );
		    debugprint( "retry...wait " + delay + "ms");
		    setTimeout( function(){
			Twitter.updateStatusWithMedia( text, picture, retry );
		    }, delay );
		}else{
		    AlertPrompt( "スクリーンショットのつぶやきに失敗しました。", "艦これタイマー" );
		    ShowNotice( "送信に失敗しました" );
		}
	    }else{
		// 成功
		window.close();
	    }
	};
	let url = this.updateMediaURL;

	let form = new FormData();
	form.append( "status", text );
	form.append( "media[]", picture );

	req.open( 'POST', url );
	req.setRequestHeader( 'Authorization',
			      OAuth.getAuthorizationHeader( 'http://miku39.jp/', message.parameters ) );
	req.send( form );
    },

    init: function(){
	this.getSavedToken();
    }
};

window.addEventListener( "load", function( e ){
    Twitter.init();
}, false );
