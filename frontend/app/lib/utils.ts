import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



/**
 * Calculate daily fees and APR earned by a position in a concentrated liquidity pool.
 * @param {number} dayIndex - Index of the day (0 = latest day).
 * @param {Array} dailyData - Array of daily snapshots with:
 *   { date, volume, price, ticks: [{tick, liquidity}] }
 * @param {number} lowerTick - Lower tick boundary of position.
 * @param {number} upperTick - Upper tick boundary of position.
 * @param {number} positionLiquidity - Total liquidity value of position at day.
 * @param {number} volumeFee - Fee rate as decimal (e.g., 0.003 for 0.3%).
 * @returns {Object} - { date, volumeInRange, feesEarned, price, dailyAPR }
 */
export function calculateDayAPR(dayIndex, dailyData, lowerTick, upperTick, positionLiquidity, volumeFee) {
  if (dayIndex < 0 || dayIndex >= dailyData.length) {
    throw new Error('Invalid day index');
  }
  
  const day = dailyData[dayIndex];
  const { date, volume, price, ticks } = day;
  
  // Filter ticks within position range
  const ticksInRange = ticks.filter(({tick}) => tick >= lowerTick && tick <= upperTick);
  
  // Sum total liquidity in pool
  const totalLiquidity = ticks.reduce((sum, t) => sum + t.liquidity, 0);
  
  // Sum liquidity in position range
  const liquidityInRange = ticksInRange.reduce((sum, t) => sum + t.liquidity, 0);
  
  // Your share of liquidity in your range
  const positionShare = liquidityInRange > 0 ? positionLiquidity / liquidityInRange : 0;
  
  // Volume attributed to your range
  const volumeInRange = (liquidityInRange / totalLiquidity) * volume;
  
  // Fees earned by your position
  const feesEarned = volumeInRange * volumeFee * positionShare;
  
  // Daily APR = (Fees earned / position liquidity) annualized
  const dailyReturn = positionLiquidity > 0 ? feesEarned / positionLiquidity : 0;
  const dailyAPR = dailyReturn * 365;
  
  return {
    date,
    volumeInRange,
    feesEarned,
    price,
    dailyAPR,
  };
}
