/**
 * Given an array of calls with method + body, build the URL string (without fetching).
 *
 * @param {string} baseUrl - e.g. "https://app.metrix.finance/api/trpc"
 * @param {Array<{ method: string, body: Object }>} calls - each call has method and its input body
 * @returns {string} the built URL
 */
function buildMetrixUrlFromCalls(calls, baseUrl = "https://app.metrix.finance/api/trpc") {
  // Join method names by comma
  const methodsPart = calls.map(call => call.method).join(",");

  // Build input object with numeric keys "0", "1", "2", ... mapping to { json: body }
  const inputObj = {};
  calls.forEach((call, idx) => {
    inputObj[idx] = { json: call.body };
  });

  // Stringify + encode the input object
  const inputJson = JSON.stringify(inputObj);
  const encodedInput = encodeURIComponent(inputJson);

  // Build the full URL
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const url = `${trimmedBase}/${methodsPart}?batch=1&input=${encodedInput}`;

  return url;
}

// Example usage:

const calls = [
  {
    method: "exchanges.getPoolTicks",
    body: {
      exchange: "orca",
      network: "solana",
      poolAddress: "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
      token0Decimals: 9,
      token1Decimals: 6
    }
  },
  {
    method: "exchanges.getPoolHistory",
    body: {
      exchange: "orca",
      network: "solana",
      poolAddress: "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
      feeTier: "400",
      apiKey: 1,
      baseTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    }
  },
  {
    method: "coinGecko.getTokenPrices",
    body: {
      apiKey: 1,
      calculationRange: "90",
      coinGeckoId: "wrapped-solana"
    }
  },
  {
    method: "coinGecko.getTokenPrices",
    body: {
      apiKey: 1,
      calculationRange: "90",
      coinGeckoId: "usd-coin"
    }
  }
];

const url = buildMetrixUrlFromCalls(calls);
console.log(url);
// → prints something like:
// https://app.metrix.finance/api/trpc/exchanges.getPoolTicks,exchanges.getPoolHistory,coinGecko.getTokenPrices,coinGecko.getTokenPrices?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B...%7D%7D...%7D%7D
