// Exchange rate: 1 USD = ~130 KES (you can update this or fetch from an API)
const KES_TO_USD_RATE = 0.0077; // 1 KES = 0.0077 USD (approximately 1/130)

export function convertKEStoUSD(amountInKES: number): number {
    return parseFloat((amountInKES * KES_TO_USD_RATE).toFixed(2));
}

export function convertUSDtoKES(amountInUSD: number): number {
    return parseFloat((amountInUSD / KES_TO_USD_RATE).toFixed(2));
}

export function formatKES(amount: number): string {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatUSD(amount: number): string {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Get live exchange rate (optional - can integrate with API)
export async function getLiveExchangeRate(): Promise<number> {
    try {
        // You can integrate with APIs like exchangerate-api.com or currencyapi.com
        // For now, return the static rate
        return KES_TO_USD_RATE;
    } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
        return KES_TO_USD_RATE;
    }
}
