"use client";

import React, { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

interface Item {
  ItemID: string;
  Title: string;
  Price: number;
  Quantity: number;
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
    fetchListings(currentPage);
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

      const processedData = data.map((item: any) => ({
        ...item,
        Price: parseFloat(item.Price) || 0,
        Quantity: parseInt(item.Quantity, 10) || 0,
        TotalSold: parseInt(item.TotalSold, 10) || 0,
      }));

      setItems(processedData);
      setTotalPages(Math.ceil(4111 / entriesPerPage));
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
      body: JSON.stringify({ page: 1, entriesPerPage: 200 }),
    });
    alert("Cache cleared!");
  };

  const columns = [
    {
      headerName: "Image",
      field: "GalleryURL" as keyof Item,
      width: 100,
      cellRenderer: ({ value }: { value: string }) =>
        value ? (
          <img
            src={value}
            alt="Item"
            style={{ width: "100px", height: "auto", objectFit: "cover" }}
          />
        ) : (
          "No Image"
        ),
    },
    {
      headerName: "Title",
      field: "Title" as keyof Item,
      width: 400,
      cellRenderer: ({ data }: { data: Item }) => (
        <a
          href={`https://www.ebay.com/itm/${data.ItemID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {data.Title}
        </a>
      ),
    },
    {
      headerName: "Price",
      field: "Price" as keyof Item,
      width: 100,
      valueFormatter: (params: { value: number }) =>
        `$${params.value.toFixed(2)}`,
    },
    {
      headerName: "Quantity",
      field: "Quantity" as keyof Item,
      width: 100,
    },
    {
      headerName: "Sold",
      field: "TotalSold" as keyof Item,
      width: 100,
    },
    {
      headerName: "Variations",
      field: "Variations" as keyof Item,
      width: 150,
      cellRenderer: ({ data }: { data: Item }) =>
        data.Variations.length > 0 ? (
          <a
            href={`/dashboard/inventory/${data.ItemID}`}
            className="text-blue-500 hover:underline"
          >
            {data.Variations.length} Variations
          </a>
        ) : (
          "None"
        ),
    },
  ];

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
      <div
        className="ag-theme-alpine"
        style={{ height: "800px", width: "100%" }}
      >
        <AgGridReact<Item>
          rowData={items}
          columnDefs={columns}
          defaultColDef={{ sortable: true, filter: true }}
          pagination={false}
          rowHeight={100}
        />
      </div>
      <div className="mt-4 text-center">
        <p>
          Page {currentPage} of {totalPages}
        </p>
      </div>
    </div>
  );
}
