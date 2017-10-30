 /* entry point for the API service. returns a JSON representation of the data requested */
function doGet(request){
  var params = request.parameter;
  if(params == null){ /* give the user a list of all the parameters and their descriptions? 🤔 */
    return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
  }
  
  var scope = params.scope;
  var result;
  
  if(scope == 'weapontalents'){
    result = dispatchWeaponTalents(params);
  } else if(scope == 'playertalents') {
    result = getPlayerTalentsVerbose();
  } else if (scope == 'geartalents'){
    result = getGearTalentsVerbose();
  } else if (scope == 'gearsets'){
    result = getGearsetsVerbose();
  } else if (scope == 'weapons'){
    result = getWeaponsVerbose();
  } else if (scope == 'weaponmods'){
    result = getWeaponModsVerbose();
  } else if (scope == 'exoticgears'){
    result = getExoticGearsVerbose();
  } else { /* not talent scope so tell the caller to fuck off */
    result = {error: 'unknown scope'};
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


/* returns JSON object based on the value of params.format 
if format == list. it returns a simple list of Weapon talent names
if format == verbose, it returns a list of all the weapon talents and their attributes */
function dispatchWeaponTalents(params){
  var result;
  
  if(params.format && params.format == 'verbose'){
      result = getWeaponTalentsVerbose();
  } else if(params.name) {
      var temp = getWeaponTalent(params.name);
      if (!temp) result = {error: 'Talent not found'};
      else result = temp;
  } else {
      result = getWeaponTalents();
  }
  
  return result;
}


function initWeaponTalentsSheet(){
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Weapon Talents'),
      
      WEAPON_TALENTS_NOTATION = '!A6:M60',
      WEAPON_NOTES_NOTATION = '!A63:B80',
      
      privateTalents = function (){
        return sheet.getRange(WEAPON_TALENTS_NOTATION).getValues();
      },
      
      privateNotes = function (){
        var val = sheet.getRange(WEAPON_NOTES_NOTATION).getValues();
        var weaponTalentNotesObject = {};
        val.map(function f(d){
          weaponTalentNotesObject[d[0].replace(/[^\w\s]/gi, '')] = d[1].replace(/[^\w\s]/gi, '');
        });
        
        return weaponTalentNotesObject;
      },
      
      sheetObj = {talents: privateTalents,
                  notes: privateNotes,
                  sheet: sheet};
  return sheetObj;
}


/* this returns a simple list of weapon talents in the gearsheet */
function getWeaponTalents() {
  var weaponTalentsColumn = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Weapon Talents!WeaponTalents').getValues();
  
  var arr = [];
  for(i in weaponTalentsColumn){ /* clean up the array */
    arr.push(weaponTalentsColumn[i].join());
  }
  
  return arr;
}


/* This returns a weapon talent object from the Weapon Talent sheet based on the data in 
   weaponTalent -> Array() and notes -> Object() */
function getWeaponTalentFromRow(weaponTalent, notes){
  /* static values */
  const TALENT_NAME_INDEX = 0;
  const DESCRIPTION_INDEX = 7;
  const CATEGORY_LIST = ["AR", "LMG", "SMG", "MMR", "Shotgun", "Pistol"];
  const ITEM_LEVELS = ["30", "31", "32", "33", "34"];
  const GEAR_SCORE = [163, 182, 204, 229, 256];
  
  var talentObject = new Object();
  var weaponCategories = new Array();
  
  /* get the talent name */
  talentObject.name = weaponTalent[TALENT_NAME_INDEX].replace(/[^\w\s]/gi, '');
  talentObject.description = weaponTalent[DESCRIPTION_INDEX]; // talent description
  
  var categorySlice = weaponTalent.slice(1, 7);
  weaponCategories = CATEGORY_LIST.filter(function resolve(x, m){ /* return only the weapon categories it rolls on */
    return categorySlice[m].indexOf('✓') > -1;
  });
  
  talentObject.rollsOn = weaponCategories;
  talentObject.requirements = new Object();
  var requirementsSlice = weaponTalent.slice(8);
  
  requirementsSlice.map(function f(x, m){
    var reqs = x.split("/"); /* split into individual requirements */
    
    /* 0 -> firearms, 1 -> stamina, 2 -> electronics */
    var reqObj = {"gearscore": GEAR_SCORE[m], firearms: parseInt(reqs[0]), stamina: parseInt(reqs[1]), electronics: parseInt(reqs[2])};
    
    talentObject.requirements[ITEM_LEVELS[m]] = reqObj;
    
    return reqObj;
  });
  
  /* add extra notes to talents that have them */
  if(notes[talentObject.name]){
    talentObject.note = notes[talentObject.name].trim();
  }
  
  return talentObject;
}


/* returns a verbose list of weapon talents including where they roll and requirements for all levels */
function getWeaponTalentsVerbose(){
  var weaponTalentsSheet = initWeaponTalentsSheet();
  var namedItemsTable = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Named Items!NamedItems').getValues();
  
  var namedItemNames = namedItemsTable.map(function f(x){
     return x[1];
  });
  
  var talentList = [];
  var talents = weaponTalentsSheet.talents()
  for(i in talents){
    var talent = getWeaponTalentFromRow(talents[i], weaponTalentsSheet.notes());
    
    if (namedItemNames.indexOf(talent.name) === -1){ /* skip exotic weapon talents */
      talentList.push(talent);
    }    
  }
  
  // Logger.log(JSON.stringify(talentList));
  return talentList;
}


function getWeaponTalent(name){
  const TALENT_TABLE_OFFSET = 5;
  var talents = getWeaponTalents();
  var weaponTalentsSheetObj = initWeaponTalentsSheet();
  
  /* for some reason Array.findIndex() doesn't work here. 
     This is unnecessary and makes me sad */
  var talentsLower = talents.map(function f(x){
    return x.replace(/[^\w\s]/gi, '').toLowerCase(); /* strip all unnecessary characters and convert to lower case */
  });
  
  var talentRowIndex = talentsLower.indexOf(name.toLowerCase());
  
  if (talentRowIndex < 0){ /* talent not found */
    return null;
  }
  var weaponTalentsSheet = weaponTalentsSheetObj.sheet;
  var columnCount = weaponTalentsSheet.getMaxColumns();
    
  var rowData = weaponTalentsSheet.getRange((talentRowIndex + TALENT_TABLE_OFFSET), 1, 1, columnCount).getValues();
  
  //Logger.log(JSON.stringify(weaponTalentsSheetObj.notes()));
  return getWeaponTalentFromRow(rowData[0], weaponTalentsSheetObj.notes());
}


function getPlayerTalentsVerbose(){
  const TALENT_TYPE_INDEX = 0;
  const TALENT_NAME_INDEX = 1;
  const TALENT_DESCRIPTION_INDEX = 2;
  const TALENT_BENEFIT_INDEX = 3;
  
  var playerTalentsTable = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Player Talents!PlayerTalents').getValues();
  var type;
  var playerTalentsList = playerTalentsTable.map(function f(row){
    var talent = {};
    if (row[TALENT_TYPE_INDEX]){ /* to accommodate the column that spans multiple rows */
      type = row[TALENT_TYPE_INDEX];
    };
    
    talent.type = type;    
    talent.name = row[TALENT_NAME_INDEX];
    talent.description = row[TALENT_DESCRIPTION_INDEX];
    talent.benefit = row[TALENT_BENEFIT_INDEX];
    
    return talent;
  });
  
  return playerTalentsList;
}


function getGearTalentsVerbose(){
  const TALENT_SLOT_INDEX = 0;
  const TALENT_NAME_INDEX = 1;
  const TALENT_DESCRIPTION_INDEX = 2;
  
  var gearTalentsTable = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Gear Talents!GearTalents').getValues();
  var slot;
  
  var gearTalentList = gearTalentsTable.map(function f(row){
    if (row[TALENT_SLOT_INDEX]){
      slot = row[TALENT_SLOT_INDEX];
    }
    
    var talent = {slot: slot, name: row[TALENT_NAME_INDEX], description: row[TALENT_DESCRIPTION_INDEX]};
    
    return talent;
  });
  
  return gearTalentList;
}


function getGearsetsVerbose(){
  const PATCH_INDEX = 0;
  const SET_NAME_INDEX = 1;
  const TWO_PIECE_INDEX = 2;
  const THREE_PIECE_INDEX = 3;
  const FOUR_PIECE_INDEX = 4;
  const FIVE_PIECE_INDEX = 6;
  const SIX_PIECE_INDEX = 7;
  
  var gearsetsTable = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Gearset Bonuses!GearSets').getValues();
  var patch;
  
  var gearsetList = gearsetsTable.map(function f(row){
     if (row[PATCH_INDEX]){
      patch = row[PATCH_INDEX];
    }
    
    var gearset = {name: row[SET_NAME_INDEX], '2': row[TWO_PIECE_INDEX], '3': row[THREE_PIECE_INDEX],
                   '4': row[FOUR_PIECE_INDEX], '5': row[FIVE_PIECE_INDEX], '6': row[SIX_PIECE_INDEX], patch: patch}
    
    return gearset;
  });

  return gearsetList;
}


/* returns a list of objects representing weapons on the gearsheet 
   and the mods that are compatible with them.
   Data from this sheet spans across two sheets 
   Weapon Damage Ranges and Weapon mod compatibility */
function getWeaponsVerbose(){
  var weaponsTable = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Weapon Damage Ranges!Weapons').getValues();
  var weaponModsCompatTable = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Weapon mod compatibility!ModsCompat').getValues();
  var namedItemsTable = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Named Items!NamedItems').getValues();
  
  var namedItemNames = namedItemsTable.map(function f(x){
     return x[1];
  });
  
  /* first create a list of weapon mod names and create the notes for each weapon
  mod compatibility for each weapon */
  var notes = {};
  var lastNoteKey;
  
  var weaponModNames = weaponModsCompatTable.map(function f(row){
    if (row[14]){ /* */
      lastNoteKey = row[14];
      notes[row[14]] = '';
    }
    
    if (row[15]){
      notes[lastNoteKey] = notes[lastNoteKey] + ' ' + row[15];
    }
    
    return row[2];
  });
   
  /* get a list of weapons and their details and then match them to the mods 
     compatible with them */
  var type;
  var variant;
  var weapons = weaponsTable.map(function f(row){
    if (row[0]){
      type = row[0];
    }
    
    if (row[1]){
      variant = row[1];
    }
    
    var weapon = {type: type, variant: variant, name: row[2], scaling: row[3], rpm: row[4], "MagSize": row[5], "OptimalRange": row[6],
                  "ReloadSpeed": row[7], "HeadshotMultiplier": row[8], "WeaponBonus": row[9], "Bonus": row[10],
                  '163': getMinMaxObject(row[11]), '182': getMinMaxObject(row[12]), '204': getMinMaxObject(row[13]),
                  '229': getMinMaxObject(row[14]), '256': getMinMaxObject(row[15])};
    
    var weaponModIndex = weaponModNames.indexOf(weapon.name);
    if (weaponModIndex > -1){
      weapon.modCompat = getWeaponModsCompat(weaponModsCompatTable[weaponModIndex], notes);
    }
    
    var namedItemIndex = namedItemNames.indexOf(weapon.name);
    if (namedItemIndex > -1){
      weapon.talent = getNamedItem(namedItemIndex, namedItemsTable);
    }
    
    
    return weapon;
  }); 
  
  // Logger.log(weapons);
  return weapons;
}


function getExoticGearsVerbose(){
  var exoticGearTable = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Named Items!ExoticGears').getValues();
  
  var exoticGears = exoticGearTable.map(function f(row){
    return {type: row[0], name: row[1], description: row[2]};
  });
  
  return exoticGears;
}


function getNamedItem(index, namedItems){
  var namedItemDetails = namedItems[index];
  return {type: namedItemDetails[0], name: namedItemDetails[1], description: namedItemDetails[2]};
}


function getMinMaxObject(dmgStr){
  var split = dmgStr.split(' - ');
  
  return{min: parseInt(split[0]), max: parseInt(split[1])};
}


function getWeaponModsCompat(modsRow, notes){
  var columnNames = ['Magazine', 'Recoil Muzzles', 'Small Suppressors', 'Large Suppressors', 'Iron Sights',
                    'Small Scope/RDS', 'Large Scope/RDS', 'Small Grips', 'Large Grips', 'Laser Pointer'];
  
  /* get only the columns with mod boolean values */
  var rowSlice = modsRow.slice(3, 13);
  
  var modsCompatObject = {};
  
  /* filter the columns based on how the content of their corresponding row */
  var modsForWeapon = columnNames.filter(function f(x, i){
    if (notes[rowSlice[i]]){
      modsCompatObject.note = notes[rowSlice[i]];
    }
    
    return rowSlice[i].indexOf('✓') > -1;
  });
  
  modsCompatObject.compat = modsForWeapon;
  return modsCompatObject;
}


function getWeaponModsVerbose(){
  var columnNames = ["Mod_Category", "name", "Primary_Attribute_UID", "Primary_Attribute", "Mod_Type", "Crit_Chance",
                     "Crit_Damage", "Headshot_Damage", "Accuracy", "Stability", "Reload_Speed", 
                    "Rate_Of_Fire", "Optimal_Range", "Magazine_Size", "Decreased_Threat", "Increased_Threat"];
  
  var weaponModsTable = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('ilvl34 Weapon Mods!WeaponMods').getValues();
  var modCategory; // 'Mod Type' on the gearsheet but there is another column with Mod Type so..
  
  var extraRowData = [];
  var weaponMods = weaponModsTable.map(function f(x, m){
    var columnWithValues = [];
    
    if(!x[1]){ /* if there is no value in the name column, it is definitely a sub row */
      var subRow = {};
      
      subRow.index = m - 1; /* index of the row above it */
      subRow.value = x[3];
      subRow.columnName = columnNames[3];
      
      extraRowData.push(subRow);
    } else {
      /* remove columns with 'x' values. this means they don't have the right attribute */
      x.map(function d(y, i){
        if (y != 'x'){
          var temp = {}
          
          temp.value = y;
          temp.index = i;
          
          columnWithValues.push(temp);
        }
      });
      
      var weaponMod = {};
      
      if(x[0]){ /* handle categories that span multiple rows */
        modCategory = x[0];
      }
      
      weaponMod.category = modCategory;
      
      for (var i = 1; i < columnWithValues.length; i++){ /* start from index=1 because the first column has already been handled */
        var key = columnNames[columnWithValues[i].index];
        var val = columnWithValues[i].value;
        
        weaponMod[key] = val;
      }
            
      return weaponMod; 
    }
  });
  
  /* merge extra data to main weapon mod list */
  for(i in extraRowData){
    var extraData = extraRowData[i];
    var tempMod = weaponMods[extraData.index];
    var oldPrimaryAttr = tempMod[extraData.columnName];
    
    tempMod[extraData.columnName] = [oldPrimaryAttr, extraData.value];
  }
  
  var filtered = weaponMods.filter(function f(p){ /* remove all null rows */
    return p != null;
  });
  
  //Logger.log(filtered);
  
  return filtered;
}
