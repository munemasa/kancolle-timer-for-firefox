// vim: set ts=8 sw=4 sts=4 ff=dos :

var Storage = {
    dirname: "kancolletimer.dat",

    /**
     * ファイルに書き込む
     * @param k ファイル名(key)
     * @param v オブジェクト(value)
     */
    writeObject: function( k, v ){
	let stringify = JSON.stringify(v);

	let f = this.getSaveDir();
	f.append( k );

	let os = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
	let flags = 0x02|0x08|0x20;// wronly|create|truncate
	os.init(f,flags,0664,0);
	let cos = GetUTF8ConverterOutputStream(os);
	cos.writeString( stringify );
	cos.close();
    },

    /**
     * ファイルから読み込む
     * @param k ファイル名(key)
     * @param defvalue デフォルト値
     */
    readObject: function( k, defvalue ){
	let f = this.getSaveDir();
	f.append( k );

	try{
	    let istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
	    istream.init(f, 0x01, 0444, 0);
	    istream.QueryInterface(Components.interfaces.nsILineInputStream);
	    let cis = GetUTF8ConverterInputStream(istream);
	    // 行を配列に読み込む
	    let line = {}, hasmore;
	    let str = "";
	    do {
		hasmore = cis.readString(1024,line);
		str += line.value;
	    } while(hasmore);
	    cis.close();

	    let obj = JSON.parse(str);
	    return obj;
	} catch (x) {
	    return defvalue;
	}
    },

    /**
     * プロフィールのディレクトリを返す.
     * @return プロフィールディレクトリへのnsIFileを返す
     */
    getProfileDir: function(){
	return GetProfileDir();
    },

    /**
     * データの保存先を返す
     * @return データ保存先をnsIFileで返す
     */
    getDefaultSaveDir: function(){
	let profdir = this.getProfileDir();
	profdir.append( this.dirname );
	return profdir;
    },

    getSaveDir: function(){
	return this.getDefaultSaveDir();
    },

    /**
     * データ保存ディレクトリを作成する.
     */
    createSaveDir: function(){
	let profdir = this.getSaveDir();
	CreateFolder( profdir.path );
    },

    init: function(){
	this.createSaveDir();
    }
};

Storage.init();
