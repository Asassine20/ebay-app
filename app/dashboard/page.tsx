"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalEntries, setTotalEntries] = useState<number | null>(null);
  const [authUrl, setAuthUrl] = useState("");
  const [hasEbayToken, setHasEbayToken] = useState<boolean>(false); // Track if the user has an eBay token

  // State for dynamic card data
  const [recentOutOfStock, setRecentOutOfStock] = useState<number | null>(null);
  const [lostSales, setLostSales] = useState<number | null>(null);
  const [restockSoon, setRestockSoon] = useState<number | null>(null);

  // Fetch the user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch("/api/dashboard/get-user-id");
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching user ID:", errorData.error || "Unknown error.");
          setError(errorData.error || "Failed to fetch user ID.");
          return;
        }
        const data = await response.json();
        setUserId(data.id); // Set the database ID
      } catch (err) {
        console.error("Error fetching user ID:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
  }, []);

  // Fetch total active listings for the user
  useEffect(() => {
    if (!userId) return;

    const fetchTotalEntries = async () => {
      try {
        const response = await fetch("/api/dashboard/get-total-listings", {
          method: "GET",
          headers: { "user-id": userId },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching total entries:", errorData.error || "Unknown error.");
          setError(errorData.error || "Failed to fetch total entries.");
          return;
        }

        const data = await response.json();
        setTotalEntries(data.totalEntries);
      } catch (err) {
        console.error("Error fetching total entries:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchTotalEntries();
  }, [userId]);

  // Fetch data for cards
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        // Recent Out of Stock
        const outOfStockResponse = await fetch("/api/dashboard/get-recent-out-of-stock-count");
        const outOfStockData = await outOfStockResponse.json();
        setRecentOutOfStock(outOfStockData.total || 0);

        // Lost Sales
        const lostSalesResponse = await fetch("/api/dashboard/get-lost-sales");
        const lostSalesData = await lostSalesResponse.json();
        setLostSales(lostSalesData.total || 0);

        // Restock Soon
        const restockSoonResponse = await fetch("/api/dashboard/get-restock-soon-count");
        const restockSoonData = await restockSoonResponse.json();
        setRestockSoon(restockSoonData.total || 0);
      } catch (err) {
        console.error("Error fetching card data:", err);
        setError("Failed to fetch dashboard data.");
      }
    };

    fetchData();
  }, [userId]);

  // Check if the user has an eBay token
  useEffect(() => {
    if (!userId) return;

    const checkEbayToken = async () => {
      try {
        const response = await fetch(`/api/check-ebay-token`, {
          method: "GET",
          headers: { "user-id": userId },
        });

        if (!response.ok) {
          console.error("Error checking eBay token.");
          setHasEbayToken(false);
          return;
        }

        const data = await response.json();
        setHasEbayToken(data.hasToken); // Set the token status
      } catch (error) {
        console.error("Error checking eBay token:", error);
        setHasEbayToken(false);
      }
    };

    checkEbayToken();
  }, [userId]);

  // Fetch eBay OAuth URL
  useEffect(() => {
    const fetchAuthUrl = async () => {
      try {
        const response = await fetch("/api/dashboard/ebay-auth");
        const data = await response.json();
        if (data.url) {
          setAuthUrl(data.url);
        } else {
          console.error("eBay OAuth URL not found in response.");
        }
      } catch (error) {
        console.error("Error fetching eBay OAuth URL:", error);
      } finally {
        setLoading(false); // Stop loading after fetch completes
      }
    };

    fetchAuthUrl();
  }, []);

  return (
    <div
      className="grid gap-6 px-4 pt-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
    >
      {/* Connect to eBay */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Connect to eBay</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => authUrl && (window.location.href = authUrl)}
            className={`px-4 py-2 rounded text-white ${hasEbayToken || !authUrl || loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
              }`}
            disabled={hasEbayToken || !authUrl || loading}
          >
            {loading ? "Loading..." : hasEbayToken ? "Already Connected" : "Sign in with eBay"}
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            {hasEbayToken
              ? "Your account is already connected to eBay."
              : "Click the button above to connect your account to eBay."}
          </p>
        </CardContent>
      </Card>

      {/* Total Active Listings */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Active Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || totalEntries === null ? (
            <div className="skeleton-loader h-8 w-16"></div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : typeof totalEntries === "number" ? (
            <div className="text-2xl font-bold">{totalEntries}</div>
          ) : (
            <div className="text-red-500">Connect to eBay</div>
          )}
          <p className="text-xs text-muted-foreground">
            Total number of active eBay listings in your account.
          </p>
        </CardContent>
      </Card>

      {/* Recent Out of Stock */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Out of Stock Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentOutOfStock !== null ? recentOutOfStock : "Loading..."}</div>
          <p className="text-xs text-muted-foreground">
            These items went out of stock within the last 30 days.
          </p>
        </CardContent>
      </Card>

      {/* Lost Sales */}
      <Card className="w-full">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Lost Sales This Month</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-red-600">
      {lostSales !== null ? `$${lostSales.toFixed(2)}` : "Loading..."}
    </div>
    <p className="text-xs text-muted-foreground">
      Estimated revenue lost due to out-of-stock items.
    </p>
  </CardContent>
</Card>


      {/* Restock Soon */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Restock Soon - Top Selling Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{restockSoon !== null ? restockSoon : "Loading..."}</div>
          <p className="text-xs text-muted-foreground">
            These items have been selling rapidly and are soon to go out-of-stock.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
