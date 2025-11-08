const CACHE_KEY = 'chartDataCache';
const CACHE_DATE_KEY = 'chartDataCacheDate';

function fetchAndRenderChart() {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            console.log('Received data:', data);

            // Store data in localStorage
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_DATE_KEY, new Date().toISOString().slice(0, 10));

            renderCharts(data);
        })
        .catch(error => console.error('Error fetching chart data:', error));
}

function renderCharts(data) {
    const { interest_rates, kospi_prices, exchange_rates, korea_interest_rates, interest_rate_difference } = data;

    // 1. Create a common set of labels (YYYY-MM) from all datasets and sort them
    const allDates = new Set([
        ...Object.keys(interest_rates),
        ...Object.keys(kospi_prices),
        ...Object.keys(exchange_rates),
        ...Object.keys(korea_interest_rates),
        ...Object.keys(interest_rate_difference)
    ]);
    const labels = Array.from(allDates).sort();

    // 2. Align data to the common labels. Use null for missing data points.
    const alignData = (data, labels) => {
        return labels.map(label => data[label] || null);
    };

    const alignedInterestRates = alignData(interest_rates, labels);
    const alignedKospiPrices = alignData(kospi_prices, labels);
    const alignedExchangeRates = alignData(exchange_rates, labels);
    const alignedKoreaInterestRates = alignData(korea_interest_rates, labels);
    const alignedInterestRateDifference = alignData(interest_rate_difference, labels);

    // --- Main Chart Configuration (KOSPI, USD/KRW, US Interest Rate) ---
    const mainChartData = {
        labels: labels,
        datasets: [
            {
                label: 'KOSPI', // Changed label
                data: alignedKospiPrices,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                yAxisID: 'y',
                spanGaps: true,
            },
            {
                label: 'USD/KRW', // Changed label
                data: alignedExchangeRates,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                yAxisID: 'y1',
                spanGaps: true,
            },
            {
                label: 'US IR', // Changed to abbreviation
                data: alignedInterestRates,
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                yAxisID: 'y2',
                spanGaps: true,
                hidden: true // Inactive by default
            }
        ]
    };

    const mainChartConfig = {
        type: 'line',
        data: mainChartData,
        options: {
            responsive: true,
            maintainAspectRatio: false, // Disable aspect ratio to allow flexible height
            interaction: {
                mode: 'index',
                intersect: false,
            },
            stacked: false,
            plugins: {
                title: {
                    display: true,
                    text: 'USD/KRW, KOSPI, and US IR (since 2015)', // Updated title
                    font: {
                        size: 10 // Further reduced font size for mobile
                    },
                    align: 'center'
                },
                legend: {
                    position: 'bottom', // Move legend to bottom
                    labels: {
                        boxWidth: 20, // Reduced box width
                        font: {
                            size: 12 // Reduced font size for mobile
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10 // Reduced max ticks for mobile
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'right', // Changed position to right
                    title: {
                        display: true,
                        text: 'KOSPI', // Changed title
                        color: 'rgba(255, 99, 132, 1)'
                    },
                    ticks: {
                        color: 'rgba(255, 99, 132, 1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'USD/KRW',
                        color: 'rgba(54, 162, 235, 1)'
                    },
                    ticks: {
                        color: 'rgba(54, 162, 235, 1)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    // max: 2000 // Set max value for exchange rate axis - Removed to allow auto-scaling
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'left', // Changed position to left
                    title: {
                        display: true,
                        text: 'US IR (%)', // Changed to abbreviation
                        color: 'rgba(153, 102, 255, 1)'
                    },
                    ticks: {
                        color: 'rgba(153, 102, 255, 1)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        },
    };

    const myChart = new Chart(
        document.getElementById('myChart'),
        mainChartConfig
    );

    // --- Interest Rate Chart Configuration (US & Korea) ---
    const interestRateChartData = {
        labels: labels,
        datasets: [
            {
                label: 'US IR', // Changed to abbreviation
                data: alignedInterestRates,
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                yAxisID: 'y', // Use 'y' for the first axis in this chart
                spanGaps: true,
            },
            {
                label: 'KR IR', // Changed to abbreviation
                data: alignedKoreaInterestRates,
                borderColor: 'rgba(75, 192, 75, 1)',
                backgroundColor: 'rgba(75, 192, 75, 0.2)',
                yAxisID: 'y', // Use 'y' for the first axis in this chart
                spanGaps: true,
            },
            {
                label: 'IR Diff (US - KR)', // Changed to abbreviation
                data: alignedInterestRateDifference,
                borderColor: 'rgba(255, 159, 64, 1)', // Orange color
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                yAxisID: 'y',
                spanGaps: true,
            }
        ]
    };

    const interestRateChartConfig = {
        type: 'line',
        data: interestRateChartData,
        options: {
            responsive: true,
            maintainAspectRatio: false, // Disable aspect ratio to allow flexible height
            interaction: {
                mode: 'index',
                intersect: false,
            },
            stacked: false,
            plugins: {
                title: {
                    display: true,
                    text: 'US and KR IR & Diff (since 2015)', // Updated title
                    font: {
                        size: 10 // Further reduced font size for mobile
                    },
                    align: 'center'
                },
                legend: {
                    position: 'bottom', // Move legend to bottom
                    labels: {
                        boxWidth: 20, // Reduced box width
                        font: {
                            size: 12 // Reduced font size for mobile
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10 // Reduced max ticks for mobile
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'IR (%)', // Changed to abbreviation
                        color: 'rgba(153, 102, 255, 1)' // Keep US color as primary
                    },
                    ticks: {
                        color: 'rgba(153, 102, 255, 1)'
                    }
                }
            }
        },
    };

    const interestRateChart = new Chart(
        document.getElementById('interestRateChart'),
        interestRateChartConfig
    );
}

// Main execution flow
const cachedData = localStorage.getItem(CACHE_KEY);
const cachedDate = localStorage.getItem(CACHE_DATE_KEY);
const today = new Date().toISOString().slice(0, 10);

if (cachedData && cachedDate === today) {
    console.log('Loading data from browser cache.');
    renderCharts(JSON.parse(cachedData));
} else {
    console.log('Fetching new data from backend.');
    fetchAndRenderChart();
}
