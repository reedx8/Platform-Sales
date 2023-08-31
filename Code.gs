/*
  This script records order counts (counts) and sales for sandwiches, pastries and coffee bags sold at each store in uber eats, doordash, and revel, while grubhub's data is manually (These 4 collectively called "Platforms"). It then outputs it to a 'Total' sheet with runAll script/macro,and finally to HISTORY sheet (aka TotalCountHistory tab) with runHistory script/macro. It sends sales figures to totalsalesbystore and totalsalesbyplatform tabs.
  NOTE: only grubhub uses the prices on Menu Prices SS

  To run:
  1. upload csv sheets generated from reports of mobile order app websites to their appropriate sheets in this spreadsheet (guide -> https://docs.google.com/document/d/1lXbw_TEEn2Lh7gQqNk0n2zd0DjcBK3pgZIKWzMAWCkM/edit?usp=sharing)
  2. Then, run runAll() function by going to Extensions -> Macros -> runAll. Done.

  This script depends on (dependencies):
  1. the items names in this script's lists (sandItems, coffeeItems, etc) matching verbatim
     both the item names in column A of total sheets and item names in csv sheets.
  2. columns in Total sheets are ordered as follows: item name, barrows, hall, meadows, orenco (see storeNames[] array)
  3. column A in total sheets is filled in with items (script does not generate it, see MasterList sheet/tab)
  4. names of the tabs in the spreadsheet are what this script expects (eg 'Revel TOTAL', 'DD Hall', etc)
 
  todo:
  - should use allPricesSheet instead to read in pastriesList, sandList, etc?
  - each item should be initialized to -1 or n/a to identify when menu has changed

  

  How to add new item(s) (pastries, coffee bags, or sandwiches) to menu:
  1. Platform Sales SS: insert blank row(s) where desired in relevant 
      tab(s) —  `right click -> insert 1 row below/above` option.
  2. Menu Prices SS: Add item to list in “All Prices” tab where you inserted blank row in step 1 — `right clicking cell -> insert cells -> insert cells and shift down` . Update reference to price (eg `=Source!CellNumber`)
  3. Platform Sales SS: Delete old list in each tab in step 1, then `right click -> paste special -> values only` to paste new modified list in tab(s) of step 1. Done.
*/

/*
Setup: below state/date is used by both classes in Classes.gs (Platform and Store class).
*/
const ss = SpreadsheetApp.openById(
    '1knD3UwI2LM843FtatfdES5QSQDsmN8dj-OM-ik_ymNY'
);
const menuPricesSS = SpreadsheetApp.openById('1leW5VmgkjvNqsaMdUspjMHVBQKQg5D3NMcdVW8p7g4k');

const totalSheetUE = ss.getSheetByName('UE TOTAL');
const totalSheetDD = ss.getSheetByName('DD TOTAL');
const totalSheetRev = ss.getSheetByName('Revel TOTAL');
const masterSheet = ss.getSheetByName('MasterList');
const historySheet = ss.getSheetByName("TotalCountHistory");
const salesByStoreSheet = ss.getSheetByName("TotalSalesByStore");
const salesByPlatformSheet = ss.getSheetByName("TotalSalesByPlatform");
const allPricesSheet = menuPricesSS.getSheetByName("All Prices");

const sheetNamesUE = ['UE Hall', 'UE Barrows', 'UE Meadows', 'UE Orenco'];
const sheetNamesDD = ['DD Hall', 'DD Barrows', 'DD Meadows', 'DD Orenco'];
const sheetNamesRev = ['Revel Hall', 'Revel Barrows', 'Revel Meadows', 'Revel Orenco'];
const csvRangeUE = "E2:X";
const csvRangeDD = 'C2:K';
const csvRangeRev = "C2:L";


const storeNames = [["Hall", "Barrows", "Meadows", "Orenco"]];
const historyTitles = [["Hall", "Barrows", "Meadows", "Orenco", "Total"]];
const platformNames = [["Doordash", "Grubhub", "Uber Eats", "Revel"]];
const bgWhite = '#ffffff';
const bgGrey = '#efefef';
const bgRange = "B3:E65";
const bgHistoryRange = "B3:F65";
const RANGE = 70;
const ROW_START = 3;
let dateString = getDateString();
const dateCell = 'B1';

// SETUP: All platforms and stores share the same pastries, sandwiches, coffee lists below:
let pastryItems = new Map();
//const pastriesList = masterSheet.getRange('C2:C45').getValues();
const pastriesList = getItems('C', 2);
pastriesList.forEach(p => {
    //pastryItems.set(p[0].toLowerCase(), 0);
    pastryItems.set(p.toLowerCase(), 0);
})

let sandItems = new Map();
//const sandList = masterSheet.getRange('A2:A8').getValues();
const sandList = getItems('A', 2);
sandList.forEach(s => {
  sandItems.set(s.toLowerCase(), 0);
})

let coffeeItems = new Map();
//const coffeeList = masterSheet.getRange('B2:B8').getValues();
const coffeeList = getItems('B', 2);
coffeeList.forEach(c => {
  coffeeItems.set(c.toLowerCase(), 0);
})

let drinkItems = new Map();
//const drinkList = masterSheet.getRange('D2:D37').getValues();
const drinkList = getItems('D', 2);
drinkList.forEach(d => {
  drinkItems.set(d.toLowerCase(), 0);
})


/* 
Macros/scripts below
*/

// Runs all necessary macros for Platform Sales spreadsheet to work as intended
// IE, updates all 3 TOTAL sheets, TotalCountHistory, & TotalSalesByStore and TotalSalesByPlatform sheets
function runAll(){
  runCSV();
  runHistory();
  runTotalSales();
}

// Updates all 3 TOTAL sheets (processes all 12 platform's CSV sheets)
function runCSV(){
  openEachStore('uber', sheetNamesUE, true);
  openEachStore('doordash', sheetNamesDD, true);
  openEachStore('revel', sheetNamesRev, true)
}

// run only uber eats, etc...
function runUbereats(){
  openEachStore('uber', sheetNamesUE, false);
}

function runDoordash(){
  openEachStore('doordash', sheetNamesDD, false);
}

function runRevel(){
  openEachStore('revel', sheetNamesRev, false);
}

// Updates TotalCountHistory sheet (collects counts from each TOTAL sheet and sends them to the HISTORY sheet)
// For example, hallStore sums up Hall's counts from each Total sheet, outputing them to HISTORY sheet
function runHistory(){
  let hallStore = new Store('hall');
  let barrowsStore = new Store('barrows');
  let meadowsStore = new Store('meadows');
  let orencoStore = new Store('orenco');

  let stores = [hallStore, barrowsStore, meadowsStore, orencoStore];
  addColumns("history", historySheet);

  for (let s of stores){
    s.collect();
    s.insertCounts();
  }

  insertTotals(historySheet, ROW_START, RANGE);
}

// Updates TotalSalesByStore sheet and TotalSalesByPlatform Sheet
function runTotalSales(){
    runTotalSalesByStore();
    runTotalSalesByPlatform();
}

// Gets sales from CSV sheets and outputs to TotalSalesByStore, depending on store
// NOTE: runTotalSalesByStore and runTotalSalesByPlatform seperate IOT allow 
// them being run indep if need be. Run runTotalSales if you want to run them both. 
function runTotalSalesByStore() {
    addColumns("totalsalesbystore", salesByStoreSheet);

    sheetNamesDD.forEach(sh => collectAndInsert(sh, "doordash", salesByStoreSheet));
    sheetNamesRev.forEach(sh => collectAndInsert(sh, "revel", salesByStoreSheet));
    sheetNamesUE.forEach(sh => collectAndInsert(sh, "uber", salesByStoreSheet));
    collectAndInsert(null, "grubhub", salesByStoreSheet);

    insertTotals(salesByStoreSheet, 3, 7);
    insertTotalsByColumn(salesByStoreSheet);
}

// Gets sales from from CSV sheets and outputs to TotalSalesByPlatform, depending on platform
function runTotalSalesByPlatform(){
    addColumns("totalsalesbyplatform", salesByPlatformSheet);
    
    sheetNamesDD.forEach(sh => collectAndInsert(sh, "doordash", salesByPlatformSheet));
    sheetNamesRev.forEach(sh => collectAndInsert(sh, "revel", salesByPlatformSheet));
    collectAndInsert(null, "grubhub", salesByPlatformSheet);
    sheetNamesUE.forEach(sh => collectAndInsert(sh, "uber", salesByPlatformSheet));
    
    insertTotalsByColumn(salesByPlatformSheet);
}








/*
Helper functions below
*/

// collects sales for a single store in a given platform
function collectAndInsert(sheetName, platformName, outputSheet) {
  if (platformName === "grubhub"){
    if (outputSheet === salesByPlatformSheet){
      const grubhub = new Platform("grubhub", null);
      grubhub.collectSales();
      grubhub.insertSales(outputSheet);
    } else { // salesbystore
      const hallGH = new Store("Hall");
      const barrowsGH = new Store("Barrows");
      const meadowsGH = new Store("Meadows");
      const orencoGH = new Store("Orenco");
      const allStores = [hallGH, barrowsGH, meadowsGH, orencoGH];

      allStores.forEach(store => {
        store.collectSales();
        store.insertSales(outputSheet);
      });



    }
    return;
  }

  let platformsStore = new Platform(platformName, sheetName);
  platformsStore.collectSales();
  platformsStore.insertSales(outputSheet);
}

// sums up totals for each row in the given sheet
function insertTotals(sheet, start, end){
    for(let row = start; row < end; ++row){
      let currentRow = sheet.getRange("A" + row);
  
      if (currentRow.isBlank() === false){
        let counts = sheet.getRange("B" + row + ":" + "E" + row).getValues();
        let sum = 0;
        counts[0].forEach(c => sum += c);
        sheet.getRange("F" + row).setValue(sum);
      }
    }
}

// insertTotals() duplicate but for totalSalesByPlatform sheet
function insertTotalsByColumn(sheet){
  const columnNumbers = ["B", "C", "D", "E"];
  const rowStart = 3;
  const rowEnd = 6;

  for (let col of columnNumbers){
    let sales = sheet.getRange(col + rowStart + ":" + col + rowEnd).getValues();
    let sum = 0;
    sales.forEach(s => sum += Number(s));
    sheet.getRange(col + 7).setValue(sum);
  }

  let allTotals = sheet.getRange("B7:E7").getValues();
  let theTotal = 0;
  allTotals[0].forEach(t => theTotal += Number(t));

  if(sheet === salesByStoreSheet){
    sheet.getRange("F7").setValue(Number(theTotal));
  } else { // salesbyplatform
    sheet.getRange("E8").setValue(Number(theTotal));
  }
}

//opens each store location depending on the platform
function openEachStore(platform, sheetNames, allPlatforms) {
  switch (platform) {
    case 'uber':
      if (allPlatforms === false){
        dateString = askForDate();
        if (dateString === -1) return;
      }
      addColumns("platform", totalSheetUE);

      for (let store of sheetNames) {
         let ueStore = new Platform(platform, store);
         ueStore.collect();
         ueStore.insert();
      }
      break;
    case 'doordash':
      // doordash csv file (as of feb 2023) has date ranges already...
      addColumns("platform", totalSheetDD);

      for (let store of sheetNames) {
        let ddStore = new Platform(platform, store);
        ddStore.collect();
        ddStore.insert();
      }
      break;
    case 'revel':
      if (allPlatforms === false){
        dateString = askForDate();
        if (dateString === -1) return;
      }
      addColumns("platform", totalSheetRev);

      for (let store of sheetNames) {
        let revelStore = new Platform(platform, store);
        revelStore.collect();
        revelStore.insert();
      }
      break;
  }
}

// add 4 or 5 columns to sheet and sets the date at top of sheet
function addColumns(name, sheet){
    let bg = (sheet.getRange("B3").getBackground() === bgWhite) ? bgGrey: bgWhite;
    name = name.toLowerCase();
  
    if (name === "history" || name === "totalsalesbystore"){
      sheet.insertColumns(2,5);
      sheet.getRange(dateCell + ":F1").mergeAcross();
      sheet.getRange("B2:F2").setValues(historyTitles);
      sheet.getRange(bgHistoryRange).setBackground(bg);
    } else if (name === "platform" || name === "totalsalesbyplatform"){
      sheet.insertColumns(2,4);
      sheet.getRange(dateCell + ":E1").mergeAcross();
      if (name === "platform") {
        sheet.getRange("B2:E2").setValues(storeNames);
      } else {
        sheet.getRange("B2:E2").setValues(platformNames);
      }
      sheet.getRange(bgRange).setBackground(bg);
    }

    sheet.getRange(dateCell).setValue(dateString);
}

// Getting date range for all Total sheets to use when runAll() executed
function getDateString(){
  const hallSheet = ss.getSheetByName('DD Hall');
  const date = hallSheet.getRange('A2:B2').getValues();
  const beginDate = date[0][0].toDateString();
  const endDate = date[0][1].toDateString();

  return beginDate + ' - ' + endDate;
}

// Asks for week range with a UI prompt. Its used when running runUbereats and runRevel macros/scripts
// since only doordash has week range in its csv file
function askForDate() {
  let ui = SpreadsheetApp.getUi();
  let result = ui.prompt("Enter in Date range");

  const button = result.getSelectedButton();
  if (button === ui.Button.OK){
    return result.getResponseText();
  } else if (button === ui.Button.CLOSE){
    return -1;
  }
}








/*
Other rarely used Macros/scripts below
*/

function runSandwichUbereats(){
  let newSheet = ss.insertSheet(0);
  let row = 2;
  for(let [k,v] of sandItems.entries()){
    newSheet.getRange("A" + row).setValue(k);
    ++row;
  }


  for (let sheet of sheetNamesUE) {
    const sh = ss.getSheetByName(sheet);
    const data = sh.getRange(csvRangeUE).getValues();

    for (let [k,v] of sandItems.entries()){
      sandItems.set(k, 0);
    }

    for(let row of data){
      if (sandItems.has(row[0].toLowerCase())){
        sandItems.set(row[0].toLowerCase(), row[3]);
      }
    }
    // send sandItems values to new tab
    if(sheet === "UE Hall"){
      insertSand(sandItems, "Hall", "B", newSheet);
    } else if (sheet === "UE Barrows"){
      insertSand(sandItems, "Barrows", "C", newSheet);
    } else if (sheet === "UE Meadows"){
      insertSand(sandItems, "Meadows", "D", newSheet);
    } else if (sheet === "UE Orenco"){
      insertSand(sandItems, "Orenco", "E", newSheet);
    }
  }
}

function insertSand(sand, store, col, newSh){
  newSh.getRange(col + "1").setValue(store);

  for (let row = 2; row < 10; ++row){
    for(let [k, v] of sand.entries()){
      if(newSh.getRange("A" + row).getValue() === k){
        newSh.getRange(col + row).setValue(v);
      }
    }
  }
}

/**
 * @param {String} columnLetter A single column letter, eg "A"
 * @param {Number} rowStart the row number to start on, eg 3
 */
function getItems(columnLetter, rowStart) {
  const MAX_RANGE = 500; // an arbitrarily high number of rows to search over
  const regex = /^\s*$/; // tests for any number of spaces in cell
  let itemList = [];
  
  for(let row = rowStart; row <= MAX_RANGE; ++row){
    let item = masterSheet.getRange(columnLetter + row).getValue();

    if (regex.test(item) === false){ // if item name is not just space(s)
      itemList.push(item);
    }
  }
	return itemList;
}
