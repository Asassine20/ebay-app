"use client";

import React, { useState, useEffect } from "react";

interface Item {
  ItemID: string;
  Title: string;
  Price: string;
  Quantity: string;
  Variations: Variation[];
}

interface Variation {
  Price: string;
  Quantity: string;
  Specifics: { Name: string; Value: string }[];
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Click 'Load Listings' to start.");
  const [allLoaded, setAllLoaded] = useState(false);
  const entriesPerPage = 200;

  const fetchListings = async () => {
    if (loading || allLoaded) return;
    setLoading(true);

    try {
      setStatus(`Loading page ${currentPage}...`);

      const response = await fetch(
        `/api/ebay-listings?page=${currentPage}&entriesPerPage=${entriesPerPage}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: Item[] = await response.json();

      if (!Array.isArray(data)) {
        console.error("Expected an array but got:", data);
        setStatus("Unexpected data format received from server.");
        return;
      }

      if (data.length === 0) {
        setStatus("All items have been loaded.");
        setAllLoaded(true);
        return;
      }

      setItems((prevItems) => [...prevItems, ...data]);
      setStatus(`Loaded ${data.length} items from page ${currentPage}.`);
      setCurrentPage((prevPage) => prevPage + 1);
    } catch (error) {
      console.error("Error fetching listings:", error);
      setStatus(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">eBay Active Listings</h1>
      <div className="mb-4">
        <button
          onClick={fetchListings}
          disabled={loading || allLoaded}
          className={`px-4 py-2 text-white rounded ${
            loading || allLoaded ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-700"
          }`}
        >
          {allLoaded ? "All Items Loaded" : "Load Listings"}
        </button>
      </div>
      <p className="text-gray-600 mb-4">{status}</p>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-4 py-2">Item ID</th>
            <th className="border border-gray-300 px-4 py-2">Title</th>
            <th className="border border-gray-300 px-4 py-2">Price</th>
            <th className="border border-gray-300 px-4 py-2">Quantity</th>
            <th className="border border-gray-300 px-4 py-2">Variations</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <React.Fragment key={item.ItemID}>
              <tr>
                <td className="border border-gray-300 px-4 py-2">{item.ItemID}</td>
                <td className="border border-gray-300 px-4 py-2">{item.Title}</td>
                <td className="border border-gray-300 px-4 py-2">{item.Price}</td>
                <td className="border border-gray-300 px-4 py-2">{item.Quantity}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {item.Variations.length > 0 ? item.Variations.length : "None"}
                </td>
              </tr>
              {item.Variations.map((variation, index) => (
                <tr key={`${item.ItemID}-${index}`} className="bg-gray-50">
                  <td colSpan={2} className="border border-gray-300 px-4 py-2">
                    {variation.Specifics.map((spec) => `${spec.Name}: ${spec.Value}`).join(", ")}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{variation.Price}</td>
                  <td className="border border-gray-300 px-4 py-2">{variation.Quantity}</td>
                  <td className="border border-gray-300 px-4 py-2">Variation</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
