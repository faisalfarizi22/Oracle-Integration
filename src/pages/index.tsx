import { Toaster } from "react-hot-toast";
import PriceFeed from "@/components/PriceFeed";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white font-mono flex flex-col items-center justify-center p-8">
      <Toaster position="top-right" />
      
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-blue-400 mb-4">
          Oracle Price Feed
        </h1>
        <p className="text-xl text-gray-400">
          Real-time cryptocurrency prices powered by Chainlink
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <PriceFeed />
      </div>

      <div className="mt-12 text-center text-gray-500 text-sm">
        <p>Powered by Chainlink Oracle on Base Sepolia</p>
      </div>
    </div>
  );
}