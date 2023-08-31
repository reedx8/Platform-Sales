/*
This class creates a new store for each platform.
Its used to collect counts from all csv files (uber, doordash, revel) and outputting to the TOTAL sheets.
Also used to collect sales figures and outputing them to totalsalesbyplatform sheet.
- platformName = uber, doordash, revel, grubhub
- sheetName = UE Hall, DD Orenco, Revel Hall, etc (ie the CSV tabs)
*/

class Platform {
  constructor (platformName, sheetName){
    this.platform = platformName.toLowerCase();
    this.store;
    if(sheetName === null){
      this.store = null;
    } else if (sheetName[0].toLowerCase() === "r"){
      this.store = sheetName.substring(6);
    } else {
      this.store = sheetName.substring(3);
    }

    this.column; // column for the store on the TOTAL and TotalSalesByStore sheets
    this.platformCol; // column for the platform on the TotalSalesByPlatform sheet
    this.itemCol;
    this.countCol; // column where counts are stored on CSV file
    this.salesCol;
    this.csvData;  // eg "UE Hall", "Revel Barrows", or "GH TOTAL" for grubhub, etc
    this.totalSheet; // eg "Revel TOTAL", "UE TOTAL", etc
    this.fee; // commission fee depending on platform
    
    this.sandwichSales = 0;
    this.pastrySales = 0;
    this.drinkSales = 0;
    this.foodSales = 0;

    // GH: food categories item names and their associated price
    this.sandwichData;
    this.pastriesData;
    this.foodData;
    this.ghTotalSalesOfficial;
    this.runTotal; // running total of food categories

    // Only used for collecting sales for Revel and Doordash:
    this.pastryCategories = ["pastries", "pastry", "desserts"];
    this.drinkCategories = ["hot drinks", "hot drink", "cold drinks", "iced drink", "coffee beans", "fresh roasted coffee beans", "cooler&extra", "pop cooler", "seasonal specials"];
    this.foodItems = ["potato chips", "umpqua oatmeal"];

    switch (this.store){
      case "Hall":
        this.column = "B"; break;
      case "Barrows":
        this.column = "C"; break;
      case "Meadows":
        this.column = "D"; break;
      case "Orenco":
        this.column = "E"; break;
      //case "Test": // revel test
        //this.column = "E"; break;
    }

    switch(this.platform){
      case "uber":
        this.csvData = ss.getSheetByName(sheetName).getRange(csvRangeUE).getValues();
        this.totalSheet = ss.getSheetByName("UE TOTAL");
        this.itemCol = 0;
        this.countCol = 7;
        this.fee = 0.85;
        this.platformCol = "D";
        break;
      case "doordash":
        this.csvData = ss.getSheetByName(sheetName).getRange(csvRangeDD).getValues();
        this.totalSheet = ss.getSheetByName("DD TOTAL");
        this.fee = 0.75;
        this.itemCol = 0;
        this.platformCol = "B";
        break;
      case "revel":
        this.csvData = ss.getSheetByName(sheetName).getRange(csvRangeRev).getValues();
        this.totalSheet = ss.getSheetByName("Revel TOTAL");
        this.itemCol = 0;
        this.countCol = 3;
        this.salesCol = 9;
        this.platformCol = "E";
        break;
      case "grubhub":
        // this case used for calculating total sales for GH in TotalSalesByPlatform
        this.totalSheet = ss.getSheetByName("GH TOTAL");
        this.csvData = this.totalSheet.getRange("A3:E").getValues(); // most recent week of grubhub counts
        this.fee = 0.64;
        this.platformCol = "C";
        this.runTotal = 0;
        this.sandwichData = allPricesSheet.getRange("G3:H9").getValues();
        this.pastriesData = allPricesSheet.getRange("A3:B46").getValues();
        this.foodData = allPricesSheet.getRange("I3:J4").getValues();
        this.ghTotalSalesOfficial = salesByPlatformSheet.getRange("A15").getValue();
        break;
    }

    // deep copy in JS
    this.pastries = new Map(JSON.parse(JSON.stringify(Array.from(pastryItems))));
    this.sandwiches = new Map(JSON.parse(JSON.stringify(Array.from(sandItems))));
    this.coffee = new Map(JSON.parse(JSON.stringify(Array.from(coffeeItems))));
    this.drinks = new Map(JSON.parse(JSON.stringify(Array.from(drinkItems))));
  }


  // collect counts from CSV files for each store in each each platform
  collect(){
    for(let row of this.csvData){
      let item = String(row[this.itemCol]).toLowerCase();
      // either doordash, or uber/revel:
      let count = (this.platform === "doordash") ? row[3] - row[5] : row[this.countCol];

      if (this.pastries.has(item)){
        // need a running total for uber and revel:
        //if (this.platform === "uber") count = this.pastries.get(item) + count;
        if (this.platform === "uber" || this.platform === "revel") count = this.pastries.get(item) + count;

        this.pastries.set(item, count);
      } else if (this.coffee.has(item)){
        if (this.platform === "uber") count = this.coffee.get(item) + count;
        this.coffee.set(item, count);
      } else if (this.sandwiches.has(item)){
        if (this.platform === "uber") count = this.sandwiches.get(item) + count;
        this.sandwiches.set(item, count);
      }
    }
  }

  // inserts count data collected from collect() into the TOTAL sheets
  insert(){
    for (let row = ROW_START; row < RANGE; ++row){
      let item = this.totalSheet.getRange("A" + row).getValue().toLowerCase();

      if (this.pastries.has(item)){
        this.totalSheet.getRange(this.column + row).setValue(this.pastries.get(item));
      } else if (this.coffee.has(item)){
        this.totalSheet.getRange(this.column + row).setValue(this.coffee.get(item));
      } else if (this.sandwiches.has(item)){
        this.totalSheet.getRange(this.column + row).setValue(this.sandwiches.get(item));
      }
    }
  }

  // collects $ sales from CSV file for doordash, uber eats, and revel (not grubhub, see Store class)
  // This is called on each CSV file for both totalsalesbystore and byplatform, except for grubhub (once)
  // Only called in code.gs -> collectAndInsert()
  collectSales(){
    if (this.platform === "uber"){
      // Uber needs to be categorized using its items (no categories in its CSV file)
      for (let row of this.csvData){
        let item = row[0].toLowerCase();
        let sales = row[19] * this.fee;

        if (this.pastries.has(item)){
          this.pastrySales = this.pastrySales + sales;
        } else if (this.coffee.has(item) || this.drinks.has(item)) {
          this.drinkSales = this.drinkSales + sales;
        } else if (this.sandwiches.has(item)){
          this.sandwichSales = this.sandwichSales + sales;
        } else if (this.foodItems.includes(item)){
          this.foodSales = this.foodSales + sales;
        }
      }
    } else if (this.platform === "grubhub"){
      // For GH we need to multiply counts * item's price to get GH's total sales (no category data)
      const categoriesData = [this.sandwichData, this.pastriesData, this.foodData];

      for (let category of categoriesData){
          let totalSales = 0; //running total sales for category
          let price = 0;
          let itemSales = 0; // a single item's sales

          for (let row of this.csvData){        
              let itemName = row[0].toLowerCase();
              let itemCount = Number(row[1]) + Number(row[2]) + Number(row[3]) + Number(row[4]);

              // "Menu Prices" Spreadsheet:
              for (let row2 of category){
                  let itemName2 = row2[0].toLowerCase();
                  if (itemName === itemName2 && itemCount !== 0){
                      price = Number(row2[1]);
                      itemSales = Number(itemCount * price);
                      totalSales = Number(totalSales + itemSales);
                      break;
                  }
              }
          }

          // set total sales for each category and apply commission fee
          if (category === this.sandwichData){
              this.sandwichSales = totalSales * this.fee;
              this.runTotal += this.sandwichSales;
          } else if (category === this.pastriesData){
              this.pastrySales = totalSales * this.fee;
              this.runTotal += this.pastrySales;
          } else if (category === this.foodData){
              this.foodSales = totalSales * this.fee;
              this.runTotal += this.foodSales;
          }
      }
      // cannot get GH drink sales via counts * price (drinks have diff. sizes), hence below code
      this.drinkSales = (this.ghTotalSalesOfficial * this.fee) - this.runTotal;
    } else {
      // either doordash or revel
      for (let row of this.csvData){
        let categ = row[1].toLowerCase();
        let sales = (this.platform === "doordash") ? (row[2] - row[8]) * this.fee : row[9];

        if (this.pastryCategories.includes(categ)){
          this.pastrySales = this.pastrySales + sales;
        } else if (categ === "sandwiches" || categ === "sandwich"){
          this.sandwichSales = this.sandwichSales + sales;
        } else if (this.drinkCategories.includes(categ)){
          if (this.foodItems.includes(row[0].toLowerCase()) === false){
            this.drinkSales = this.drinkSales + sales;
          } else {
            this.foodSales = this.foodSales + sales;
          }
        }
      }
    }
  }

  insertSales(sheet) {
      let data = sheet.getRange("A3:E6").getValues();
      
      for (let row of data) {
          let categoryName = row[0].toLowerCase();
          if (categoryName === "sandwiches"){
                  let col = (sheet === salesByStoreSheet) ? this.column : this.platformCol;
                  let cell = sheet.getRange(col + 3);
                  let prevValue = cell.getValue();
                  cell.setValue(prevValue + this.sandwichSales);
          } else if (categoryName === "drinks"){
                  let col = (sheet === salesByStoreSheet) ? this.column : this.platformCol;
                  let cell = sheet.getRange(col + 4);
                  let prevValue = Number(cell.getValue());
                  cell.setValue(prevValue + this.drinkSales);
          } else if (categoryName === "pastries"){
                  let col = (sheet === salesByStoreSheet) ? this.column : this.platformCol;
                  let cell = sheet.getRange(col + 5);
                  let prevValue = Number(cell.getValue());
                  cell.setValue(prevValue + this.pastrySales);
          } else if (categoryName === "food"){
                  let col = (sheet === salesByStoreSheet) ? this.column : this.platformCol;
                  let cell = sheet.getRange(col + 6);
                  let prevValue = cell.getValue();
                  cell.setValue(prevValue + this.foodSales);
          }
      }
  }
}





/*
This lighter-weight class creates a new store, collecting data from each TOTAL sheet and outputing to HISTORY sheet. Class also used to output sales to totalsalesbystore
storeName = hall, barrows, etc
*/
class Store {
  constructor(storeName){
    this.store = storeName.toLowerCase();

    // TODO: Add "UE Hall", "UE Barrows" and GH etc to storesheets below
    if (this.store === "hall"){
      this.column = "B";
      this.columnNum = 1;
      this.ghSalesOfficial = salesByPlatformSheet.getRange("A21").getValue();
    } else if (this.store === "barrows" || this.store === "barrow" || this.store === "progress ridge"){
      this.column = "C";
      this.columnNum = 2;
      this.ghSalesOfficial = salesByPlatformSheet.getRange("A22").getValue();
    } else if (this.store === "meadows" || this.store === "kruse"){
      this.column = "D";
      this.columnNum = 3;
      this.ghSalesOfficial = salesByPlatformSheet.getRange("A23").getValue();
    } else if (this.store === "orenco"){
      this.column = "E";
      this.columnNum = 4;
      this.ghSalesOfficial = salesByPlatformSheet.getRange("A24").getValue();
    }

    // GH: food categories item names and their associated price
    this.sandwichData = allPricesSheet.getRange("G3:H9").getValues();
    this.pastriesData = allPricesSheet.getRange("A3:B46").getValues();
    this.foodData = allPricesSheet.getRange("I3:J4").getValues();
    
    this.runTotal = 0; // running total of categories
    this.fee = 0.64; // grubhubs commission fee
    this.sandwichSales;
    this.drinkSales;
    this.foodSales;
    this.pastrySales;

    this.totalSheet = ss.getSheetByName("GH TOTAL");
    this.csvData = this.totalSheet.getRange("A3:E").getValues();
    this.ghTotalSalesOfficial = salesByPlatformSheet.getRange("A15").getValue();

    // deep copy in JS
    this.pastries = new Map(JSON.parse(JSON.stringify(Array.from(pastryItems))));
    this.sandwiches = new Map(JSON.parse(JSON.stringify(Array.from(sandItems))));
    this.coffee = new Map(JSON.parse(JSON.stringify(Array.from(coffeeItems))));
    this.drinks = new Map(JSON.parse(JSON.stringify(Array.from(drinkItems))));

    this.totalSheets = [ss.getSheetByName('UE TOTAL'), ss.getSheetByName('DD TOTAL'), ss.getSheetByName('Revel TOTAL'), ss.getSheetByName('GH TOTAL')];
  }

   // collects pastries, sandwiches and coffee counts from each platform's TOTAL sheet for that specific store only
  collect(){
    for (let sheet of this.totalSheets){
      this.collectCounts(sheet);
    }
  }

  collectCounts(sheet){
    for(let row = ROW_START; row < RANGE; ++row){
      let item = sheet.getRange("A" + row).getValue().toLowerCase();

      if (this.sandwiches.has(item)){
        let prevCount = this.sandwiches.get(item);
        let newCount = sheet.getRange(this.column + row).getValue();
        this.sandwiches.set(item, prevCount + newCount);
      } else if (this.coffee.has(item)){
        let prevCount = this.coffee.get(item);
        let newCount = sheet.getRange(this.column + row).getValue();
        this.coffee.set(item, prevCount + newCount);
      } else if (this.pastries.has(item)){
        let prevCount = this.pastries.get(item);
        let newCount = sheet.getRange(this.column + row).getValue();
        this.pastries.set(item, prevCount + newCount);
      }
    }
  }

  // inserts counts into HISTORY tab for that specific store only
  insertCounts(){
    for(let row = ROW_START; row < RANGE; ++row){
      let item = historySheet.getRange("A" + row).getValue().toLowerCase();

      if (this.sandwiches.has(item)){
        historySheet.getRange(this.column + row).setValue(this.sandwiches.get(item));
      } else if(this.coffee.has(item)){
        historySheet.getRange(this.column + row).setValue(this.coffee.get(item));
      } else if (this.pastries.has(item)){
        historySheet.getRange(this.column + row).setValue(this.pastries.get(item));
      }
    }
  }

  // totalsalesbystore grubhub only -- collect sales for all categories by GH store
  collectSales(){
    // For GH we need to multiply counts * item's price to get GH's total sales
    const categoriesData = [this.sandwichData, this.pastriesData, this.foodData];

    for (let category of categoriesData){
        let totalSales = 0; // running total sales for category
        let price = 0;
        let itemSales = 0; // a single item's sales

        for (let row of this.csvData){        
            let itemName = row[0].toLowerCase();
            let itemCount = Number(row[this.columnNum]);

            for (let row2 of category){
                let itemName2 = row2[0].toLowerCase();
                if (itemName === itemName2 && itemCount !== 0){
                    price = Number(row2[1]);
                    itemSales = Number(itemCount * price);
                    totalSales = Number(totalSales + itemSales);
                    break;
                }
            }
        }

        // set total sales for each category and apply commission fee
        if (category === this.sandwichData){
            this.sandwichSales = totalSales * this.fee;
            this.runTotal += this.sandwichSales;
        } else if (category === this.pastriesData){
            this.pastrySales = totalSales * this.fee;
            this.runTotal += this.pastrySales;
        } else if (category === this.foodData){
            this.foodSales = totalSales * this.fee;
            this.runTotal += this.foodSales;
        }
    }
    // cannot get GH drink sales via counts * price (drinks have diff. sizes), hence below code
    const otherSales = this.foodSales + this.pastrySales + this.sandwichSales;
    this.drinkSales = (this.ghSalesOfficial * this.fee) - otherSales;
  }

  // insert sales for grubhub
  insertSales(sheet){
      let data = sheet.getRange("A3:E6").getValues();
      
      for (let row of data) {
          let categoryName = row[0].toLowerCase();
          if (categoryName === "sandwiches"){
                  let cell = sheet.getRange(this.column + 3);
                  let prevValue = Number(cell.getValue());
                  cell.setValue(prevValue + this.sandwichSales);
          } else if (categoryName === "drinks"){
                  let cell = sheet.getRange(this.column + 4);
                  let prevValue = Number(cell.getValue());
                  cell.setValue(prevValue + this.drinkSales);
          } else if (categoryName === "pastries"){
                  let cell = sheet.getRange(this.column + 5);
                  let prevValue = Number(cell.getValue());
                  cell.setValue(prevValue + this.pastrySales);
          } else if (categoryName === "food"){
                  let cell = sheet.getRange(this.column + 6);
                  let prevValue = Number(cell.getValue());
                  cell.setValue(prevValue + this.foodSales);
          }
      }
  }
}
