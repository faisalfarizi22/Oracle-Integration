import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, TrendingUp, Wifi, Clock, Database } from "lucide-react";
import { ethers } from "ethers";
import PriceABI from "../abis/PriceABI.json";

const CONFIG = {
  RPC_URL: "https://sepolia.base.org",
  CONTRACT_ADDRESS: "0x94aB249807B55C8A8Dcb6cd9785636Af52744e22", 
  REFRESH_INTERVAL: 15000, 
  DECIMALS: 8,
  CHAIN_ID: 84532,
  CHAIN_NAME: "Base Sepolia"
};

interface TokenPrice {
  token: string;
  price: number;
  priceFeedAddress: string;
}

export default function MultiTokenPriceFeed() {
  const [tokenPrices, setTokenPrices] = useState<TokenPrice[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, PriceABI, provider);

  useEffect(() => {
    initializeContract();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && supportedTokens.length > 0 && !loading) {
      interval = setInterval(() => {
        fetchAllPrices();
      }, CONFIG.REFRESH_INTERVAL);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [supportedTokens, isConnected, loading]);

  const initializeContract = async () => {
    try {
      setLoading(true);
      setError(null);

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== CONFIG.CHAIN_ID) {
        throw new Error(`Wrong network. Expected Chain ID: ${CONFIG.CHAIN_ID}`);
      }
      setIsConnected(true);

      await loadContractData();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to contract");
      setIsConnected(false);
      console.error("Contract initialization error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadContractData = async () => {
    try {
      const total = await contract.getTotalSupportedTokens();
      setTotalTokens(Number(total));

      const tokens = await contract.getAllSupportedTokens();
      setSupportedTokens(tokens);
      
      if (tokens.length > 0) {
        setSelectedToken(tokens[0]);
        await fetchAllPrices(tokens);
      } else {
        throw new Error("No tokens supported by this contract");
      }
      
    } catch (err) {
      throw new Error("Failed to load contract data: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const fetchAllPrices = async (tokens?: string[]) => {
    try {
      const tokensToFetch = tokens || supportedTokens;
      if (tokensToFetch.length === 0) return;

      const pricePromises = tokensToFetch.map(async (token) => {
        try {
          const [priceData, priceFeedAddress] = await Promise.all([
            contract.getLatestPrice(token),
            contract.getPriceFeedAddress(token)
          ]);
          
          const price = Number(priceData) / Math.pow(10, CONFIG.DECIMALS);
          
          return {
            token,
            price,
            priceFeedAddress
          };
        } catch (err) {
          console.error(`Error fetching price for ${token}:`, err);
          return {
            token,
            price: 0,
            priceFeedAddress: "0x0000000000000000000000000000000000000000"
          };
        }
      });

      const prices = await Promise.all(pricePromises);
      setTokenPrices(prices);
      setLastUpdated(new Date());
      setError(null);
      
    } catch (err) {
      setError("Failed to fetch prices: " + (err instanceof Error ? err.message : "Unknown error"));
      console.error("Fetch prices error:", err);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAllPrices();
    } catch (err) {
      console.error("Manual refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTokenSelect = (token: string) => {
    setSelectedToken(token);
  };

  const getCurrentPrice = () => {
    const tokenData = tokenPrices.find(tp => tp.token === selectedToken);
    return tokenData?.price || 0;
  };

  const formatPrice = (value: number) => {
    if (value === 0) return "0.00";
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-xl p-8 backdrop-blur-lg bg-opacity-50 border border-gray-700">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
            <p className="text-white">Loading contract data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center bg-transparent p-4 min-h-screen">
      {error && (
        <div className="mb-4 max-w-2xl w-full bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}
      
      <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-xl shadow-2xl p-8 max-w-2xl w-full backdrop-blur-lg bg-opacity-50 border border-gray-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse"></div>
        
        <div className="relative z-10 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              ETH Price Feed
            </h1>
            <div className="flex items-center gap-2">
              <Wifi className={`h-5 w-5 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
              <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400">
            {lastUpdated && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {supportedTokens.length > 0 && (
          <div className="relative z-10 mb-8">
            <label className="text-gray-400 text-sm mb-3 block">Select Token</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {supportedTokens.map((token) => (
                <button
                  key={token}
                  onClick={() => handleTokenSelect(token)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedToken === token
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
                  }`}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedToken && (
          <div className="relative z-10 text-center mb-8">
            <div className="mb-2">
              <h2 className="text-xl text-gray-400">{selectedToken}/USD</h2>
            </div>
            <div className="relative">
              <p className="text-5xl font-bold text-white mb-2">
                ${formatPrice(getCurrentPrice())}
              </p>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-10 blur-xl"></div>
            </div>
          </div>
        )}

        {tokenPrices.length > 1 && (
          <div className="relative z-10 mb-8">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">All Supported Tokens</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tokenPrices.map((tokenData) => (
                <div
                  key={tokenData.token}
                  className={`bg-gray-800/50 rounded-lg p-4 border transition-all duration-200 ${
                    selectedToken === tokenData.token
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white">{tokenData.token}/USD</span>
                    <span className="text-lg font-bold text-green-400">
                      ${formatPrice(tokenData.price)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Feed: {formatAddress(tokenData.priceFeedAddress)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative z-10 flex gap-4">
          <button 
            onClick={handleManualRefresh}
            disabled={refreshing || !isConnected}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh All Prices'}
          </button>
        </div>

        <div className="relative z-10 mt-6 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400">
            <div>Auto-refresh: {CONFIG.REFRESH_INTERVAL / 1000}s</div>
          </div>
        </div>
      </div>
    </div>
  );
}