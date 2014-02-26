var logging = false;

function initialize(){
	try{
		var value = window.localStorage.getItem("aliasTabs");
		if(value == null){
			window.localStorage.setItem("aliasTabs","");
			return false;
		}
		else return value;
	}catch(e){}
}

function log(txt) {
    if(logging) {
      console.log(txt);
    }
}  
/*function obj(){
	this.length = 0;
	this.allTrue = false;
	this.numberOfTrueValues = 0;
	var arr = initialize();
	this.aliases  = {};
	if(arr)
		arr = arr.split(' ');
	for(var i = 0; i<arr.length;i += 2){
		this.aliases[arr[i]] = arr[i+1];
		this.length++;
	}
}*/

function parseJsonObject(json){
	var mappings = [];
	if(json !== undefined && json !== '' && json !== null)
	{
		try{
			if(typeof(json) === "object"){
				mappings = makeMappings(json);
			}
			else if(typeof(json === "string")){
				mappings = makeMappings(JSON.parse(json));
			}
		}
		catch(e){
			var arr = json.split(" "), 
				index = 0;
			for(;index < arr.length; index += 2)
			{
				mappings[arr[index]] = arr[index+1]; 
			}
		}
		return mappings;
	}
}

function makeMappings(json){
	var mappings = [];
	for(var key in json.Aliases){
		mappings[json.Aliases[key].alias] = json.Aliases[key].link;
	}
	return mappings;
}

function obj(){
	this.length = 0;
	this.aliases = parseJsonObject(initialize());
	return this;
}

var o = new obj();
function saveAliasAndLinks(value){
	try{
		window.localStorage.setItem('aliasTabs',value);
		o = new obj();
	}
	catch(e){
		log(e);
	}
}
chrome.omnibox.onInputEntered.addListener(function (text) {
	chrome.windows.getCurrent(function(window){
		chrome.tabs.getSelected(window.id,function(tab){
			var tabUrl = text;
			var wordAfterUrl = '';
			if(tabUrl.split(' ').length > 1){
				var temp = tabUrl.split(' ');
				wordAfterUrl = tabUrl.substring(tabUrl.indexOf(' ')  + 1, tabUrl.length);
				tabUrl = temp[0] + '+';
			}
			
			if(o.aliases.hasOwnProperty(tabUrl))
			{
				var newUrl = o.aliases[tabUrl] + wordAfterUrl;
				var regex = /https?:\/\//;
				if(!regex.test(newUrl))
				{
					newUrl = "http://" + newUrl;
				}
				chrome.tabs.update(tab.id, {url: newUrl});
			}
		});
	});
});
chrome.tabs.onUpdated.addListener(function(id, changeInfo, tab){
	var tabUrl = tab.url.replace(/http:[^<]+&[q|p]=/,"");
	var wordAfterUrl = "";
	if(tabUrl.split('+').length > 1){
		var temp = tabUrl.split('+');
		wordAfterUrl = tabUrl.substring(tabUrl.indexOf('+')  + 1, tabUrl.length);
		tabUrl = temp[0] + '+';
	}
	if(o.aliases.hasOwnProperty(tabUrl))
	{
		var newUrl = o.aliases[tabUrl] + wordAfterUrl;
		var regex = /https?:\/\//;
		if(!regex.test(newUrl))
		{
			newUrl = "http://" + newUrl;
		}
		chrome.tabs.update(id, {url: newUrl});
	}
});

