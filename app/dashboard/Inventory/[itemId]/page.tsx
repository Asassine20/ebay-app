"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

export default function InventoryVariationsPage() {
  const { itemid } = useParams(); // Lowercase itemid to match the route
  console.log("Extracted itemid from URL:", itemid);

  const [inventoryVariations, setInventoryVariations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInventoryVariations = async (currentPage: number) => {
    if (!itemid) {
      console.error("Item ID is missing in the URL.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/get-variations?itemId=${itemid}&page=${currentPage}&entriesPerPage=250`
      );
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error details:", errorData);
        throw new Error(`API error: ${response.status} - ${errorData.message}`);
      }
      const { data, totalPages } = await response.json();
      setInventoryVariations(data);
      setTotalPages(totalPages);
    } catch (error) {
      console.error("Error fetching inventory variations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryVariations(page);
  }, [page]);

  const columnDefs = [
    {
      headerName: "Image",
      field: "picture_url",
      width: 120,
      cellRenderer: (params: any) =>
        params.value ? (
          <img
            src={params.value}
            alt="Variation"
            style={{ width: "100px", height: "auto", objectFit: "cover" }}
          />
        ) : (
          "N/A"
        ),
    },
    {
      headerName: "Name",
      field: "name",
      width: 300,
    },
    {
      headerName: "Price",
      field: "price",
      width: 150,
      valueFormatter: ({ value }: any) =>
        typeof value === "number" ? `$${value.toFixed(2)}` : "N/A",
    },
    {
      headerName: "Quantity Available",
      field: "quantity",
      width: 150,
    },
    {
      headerName: "Sales (Last 30 Days)",
      field: "recent_sales",
      width: 150,
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inventory Variations</h1>
      {loading ? (
        <p className="text-center">Loading...</p>
      ) : inventoryVariations.length > 0 ? (
        <>
          <div className="ag-theme-alpine mt-4" style={{ height: "600px", width: "100%" }}>
            <AgGridReact
              columnDefs={columnDefs}
              rowData={inventoryVariations}
              defaultColDef={{ 
                sortable: true, 
                filter: true,
                autoHeaderHeight: true,
                wrapHeaderText: true,
               }}
              domLayout="autoHeight"
              pagination={true}
              paginationPageSize={10}
              rowHeight={120} // Taller rows for larger images
              
            />
          </div>
          <div className="mt-4 flex justify-center">
            <button
              className="px-4 py-2 mx-2 bg-gray-300 rounded"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="px-4 py-2">{`Page ${page} of ${totalPages}`}</span>
            <button
              className="px-4 py-2 mx-2 bg-gray-300 rounded"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <p className="text-center">No variations found for this item.</p>
      )}
    </div>
  );
}
