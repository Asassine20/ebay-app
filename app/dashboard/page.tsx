"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs"; // Import useAuth from Clerk

export default function Dashboard() {
  const { userId } = useAuth(); // Fetch user ID dynamically from Clerk
  const [loading, setLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState("");
  const [message, setMessage] = useState("");

  // Fetch the eBay OAuth URL
  useEffect(() => {
    const fetchAuthUrl = async () => {
      try {
        const response = await fetch("/api/ebay-auth");
        const data = await response.json();
        setAuthUrl(data.url);
      } catch (error) {
        console.error("Error fetching eBay OAuth URL:", error);
        setAuthUrl("");
      }
    };

    fetchAuthUrl();
  }, []);

  const handleFetchData = async () => {
    setLoading(true);
    setMessage("");

    if (!userId) {
      setMessage("User not authenticated.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/itemInsert", {
        method: "GET",
        headers: {
          "user-id": userId, // Use dynamic user ID from Clerk
        },
      });

      if (!response.ok) {
        const error = await response.json();
        setMessage(`Error: ${error.error}`);
      } else {
        const data = await response.json();
        setMessage("Data fetched and saved successfully!");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="grid gap-6 px-4 pt-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
    >
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Out of Stock Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">28</div>
          <p className="text-xs text-muted-foreground">
            These items went out of stock within the last 30 days.
            <br /> Restock soon.
          </p>
          <p>{userId}</p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Potential Sales Increase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">$1645/month</div>
          <p className="text-xs text-muted-foreground">
            Restocking out-of-stock items could boost sales by this amount.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lost Sales This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">$963</div>
          <p className="text-xs text-muted-foreground">
            Estimated revenue lost due to out-of-stock items.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Restock Soon - Hot Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">7</div>
          <p className="text-xs text-muted-foreground">
            These items have been selling rapidly and are soon to go out-of-stock.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Connect to eBay</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => authUrl && (window.location.href = authUrl)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={!authUrl}
          >
            {authUrl ? "Sign in with eBay" : "Loading..."}
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Click the button above to connect your account to eBay.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fetch eBay Data</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={handleFetchData}
            className={`px-4 py-2 text-white rounded ${loading ? "bg-gray-500" : "bg-blue-500 hover:bg-blue-600"}`}
            disabled={loading}
          >
            {loading ? "Fetching..." : "Fetch Data"}
          </button>
          {message && <p className="text-xs text-muted-foreground mt-2">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}