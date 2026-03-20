import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavBar from "@/components/NavBar";
import HomePage from "./pages/HomePage";
import ScanPage from "./pages/ScanPage";
import ResultsPage from "./pages/ResultsPage";
import CollectionPage from "./pages/CollectionPage";
import MarketPage from "./pages/MarketPage";
import CategoryMarketPage from "./pages/CategoryMarketPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="dark">
          <div className="min-h-screen bg-background text-foreground">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/collection" element={<CollectionPage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/market/:categoryId" element={<CategoryMarketPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <NavBar />
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
