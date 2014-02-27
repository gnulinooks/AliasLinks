var length = 0;
var deletedItems = {};

function obj( items){
	this.arr = items.split(" ");
	this.aliasLinkList = {};
	this.length = 0;
	for(var i = 0;i<this.arr.length;i += 2){
		this.aliasLinkList[this.arr[i]] = this.arr[i+1];
		this.length++;
	}
}
/*
	 takes the json string and parse it and makes object;
*/
function createAliasesJSONObject(json){
	if(json !== undefined && json !== "")
	{
		try{
			if(typeof(json) === "object"){
				return json;
			}
			else{
				return JSON.parse(json);
			}
		}
		catch(e){ //handling the string case if alias is stored as string.
			var arr = json.split(" "), 
				index = 0,
				id = 1,
				maxId = 1,
				length = 0,
				generalInfo = {},
				aliases = {};
			for(;index < arr.length; index += 2)
			{
				aliases[arr[index]] = makeObject(arr[index], arr[index+1], id);
				id++;
				length++;
			}
			json = {GeneralInfo: {currentMaxId: id, currentLength: length}, Aliases: aliases};
			
			return json;
		}
	}
}

function makeObject(alias, link, id){
	return {id: id, alias: alias, link: link, createdOn: '', updatedOn: ''};
}

/*
 Populates the html popup of Alias Links with saved aliases
 */
function populate(){
	bindButtonClickEvents();
	//var window = 
	chrome.runtime.getBackgroundPage(function(window){
		var aliasLinks = window.window.localStorage.getItem("aliasTabs"),
		aliases = {},
		currentMaxId = 1,
		currentLenght = 0,
		sortedAliases = [],
		currentAlias = {};
		
		if(aliasLinks !== undefined && aliasLinks !== "" && aliasLinks !== null)
		{
			//alert(JSON.stringify(aliasLinks));
			aliases = createAliasesJSONObject(aliasLinks),
			currentMaxId = aliases.GeneralInfo.currentMaxId,
			currentLength = parseInt(aliases.GeneralInfo.currentLength, 10),
			sortedAliases = sortAliasesByName(aliases);
			
			for(var key = 0; key < sortedAliases.length; key++){
				currentAlias = aliases.Aliases[sortedAliases[key]];
				addRow(currentAlias.id, currentAlias.alias, currentAlias.link, currentAlias.createdOn, currentAlias.updatedOn, false);
			}
			
			if(currentLength >= 5 ){
				$("#dataList").addClass("scrollbar");
			}
			if(aliases.Deleted != null || aliases.Deleted != undefined){
				deletedItems = aliases.Deleted;
			}
		}
		
		chrome.tabs.getSelected(null, function(tab) {
			addRow(currentMaxId, '', tab.url, '', '', true);
		});
	});
}

function sortAliasesByName(aliases){
	var aliasArray = [];
	$.each(aliases.Aliases, function(){
		aliasArray.push(this.alias);
	})
	return aliasArray.sort();
}

function addRow(id, alias, link, createdOn, updatedOn, front){
	if(isEmptyOrNull(createdOn)){
		createdOn = (new Date()).toUTCString();
		updatedOn = createdOn;
	}
	var $parentDiv = $("<div class='clear' />")
						.attr({"id":id, createdOn: createdOn, updatedOn: updatedOn}),
		$leftDiv = $("<div class='floatleft' style='width:83px'/>"),
		$rightDiv = $("<div class='aliasLinkP' />"),
		$aliasSpan = $("<span class='aliasNameP' />")
						.attr("title", alias)
						.text(alias),
		$linkSpan = $("<span class='urlSpan' />")
						.attr("title", link)
						.text(link);
		$leftDiv.append($aliasSpan);
		$rightDiv.append($linkSpan);
		$parentDiv.append($leftDiv)
				  .append($rightDiv)
				  .append($('<div><img src="edit.png" class="edit" title="edit"/> <img src="trash.gif" class="trash" title="delete"/></div>'));
			
	if(!front){
		$("#dataList").append($parentDiv);
	}
	else{
		$("#dataList").prepend($parentDiv);
		editItem($parentDiv.find(".edit"));
	}
}

function saveItems(){
	var $aliases = $("#dataList>div"),
		json = {},
		dataList = {},
		generalInfo = {},
		maxId = 0,
		length = 0,
		isError = false;
		
	$.each($aliases, function(){
		var id = $(this).attr("id"),
			alias = $(this).find(".aliasNameP").text(),
			link = $(this).find(".urlSpan").text(),
			createdOn = $(this).attr("createdOn");
			updatedOn = $(this).attr("updatedOn");
		if($(this).find(".aliasNameP").hasClass("hidden")){
			alias = $(this).find(".aliasNameInput").val();
			link = $(this).find(".aliasLinkInput").val();
			$(this).find(".urlSpan").text(link);
			$(this).find(".aliasNameP").text(alias);
		}
		if(alias !== undefined && alias !== "" &&
			 link !== undefined && link !== "")
		{
			if(deletedItems.hasOwnProperty(alias)){
				delete deletedItems[alias];
			}
			dataList[alias] = { id: id, alias: alias, link: link, createdOn: createdOn, updatedOn: updatedOn };
			if (maxId < parseInt(id, 10)){
				maxId = parseInt(id, 10);
			}
			length++;
		}
		else if(isEmptyOrNull(alias) && !isEmptyOrNull(link)){
			$(this).find(".floatLeft").css("border", "1px solid red");
			isError = true;
		}
		else if(!isEmptyOrNull(alias) && isEmptyOrNull(link)){
			$(this).find(".aliasLinkP").css("border", "1px solid red");
			isError = true;
		}
		else{
			$(this).addClass("hidden");
		}
	});
	if(maxId <= 0 || length <= 0){
		return ;
	}
	
	if(isError){
		deliverMessage("Please give proper value to the input fields.", "red");
		return;
	}
	
	generalInfo = {currentMaxId: maxId + 1, currentLength: length};
	json = {GeneralInfo: generalInfo, Aliases: dataList, Deleted: deletedItems};
	
	try{
		chrome.extension.getBackgroundPage().saveAliasAndLinks(JSON.stringify(json));
	}
	catch(err){
		deliverMessage("There is some error in your local chrome storage.", "red");
		return;
	}
	alert(JSON.stringify(json));
	$("#dataList input").addClass("hidden");
	$("#dataList span").removeClass("hidden");
	$("#dataList div").css("border", "none");
	
	deliverMessage("Your alias has been saved.", "black");
}

function deliverMessage(message, color){
	$("#savedMessage").css({"color":color, "display": "block"})
		.text(message);
}

function isEmptyOrNull(str){
	if(str === undefined || str === "" || str === null){
		return true;
	}
	else{
		return false;
	}
}

function bindButtonClickEvents(){
	$("#menu").find("button")
		.click(function(){
			$("#menu").find("button").removeClass("selected");
			$(".content").addClass("hidden");
			$("#" + $(this).attr("class")).removeClass("hidden");
			$(this).addClass("selected");
	});
}

function fillImportContent(json){
	saveItems(); //remove this after couple of months of publishing this version and call fillImportContent from populate
	//passing aliasLinks as parameter;
	var aliases = chrome.extension.getBackgroundPage().initialize();
	$("#import").find("fieldset").append(aliases);
}

function editItem(e){
	var $parentDiv = $(e).parent().parent(),
	$inputAlias = $("<input />")
					.addClass("aliasNameInput")
					.val($parentDiv.find(".aliasNameP").text()),
	$inputLink = $("<input/>")
					.addClass("aliasLinkInput")
					.val($parentDiv.find(".urlSpan").text());
					
	if($parentDiv.find(".aliasNameP").hasClass("hidden"))
	{
		return;
	}
	$parentDiv.find(".aliasNameP").addClass("hidden");
	$parentDiv.find(".urlSpan").addClass("hidden");
	if($parentDiv.find("input").length > 0){
		$parentDiv.find("input").removeClass("hidden");
		return;
	}
	$parentDiv.find(".floatLeft").append($inputAlias);
	$parentDiv.find(".aliasLinkP").append($inputLink);
	
}

function deleteAlias(item){
	var id = $(item).attr("id"),
		alias = $(item).find(".aliasNameP").text(),
		link = $(item).find(".urlSpan").text(),
		createdOn = $(item).attr("createdOn");
		updatedOn = new Date().toUTCString();
	if(!isEmptyOrNull(alias)){
		deletedItems[alias] = { id: id, alias: alias, link: link, createdOn: createdOn, updatedOn: updatedOn };
	}
	$(item).remove();
}

document.addEventListener('DOMContentLoaded', function () {
  $(".buttonArea").delegate(".saveAlias", "click", saveItems);
  $("#dataList").delegate(".edit","click", function(){	
		editItem(this);
  });
	
  $("#dataList").delegate(".trash", "click", function(){
	if(confirm("Are you sure to delete?")){
		//$(this).parent().parent().remove();
		deleteAlias($(this).parent().parent());
	}
  });

  $("#dataList").delegate("input", "keypress", function(key){
  	if(key.which === 13){
  		saveItems();
  	}
  });

  populate();
});

