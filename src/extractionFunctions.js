'use strict';

/**
 * Extraction functions that run inside page.evaluate() in the browser context.
 * Ported from temp/jsFunction.md — logic is kept identical.
 */

const extractDriverDataFn = `() => {
  const drivers = {};
  const rows = document.querySelectorAll('tbody tr');

  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');

    if (cells.length === 16) {
      const driverName = cells[0].innerText.trim();

      const getPoints = (index) => {
        const text = cells[index].innerText.trim();
        return text === '' ? 0 : parseFloat(text);
      };

      if (driverName) {
        drivers[driverName] = {
          TotalPoints: getPoints(1),
          PriceChange: getPoints(2),
          Sprint: {
            POS: getPoints(4),
            PG: getPoints(5),
            OV: getPoints(6),
            FL: getPoints(7),
          },
          Qualifying: {
            POS: getPoints(9),
          },
          Race: {
            POS: getPoints(11),
            PG: getPoints(12),
            OV: getPoints(13),
            FL: getPoints(14),
            DD: getPoints(15),
          },
        };
      }
    }
  });

  return drivers;
}`;

const extractConstructorDataFn = `() => {
  const constructors = {};
  const rows = document.querySelectorAll('tbody tr');

  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');

    if (cells.length === 17) {
      const constructorName = cells[0].innerText.trim();

      const getPoints = (index) => {
        const text = cells[index].innerText.trim();
        return text === '' ? 0 : parseFloat(text);
      };

      if (constructorName) {
        constructors[constructorName] = {
          TotalPoints: getPoints(1),
          PriceChange: getPoints(2),
          Sprint: {
            POS: getPoints(4),
            PG: getPoints(5),
            OV: getPoints(6),
            FL: getPoints(7),
          },
          Qualifying: {
            POS: getPoints(9),
            TW: getPoints(10),
          },
          Race: {
            POS: getPoints(12),
            PG: getPoints(13),
            OV: getPoints(14),
            FL: getPoints(15),
            FP: getPoints(16),
          },
        };
      }
    }
  });

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
