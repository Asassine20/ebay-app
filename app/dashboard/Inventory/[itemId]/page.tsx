"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ItemDetailsPage() {
  const params = useParams();
  const [item, setItem] = useState<any>(null);
  const [status, setStatus] = useState("Loading...");
  const itemId = params?.itemId;

  useEffect(() => {
    if (!itemId) {
      setStatus("Item ID not found in URL.");
      return;
    }

    const fetchItemDetails = async () => {
      try {
        const response = await fetch(`/api/item-details?itemId=${itemId}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched item details from API:", data); // Log the response structure
        setItem(data); // Save data to state
        setStatus("Item loaded successfully.");
      } catch (error) {
        console.error("Error fetching item details:", error);
        setStatus("Error loading item details.");
      }
    };

    fetchItemDetails();
  }, [itemId]);

  // Debugging: Log the item state to check if Variations are populated correctly
  useEffect(() => {
    console.log("Updated item state:", item);
  }, [item]);

  if (status === "Loading...") return <p>Loading...</p>;
  if (!item) return <p>{status}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{item.Title}</h1>
      <p>Price: {item.Price}</p>
      <p>Quantity: {item.Quantity}</p>
      <h2 className="text-xl font-bold mt-4">Variations:</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-4 py-2">Name</th>
            <th className="border border-gray-300 px-4 py-2">Price</th>
            <th className="border border-gray-300 px-4 py-2">Quantity Available</th>
            <th className="border border-gray-300 px-4 py-2">Sales (Last 30 Days)</th>
          </tr>
        </thead>
        <tbody>
          {item.Variations && item.Variations.length > 0 ? (
            item.Variations.map((variation: any, index: number) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">{variation.Name || "N/A"}</td>
                <td className="border border-gray-300 px-4 py-2">{variation.Price}</td>
                <td className="border border-gray-300 px-4 py-2">{variation.Quantity || "N/A"}</td>
                <td className="border border-gray-300 px-4 py-2">{variation.QuantitySold || 0}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={4}
                className="border border-gray-300 px-4 py-2 text-center text-gray-500"
              >
                No variations available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
