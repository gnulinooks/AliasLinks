var logging = false;

function initialize(){
	try{
		var value = window.localStorage.getItem("aliasTabs");
		if(value == null){
			window.localStorage.setItem("aliasTabs","");
			return "";
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
	saveLocalData(value);
	syncData();
}

function saveLocalData(data){
	try{
		window.localStorage.setItem('aliasTabs',data);
		o = new obj();
	}
	catch(e){
		log(e);
	}
}

function syncData(){
	chrome.storage.sync.get("aliasTabs", function (cloudData_aliasTabs) {
		var cloudData = cloudData_aliasTabs.aliasTabs,
			localData = initialize();
		
		if(cloudData === undefined && localData === ""){
			return;
		}
		
		cloudData = validateData(cloudData);
		localData = validateData(localData);
		
		var finalData = compareData(localData, cloudData);
			
		saveLocalAndCloudData(finalData);
	});
}

function validateData(data){
	if(data == null || data == undefined || data === ""){
		return {};
	}
	else if(typeof(data) === "string"){
		return JSON.parse(data);
	}
	return data;
}

function compareData(localData, cloudData){
	localData = defineDeletedIfNotDefined(localData);
	cloudData = defineDeletedIfNotDefined(cloudData);
	if(cloudData && cloudData.GeneralInfo){
		var id = 1,
			currentAlias = {},
			length = 0,
			deletedAliases = {},
			newData = {};
			for(key in localData.Aliases){
				if(key in cloudData.Aliases){
					currentAlias = getUpdatedAlias(localData.Aliases[key], cloudData.Aliases[key]);
				}
				else if(key in cloudData.Deleted){
					if(!shouldAliasGoInDeleted(localData.Aliases[key], cloudData.Deleted[key])){
						currentAlias = localData.Aliases[key];
						delete cloudData.Deleted[key];
					}
					else{
						continue;
					}
				}
				else{
					currentAlias = localData.Aliases[key];
				}
				currentAlias.id = id;
				id++;
				length++;
				
				newData[key] = currentAlias;
			}
			currentAlias = {};
			for(key in cloudData.Aliases){
				if(!(key in newData)){
					if(key in localData.Deleted){
						if(!shouldAliasGoInDeleted(cloudData.Aliases[key], localData.Deleted[key])){
							delete localData.Deleted[key];
						}
						else{
							continue;
						}
					}
					currentAlias = cloudData.Aliases[key];
					currentAlias.id = id;
					id++;
					length++;
					newData[key] = currentAlias;
				}
			}
			
			currentDeleted = localData.Deleted;
			for(key in cloudData.Deleted){
				if(!(key in currentDeleted)){
					currentDeleted[key] = cloudData.Deleted[key];
				}
			}
			var generalInfo = {currentMaxId: id + 1, currentLength: length};
			
			//alert("final data " + JSON.stringify(newData) + " Deleted " + JSON.stringify(currentDeleted));
			
	        return {GeneralInfo: generalInfo, Aliases: newData, Deleted: currentDeleted};
	}
	else{
		return localData;
	}
}

function shouldAliasGoInDeleted(currentAlias, deletedAlias){
	if( (new Date(currentAlias.updatedOn)) < (new Date(deletedAlias.updatedOn)) || deletedAlias.link === currentAlias.link){
		return true;
	}
	else{
		return false;
	}
}

function getUpdatedAlias(localAlias, cloudAlias) {
    if ((new Date(cloudAlias.updatedOn)) === (new Date(localAlias.updatedOn))
        &&  cloudAlias.link === localAlias.link) {
        return cloudAlias;
    }
    else if ( (new Date(cloudAlias.updatedOn)) > (new Date(localAlias.updatedOn))) {
        return cloudAlias;
    }
    else {
        return localAlias;
    }   
}

function defineDeletedIfNotDefined(data){
	if(data == null || data == undefined){
		return {};
	}
	if(data.Deleted == null || data.Deleted == undefined){
		data.Deleted = {};
		return data;
	}
	return data;
}

function saveLocalAndCloudData(finalData){
	saveLocalData(JSON.stringify(finalData));
	
	saveCloudData(finalData);
}

function saveCloudData(data){
	chrome.storage.sync.set({ "aliasTabs": data });
	//alert("stored data" + data);
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
			
			var newUrl;
			
			if(o.aliases && o.aliases.hasOwnProperty(tabUrl))
			{
				newUrl = o.aliases[tabUrl] + wordAfterUrl;
				var relativeUrlRegex = /^\//;
				if(relativeUrlRegex.test(newUrl))
				{
					var domainNameRegex = /(https?:\/\/[^\/]*)/;
					var domainName = tab.url.match(domainNameRegex)[0];
					newUrl = domainName + newUrl;
				}
				else{
					var regex = /https?:\/\//;
					if(!regex.test(newUrl))
					{
						newUrl = "http://" + newUrl;
					}
				}
			}
			else{
				newUrl = "http://google.com/search?q=" + text;
			}
			chrome.tabs.update(tab.id, {url: newUrl});
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
	if(o.aliases && o.aliases.hasOwnProperty(tabUrl))
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

syncData();
