const pools = [
    {
        chain: 'base',
        exchange: 'uniswap',
        poolAddress: '0xd0b53D9277642d899DF5C87A3966A349A798F224'
    },
    {
        chain: 'ethereum',
        exchange: 'uniswap',
        poolAddress: '0xFe4ec8F377be9e1e95A49d4e0D20F52D07b1ff0D'
    }
];

const generateTicks = (priceLower: any, priceUpper: any, totalAmount: any) => {
    const ticks = [];
    const lower = parseFloat(priceLower);
    const upper = parseFloat(priceUpper);
    const numTicks = 100;
    const step = (upper - lower) / (numTicks - 1);


    for (let i = 0; i < numTicks; i++) {
        const tickLower = lower + step * i;
        const tickUpper = i === numTicks - 1 ? upper : lower + step * (i + 1);
        ticks.push(
            {
                priceLower: parseFloat(tickLower.toFixed(6)),
                priceUpper: parseFloat(tickUpper.toFixed(6)),
                totalAmount: totalAmount
            }
        );
    }

    return ticks;
}

function generateFakeData() {
    const data: any[] = [];
    const endDate = new Date('2025-09-06T00:00:00Z');
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days back
    
    // Generate data for 31 days (inclusive of start, exclusive of end)
    for (let day = 0; day < 30; day++) {
        const timestamp = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
        
        // Generate one entry per pool
        pools.forEach(pool => {
            const priceLower = (4000 + Math.random() * 100).toFixed(2);
            const priceUpper = (parseFloat(priceLower) + 2 + Math.random() * 3).toFixed(2);
            const totalAmount = (1 + Math.random() * 9).toFixed(15) + 'e' + (32 + Math.floor(Math.random() * 5));
            
            data.push({
                timestamp: timestamp.getTime(),
                chain: pool.chain,
                exchange: pool.exchange,
                poolAddress: pool.poolAddress,
                ticks: generateTicks(priceLower, priceUpper, totalAmount),
            });
        });
    }
    
    return data;
}

// Output the data
const fakeData = generateFakeData();
// console.log('export default ' + JSON.stringify(fakeData, null, 2) + ';');

export default fakeData