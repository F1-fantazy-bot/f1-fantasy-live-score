'use strict';

/**
 * Extraction functions that run inside page.evaluate() in the browser context.
 * Uses data-column-id attributes on <th> elements to build a dynamic column
 * map, making extraction resilient to column reordering on f1fantasytools.com.
 */

const extractDriverDataFn = `() => {
  const drivers = {};
  const tables = document.querySelectorAll('table');

  for (const table of tables) {
    const headerRows = table.querySelectorAll('thead tr');
    if (headerRows.length < 2) continue;

    const columnHeaders = headerRows[1].querySelectorAll('th');
    const colMap = {};
    
    columnHeaders.forEach((th, index) => {
      const colId = th.getAttribute('data-column-id');
      if (colId) colMap[colId] = index;
    });

    let isDriverTable = colMap['R_dotdPoints'] !== undefined;
    if (!isDriverTable && colMap['asset'] !== undefined) {
      if (columnHeaders[colMap['asset']].innerText.trim() === 'DR') {
        isDriverTable = true;
      }
    }

    if (!isDriverTable) continue;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (!cells.length || colMap['asset'] === undefined) return;

      const rawName = cells[colMap['asset']].innerText.trim();
      const name = rawName.split('\\n')[0].trim();
      if (!name) return;

      const getPoints = (key) => {
        const index = colMap[key];
        if (index === undefined || !cells[index]) return 0; 
        const text = cells[index].innerText.trim();
        return text === '' ? 0 : parseFloat(text);
      };

      drivers[name] = {
        TotalPoints: getPoints('totalPoints'),
        PriceChange: getPoints('priceChange'),
        Sprint: {
          POS: getPoints('S_totalPositionPoints'),
          PG:  getPoints('S_positionsGained'),
          OV:  getPoints('S_overtakes'),
          FL:  getPoints('S_fastestLapPoints')
        },
        Qualifying: {
          POS: getPoints('Q_totalPositionPoints')
        },
        Race: {
          POS: getPoints('R_totalPositionPoints'),
          PG:  getPoints('R_positionsGained'),
          OV:  getPoints('R_overtakes'),
          FL:  getPoints('R_fastestLapPoints'),
          DD:  getPoints('R_dotdPoints')
        }
      };
    });

    break; 
  }

  return drivers;
}`;

const extractConstructorDataFn = `() => {
  const constructors = {};
  const tables = document.querySelectorAll('table');

  for (const table of tables) {
    const headerRows = table.querySelectorAll('thead tr');
    if (headerRows.length < 2) continue;

    const columnHeaders = headerRows[1].querySelectorAll('th');
    const colMap = {};
    
    columnHeaders.forEach((th, index) => {
      const colId = th.getAttribute('data-column-id');
      if (colId) colMap[colId] = index;
    });

    let isConstructorTable = colMap['R_fastestPitStopPoints'] !== undefined || colMap['Q_teamworkPoints'] !== undefined;
    if (!isConstructorTable && colMap['asset'] !== undefined) {
      if (columnHeaders[colMap['asset']].innerText.trim() === 'CR') {
        isConstructorTable = true;
      }
    }

    if (!isConstructorTable) continue;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (!cells.length || colMap['asset'] === undefined) return;

      const rawName = cells[colMap['asset']].innerText.trim();
      const name = rawName.split('\\n')[0].trim();
      if (!name) return;

      const getPoints = (key) => {
        const index = colMap[key];
        if (index === undefined || !cells[index]) return 0; 
        const text = cells[index].innerText.trim();
        return text === '' ? 0 : parseFloat(text);
      };

      constructors[name] = {
        TotalPoints: getPoints('totalPoints'),
        PriceChange: getPoints('priceChange'),
        Sprint: {
          POS: getPoints('S_totalPositionPoints'),
          PG:  getPoints('S_positionsGained'),
          OV:  getPoints('S_overtakes'),
          FL:  getPoints('S_fastestLapPoints')
        },
        Qualifying: {
          POS: getPoints('Q_totalPositionPoints'),
          TW:  getPoints('Q_teamworkPoints')
        },
        Race: {
          POS: getPoints('R_totalPositionPoints'),
          PG:  getPoints('R_positionsGained'),
          OV:  getPoints('R_overtakes'),
          FL:  getPoints('R_fastestLapPoints'),
          FP:  getPoints('R_fastestPitStopPoints')
        }
      };
    });

    break;
  }

  return constructors;
}`;

/**
 * Returns the extraction function source strings for use in page.evaluate().
 */
function getExtractionFunctions() {
  return {
    extractDriverData: extractDriverDataFn,
    extractConstructorData: extractConstructorDataFn,
  };
}

module.exports = { getExtractionFunctions };
