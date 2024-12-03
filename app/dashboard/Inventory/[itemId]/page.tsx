"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ItemDetailsPage() {
  const params = useParams(); // Extracts dynamic route parameters
  const [item, setItem] = useState<any>(null);
  const [status, setStatus] = useState("Loading...");
  const itemId = params?.itemId; // Get `itemId` from URL

  useEffect(() => {
    if (!itemId) {
      setStatus("Item ID not found in URL.");
      return;
    }

    const fetchItemDetails = async () => {
      try {
        console.log("Fetching item details for ItemID:", itemId);
        const response = await fetch(`/api/item-details?itemId=${itemId}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched item details:", data);
        setItem(data);
        setStatus("Item loaded successfully.");
      } catch (error) {
        console.error("Error fetching item details:", error);
        setStatus("Error loading item details.");
      }
    };

    fetchItemDetails();
  }, [itemId]);

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
            <th className="border border-gray-300 px-4 py-2">Quantity</th>
            <th className="border border-gray-300 px-4 py-2">Sales (Last 30 Days)</th>
          </tr>
        </thead>
        <tbody>
          {item.Variations.map((variation: any, index: number) => (
            <tr key={index}>
              <td className="border border-gray-300 px-4 py-2">{variation.Name || "N/A"}</td>
              <td className="border border-gray-300 px-4 py-2">{variation.Price}</td>
              <td className="border border-gray-300 px-4 py-2">{variation.Quantity}</td>
              <td className="border border-gray-300 px-4 py-2">{variation.Sales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
