import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FINNHUB_API_KEY = 'cqhq1u1r01qgbqu5tirgcqhq1u1r01qgbqu5tis0';
const STOCKDATA_API_KEY = 'n7enZckAhvpoPHb1GWYR3em5J3Gp1I2OjJVwKsc6';

const fetchStockData = async (symbol) => {
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    throw error;
  }
};

const fetchStockPrice = async (symbol) => {
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
    return response.data.c; // c is the current price
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error);
    throw error;
  }
};

const fetchHistoricalPrice = async (symbol, from, to) => {
  try {
    const response = await axios.get(`https://api.stockdata.org/v1/data/eod?symbols=${symbol}&api_token=${STOCKDATA_API_KEY}&date_from=${from}&date_to=${to}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error);
    throw error;
  }
};

const fetchExpectedReturn = async (symbol) => {
  const now = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

  try {
    const historicalData = await fetchHistoricalPrice(symbol, oneYearAgo, now);
    console.log(`Historical Data for ${symbol}:`, historicalData);

    if (!historicalData || historicalData.length === 0) {
      throw new Error('Historical data is missing or incomplete');
    }

    const firstClosePrice = historicalData[0].close;
    const lastClosePrice = historicalData[historicalData.length - 1].close;

    const expectedReturn = ((lastClosePrice - firstClosePrice) / firstClosePrice) * 100;
    console.log(`Expected Return for ${symbol}:`, expectedReturn);

    return expectedReturn;
  } catch (error) {
    console.error(`Error fetching expected return for ${symbol}:`, error);
    throw error;
  }
};

const fetchCompanyDescription = async (symbol) => {
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
    console.log('Company Description Response:', response.data);
    return generateCompanyDescription(response.data);
  } catch (error) {
    console.error(`Error fetching company description for ${symbol}:`, error);
    throw error;
  }
};

const generateCompanyDescription = (data) => {
  if (data.description) {
    return data.description;
  }

  // Generate a custom description if the description is not available from the API
  return `${data.name} is a company listed on the ${data.exchange}. It operates in the ${data.finnhubIndustry} sector and has a market capitalization of ${data.marketCapitalization}. The company has been publicly traded since ${data.ipo}.`;
};

const fetchPortfolioStocks = async (symbols) => {
  const promises = symbols.map(symbol => fetchStockData(symbol));
  const results = await Promise.all(promises);
  return results;
};

const fetchPortfolioPrices = async (symbols) => {
  const promises = symbols.map(symbol => fetchStockPrice(symbol));
  const results = await Promise.all(promises);
  return results;
};

const fetchPortfolioReturns = async (symbols) => {
  const promises = symbols.map(symbol => fetchExpectedReturn(symbol));
  const results = await Promise.all(promises);
  return results;
};

const Popup = () => {
  const [symbol, setSymbol] = useState('');
  const [data, setData] = useState(null);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState("Hello, welcome to Vantage API Extension!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [riskLevel, setRiskLevel] = useState('low');
  const [investmentValue, setInvestmentValue] = useState('');
  const [portfolio, setPortfolio] = useState(null);

  const handleSearch = () => {
    setLoading(true);
    setError(null);
    fetchStockData(symbol)
      .then(data => {
        setData(data);
        setLoading(false);
        if (!history.includes(symbol)) {
          setHistory([...history, symbol]);
        }
      })
      .catch(error => {
        setError('Failed to fetch stock information');
        setLoading(false);
      });

    fetchCompanyDescription(symbol)
      .then(description => {
        setDescription(description);
      })
      .catch(error => {
        setDescription('Failed to fetch company description');
      });
  };

  const handlePortfolio = () => {
    const symbols = riskLevel === 'low'
      ? ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'PEP', 'INTC', 'CSCO', 'NVDA', 'TXN'] // Low risk
      : riskLevel === 'medium'
      ? ['PYPL', 'ADBE', 'NFLX', 'AMD', 'QCOM', 'TSLA', 'ZM', 'CRWD', 'ADSK', 'SNPS'] // Medium risk
      : ['MRNA', 'ROKU', 'DOCU', 'OKTA', 'DDOG', 'TEAM', 'PLTR', 'ZS', 'TWLO', 'SNAP']; // High risk

    const ratios = riskLevel === 'low'
      ? [0.15, 0.15, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.05, 0.05] // Example ratios for low risk
      : riskLevel === 'medium'
      ? [0.12, 0.12, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.08, 0.08] // Example ratios for medium risk
      : [0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10]; // Example ratios for high risk

    setLoading(true);
    fetchPortfolioStocks(symbols)
      .then(stocks => {
        fetchPortfolioPrices(symbols)
          .then(prices => {
            fetchPortfolioReturns(symbols)
              .then(returns => {
                const portfolio = stocks.map((stock, index) => ({
                  symbol: stock.ticker,
                  name: stock.name,
                  value: investmentValue * ratios[index],
                  price: prices[index],
                  expectedReturn: returns[index]
                }));
                setPortfolio(portfolio);
                setLoading(false);
              })
              .catch(error => {
                setError('Failed to fetch expected returns');
                setLoading(false);
                console.error('Error in fetchPortfolioReturns:', error);
              });
          })
          .catch(error => {
            setError('Failed to fetch stock prices');
            setLoading(false);
            console.error('Error in fetchPortfolioPrices:', error);
          });
      })
      .catch(error => {
        setError('Failed to fetch portfolio data');
        setLoading(false);
        console.error('Error in fetchPortfolioStocks:', error);
      });
  };

  const renderPortfolio = () => {
    if (!portfolio) return null;
    return (
      <div>
        <h2>Generated Portfolio</h2>
        <ul>
          {portfolio.map((stock, index) => (
            <li key={index}>
              <strong>{stock.symbol} - {stock.name}</strong>: ${stock.value.toFixed(2)} at ${stock.price}, Expected Return: {stock.expectedReturn.toFixed(2)}%
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div style={{ padding: '10px' }}>
      <h1>Vantage API Extension</h1>
      <input
        type="text"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="Enter stock symbol"
      />
      <button onClick={handleSearch}>Search</button>
      <p>{message}</p>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>No data</p>
      )}
      <div>
        <h2>Company Description</h2>
        <p>{description}</p>
      </div>
      <div>
        <h2>Create Portfolio</h2>
        <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
          <option value="low">Low Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="high">High Risk</option>
        </select>
        <input
          type="number"
          value={investmentValue}
          onChange={(e) => setInvestmentValue(e.target.value)}
          placeholder="Investment Value"
        />
        <button onClick={handlePortfolio}>Create Portfolio</button>
        {renderPortfolio()}
      </div>
      <div>
        <h2>Search History</h2>
        <ul>
          {history.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Popup;
