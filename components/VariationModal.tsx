import React, { useEffect, useState } from "react";
import ReactModal from "react-modal";
import type { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";

interface VariationModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  selectedItemId: string | null;
}

interface Variation {
  picture_url: string;
  name: string;
  price: number;
  quantity: number;
  recent_sales: number;
}

export default function VariationModal({
  isOpen,
  onRequestClose,
  selectedItemId,
}: VariationModalProps) {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [itemName, setItemName] = useState<string | null>(null); // State for item name
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isOpen && selectedItemId) {
      fetchVariations(page);
    }
  }, [isOpen, selectedItemId, page]);

  const fetchVariations = async (currentPage: number) => {
    if (!selectedItemId) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/dashboard/get-variations?itemId=${selectedItemId}&page=${currentPage}&entriesPerPage=250`
      );
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error details:", errorData);
        throw new Error(`API error: ${response.status} - ${errorData.message}`);
      }
      const { itemName, data, totalPages } = await response.json(); // Adjust based on API response
      setItemName(itemName); // Set the item name
      setVariations(data);
      setTotalPages(totalPages);
    } catch (error) {
      console.error("Error fetching variations:", error);
    } finally {
      setLoading(false);
    }
  };

  const columnDefs: ColDef<Variation>[] = [
    {
      headerName: "Image",
      field: "picture_url",
      width: 100,
      cellRenderer: (params: any) =>
        params.value ? (
          <img
            src={params.value}
            alt="Variation"
            style={{ width: "80px", height: "auto", objectFit: "cover" }}
          />
        ) : (
          "N/A"
        ),
    },
    {
      headerName: "Name",
      field: "name",
      width: 300,
      cellStyle: {
        whiteSpace: "normal",
        lineHeight: "1.4",
      },
    },
    {
      headerName: "Price",
      field: "price",
      width: 80,
      valueFormatter: ({ value }: any) =>
        typeof value === "number" ? `$${value.toFixed(2)}` : "N/A",
    },
    {
      headerName: "Quantity Available",
      field: "quantity",
      width: 100,
    },
    {
      headerName: "Sales (Last 30 Days)",
      field: "recent_sales",
      width: 150,
    },
  ];

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Variations Modal"
      ariaHideApp={false}
      style={{
        content: {
          width: "90%", // Wider modal
          margin: "auto",
          height: "90%", // Taller modal
          backgroundColor: "#1e1e1e",
          color: "#fff",
          overflow: "hidden", // Prevent overflow
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          zIndex: 1000,
        },
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          Variations for Item: {itemName || "Loading..."}
        </h2>
        <button
          onClick={onRequestClose}
          className="text-red-500 text-2xl font-bold hover:text-red-700"
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      {loading ? (
        <p className="text-center">Loading...</p>
      ) : variations.length > 0 ? (
        <>
          <div
            className="ag-theme-alpine-dark"
            style={{
              height: "calc(100% - 80px)", // Full height minus header/footer
              width: "100%",
            }}
          >
            <AgGridReact
              columnDefs={columnDefs}
              rowData={variations}
              defaultColDef={{
                sortable: true,
                filter: true,
                autoHeaderHeight: true,
                wrapHeaderText: true,
                resizable: true,
                flex: 1,
              }}
              domLayout="normal" // Adjust layout for full visibility
              pagination={true}
              paginationPageSize={250}
              rowHeight={100}
            />
          </div>
        </>
      ) : (
        <p className="text-center">No variations found for this item.</p>
      )}
    </ReactModal>
  );
}
