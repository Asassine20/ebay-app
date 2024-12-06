"use client";
import Link from "next/link";

import React, { useState, useEffect } from "react";

interface Item {
  ItemID: string;
  Title: string;
  Price: string;
  Quantity: string;
  Variations: Variation[];
  TotalSold: number; 
  GalleryURL?: string;
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
  const [status, setStatus] = useState("Loading...");
  const [totalPages, setTotalPages] = useState(1);
  const entriesPerPage = 200;

  useEffect(() => {
    fetchListings(currentPage); // Fetch items for the current page whenever it changes
  }, [currentPage]);

  const fetchListings = async (page: number) => {
    setLoading(true);
    setStatus(`Loading page ${page}...`);

    try {
      const response = await fetch(
        `/api/ebay-listings?page=${page}&entriesPerPage=${entriesPerPage}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.error("Expected an array but got:", data);
        setStatus("Unexpected data format received from server.");
        return;
      }

      if (data.length === 0) {
        setStatus("No more items available.");
        return;
      }

      setItems(data);
      setTotalPages(Math.ceil(4111 / entriesPerPage)); // Adjust based on total entries if known
      setStatus(`Page ${page} loaded successfully.`);
    } catch (error) {
      console.error("Error fetching listings:", error);
      setStatus(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  const clearCache = async () => {
    await fetch(`/api/ebay-listings`, {
      method: "POST",
      body: JSON.stringify({ page: 1, entriesPerPage: 200 }), // Adjust parameters as needed
    });
    alert("Cache cleared!");
  };
  

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">eBay Active Listings</h1>
      <div className="mb-4 flex justify-between">
        <button
          onClick={handlePreviousPage}
          disabled={loading || currentPage === 1}
          className={`px-4 py-2 text-white rounded ${
            currentPage === 1 ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-700"
          }`}
        >
          Previous
        </button>
        <p className="text-gray-600">{status}</p>
        <button
          onClick={handleNextPage}
          disabled={loading || currentPage === totalPages}
          className={`px-4 py-2 text-white rounded ${
            currentPage === totalPages
              ? "bg-gray-400"
              : "bg-blue-500 hover:bg-blue-700"
          }`}
        >
          Next
        </button>
      </div>
      <table className="table-auto w-full border-collapse border border-gray-300">
  <thead>
    <tr className="bg-gray-200">
      <th className="border border-gray-300 px-4 py-2">Image</th> {/* Image column first */}
      <th className="border border-gray-300 px-4 py-2">Title</th>
      <th className="border border-gray-300 px-4 py-2">Price</th>
      <th className="border border-gray-300 px-4 py-2">Quantity</th>
      <th className="border border-gray-300 px-4 py-2">Sold</th>
      <th className="border border-gray-300 px-4 py-2">Variations</th> {/* Variations with link */}
    </tr>
  </thead>
  <tbody>
    {items.map((item) => (
      <tr key={item.ItemID}>
        {/* Image column */}
        <td className="border border-gray-300 px-4 py-2">
          {item.GalleryURL ? (
            <img src={item.GalleryURL} alt={item.Title} className="w-16 h-16 object-cover" />
          ) : (
            "No Image"
          )}
        </td>

        {/* Title column with link */}
        <td className="border border-gray-300 px-4 py-2">
          <a
            href={`https://www.ebay.com/itm/${item.ItemID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {item.Title}
          </a>
        </td>

        {/* Price */}
        <td className="border border-gray-300 px-4 py-2">{item.Price}</td>

        {/* Quantity */}
        <td className="border border-gray-300 px-4 py-2">{item.Quantity}</td>

        {/* Total Sold */}
        <td className="border border-gray-300 px-4 py-2">{item.TotalSold}</td>

        {/* Variations with link if not None */}
        <td className="border border-gray-300 px-4 py-2">
          {item.Variations.length > 0 ? (
            <Link
              href={`/dashboard/inventory/${item.ItemID}`}
              className="text-blue-500 hover:underline"
            >
              {item.Variations.length} Variations
            </Link>
          ) : (
            "None"
          )}
        </td>
      </tr>
    ))}
  </tbody>
</table>


      <div className="mt-4 text-center">
        <p>
          Page {currentPage} of {totalPages}
        </p>
      </div>
    </div>
  );
}
